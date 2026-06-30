"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Select, SuccessState } from "../ui";
import type { ColumnMapping, MappingField } from "../../types/mapping";

type UploadResponse = {
  uploadId: string;
  fileName: string;
  rowCount: number;
  headers: string[];
  sampleRows: string[][];
  mapping: ColumnMapping[];
};

type Stage = "select" | "mapping" | "analyzing" | "done";

const FIELD_OPTIONS: Array<{ value: MappingField; label: string }> = [
  { value: "date", label: "날짜" },
  { value: "merchant", label: "가맹점명" },
  { value: "amount", label: "금액" },
  { value: "ignore", label: "무시" },
];

const REQUIRED_FIELDS: MappingField[] = ["date", "merchant", "amount"];

// Mirrors the server-side 5MB cap so the user gets immediate feedback.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_UPLOAD_TYPES = new Set([
  "",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel", // legacy .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
]);

const ALLOWED_UPLOAD_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export type CsvValidation = { ok: true } | { ok: false; message: string };

export function validateCsvFile(file: File): CsvValidation {
  const name = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasAllowedType = ALLOWED_UPLOAD_TYPES.has(file.type);

  if (!hasAllowedExtension || !hasAllowedType) {
    return { ok: false, message: "CSV 또는 엑셀 파일(.csv, .xlsx, .xls)만 업로드할 수 있습니다." };
  }

  if (file.size === 0) {
    return { ok: false, message: "빈 파일입니다. 거래 내역이 담긴 CSV를 선택하세요." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "파일이 5MB를 초과했습니다. 더 작은 CSV로 시도하세요." };
  }

  return { ok: true };
}

