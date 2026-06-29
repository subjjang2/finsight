import { NextResponse } from "next/server";
import { decodeBuffer } from "../../../lib/csv/decode";
import { parseCsv } from "../../../lib/csv/parse";
import { validateUploadFile } from "../../../lib/csv/upload";
import { createServerClient } from "../../../lib/supabase/server";
import { mapColumns } from "../../../services/claude";

const BUCKET = "card-statements";
const SAMPLE_ROW_COUNT = 5;

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
  }

  const validation = validateUploadFile({
    size: file.size,
    type: file.type,
    name: file.name,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: validation.status });
  }

  let parsed;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    parsed = parseCsv(decodeBuffer(bytes));
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }

  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: "text/csv",
    upsert: false,
  });

  if (uploadError) {
    console.error("[uploads] storage upload failed", uploadError);
    return NextResponse.json({ error: "파일을 저장하지 못했습니다." }, { status: 500 });
  }

  let mapping;

  try {
    mapping = await mapColumns(parsed.headers, parsed.rows.slice(0, SAMPLE_ROW_COUNT));
  } catch {
    return NextResponse.json({ error: "Column mapping is temporarily unavailable." }, { status: 503 });
  }

  const { data: upload, error: insertError } = await supabase
    .from("uploads")
    .insert({
      user_id: user.id,
      file_name: file.name,
      row_count: parsed.rows.length,
      column_mapping: mapping,
      storage_path: storagePath,
    })
    .select("id")
    .single();

  if (insertError || !upload) {
    console.error("[uploads] upload record insert failed", insertError);
    return NextResponse.json({ error: "업로드 정보를 저장하지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    uploadId: upload.id,
    fileName: file.name,
    rowCount: parsed.rows.length,
    headers: parsed.headers,
    sampleRows: parsed.rows.slice(0, SAMPLE_ROW_COUNT),
    mapping,
  });
}

function safeFileName(name: string): string {
  const normalized = name.trim().replace(/[^a-zA-Z0-9._-]/g, "_");

  return normalized || "statement.csv";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Invalid CSV file.";
}
