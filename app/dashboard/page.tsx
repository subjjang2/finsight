import Link from "next/link";
import { CategoryDonut } from "../../components/dashboard/CategoryDonut";
import { Card, EmptyState, ErrorState, Stat } from "../../components/ui";
import { categoryLabel, isCategory } from "../../lib/categories";
import { asNumber, pct, won, yyyyMmDd } from "../../lib/format";
import { createServerClient } from "../../lib/supabase/server";
import type { Category } from "../../types/category";
import type { CategoryBreakdown } from "../../types/transaction";

export const dynamic = "force-dynamic";

type InsightRow = {
  id: string;
  upload_id: string;
  total: number | string | null;
  tx_count: number | null;
  breakdown: unknown;
  summary: string | null;
  created_at: string;
};

type UploadRow = {
  file_name: string | null;
  row_count: number | null;
};

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ErrorState title="로그인이 필요합니다" message="대시보드는 로그인 후 확인할 수 있습니다." />;
  }

  const { data: latestInsight, error: insightError } = await supabase
    .from("insights")
    .select("id, upload_id, total, tx_count, breakdown, summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<InsightRow>();

  if (insightError) {
    return <ErrorState title="인사이트를 불러오지 못했습니다" message={insightError.message} />;
  }

  if (!latestInsight) {
    return (
      <div className="space-y-8">
        <Header
          actionLabel="CSV 업로드"
          actionHref="/dashboard/upload"
          subtitle="분석 이력이 생기면 최신 지출 요약이 여기에 표시됩니다."
          title="인사이트"
        />
        <EmptyState title="분석 이력이 없습니다" message="CSV 명세서를 업로드하고 매핑을 확인하면 첫 인사이트가 생성됩니다." />
      </div>
    );
  }

  const { data: upload } = await supabase
    .from("uploads")
    .select("file_name, row_count")
    .eq("id", latestInsight.upload_id)
    .eq("user_id", user.id)
    .maybeSingle<UploadRow>();

  const total = asNumber(latestInsight.total);
  const breakdown = parseBreakdown(latestInsight.breakdown).sort((a, b) => b.amount - a.amount);
  const topCategory = breakdown[0];

  return (
    <div className="space-y-8">
      <Header
        actionLabel="새 명세서 분석"
        actionHref="/dashboard/upload"
        subtitle={`${upload?.file_name ?? "최근 업로드"} · ${yyyyMmDd(latestInsight.created_at)}`}
        title="인사이트"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="총 지출" value={won(total)} helper={`${latestInsight.tx_count ?? 0}건 분석`} />
        <Stat label="최대 카테고리" value={topCategory ? categoryLabel(topCategory.id) : "-"} helper={topCategory ? pct(topCategory.amount, total) : "0.0%"} />
        <Stat label="업로드 행" value={`${(upload?.row_count ?? latestInsight.tx_count ?? 0).toLocaleString("ko-KR")}행`} helper="확인된 최신 CSV" />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">서술형 요약</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">최근 지출 요약</h2>
          </div>
          <span className="text-xs tabular-nums text-muted">{yyyyMmDd(latestInsight.created_at)}</span>
        </div>
        <p className="text-sm leading-relaxed text-ink">
          {latestInsight.summary ?? "요약 정보가 없습니다."}
        </p>
      </Card>

      <Card className="p-0">
        <div className="border-b border-line p-6">
          <h2 className="text-lg font-semibold text-ink">카테고리별 지출</h2>
          <p className="mt-2 text-sm text-muted">고정 12개 카테고리 기준 합계와 비율입니다.</p>
        </div>
        {breakdown.length > 0 ? (
          <div className="p-6">
            <CategoryDonut rows={breakdown} total={total} />
          </div>
        ) : (
          <div className="p-6">
            <EmptyState title="분류된 카테고리가 없습니다" message="분석 결과에 집계 가능한 거래가 없습니다." />
          </div>
        )}
      </Card>
    </div>
  );
}

function Header({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-4xl font-semibold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>
      </div>
      <Link className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200" href={actionHref}>
        {actionLabel}
      </Link>
    </div>
  );
}

function parseBreakdown(value: unknown): CategoryBreakdown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): CategoryBreakdown[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as Partial<{ id: string; amount: number | string; count: number }>;

    if (!candidate.id || !isCategory(candidate.id)) {
      return [];
    }

    return [
      {
        id: candidate.id as Category,
        amount: asNumber(candidate.amount),
        count: Number(candidate.count ?? 0),
      },
    ];
  });
}