export function UploadFlow({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("select");
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const missingFields = useMemo(
    () => REQUIRED_FIELDS.filter((field) => !mapping.some((item) => item.field === field)),
    [mapping],
  );
  const canAnalyze = missingFields.length === 0 && stage === "mapping";

  async function uploadFile(nextFile: File) {
    setFile(nextFile);
    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", nextFile);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "업로드에 실패했습니다.");
      }

      setUpload(payload as UploadResponse);
      setMapping((payload as UploadResponse).mapping);
      setStage("mapping");
    } catch (caught) {
      setStage("select");
      setError(caught instanceof Error ? caught.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  async function analyze() {
    if (!upload || !canAnalyze) {
      return;
    }

    setError(null);
    setStage("analyzing");

    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadId: upload.uploadId,
          mapping,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "분석에 실패했습니다.");
      }

      setStage("done");
      router.refresh();
      router.push("/dashboard");
    } catch (caught) {
      setStage("mapping");
      setError(caught instanceof Error ? caught.message : "분석에 실패했습니다.");
    }
  }

  function updateField(index: number, field: MappingField) {
    setMapping((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, field } : item)),
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-ink">명세서 업로드</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            CSV 또는 엑셀을 올리면 먼저 컬럼 매핑을 확인한 뒤 분석을 시작합니다.
          </p>
        </div>
        <Badge className="tabular-nums">이번 달 {used}/{limit}건</Badge>
      </div>

      {error ? <ErrorState title="요청 실패" message={error} /> : null}
      {isUploading ? <LoadingState label="CSV를 읽고 컬럼을 매핑하는 중입니다." /> : null}
      {stage === "done" ? <SuccessState title="분석 완료" message="최신 인사이트로 이동합니다." /> : null}

      {stage === "select" && !isUploading ? (
        <Card>
          <input
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];

              if (!nextFile) {
                return;
              }

              const validation = validateCsvFile(nextFile);

              if (!validation.ok) {
                setFile(nextFile);
                setError(validation.message);
                return;
              }

              void uploadFile(nextFile);
            }}
            ref={inputRef}
            type="file"
          />
          <button
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface-2 px-6 text-center transition-colors hover:border-accent"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="mb-5 h-10 w-10 text-accent"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path d="M12 16V4m-5 5 5-5 5 5" />
              <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
            </svg>
            <span className="text-base font-semibold text-ink">CSV·엑셀 파일 선택</span>
            <span className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              카드사 원본 CSV 또는 엑셀(.xlsx, .xls)을 그대로 선택하세요. 업로드 후 분석 전에 날짜, 가맹점, 금액 컬럼을 직접 확인합니다.
            </span>
          </button>
          {file ? (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-2 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{file.name}</p>
                <p className="text-xs tabular-nums text-muted">{file.size.toLocaleString("ko-KR")} bytes</p>
              </div>
              <Button onClick={() => inputRef.current?.click()} variant="text">
                다른 파일
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {stage === "select" && !file && !isUploading ? (
        <EmptyState title="아직 선택한 파일이 없습니다" message="CSV 또는 엑셀 파일을 선택하면 매핑 확인 단계가 표시됩니다." />
      ) : null}

      {stage === "mapping" && upload ? (
        <MappingReview
          canAnalyze={canAnalyze}
          mapping={mapping}
          missingFields={missingFields}
          onAnalyze={() => void analyze()}
          onBack={() => {
            setUpload(null);
            setMapping([]);
            setStage("select");
          }}
          onFieldChange={updateField}
          upload={upload}
        />
      ) : null}

      {stage === "analyzing" ? (
        <Card className="grid min-h-80 place-items-center text-center">
          <div>
            <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-2 border-surface-3 border-t-accent" />
            <p className="text-base font-semibold text-ink">거래를 분류하고 집계하는 중입니다</p>
            <p className="mt-2 text-sm tabular-nums text-muted">
              {upload?.rowCount.toLocaleString("ko-KR") ?? 0}건을 12개 고정 카테고리로 분석합니다.
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function MappingReview({
  upload,
  mapping,
  missingFields,
  canAnalyze,
  onFieldChange,
  onAnalyze,
  onBack,
}: {
  upload: UploadResponse;
  mapping: ColumnMapping[];
  missingFields: MappingField[];
  canAnalyze: boolean;
  onFieldChange: (index: number, field: MappingField) => void;
  onAnalyze: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">AI 컬럼 매핑 확인</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {upload.fileName} · {upload.rowCount.toLocaleString("ko-KR")}행. 필드가 맞지 않으면 직접 수정한 뒤 분석하세요.
            </p>
          </div>
          <Button onClick={onBack} variant="text">
            다시 선택
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.1fr_1.4fr_180px_110px] border-b border-line px-6 py-3 text-xs font-medium text-muted">
              <span>원본 컬럼</span>
              <span>샘플 값</span>
              <span>매핑 필드</span>
              <span className="text-right">신뢰도</span>
            </div>
            {mapping.map((item, index) => (
              <div
                className="grid grid-cols-[1.1fr_1.4fr_180px_110px] items-center border-b border-line px-6 py-3 last:border-b-0"
                key={item.source}
              >
                <span className="text-sm font-medium text-ink">{item.source}</span>
                <span className="truncate pr-4 text-sm tabular-nums text-muted">{item.sample || "-"}</span>
                <Select
                  aria-label={`${item.source} 매핑 필드`}
                  onChange={(event) => onFieldChange(index, event.target.value as MappingField)}
                  value={item.field}
                >
                  {FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <span className="text-right text-sm tabular-nums text-muted">
                  {Math.round(item.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <PreviewTable headers={upload.headers} rows={upload.sampleRows} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {missingFields.length > 0
            ? `필수 필드가 빠졌습니다: ${missingFields.join(", ")}`
            : "필수 필드가 모두 매핑되었습니다."}
        </p>
        <Button disabled={!canAnalyze} onClick={onAnalyze} variant="accent">
          분석 실행
        </Button>
      </div>
    </div>
  );
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <EmptyState title="미리보기 행이 없습니다" message="CSV 헤더는 읽었지만 샘플 거래 행이 없습니다." />;
  }

  return (
    <Card className="p-0">
      <div className="border-b border-line p-6">
        <h2 className="text-lg font-semibold text-ink">원본 샘플</h2>
        <p className="mt-2 text-sm text-muted">업로드된 CSV 앞부분을 그대로 표시합니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              {headers.map((header) => (
                <th className="px-4 py-3 font-medium" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr className="border-b border-line last:border-b-0" key={rowIndex}>
                {headers.map((header, index) => (
                  <td className="max-w-48 truncate px-4 py-3 text-muted" key={`${header}-${index}`}>
                    {row[index] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
