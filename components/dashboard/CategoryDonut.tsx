import { categoryLabel } from "../../lib/categories";
import { pct, won } from "../../lib/format";
import type { Category } from "../../types/category";

// Sequential emerald scale: i=0 is the brightest emerald, fading toward neutral gray as the
// rank drops. Values are rounded so the same input always yields a stable color string.
export function emeraldScale(i: number, n: number): string {
  const t = n <= 1 ? 0 : i / (n - 1);
  const light = Math.round((62 - t * 26) * 10) / 10; // 62% → 36%
  const chroma = Math.round((0.16 - t * 0.135) * 1000) / 1000; // saturated → near-gray
  return `oklch(${light}% ${chroma} 165)`;
}

type DonutInput = { id: Category; amount: number };

export type DonutSegment = {
  id: Category;
  color: string;
  length: number; // dash length (arc) in user units
  gap: number; // full circumference, the dash "gap"
  offset: number; // strokeDashoffset, negative to advance clockwise
  radius: number;
};

const STROKE = 14;

// Pure geometry for the donut arcs. Each positive row becomes one arc sized to its share of the
// total, stacked head-to-tail around the circle. Kept separate from rendering so it can be tested.
export function donutSegments(rows: DonutInput[], total: number, size: number): DonutSegment[] {
  if (total <= 0) {
    return [];
  }

  const radius = size / 2 - STROKE;
  const circumference = 2 * Math.PI * radius;
  const positive = rows.filter((row) => row.amount > 0);

  let acc = 0;
  return positive.map((row, i) => {
    const frac = row.amount / total;
    const segment: DonutSegment = {
      id: row.id,
      color: emeraldScale(i, positive.length),
      length: frac * circumference,
      gap: circumference,
      offset: acc === 0 ? 0 : -acc * circumference,
      radius,
    };
    acc += frac;
    return segment;
  });
}

type LegendRow = { id: Category; amount: number; count?: number };

export function CategoryDonut({ rows, total }: { rows: LegendRow[]; total: number }) {
  const size = 168;
  const center = size / 2;
  const segments = donutSegments(rows, total, size);
  const legend = rows.filter((row) => row.amount > 0);

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg className="-rotate-90" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
          <circle cx={center} cy={center} fill="none" r={size / 2 - STROKE} stroke="var(--surface-3)" strokeWidth={STROKE} />
          {segments.map((segment) => (
            <circle
              cx={center}
              cy={center}
              fill="none"
              key={segment.id}
              r={segment.radius}
              stroke={segment.color}
              strokeDasharray={`${segment.length} ${segment.gap}`}
              strokeDashoffset={segment.offset}
              strokeLinecap="butt"
              strokeWidth={STROKE}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <span className="text-xs text-muted">총 지출</span>
          <span className="text-lg font-semibold tabular-nums text-ink">{won(total)}</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-3">
        {legend.map((row, i) => (
          <li className="flex items-center gap-3" key={row.id}>
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: emeraldScale(i, legend.length) }}
            />
            <span className="flex-1 truncate text-sm font-medium text-ink">{categoryLabel(row.id)}</span>
            <span className="w-14 text-right text-xs tabular-nums text-muted">{pct(row.amount, total)}</span>
            <span className="w-24 text-right text-sm tabular-nums text-ink">{won(row.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
