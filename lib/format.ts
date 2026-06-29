export function asNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function won(value: number | string | null | undefined): string {
  return `₩${Math.round(asNumber(value)).toLocaleString("ko-KR")}`;
}

export function wonShort(value: number | string | null | undefined): string {
  const amount = Math.round(asNumber(value));

  if (Math.abs(amount) >= 10000) {
    return `${(amount / 10000).toLocaleString("ko-KR", {
      maximumFractionDigits: 1,
    })}만`;
  }

  return amount.toLocaleString("ko-KR");
}

export function pct(value: number | string | null | undefined, total: number | string | null | undefined): string {
  const denominator = asNumber(total);

  if (denominator === 0) {
    return "0.0%";
  }

  return `${((asNumber(value) / denominator) * 100).toFixed(1)}%`;
}

export function yyyyMmDd(value: string | Date | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toISOString().slice(0, 10);
}

export function formatMonth(value: string | Date | null | undefined): string {
  const formatted = yyyyMmDd(value);

  return formatted === "-" ? "-" : formatted.slice(0, 7);
}
