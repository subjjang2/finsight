import Link from "next/link";
import { Card, EmptyState, ErrorState, Stat } from "../../../components/ui";
import { categoryLabel, isCategory } from "../../../lib/categories";
import { asNumber, formatMonth, pct, won, wonShort, yyyyMmDd } from "../../../lib/format";
import { createServerClient } from "../../../lib/supabase/server";
import type { Category } from "../../../types/category";
import type { CategoryBreakdown } from "../../../types/transaction";

export const dynamic = "force-dynamic";

type InsightRow = {
  id: string;
  upload_id: string;
  total: number | string | null;
  tx_count: number | null;
  breakdown: unknown;
  created_at: string;
};

type UploadRow = {
  id: string;
  file_name: string | null;
};

type MonthlyPoint = {
  id: string;
  month: string;
  total: number;
  count: number;
  fileName: string;
  createdAt: string;
  breakdown: CategoryBreakdown[];
};

export default async function TrendPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ErrorState title="로그인이 필요합니다" message="월별 추이는 로그인 후 확인할 수 있습니다." />;
  }

  const { data: insights, error } = await supabase
    .from("insights")
    .select("id, upload_id, total, tx_count, breakdown, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6)
    .returns<InsightRow[]>();

  if (error) {
    return <ErrorState title="추이를 불러오지 못했습니다" message={error.message} />;
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="space-y-8">
        <Header />
        <EmptyState title="월별 추이 데이터가 없습니다" message="분석을 한 번 이상 완료하면 월별 지출 흐름을 볼 수 있습니다." />
      </div>
    );
  }

  const uploadIds = insights.map((insight) => insight.upload_id);
  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, file_name")
    .in("id", uploadIds)
    .eq("user_id", user.id)
    .returns<UploadRow[]>();

  const fileNameById = new Map((uploads ?? []).map((upload) => [upload.id, upload.file_name ?? "CSV 명세서"]));
  const points = insights
    .map((insight) => ({
      id: insight.id,
      month: formatMonth(insight.created_at),
      total: asNumber(insight.total),
      count: Number(insight.tx_count ?? 0),
      fileName: fileNameById.get(insight.upload_id) ?? "CSV 명세서",
      createdAt: insight.created_at,
      breakdown: parseBreakdown(insight.breakdown),
    }))
    .reverse();
  const current = points[points.length - 1];
  const previous = points[points.length - 2];
  const maxTotal = Math.max(...points.map((point) => point.total), 1);
  const average = points.reduce((sum, point) => sum + point.total, 0) / points.length;
  const delta = previous && previous.total > 0 ? ((current.total - previous.total) / previous.total) * 100 : 0;
  const topCategories = topCategoryTrends(points);

  return (
    <div className="space-y-8">
      <Header />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="최근 월 지출" value={won(current.total)} helper={`${current.month} · ${current.count}건`} />
        <Stat label="최근 6회 평균" value={won(average)} helper={`${points.length}개 분석 기준`} />
        <Stat label="직전 대비" value={`${Math.abs(delta).toFixed(1)}%`} helper={delta >= 0 ? "증가" : "감소"} />
      </div>

      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-ink">월별 총 지출</h2>
          <p className="mt-2 text-sm text-muted">최근 분석 이력을 월 단위로 정렬했습니다.</p>
        </div>
        <div className="flex h-72 items-end gap-3">
          {points.map((point) => (
            <div className="flex h-full flex-1 flex-col justify-end gap-3" key={point.id}>
              <div className="flex flex-1 items-end">
                <div
                  className="w-full rounded-t-lg bg-accent"
                  style={{ height: `${Math.max(4, (point.total / maxTotal) * 100)}%` }}
                  title={`${point.month} ${won(point.total)}`}
                />
              </div>
              <div className="text-center">
                <p className="text-xs tabular-nums text-muted">{point.month.slice(5)}</p>
                <p className="mt-1 text-xs tabular-nums text-ink">{wonShort(point.total)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-ink">상위 카테고리 추이</h2>
          <p className="mt-2 text-sm text-muted">최근 월 기준 지출 비중이 큰 카테고리 3개입니다.</p>
        </div>
        {topCategories.length > 0 ? (
          <div className="space-y-6">
            {topCategories.map((trend) => {
              const max = Math.max(...trend.values, 1);
              const latest = trend.values[trend.values.length - 1] ?? 0;

              return (
                <div key={trend.category}>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-ink">{categoryLabel(trend.category)}</span>
                    <span className="text-sm tabular-nums text-muted">{won(latest)}</span>
                  </div>
                  <div className="grid grid-cols-6 items-end gap-2">
                    {trend.values.map((value, index) => (
                      <div className="space-y-2" key={`${trend.category}-${points[index]?.id}`}>
                        <div className="flex h-16 items-end rounded-lg bg-surface-2">
                          <div
                            className="w-full rounded-lg bg-surface-3"
                            style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                          />
                        </div>
                        <p className="text-center text-xs tabular-nums text-muted-soft">{points[index]?.month.slice(5)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="카테고리 추이가 없습니다" message="집계된 카테고리가 있는 분석 결과가 필요합니다." />
        )}
      </Card>

      <Card className="p-0">
        <div className="border-b border-line p-6">
          <h2 className="text-lg font-semibold text-ink">분석 이력</h2>
          <p className="mt-2 text-sm text-muted">저장된 최근 분석 결과입니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-6 py-3 text-left font-medium">날짜</th>
                <th className="px-6 py-3 text-left font-medium">파일</th>
                <th className="px-6 py-3 text-right font-medium">건수</th>
                <th className="px-6 py-3 text-right font-medium">총 지출</th>
                <th className="px-6 py-3 text-right font-medium">최대 비중</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => {
                const top = [...point.breakdown].sort((a, b) => b.amount - a.amount)[0];

                return (
                  <tr className="border-b border-line last:border-b-0" key={point.id}>
                    <td className="px-6 py-4 tabular-nums text-muted">{yyyyMmDd(point.createdAt)}</td>
                    <td className="px-6 py-4 text-ink">{point.fileName}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted">{point.count}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-ink">{won(point.total)}</td>
                    <td className="px-6 py-4 text-right text-muted">
                      {top ? `${categoryLabel(top.id)} ${pct(top.amount, point.total)}` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-4xl font-semibold text-ink">월별 추이</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          분석 이력을 기준으로 총 지출과 상위 카테고리 변화를 확인합니다.
        </p>
      </div>
      <Link className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200" href="/dashboard/upload">
        CSV 업로드
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
        id: candidate.id,
        amount: asNumber(candidate.amount),
        count: Number(candidate.count ?? 0),
      },
    ];
  });
}

function topCategoryTrends(points: MonthlyPoint[]): Array<{ category: Category; values: number[] }> {
  const latest = points[points.length - 1];

  if (!latest) {
    return [];
  }

  const topCategories = [...latest.breakdown]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((item) => item.id);

  return topCategories.map((category) => ({
    category,
    values: points.map((point) => point.breakdown.find((item) => item.id === category)?.amount ?? 0),
  }));
}
