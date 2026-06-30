import type { CheckoutStatus } from "../../lib/billing/checkout-status";

// Presentational banner for the post-checkout return state. No hooks: the polling/refresh
// lifecycle lives in CheckoutSuccessWatcher; this only maps a status → visual (loading /
// success / timeout). `idle` renders nothing so the pricing page is untouched off the flow.
export function CheckoutStatusBanner({
  status,
  onRetry,
}: {
  status: CheckoutStatus;
  onRetry?: () => void;
}) {
  if (status === "idle") {
    return null;
  }

  if (status === "confirming") {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin text-accent"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={1.6}
          viewBox="0 0 24 24"
        >
          <path d="M12 3a9 9 0 1 1-9 9" />
        </svg>
        <div className="text-sm">
          <p className="font-medium text-ink">결제 확인 중…</p>
          <p className="text-muted">구독을 활성화하고 있어요. 잠시만 기다려 주세요.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-accent/40 bg-surface-2 px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-accent"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          viewBox="0 0 24 24"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <div className="text-sm">
          <p className="font-medium text-ink">Pro가 활성화되었어요</p>
          <p className="text-muted">이제 월 200건까지 분석할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // timeout
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3">
      <div className="text-sm">
        <p className="font-medium text-ink">결제는 완료되었어요</p>
        <p className="text-muted">활성화 반영이 조금 지연되고 있습니다. 다시 확인해 주세요.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        다시 확인
      </button>
    </div>
  );
}
