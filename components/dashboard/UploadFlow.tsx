"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, SuccessState } from "../ui";
import { track } from "../../lib/analytics/client";
import { ANALYTICS_EVENTS } from "../../lib/analytics/events";
import type { ColumnMapping } from "../../types/mapping";

type UploadResponse = {
  uploadId: string;
  fileName: string;
  rowCount: number;
  headers: string[];
  sampleRows: string[][];
  mapping: ColumnMapping[];
};

type Stage = "select" | "analyzing" | "done";

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

  // Client-supplied `file.type` is unreliable (Korean issuers' .xls often comes
  // through as a generic MIME type), so a supported extension is sufficient.
  // Only reject when neither the extension nor the content type is supported —
  // mirrors the server-side validateUploadFile in lib/csv/upload.ts.
  if (!hasAllowedExtension && !hasAllowedType) {
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
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(nextFile: File) {
    setFile(nextFile);
    setError(null);
    setIsUploading(true);
    track(ANALYTICS_EVENTS.uploadStarted, { sizeBytes: nextFile.size });

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

      const uploadResponse = payload as UploadResponse;
      track(ANALYTICS_EVENTS.uploadCompleted, { rowCount: uploadResponse.rowCount });
      setUpload(uploadResponse);
      // End the upload/mapping phase before the analysis phase so the two
      // loading screens never render at the same time.
      setIsUploading(false);

      // No manual mapping-confirm step: analyze immediately with the AI-inferred
      // mapping. runAnalysis handles its own errors, so it won't reach the catch
      // below (that path is for upload failures only).
      await runAnalysis(uploadResponse);
    } catch (caught) {
      setStage("select");
      const message = caught instanceof Error ? caught.message : "업로드에 실패했습니다.";
      track(ANALYTICS_EVENTS.uploadFailed, { message });
      setError(message);
      setIsUploading(false);
    }
  }

  async function runAnalysis(uploadResponse: UploadResponse) {
    setError(null);
    setStage("analyzing");
    track(ANALYTICS_EVENTS.analysisStarted, { rowCount: uploadResponse.rowCount });

    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadId: uploadResponse.uploadId,
          mapping: uploadResponse.mapping,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        // 402/403 = 한도 초과, 503 = AI 일시 중단, 그 외 = 일반 오류로 실패 사유를 구분한다.
        const reason =
          response.status === 402 || response.status === 403
            ? "limit_exceeded"
            : response.status === 503
              ? "ai_unavailable"
              : "error";
        track(ANALYTICS_EVENTS.analysisFailed, { reason, status: response.status });
        throw new Error(payload.error ?? "분석에 실패했습니다.");
      }

      track(ANALYTICS_EVENTS.analysisCompleted, {
        rowCount: uploadResponse.rowCount,
        skipped: payload?.skipped ?? 0,
      });
      setStage("done");
      router.refresh();
      router.push("/dashboard");
    } catch (caught) {
      // No mapping screen to fall back to — return to file select so the user
      // can try a different file.
      setStage("select");
      setError(caught instanceof Error ? caught.message : "분석에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-ink">명세서 업로드</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            CSV 또는 엑셀을 올리면 바로 분석을 시작합니다.
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

              // Clear the input so re-selecting the SAME file after an error still
              // fires onChange (browsers skip the event when the value is unchanged).
              event.target.value = "";

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
              카드사 원본 CSV 또는 엑셀(.xlsx, .xls)을 그대로 선택하세요. 올리면 자동으로 컬럼을 매핑해 분석을 시작합니다.
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
        <EmptyState title="아직 선택한 파일이 없습니다" message="CSV 또는 엑셀 파일을 선택하면 자동으로 분석이 시작됩니다." />
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
