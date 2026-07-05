import { getPublicSiteUrl } from "./auth/validation";

export const SITE_NAME = "finsight";
export const SITE_TAGLINE = "카드 명세서 CSV, 1분 만에 지출 인사이트로";
export const SITE_DESCRIPTION =
  "카드사 CSV를 그대로 올리면 AI가 컬럼을 인식하고 거래를 분류해 이번 달 지출을 카테고리별로 정리합니다. 카드 명세서 정리·지출 카테고리 자동 분류·소비 패턴 분석까지 1분.";

// 쐐기(wedge) 우선 키워드 세트: 저경쟁 롱테일(카드 명세서 정리 등)로 먼저 순위를
// 잡고, 축적된 권위로 상위어(소비 패턴 분석 → 재테크)까지 확장하는 순서를 반영한다.
export const SITE_KEYWORDS = [
  "카드 명세서 정리",
  "카드 내역 엑셀 정리",
  "카드 명세서 CSV",
  "지출 카테고리 자동 분류",
  "이번 달 카드값 분석",
  "소비 패턴 분석",
  "지출 관리",
  "가계부 자동화",
  "지출 분석 앱",
  "재테크",
];

// 메타데이터 base·canonical·sitemap·JSON-LD가 공유하는 단일 URL 소스.
// OAuth 콜백과 동일하게 NEXT_PUBLIC_SITE_URL을 정본으로 쓴다(도메인 교체 시 env 한 줄).
export function siteUrl(): string {
  return getPublicSiteUrl().replace(/\/+$/, "");
}

export function absoluteUrl(path: string = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

// SoftwareApplication JSON-LD — 앱의 성격/가격/언어를 검색엔진에 명시해
// 리치 결과 후보로 노출시킨다. 별점(aggregateRating)은 조작 위험이 있어 넣지 않는다.
export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "ko-KR",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
  };
}
