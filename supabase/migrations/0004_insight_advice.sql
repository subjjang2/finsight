-- Pro 분석(Sonnet 지출 조언) 결과를 명세서(insight)당 1회 캐시한다.
-- 같은 명세서를 다시 볼 때 Claude를 재호출하지 않기 위함. nullable.
-- RLS는 기존 insights 소유자 정책(insights_select_own/insights_update_own)이 그대로 적용되므로
-- 별도 정책이 필요 없다.
alter table public.insights add column if not exists advice text;

comment on column public.insights.advice is
  'Pro 전용 Sonnet 지출 조언 캐시. /api/advice가 생성·갱신한다. null이면 아직 생성 전.';

-- 마지막 advice 생성 시각. /api/advice가 '다시 생성'(regenerate) 쿨다운 판정에 쓴다.
-- 스크립트로 재호출을 반복해 유료 Claude 비용을 어뷰징하는 것을 막기 위함.
alter table public.insights add column if not exists advice_generated_at timestamptz;

comment on column public.insights.advice_generated_at is
  'advice를 마지막으로 생성한 시각. 재생성 쿨다운(현재 30초) 판정용.';
