import { NextResponse } from "next/server";
import { buildInsight, normalizeTransactionsFromMapping } from "../../../lib/analysis";
import { parseStatement } from "../../../lib/csv/statement";
import { currentPeriod } from "../../../lib/entitlements";
import { createServerClient } from "../../../lib/supabase/server";
import { classifyTransactions } from "../../../services/claude";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../../../types/tier";
import type { ColumnMapping, MappingField } from "../../../types/mapping";
import type { Transaction } from "../../../types/transaction";

const BUCKET = "card-statements";
const MAX_TRANSACTIONS = 10_000;
const MAPPING_FIELDS: MappingField[] = ["date", "merchant", "amount", "ignore"];
const GENERIC_SERVER_ERROR = "Something went wrong. Please try again.";

type AnalysisCredit = { allowed: boolean; new_count: number; tier: string };

type AnalysisRequestBody = {
  uploadId?: unknown;
  mapping?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AnalysisRequestBody;

  try {
    body = (await request.json()) as AnalysisRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.uploadId !== "string" || body.uploadId.trim() === "") {
    return NextResponse.json({ error: "uploadId is required." }, { status: 400 });
  }

  const mapping = parseColumnMapping(body.mapping);

  if (!mapping) {
    return NextResponse.json({ error: "Valid column mapping is required." }, { status: 400 });
  }

  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .select("id, storage_path")
    .eq("id", body.uploadId)
    .eq("user_id", user.id)
    .single();

  if (uploadError || !upload) {
    if (uploadError) {
      console.error("uploads lookup failed", uploadError.message);
    }

    return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  }

  const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(upload.storage_path);

  if (downloadError || !file) {
    console.error("storage download failed", downloadError?.message);

    return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
  }

  // Parsing/normalization happens before metering so an invalid CSV never
  // consumes a credit, and well before the paid Claude call.
  let normalized;

  try {
    const parsed = parseStatement(new Uint8Array(await file.arrayBuffer()));
    normalized = normalizeTransactionsFromMapping(parsed.headers, parsed.rows, mapping);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }

  // No parseable rows (e.g. a header-only CSV) must not consume a paid credit.
  if (normalized.transactions.length === 0) {
    return NextResponse.json(
      { error: "No valid transactions were found in the upload." },
      { status: 400 },
    );
  }

  if (normalized.transactions.length > MAX_TRANSACTIONS) {
    return NextResponse.json(
      { error: `Upload exceeds the ${MAX_TRANSACTIONS} transaction limit.` },
      { status: 400 },
    );
  }

  // Atomically reserve a credit (check + increment in one DB transaction) so two
  // concurrent requests cannot both pass the limit and double-spend a paid call.
  const period = currentPeriod(new Date());
  const { data: creditData, error: creditError } = await supabase.rpc("consume_analysis_credit", {
    p_period: period,
    p_free_limit: FREE_MONTHLY_LIMIT,
    p_pro_limit: PRO_FAIR_USE_LIMIT,
  });

  if (creditError) {
    console.error("consume_analysis_credit failed", creditError.message);

    return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
  }

  const credit = (Array.isArray(creditData) ? creditData[0] : creditData) as AnalysisCredit | undefined;

  if (!credit) {
    console.error("consume_analysis_credit returned no row");

    return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
  }

  const tier = credit.tier === "pro" ? "pro" : "free";

  if (!credit.allowed) {
    return NextResponse.json(
      { error: "Monthly analysis limit exceeded.", limit: tier === "pro" ? PRO_FAIR_USE_LIMIT : FREE_MONTHLY_LIMIT },
      { status: tier === "free" ? 402 : 403 },
    );
  }

  let transactions: Transaction[];

  try {
    const classifications = await classifyTransactions(normalized.transactions);
    transactions = normalized.transactions.map((transaction, index) => ({
      ...transaction,
      category: classifications[index]?.category ?? "etc",
    }));
  } catch (error) {
    console.error("classifyTransactions failed", error);
    await refundCredit(supabase, period);

    return NextResponse.json({ error: "Analysis is temporarily unavailable." }, { status: 503 });
  }

  const insight = buildInsight(transactions);

  if (transactions.length > 0) {
    const { error: transactionError } = await supabase.from("transactions").insert(
      transactions.map((transaction) => ({
        user_id: user.id,
        upload_id: upload.id,
        tx_date: transaction.date,
        merchant: transaction.merchant,
        amount: transaction.amount,
        category: transaction.category,
      })),
    );

    if (transactionError) {
      console.error("transactions insert failed", transactionError.message);
      await refundCredit(supabase, period);

      return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
    }
  }

  const { data: insightRow, error: insightError } = await supabase
    .from("insights")
    .insert({
      user_id: user.id,
      upload_id: upload.id,
      total: insight.total,
      tx_count: insight.count,
      breakdown: insight.breakdown,
      summary: insight.summary,
    })
    .select("id")
    .single();

  if (insightError || !insightRow) {
    console.error("insights insert failed", insightError?.message);
    await refundCredit(supabase, period);

    return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
  }

  const { error: mappingError } = await supabase
    .from("uploads")
    .update({ column_mapping: mapping })
    .eq("id", upload.id)
    .eq("user_id", user.id);

  if (mappingError) {
    // The analysis itself is persisted; surface a soft warning but keep the result.
    console.error("uploads mapping update failed", mappingError.message);
  }

  return NextResponse.json({
    insightId: insightRow.id,
    insight,
    skipped: normalized.skipped.length,
  });
}

async function refundCredit(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  period: string,
): Promise<void> {
  const { error } = await supabase.rpc("refund_analysis_credit", { p_period: period });

  if (error) {
    console.error("refund_analysis_credit failed", error.message);
  }
}

function parseColumnMapping(value: unknown): ColumnMapping[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const mapping = value.filter((item): item is ColumnMapping => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as Partial<ColumnMapping>;

    return (
      typeof candidate.source === "string" &&
      typeof candidate.sample === "string" &&
      typeof candidate.field === "string" &&
      MAPPING_FIELDS.includes(candidate.field as MappingField) &&
      typeof candidate.confidence === "number" &&
      Number.isFinite(candidate.confidence)
    );
  });

  return mapping.length === value.length ? mapping : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Invalid analysis input.";
}
