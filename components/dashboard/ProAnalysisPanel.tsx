"use client";

import { useState } from "react";
import { Button, Card } from "../ui";

type Plan = "free" | "pro";

export type ProAnalysisView = "locked" | "idle" | "result";

// 초기 렌더 상태를 결정하는 순수 함수 (테스트 대상).
export function proAnalysisInitialView(plan: Plan, initialAdvice: string | null): ProAnalysisView {
  if (plan !== "pro") {
    return "locked";
  }

  return initialAdvice && initialAdvice.trim() !== "" ? "result" : "idle";
}

export function ProAnalysisPanel({
  plan,
  initialAdvice,
  hasInsight,
}: {
  plan: Plan;
  initialAdvice: string | null;
  hasInsight: boolean;
}) {
  const cached = initialAdvice && initialAdvice.trim() !== "" ? initialAdvice : null;
  const [advice, setAdvice] = useState<string | null>(cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan !== "pro") {
    return <LockedPanel />;
  }

  async function generate(regenerate: boolean) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });

      const data = (await response.json().catch(() => null)) as { advice?: string; error?: string } | null;

      if (!response.ok || !data?.advice) {
        throw new Error(data?.error ?? "분석을 생성하지 못했습니다.");
      }

      setAdvice(data.advice);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "분석을 생성하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex h-full flex-col p-0">
      <div className="border-b border-line p-6">
        <h2 className="text-lg font-semibold text-ink">Pro 심층 분석</h2>
        <p className="mt-2 text-sm text-muted">Sonnet이 지출 패턴을 진단하고 조언을 제안합니다.</p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {loading ? (
          <AnalyzingBar />
        ) : advice ? (
          <div className="flex flex-1 flex-col gap-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{advice}</p>
            <Button className="self-start" onClick={() => generate(true)} variant="text">
              다시 생성
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-6">
            <p className="text-sm leading-relaxed text-muted">
              최신 명세서의 카테고리 지출을 바탕으로 지출 진단과 실천형 조언을 생성합니다.
            </p>
            <div className="space-y-2">
              <Button className="w-full" disabled={!hasInsight} onClick={() => generate(false)} variant="accent">
                분석 생성하기
              </Button>
              {hasInsight ? null : (
                <p className="text-xs text-muted">분석할 명세서가 없습니다. 먼저 CSV를 업로드하세요.</p>
              )}
            </div>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
      </div>
    </Card>
  );
}

function AnalyzingBar() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <p className="text-sm text-muted">분석 중…</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full w-1/3 rounded-full bg-accent"
          style={{ animation: "indeterminate-bar 1.1s ease-in-out infinite" }}
        />
      </div>
      <p className="text-xs text-muted">잠시만 기다려 주세요. 보통 몇 초 정도 걸립니다.</p>
    </div>
  );
}

function LockedPanel() {
  return (
    <Card className="flex h-full flex-col p-0">
      <div className="border-b border-line p-6">
        <div className="flex items-center gap-3">
          <LockIcon />
          <h2 className="text-lg font-semibold text-ink">Pro 분석 잠금</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Free 분석 결과를 먼저 표시합니다. Pro 구독이 활성화되면 Sonnet 심층 분석을 이어서 표시합니다.
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 p-6">
        <UpgradeButton />
        <p className="text-xs text-muted">Polar가 결제와 세금 처리를 담당합니다.</p>
      </div>
    </Card>
  );
}

function UpgradeButton() {
  const [pending, setPending] = useState(false);

  async function upgrade() {
    setPending(true);

    try {
      const response = await fetch("/api/polar/checkout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });

      const data = (await response.json().catch(() => null)) as { url?: string } | null;

      if (response.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // 무시하고 버튼을 다시 활성화한다.
    }

    setPending(false);
  }

  return (
    <Button className="w-full" disabled={pending} onClick={upgrade} variant="accent">
      {pending ? "이동 중…" : "Pro로 업그레이드"}
    </Button>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 text-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
    >
      <rect height="11" rx="2" width="16" x="4" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
