// 채점 결과 집계 + 리포트 포매팅. 순수 함수로 분리해 키 없이(vitest) 검증한다.
import type { EvalCase, Track } from "./parse";

export interface CaseResult {
  id: string;
  track: Track;
  pass: boolean;
  reason: string;
}

export interface TrackTally {
  total: number;
  passed: number;
  failed: number;
}

export interface Summary {
  total: number;
  passed: number;
  failed: number;
  byTrack: Record<Track, TrackTally>;
  failures: CaseResult[];
  exitCode: 0 | 1;
}

/** 하나라도 실패하면 exitCode=1 (회귀 게이트). */
export function aggregate(results: CaseResult[]): Summary {
  const byTrack: Record<Track, TrackTally> = {
    review: { total: 0, passed: 0, failed: 0 },
    qa: { total: 0, passed: 0, failed: 0 },
  };
  let passed = 0;
  const failures: CaseResult[] = [];

  for (const r of results) {
    const t = byTrack[r.track];
    t.total += 1;
    if (r.pass) {
      t.passed += 1;
      passed += 1;
    } else {
      t.failed += 1;
      failures.push(r);
    }
  }

  const failed = results.length - passed;
  return {
    total: results.length,
    passed,
    failed,
    byTrack,
    failures,
    exitCode: failed > 0 ? 1 : 0,
  };
}

export interface ReportMeta {
  subject: string;
  judge: string;
  at?: string;
}

