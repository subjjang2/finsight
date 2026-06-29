import { NextResponse } from "next/server";
import { buildInsight, getMeteringDecision, normalizeTransactionsFromMapping } from "../../../lib/analysis";
import { decodeBuffer } from "../../../lib/csv/decode";
import { parseCsv } from "../../../lib/csv/parse";
import { nextAnalysisCount } from "../../../lib/entitlements";
import { createServerClient } from "../../../lib/supabase/server";
import { classifyTransactions } from "../../../services/claude";
import type { ColumnMapping, MappingField } from "../../../types/mapping";
import type { Transaction } from "../../../types/transaction";

const BUCKET = "card-statements";
const MAPPING_FIELDS: MappingField[] = ["date", "merchant", "amount", "ignore"];

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tier, monthly_analysis_count, count_period")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Profile not found." }, { status: 500 });
  }

  const tier = profile.tier === "pro" ? "pro" : "free";
  const countProfile = {
    monthly_analysis_count: Number(profile.monthly_analysis_count ?? 0),
    count_period: typeof profile.count_period === "string" ? profile.count_period : null,
  };
  const now = new Date();
  const metering = getMeteringDecision(tier, countProfile, now);

  if (!metering.allowed) {
    return NextResponse.json(
      { error: "Monthly analysis limit exceeded.", limit: metering.limit },
      { status: tier === "free" ? 402 : 403 },
    );
  }

  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .select("id, storage_path")
    .eq("id", body.uploadId)
    .eq("user_id", user.id)
    .single();

  if (uploadError || !upload) {
    return NextResponse.json({ error: uploadError?.message ?? "Upload not found." }, { status: 404 });
  }

  const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(upload.storage_path);

  if (downloadError || !file) {
    return NextResponse.json({ error: downloadError?.message ?? "Upload file not found." }, { status: 500 });
  }

  let normalized;

  try {
    const parsed = parseCsv(decodeBuffer(new Uint8Array(await file.arrayBuffer())));
    normalized = normalizeTransactionsFromMapping(parsed.headers, parsed.rows, mapping);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }

  let transactions: Transaction[];

  try {
    const classifications = await classifyTransactions(normalized);
    transactions = normalized.map((transaction, index) => ({
      ...transaction,
      category: classifications[index]?.category ?? "etc",
    }));
  } catch {
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
      return NextResponse.json({ error: transactionError.message }, { status: 500 });
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
    return NextResponse.json({ error: insightError?.message ?? "Insight could not be saved." }, { status: 500 });
  }

  const { error: mappingError } = await supabase
    .from("uploads")
    .update({ column_mapping: mapping })
    .eq("id", upload.id)
    .eq("user_id", user.id);

  if (mappingError) {
    return NextResponse.json({ error: mappingError.message }, { status: 500 });
  }

  const nextCount = nextAnalysisCount(countProfile, now);
  const { error: countError } = await supabase
    .from("profiles")
    .update(nextCount)
    .eq("id", user.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  return NextResponse.json({ insightId: insightRow.id, insight });
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
