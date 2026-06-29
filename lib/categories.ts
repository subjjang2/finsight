import type { Category } from "../types/category";

export const CATEGORIES: ReadonlyArray<{ id: Category; label: string }> = [
  { id: "dining", label: "식비" },
  { id: "shopping", label: "쇼핑" },
  { id: "grocery", label: "마트·생필품" },
  { id: "cafe", label: "카페·간식" },
  { id: "transport", label: "교통" },
  { id: "utilities", label: "주거·통신" },
  { id: "leisure", label: "문화·여가" },
  { id: "medical", label: "의료·건강" },
  { id: "finance", label: "보험·금융" },
  { id: "education", label: "교육" },
  { id: "travel", label: "여행·숙박" },
  { id: "etc", label: "기타" },
] as const;

export const CATEGORY_IDS: readonly Category[] = Object.freeze(
  CATEGORIES.map((category) => category.id),
);

export function isCategory(x: string): x is Category {
  return CATEGORY_IDS.includes(x as Category);
}

export function categoryLabel(id: Category): string {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}