/** 사람이 읽는 마크다운 리포트. run.ts가 콘솔 + reports/last-run.md 로 쓴다. */
export function formatReport(summary: Summary, results: CaseResult[], meta: ReportMeta): string {
  const lines: string[] = [];
  lines.push("# harness eval — last run");
  lines.push("");
  lines.push(`- subject: \`${meta.subject}\` · judge: \`${meta.judge}\``);
  if (meta.at) lines.push(`- at: ${meta.at}`);
  lines.push(
    `- result: **${summary.exitCode === 0 ? "PASS" : "FAIL"}** — ${summary.passed}/${summary.total} passed`,
  );
  for (const track of ["review", "qa"] as const) {
    const t = summary.byTrack[track];
    if (t.total > 0) lines.push(`- ${track}: ${t.passed}/${t.total}`);
  }
  lines.push("");
  lines.push("| case | track | verdict | reason |");
  lines.push("| --- | --- | --- | --- |");
  for (const r of results) {
    const reason = r.reason.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    lines.push(`| ${r.id} | ${r.track} | ${r.pass ? "PASS" : "FAIL"} | ${reason} |`);
  }
  if (summary.failures.length > 0) {
    lines.push("");
    lines.push("## failures");
    for (const f of summary.failures) {
      lines.push(`- **${f.id}** (${f.track}): ${f.reason}`);
    }
  }
  return lines.join("\n") + "\n";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TRACK_LABEL: Record<Track, string> = { review: "코드 리뷰", qa: "규약 응답" };

/** review는 코드 스니펫을 <pre>로, qa는 질문 블록으로 렌더. */
function renderInput(c: EvalCase): string {
  if (c.track === "review") {
    return `<div class="field"><div class="flabel">입력 스니펫</div><pre>${esc(c.input)}</pre></div>`;
  }
  return `<div class="field"><div class="flabel">질문</div><div class="question">${esc(c.input)}</div></div>`;
}

/** 사람이 박제한 golden 라벨을 "채점 기준"으로 렌더. */
function renderCriteria(c: EvalCase): string {
  if (c.track === "review") {
    const line =
      c.expect === "violation"
        ? "룰 위반을 반드시 지적해야 통과"
        : "정상 코드 — 위반으로 잘못 지적하면(오탐) 실패";
    const cls = c.expect === "violation" ? "chk" : "chk no";
    return `<div class="checks"><div class="${cls}">${line}</div></div>`;
  }
  const must = c.must.map((m) => `<div class="chk">반드시: <b>${esc(m)}</b></div>`).join("");
  const mustNot = c.mustNot.map((m) => `<div class="chk no">금지: “${esc(m)}”</div>`).join("");
  return `<div class="checks">${must}${mustNot}</div>`;
}

/** review는 rule/expect, qa는 틀린전제/사실채점 배지. */
function renderBadges(c: EvalCase): string {
  if (c.track === "review") {
    const rule = c.rule ? `<span class="cbadge rule">${esc(c.rule)}</span>` : "";
    const expect =
      c.expect === "violation"
        ? `<span class="cbadge viol">위반이어야 함</span>`
        : `<span class="cbadge okb">정상이어야 함</span>`;
    return rule + expect;
  }
  return c.falsePremise
    ? `<span class="cbadge viol">틀린 전제</span>`
    : `<span class="cbadge okb">사실 채점</span>`;
}

/** 케이스 메타가 있으면 상세 카드, 없으면 최소 카드(테스트 스텁 등). */
function renderCaseCard(r: CaseResult, c: EvalCase | undefined): string {
  const dot = r.pass ? `<div class="dot ok">✓</div>` : `<div class="dot bad">✕</div>`;
  const title = c?.title ? `<span class="cname">${esc(c.title)}</span>` : "";
  const badges = c ? `<div class="cbadges">${renderBadges(c)}</div>` : "";
  const body = c ? `${renderInput(c)}<div class="field"><div class="flabel">채점 기준</div>${renderCriteria(c)}</div>` : "";
  const verdictCls = r.pass ? "verdict-note ok" : "verdict-note bad";
  const verdictLabel = r.pass ? "통과" : "실패";
  return `<div class="case ${r.pass ? "" : "case-bad"}">
    <div class="case-top">
      ${dot}
      <div class="case-title"><span class="cid">${esc(r.id)}</span>${title}</div>
      ${badges}
    </div>
    <div class="case-body">
      ${body}
      <div class="${verdictCls}"><b>${verdictLabel}</b> — ${esc(r.reason)}</div>
    </div>
  </div>`;
}

/** 자립형(single-file) HTML 리포트. run.ts가 reports/last-run.html 로 쓴다. */
export function formatHtmlReport(
  summary: Summary,
  results: CaseResult[],
  meta: ReportMeta,
  cases: EvalCase[] = [],
): string {
  const ok = summary.exitCode === 0;
  const byId = new Map(cases.map((c) => [c.id, c] as const));
  const trackCards = (["review", "qa"] as const)
    .filter((t) => summary.byTrack[t].total > 0)
    .map((t) => {
      const x = summary.byTrack[t];
      const good = x.failed === 0;
      return `<div class="card ${good ? "ok" : "bad"}">
        <div class="card-k">${TRACK_LABEL[t]} <span class="ck-sub">${t}</span></div>
        <div class="card-v">${x.passed}<span>/${x.total}</span></div>
      </div>`;
    })
    .join("");

  const sections = (["review", "qa"] as const)
    .filter((t) => summary.byTrack[t].total > 0)
    .map((t) => {
      const x = summary.byTrack[t];
      const cards = results
        .filter((r) => r.track === t)
        .map((r) => renderCaseCard(r, byId.get(r.id)))
        .join("");
      return `<section class="track">
        <div class="track-head"><h2>${TRACK_LABEL[t]} <span class="th-en">${t}</span></h2>
        <span class="track-count">${x.passed} / ${x.total} 통과</span></div>
        <div class="case-list">${cards}</div>
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>하네스 품질 eval — ${ok ? "통과" : "실패"} (${summary.passed}/${summary.total})</title>
<style>
  :root {
    --bg:#f3f6f4; --panel:#fff; --panel2:#f7faf8; --line:#dde6e0; --fg:#16211c; --muted:#5c6f65; --faint:#859389;
    --ok:#0f9d6b; --ok-soft:#dbf1e6; --bad:#d7443e; --bad-soft:#fbe3e2; --accent:#0f9d6b; --accent-soft:#d6f0e4;
    --code-bg:#f4f7f5; --code-fg:#223029;
    --mono:ui-monospace,"JetBrains Mono","Cascadia Code",Menlo,Consolas,monospace;
    --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0c130f; --panel:#131d17; --panel2:#17241c; --line:#24352b; --fg:#e7f0ea; --muted:#9db3a6; --faint:#6f8578;
      --ok:#34d399; --ok-soft:#123528; --bad:#f87171; --bad-soft:#3a1a1a; --accent:#34d399; --accent-soft:#123528;
      --code-bg:#0e1712; --code-fg:#c9dbcf; }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font-family:var(--sans); line-height:1.55; -webkit-font-smoothing:antialiased; }
  main { max-width:920px; margin:0 auto; padding:40px 24px 72px; }
  .eyebrow { font-family:var(--mono); font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin:0 0 8px; }
  h1 { font-size:26px; margin:0 0 18px; letter-spacing:-.01em; }
  .verdict { display:flex; align-items:center; gap:16px; background:var(--panel); border:1px solid var(--line); border-left:4px solid var(--ok); border-radius:12px; padding:18px 20px; margin-bottom:14px; }
  .verdict.bad { border-left-color:var(--bad); }
  .verdict .big { font-family:var(--mono); font-size:32px; font-weight:700; color:var(--ok); font-variant-numeric:tabular-nums; line-height:1; }
  .verdict.bad .big { color:var(--bad); }
  .verdict .vt { flex:1; }
  .verdict .vt strong { display:block; font-size:15px; }
  .verdict .vt span { color:var(--muted); font-size:13px; }
  .gate { font-family:var(--mono); font-size:12px; padding:5px 11px; border-radius:999px; background:var(--ok-soft); color:var(--ok); font-weight:600; white-space:nowrap; }
  .verdict.bad .gate { background:var(--bad-soft); color:var(--bad); }
  .meta { color:var(--muted); font-size:12.5px; font-family:var(--mono); margin:0 0 26px; display:flex; flex-wrap:wrap; gap:6px 18px; }
  .meta b { color:var(--fg); font-weight:600; }
  .cards { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:36px; }
  .card { flex:1; min-width:130px; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
  .card-k { font-size:12px; color:var(--muted); font-weight:600; }
  .card-k .ck-sub { font-family:var(--mono); font-size:10.5px; color:var(--faint); font-weight:400; }
  .card-v { font-size:26px; font-weight:700; margin-top:6px; font-variant-numeric:tabular-nums; }
  .card-v span { color:var(--muted); font-size:15px; font-weight:500; }
  .card.ok { border-left:3px solid var(--ok); } .card.bad { border-left:3px solid var(--bad); }
  .track + .track { margin-top:40px; }
  .track-head { display:flex; align-items:baseline; gap:12px; margin-bottom:16px; padding-bottom:9px; border-bottom:2px solid var(--line); }
  .track-head h2 { font-size:18px; margin:0; } .th-en { font-family:var(--mono); font-size:12px; color:var(--faint); font-weight:400; }
  .track-count { font-family:var(--mono); font-size:13px; color:var(--muted); font-variant-numeric:tabular-nums; margin-left:auto; }
  .case-list { display:grid; gap:13px; }
  .case { background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .case-bad { border-color:color-mix(in srgb,var(--bad) 45%,var(--line)); }
  .case-top { display:flex; align-items:flex-start; gap:11px; padding:15px 17px 11px; }
  .dot { width:22px; height:22px; border-radius:999px; flex-shrink:0; margin-top:1px; display:grid; place-items:center; font-size:13px; font-weight:700; }
  .dot.ok { background:var(--ok-soft); color:var(--ok); } .dot.bad { background:var(--bad-soft); color:var(--bad); }
  .case-title { flex:1; } .cid { font-family:var(--mono); font-size:11.5px; color:var(--faint); display:block; margin-bottom:2px; }
  .cname { font-size:14.5px; font-weight:600; line-height:1.35; }
  .cbadges { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; flex-shrink:0; }
  .cbadge { font-family:var(--mono); font-size:10.5px; padding:3px 8px; border-radius:6px; font-weight:600; white-space:nowrap; }
  .cbadge.rule { background:var(--line); color:var(--muted); }
  .cbadge.viol { background:var(--bad-soft); color:var(--bad); }
  .cbadge.okb { background:var(--accent-soft); color:var(--accent); }
  .case-body { padding:0 17px 15px; display:grid; gap:11px; }
  .flabel { font-family:var(--mono); font-size:10.5px; letter-spacing:.07em; text-transform:uppercase; color:var(--faint); margin-bottom:5px; }
  pre { margin:0; background:var(--code-bg); border:1px solid var(--line); border-radius:8px; padding:12px 14px; overflow-x:auto; font-family:var(--mono); font-size:12.5px; line-height:1.55; color:var(--code-fg); white-space:pre; }
  .question { background:var(--code-bg); border:1px solid var(--line); border-radius:8px; padding:12px 14px; font-size:13.5px; white-space:pre-line; }
  .checks { font-size:13px; color:var(--muted); }
  .chk { display:flex; gap:8px; align-items:baseline; padding:2px 0; }
  .chk::before { content:"→"; color:var(--accent); font-family:var(--mono); }
  .chk.no::before { content:"✕"; color:var(--bad); }
  .chk b { color:var(--fg); }
  .verdict-note { border-radius:8px; padding:11px 14px; font-size:13px; }
  .verdict-note.ok { background:var(--ok-soft); } .verdict-note.ok b { color:var(--ok); }
  .verdict-note.bad { background:var(--bad-soft); } .verdict-note.bad b { color:var(--bad); }
  footer { margin-top:48px; padding-top:18px; border-top:1px solid var(--line); font-family:var(--mono); font-size:12px; color:var(--faint); line-height:1.7; }
</style>
</head>
<body>
<main>
  <p class="eyebrow">finsight · 하네스 품질 회귀 게이트</p>
  <h1>하네스 품질 eval 리포트</h1>
  <div class="verdict ${ok ? "" : "bad"}">
    <div class="big">${summary.passed}/${summary.total}</div>
    <div class="vt">
      <strong>${ok ? "전체 통과 — 회귀 없음" : "실패 — 회귀 감지"}</strong>
      <span>${ok ? "모든 골든 케이스 판정 통과. 하나라도 실패하면 exit 1로 게이트가 닫힌다." : `실패 ${summary.failed}건. 아래 실패 카드를 확인하라.`}</span>
    </div>
    <div class="gate">${ok ? "exit 0 · GATE OPEN" : "exit 1 · GATE CLOSED"}</div>
  </div>
  <div class="meta">
    <span>subject <b>${esc(meta.subject)}</b></span>
    <span>judge <b>${esc(meta.judge)}</b></span>${meta.at ? `\n    <span>실행 <b>${esc(meta.at)}</b></span>` : ""}
  </div>
  <div class="cards">${trackCards}</div>
  ${sections}
  <footer>
    무결성/균형 검사 npx vitest run eval/harness (키·과금 없음) · 라이브 채점 npm run eval (subject + opus judge)<br>
    정본·설계 eval/harness/README.md · 골든 라벨은 사람이 박제하는 ground truth
  </footer>
</main>
</body>
</html>
`;
}
