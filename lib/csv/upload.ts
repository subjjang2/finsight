export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
]);

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Pure validation for an uploaded card-statement file.
 *
 * Client-supplied `type` is spoofable, so we treat a CSV extension as
 * sufficient and only reject when both the content type and the extension
 * clearly indicate a non-CSV file.
 */
export function validateUploadFile(input: {
  size: number;
  type: string;
  name: string;
}): UploadValidationResult {
  if (input.size <= 0) {
    return { ok: false, status: 400, message: "빈 파일은 업로드할 수 없습니다." };
  }

  if (input.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 413,
      message: "파일 크기는 5MB를 초과할 수 없습니다.",
    };
  }

  const contentType = input.type.trim().toLowerCase();
  const hasCsvExtension = input.name.trim().toLowerCase().endsWith(".csv");
  const hasAllowedType = contentType !== "" && ALLOWED_CONTENT_TYPES.has(contentType);

  if (!hasAllowedType && !hasCsvExtension) {
    return {
      ok: false,
      status: 415,
      message: "CSV 파일만 업로드할 수 있습니다.",
    };
  }

  return { ok: true };
}
