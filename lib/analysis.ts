import { CATEGORY_IDS } from "./categories";
import { canAnalyze, currentPeriod, type AnalysisCountProfile } from "./entitlements";
import { normalizeAmount, normalizeDate } from "./csv/normalize";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../types/tier";
import type { Category } from "../types/category";
import type { ColumnMapping, MappingField } from "../types/mapping";
import type { Insight, Transaction } from "../types/transaction";
import type { Tier } from "../types/tier";

export type NormalizedTransactionInput = {
  date: string;
  merchant: string;
  amount: number;
};

export type MeteringDecision = {
  allowed: boolean;
  effectiveCount: number;
  limit: number;
};

export function buildInsight(transactions: Transaction[]): Insight {
  if (transactions.length === 0) {
    return {
      total: 0,
      count: 0,
      breakdown: [],
      summary: "분석할 거래가 없습니다.",
    };
  }

  const byCategory = new Map<Category, { amount: number; count: number }>();
  let total = 0;

  for (const transaction of transactions) {
    total += transaction.amount;
    const current = byCategory.get(transaction.category) ?? { amount: 0, count: 0 };
    byCategory.set(transaction.category, {
      amount: current.amount + transaction.amount,
      count: current.count + 1,
    });
  }

  const breakdown = CATEGORY_IDS.flatMap((id) => {
    const current = byCategory.get(id);

    return current ? [{ id, amount: current.amount, count: current.count }] : [];
  });

  return {
    total,
    count: transactions.length,
    breakdown,
    summary: `총 ${transactions.length.toLocaleString("ko-KR")}건, ${total.toLocaleString("ko-KR")}원 지출을 분석했습니다.`,
  };
}

export function getMeteringDecision(tier: Tier, profile: AnalysisCountProfile, now: Date): MeteringDecision {
  const limit = tier === "pro" ? PRO_FAIR_USE_LIMIT : FREE_MONTHLY_LIMIT;
  const effectiveCount = profile.count_period === currentPeriod(now) ? profile.monthly_analysis_count : 0;

  return {
    allowed: canAnalyze(tier, effectiveCount),
    effectiveCount,
    limit,
  };
}

export function normalizeTransactionsFromMapping(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping[],
): NormalizedTransactionInput[] {
  const indexes = requiredMappingIndexes(headers, mapping);

  return rows.map((row) => ({
    date: normalizeDate(row[indexes.date] ?? ""),
    merchant: normalizeMerchant(row[indexes.merchant] ?? ""),
    amount: normalizeAmount(row[indexes.amount] ?? ""),
  }));
}

function requiredMappingIndexes(headers: string[], mapping: ColumnMapping[]): Record<Exclude<MappingField, "ignore">, number> {
  const result: Partial<Record<Exclude<MappingField, "ignore">, number>> = {};

  for (const field of ["date", "merchant", "amount"] as const) {
    const source = mapping.find((item) => item.field === field)?.source;
    const index = source ? headers.indexOf(source) : -1;

    if (index < 0) {
      throw new Error(`Missing required mapping field: ${field}`);
    }

    result[field] = index;
  }

  return result as Record<Exclude<MappingField, "ignore">, number>;
}

function normalizeMerchant(raw: string): string {
  const merchant = raw.trim();

  if (!merchant) {
    throw new Error("Missing merchant.");
  }

  return merchant;
}
