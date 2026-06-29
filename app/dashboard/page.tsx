import Link from "next/link";
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

type TransactionRow = {
  tx_date: string | null;
  merchant: string | null;
  amount: number | string | null;
  category: string;
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

  const [{ data: upload }, { data: transactions, error: txError }] = await Promise.all([
    supabase
      .from("uploads")
      .select("file_name, row_count")
      .eq("id", latestInsight.upload_id)
      .eq("user_id", user.id)
      .maybeSingle<UploadRow>(),
    supabase
      .from("transactions")
      .select("tx_date, merchant, amount, category")
      .eq("upload_id", latestInsight.upload_id)
      .eq("user_id", user.id)
      .order("tx_date", { ascending: false })
      .limit(8)
      .returns<TransactionRow[]>(),
  ]);

  if (txError) {
    return <ErrorState title="거래 내역을 불러오지 못했습니다" message={txError.message} />;
  }

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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-left font-medium">카테고리</th>
                  <th className="px-6 py-3 text-left font-medium">비율</th>
                  <th className="px-6 py-3 text-right font-medium">건수</th>
                  <th className="px-6 py-3 text-right font-medium">금액</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr className="border-b border-line last:border-b-0" key={row.id}>
                    <td className="px-6 py-4 font-medium text-ink">{categoryLabel(row.id)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-lg bg-surface-3">
                          <div className="h-full rounded-lg bg-accent" style={{ width: pct(row.amount, total) }} />
                        </div>
                        <span className="w-14 text-right text-xs tabular-nums text-muted">{pct(row.amount, total)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted">{row.count}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-ink">{won(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState title="분류된 카테고리가 없습니다" message="분석 결과에 집계 가능한 거래가 없습니다." />
          </div>
        )}
      </Card>

      <Card className="p-0">
        <div className="border-b border-line p-6">
          <h2 className="text-lg font-semibold text-ink">최근 거래</h2>
          <p className="mt-2 text-sm text-muted">최신 분석에 포함된 거래 일부입니다.</p>
        </div>
        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <tbody>
                {transactions.map((tx, index) => (
                  <tr className="border-b border-line last:border-b-0" key={`${tx.tx_date}-${tx.merchant}-${index}`}>
                    <td className="px-6 py-3 tabular-nums text-muted">{yyyyMmDd(tx.tx_date)}</td>
                    <td className="px-6 py-3 text-ink">{tx.merchant ?? "-"}</td>
                    <td className="px-6 py-3 text-muted">{isCategory(tx.category) ? categoryLabel(tx.category) : tx.category}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-ink">{won(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState title="표시할 거래가 없습니다" message="최신 인사이트는 있지만 거래 목록이 비어 있습니다." />
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
