"use client";

import { useEffect } from "react";
import { captureClientException } from "../lib/analytics/client";

// Route-segment error boundary. Reports the runtime error to PostHog (no-op without a
// key) and offers a retry. Covers any client render/data error under the root layout.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureClientException(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-ink">문제가 발생했습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          예기치 못한 오류로 화면을 표시하지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
          onClick={() => reset()}
          type="button"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
