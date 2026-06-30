import { NextResponse } from "next/server";
import { categoryLabel, isCategory } from "../../../lib/categories";
import { createServerClient } from "../../../lib/supabase/server";
import { generateSpendingAdvice } from "../../../services/claude";
import type { Category } from "../../../types/category";

const GENERIC_SERVER_ERROR = "Something went wrong. Please try again.";
// 재생성 쿨다운: 스크립트로 POST를 반복해 유료 Claude 호출을 어뷰징하는 것을 막는다.
// advice는 명세서당 캐시되므로 정상 사용에는 영향이 없고, 빠른 연속 재생성만 막는다.
const REGENERATE_COOLDOWN_MS = 30_000;

type AdviceRequestBody = {
  regenerate?: unknown;
};

type InsightRow = {
  id: string;
  total: number | string | null;
  tx_count: number | null;
  breakdown: unknown;
  summary: string | null;
  advice: string | null;
  advice_generated_at: string | null;
};

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pro 전용 기능: tier를 먼저 검증해 Free 사용자에게는 Claude를 호출하지 않는다.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("profiles lookup failed", profileError?.message);

    return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
  }

  if (profile.tier !== "pro") {
    return NextResponse.json({ error: "Pro 구독이 필요합니다." }, { status: 403 });
  }

  // 본문은 선택적. 비어 있거나 깨졌으면 regenerate=false로 취급한다.
  let body: AdviceRequestBody = {};

  try {
    body = (await request.json()) as AdviceRequestBody;
  } catch {
    body = {};
  }

  const regenerate = body.regenerate === true;

  const { data: insight, error: insightError } = await supabase
    .from("insights")
    .select("id, total, tx_count, breakdown, summary, advice, advice_generated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<InsightRow>();

  if (insightError) {
    console.error("insights lookup failed", insightError.message);

    return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
  }

  if (!insight) {
    return NextResponse.json({ error: "분석할 명세서가 없습니다." }, { status: 404 });
  }

  // 캐시 히트: 명세서당 1회만 Claude를 호출하도록 저장된 결과를 그대로 반환한다.
  if (!regenerate && typeof insight.advice === "string" && insight.advice.trim() !== "") {
    return NextResponse.json({ advice: insight.advice, cached: true });
  }

  // 쿨다운: 마지막 생성 이후 너무 빨리 재호출하면 막는다(유료 호출 어뷰징 방지).
  if (insight.advice_generated_at) {
    const elapsed = Date.now() - new Date(insight.advice_generated_at).getTime();

    if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < REGENERATE_COOLDOWN_MS) {
      const retryAfter = Math.ceil((REGENERATE_COOLDOWN_MS - elapsed) / 1000);

      return NextResponse.json(
        { error: `분석은 ${Math.ceil(REGENERATE_COOLDOWN_MS / 1000)}초에 한 번만 생성할 수 있습니다. 잠시 후 다시 시도해 주세요.` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
  }

  let advice: string;

  try {
    advice = await generateSpendingAdvice({
      total: Number(insight.total ?? 0),
      count: insight.tx_count ?? 0,
      breakdown: parseBreakdown(insight.breakdown),
      summary: insight.summary,
    });
  } catch (error) {
    console.error("generateSpendingAdvice failed", error);

    return NextResponse.json(
      { error: "분석을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  const { error: updateError } = await supabase
    .from("insights")
    .update({ advice, advice_generated_at: new Date().toISOString() })
    .eq("id", insight.id)
    .eq("user_id", user.id);

  if (updateError) {
    // 캐시 저장 실패는 치명적이지 않다 — 생성한 조언은 그대로 반환한다.
    console.error("insights advice update failed", updateError.message);
  }

  return NextResponse.json({ advice, cached: false });
}

// insights.breakdown(JSON)을 Claude 프롬프트용 한국어 라벨 형태로 정규화한다.
function parseBreakdown(value: unknown): { category: string; amount: number; count: number }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): { category: string; amount: number; count: number }[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as Partial<{ id: string; amount: number | string; count: number }>;

    if (!candidate.id || !isCategory(candidate.id)) {
      return [];
    }

    return [
      {
        category: categoryLabel(candidate.id as Category),
        amount: Number(candidate.amount ?? 0),
        count: Number(candidate.count ?? 0),
      },
    ];
  });
}
