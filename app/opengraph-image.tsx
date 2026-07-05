import { ImageResponse } from "next/og";

// 카카오톡·트위터 등 공유 시 노출되는 1200×630 카드.
// 한글 폰트를 번들하지 않으려 텍스트는 라틴 위주로 두고(브랜드+태그라인),
// 값은 emerald 바 차트 모티프로 시각화한다. 브랜드 다크 톤(#0a0b0d) 고정.
export const alt = "finsight — turn card statement CSVs into spending insights in a minute";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#10b981";
const CANVAS = "#0a0b0d";
const INK = "#e8eaed";
const MUTED = "#8b9099";

// 프리뷰 바 차트: 높이(px)만 다른 emerald 막대 5개.
const BARS = [120, 210, 160, 90, 250];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CANVAS,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 44 }}>
            <div style={{ width: 12, height: 20, borderRadius: 3, background: ACCENT }} />
            <div style={{ width: 12, height: 32, borderRadius: 3, background: ACCENT }} />
            <div style={{ width: 12, height: 44, borderRadius: 3, background: ACCENT }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: INK }}>finsight</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.15,
            }}
          >
            <div style={{ display: "flex" }}>Card statements, sorted</div>
            <div style={{ display: "flex" }}>
              into&nbsp;
              <span style={{ color: ACCENT }}>spending insights.</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: MUTED }}>
            Drop a CSV. AI maps the columns and categorizes every transaction — in a minute.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 260 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: h,
                borderRadius: 12,
                background: i === BARS.length - 1 ? ACCENT : "#1c2024",
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
