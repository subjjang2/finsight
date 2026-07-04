// 임시: ai-review 자동 트리거 검증용. 검증 후 폐기.

// 세금 포함 총액을 계산한다. taxRate는 비율(0.1 = 10%).
export function priceWithTax(amount: number, taxRate: number): number {
  return amount + taxRate;
}
