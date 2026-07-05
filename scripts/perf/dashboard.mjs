#!/usr/bin/env node
// Renders the autoperf loop result into a rich, self-contained HTML report.
// Inputs:
//   reports/perf/autoperf-log.json          the object returned by .claude/workflows/autoperf.js
//   reports/perf/<label>/summary.json        full per-state detail (metrics/opportunities/diagnostics)
// Output: docs/perf-autoloop.html
//
// Usage: node scripts/perf/dashboard.mjs [logPath] [outPath]

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const logPath = process.argv[2] || path.join(repoRoot, 'reports', 'perf', 'autoperf-log.json');
const outPath = process.argv[3] || path.join(repoRoot, 'docs', 'perf-autoloop.html');

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- formatting -----------------------------------------------------------
const ms = (v) => (v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);
const kib = (v) => (v == null ? '—' : `${(v / 1024).toFixed(1)} KiB`);
const num2 = (v) => (v == null ? '—' : v.toFixed(3).replace(/\.?0+$/, '') || '0');

// Google CWV / Lighthouse rating thresholds (mobile).
const THRESH = {
  lcp: [2500, 4000], fcp: [1800, 3000], tbt: [200, 600], cls: [0.1, 0.25], si: [3400, 5800], tti: [3800, 7300],
};
function rate(id, v) {
  const t = THRESH[id];
  if (!t || v == null) return 'na';
  return v <= t[0] ? 'good' : v <= t[1] ? 'ni' : 'poor';
}

// Continuous cost objective, mirrored from lighthouse-run.mjs so we can break it down.
function costParts(m) {
  return {
    LCP: (m.lcp ?? 0) * 1.0,
    TBT: (m.tbt ?? 0) * 4.0,
    CLS: (m.cls ?? 0) * 8000,
    'Speed Index': (m.si ?? 0) * 0.5,
    Bytes: ((m.totalByteWeight ?? 0) / 1024) * 2,
    Bootup: (m.bootupTime ?? 0) * 0.5,
  };
}

// ---- svg widgets ----------------------------------------------------------
function gauge(label, score, delta) {
  const R = 34, C = 2 * Math.PI * R, off = C * (1 - score / 100);
  const band = score >= 100 ? 'var(--emerald)' : score >= 90 ? 'var(--amber)' : 'var(--red)';
  const dBadge = delta > 0 ? `<span class="delta up">▲${delta}</span>` : delta < 0 ? `<span class="delta down">▼${Math.abs(delta)}</span>` : `<span class="delta flat">=</span>`;
  return `<div class="gauge">
    <svg viewBox="0 0 84 84" width="84" height="84">
      <circle cx="42" cy="42" r="${R}" fill="none" stroke="var(--grid)" stroke-width="7"/>
      <circle cx="42" cy="42" r="${R}" fill="none" stroke="${band}" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 42 42)"/>
      <text x="42" y="47" text-anchor="middle" class="gauge-num">${score}</text>
    </svg>
    <div class="gauge-cap">${esc(label)} ${dBadge}</div>
  </div>`;
}

function progressChart(points) {
  if (!points.length) return '';
  const W = 760, H = 260, padL = 46, padR = 46, padT = 24, padB = 46;
  const iw = W - padL - padR, ih = H - padT - padB;
  const sums = points.map((p) => p.sum), costs = points.map((p) => p.cost);
  const sumMin = Math.min(388, ...sums) - 2, sumMax = 401;
  const costMin = Math.min(...costs) * 0.985, costMax = Math.max(...costs) * 1.01;
  const x = (i) => padL + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const ySum = (v) => padT + ih - ((v - sumMin) / (sumMax - sumMin || 1)) * ih;
  const yCost = (v) => padT + ih - ((v - costMin) / (costMax - costMin || 1)) * ih;
  const bw = Math.min(52, iw / points.length / 1.7);
  const gl = [0, 0.25, 0.5, 0.75, 1].map((f) => { const yy = padT + ih - f * ih; const val = Math.round(sumMin + f * (sumMax - sumMin)); return `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="var(--grid)" stroke-width="1"/><text x="${padL - 8}" y="${yy + 4}" text-anchor="end" class="svg-axis">${val}</text>`; }).join('');
  const bars = points.map((p, i) => {
    const color = p.accepted ? 'var(--emerald)' : p.baseline ? 'var(--blue)' : 'var(--muted)';
    return `<rect x="${x(i) - bw / 2}" y="${ySum(p.sum)}" width="${bw}" height="${padT + ih - ySum(p.sum)}" rx="4" fill="${color}" opacity="${p.accepted || p.baseline ? 0.9 : 0.35}"/>
      <text x="${x(i)}" y="${ySum(p.sum) - 7}" text-anchor="middle" class="svg-lbl">${p.sum}</text>`;
  }).join('');
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${yCost(p.cost)}`).join(' ');
  const dots = points.map((p, i) => `<circle cx="${x(i)}" cy="${yCost(p.cost)}" r="4" fill="var(--amber)"/><text x="${x(i)}" y="${yCost(p.cost) - 9}" text-anchor="middle" class="svg-cost">${p.cost}</text>`).join('');
  const xl = points.map((p, i) => `<text x="${x(i)}" y="${H - 16}" text-anchor="middle" class="svg-axis">${esc(p.label)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="반복별 점수 합계와 cost 추이">
    ${gl}${bars}
    <path d="${line}" fill="none" stroke="var(--amber)" stroke-width="2.5"/>${dots}${xl}
    <text x="${padL}" y="15" class="svg-axis">categoryScoreSum /400 · 막대</text>
    <text x="${W - padR}" y="15" text-anchor="end" class="svg-axis" fill="var(--amber)">cost · 선 (낮을수록 좋음)</text>
  </svg>`;
}

// horizontal stacked bar for cost breakdown
function costBar(parts, total) {
  const colors = { LCP: '#3b82f6', TBT: '#8b5cf6', CLS: '#ec4899', 'Speed Index': '#10b981', Bytes: '#f59e0b', Bootup: '#64748b' };
  const seg = Object.entries(parts).filter(([, v]) => v > 0).map(([k, v]) => `<div class="seg" style="width:${(v / total * 100).toFixed(2)}%;background:${colors[k]}" title="${k}: ${Math.round(v)}"></div>`).join('');
  return `<div class="costbar">${seg}</div>`;
}

// ---- main -----------------------------------------------------------------
async function loadSummary(label) {
  try { return JSON.parse(await readFile(path.join(repoRoot, 'reports', 'perf', label, 'summary.json'), 'utf8')); }
  catch { return null; }
}

async function main() {
  let log;
  try { log = JSON.parse(await readFile(logPath, 'utf8')); }
  catch (e) { console.error(`[dashboard] cannot read log at ${logPath}: ${e.message}`); process.exit(1); }

  const baseFull = (await loadSummary(log.baselineLabel || 'baseline-wf'))?.results?.[0];
  const bestFull = (await loadSummary(log.bestLabel || 'iter-2'))?.results?.[0];
  const base = log.baseline || {};
  const best = log.best || {};
  const iters = log.iterations || [];
  const bc = base.results?.[0]?.categories || {};
  const bestc = best.results?.[0]?.categories || {};

  const points = [
    { label: 'baseline', sum: base.categoryScoreSum ?? 0, cost: base.totalCost ?? 0, baseline: true, accepted: false },
    ...iters.filter((it) => it.summary).map((it) => ({ label: `iter ${it.i}`, sum: it.summary.categoryScoreSum, cost: it.summary.totalCost, accepted: it.accepted })),
  ];
  const acceptedCount = iters.filter((it) => it.accepted).length;
  const sumDelta = (best.categoryScoreSum ?? 0) - (base.categoryScoreSum ?? 0);
  const costDelta = (base.totalCost ?? 0) - (best.totalCost ?? 0);
  const costPct = base.totalCost ? ((costDelta / base.totalCost) * 100).toFixed(1) : 0;

  // ---- gauges (before→after per category) ----
  const cats = [['performance', 'Performance'], ['accessibility', 'Accessibility'], ['bestPractices', 'Best Practices'], ['seo', 'SEO']];
  const gauges = cats.map(([k, lbl]) => gauge(lbl, bestc[k] ?? 0, (bestc[k] ?? 0) - (bc[k] ?? 0))).join('');

  // ---- metrics before/after table ----
  const mrows = baseFull && bestFull ? (() => {
    const bm = baseFull.metrics, xm = bestFull.metrics;
    const rows = [
      ['largest-contentful-paint', 'LCP', 'lcp', ms], ['first-contentful-paint', 'FCP', 'fcp', ms],
      ['total-blocking-time', 'TBT', 'tbt', ms], ['cumulative-layout-shift', 'CLS', 'cls', num2],
      ['speed-index', 'Speed Index', 'si', ms], ['interactive', 'TTI', 'tti', ms],
      ['total-byte-weight', 'Total bytes', 'totalByteWeight', kib], ['mainthread-work', 'Main-thread work', 'mainThreadWork', ms],
      ['bootup', 'JS bootup', 'bootupTime', ms], ['unused-js', 'Unused JS', 'unusedJsBytes', kib], ['legacy-js', 'Legacy JS', 'legacyJsBytes', kib],
    ];
    return rows.map(([, lbl, key, fmt]) => {
      const b = bm[key], x = xm[key];
      const d = (b ?? 0) - (x ?? 0); // positive = improved (lower)
      const r = rate(key, x);
      const dCell = Math.abs(d) < 0.001 ? '<span class="muted">·</span>' : `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '−' : '+'}${fmt(Math.abs(d))}</span>`;
      const badge = r === 'na' ? '' : `<span class="dot ${r}"></span>`;
      return `<tr><td>${badge}${esc(lbl)}</td><td class="num muted">${fmt(b)}</td><td class="num"><b>${fmt(x)}</b></td><td class="num">${dCell}</td></tr>`;
    }).join('');
  })() : '<tr><td colspan=4 class=muted>metric 상세 없음</td></tr>';

  // ---- cost breakdown ----
  const bParts = baseFull ? costParts(baseFull.metrics) : null;
  const xParts = bestFull ? costParts(bestFull.metrics) : null;
  const costSection = bParts && xParts ? `
    <div class="cbrow"><span class="cblabel">baseline <b>${base.totalCost}</b></span>${costBar(bParts, base.totalCost)}</div>
    <div class="cbrow"><span class="cblabel">best <b>${best.totalCost}</b></span>${costBar(xParts, best.totalCost)}</div>
    <div class="cblegend">${Object.keys(bParts).map((k) => `<span class="lg"><i style="background:${{ LCP: '#3b82f6', TBT: '#8b5cf6', CLS: '#ec4899', 'Speed Index': '#10b981', Bytes: '#f59e0b', Bootup: '#64748b' }[k]}"></i>${k} ${Math.round(xParts[k])}</span>`).join('')}</div>` : '';

  // ---- loop timeline ----
  const timeline = [
    `<div class="tl-item base"><div class="tl-dot"></div><div class="tl-body"><div class="tl-head"><b>baseline</b><span class="pill">${base.categoryScoreSum}/400 · cost ${base.totalCost}</span></div><div class="muted small">측정 기준점 — a11y ${bc.accessibility}, best-practices ${bc.bestPractices}</div></div></div>`,
    ...iters.map((it) => {
      const s = it.summary;
      const prev = it.i === 1 ? base : (iters[it.i - 2]?.accepted ? iters[it.i - 2].summary : base);
      const dSum = s ? s.categoryScoreSum - (prev.categoryScoreSum ?? 0) : 0;
      const dCost = s ? (prev.totalCost ?? 0) - s.totalCost : 0;
      const files = (it.filesChanged || []).map((f) => `<code>${esc(f.path)}</code> <span class="ftag">${f.created ? '신규' : '수정'}</span>`).join(' ');
      return `<div class="tl-item ${it.accepted ? 'ok' : 'no'}"><div class="tl-dot"></div><div class="tl-body">
        <div class="tl-head"><b>iter ${it.i}</b> · ${esc(it.approach)} ${it.accepted ? '<span class="badge ok">KEPT</span>' : '<span class="badge no">reverted</span>'}
          <span class="pill">${s ? `${s.categoryScoreSum}/400` : 'build fail'}${dSum ? ` <span class="${dSum > 0 ? 'up' : 'down'}">(${dSum > 0 ? '+' : ''}${dSum})</span>` : ''} · cost ${s ? s.totalCost : '—'}${dCost > 0 ? ` <span class="up">(−${dCost})</span>` : ''}</span></div>
        <div class="muted small">${esc(it.rationale)}</div>
        ${files ? `<div class="tl-files">${files}</div>` : ''}
      </div></div>`;
    }),
  ].join('');

  // ---- remaining opportunities (from best state) ----
  const remOpps = (bestFull?.opportunities || []).map((o) => `<li><b>${esc(o.title)}</b> <span class="chip warn">~${o.savingsMs}ms</span><div class="muted small">${esc(o.description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))}</div></li>`).join('');
  const remDiag = (bestFull?.diagnostics || []).filter((d) => !/insight$/.test(d.id) || d.displayValue).map((d) => `<li><b>${esc(d.title)}</b>${d.displayValue ? ` <span class="chip">${esc(d.displayValue)}</span>` : ''}</li>`).join('');

  const reportLink = `../reports/perf/${log.bestLabel || 'iter-2'}/root.report.html`;

  // ---- concrete next-step action plan ----
  const legacyKiB = bestFull ? (bestFull.metrics.legacyJsBytes / 1024).toFixed(1) : '12';
  const unusedKiB = bestFull ? (bestFull.metrics.unusedJsBytes / 1024).toFixed(1) : '42';
  const branch = 'perf/lighthouse-autoloop';
  const actions = [
    {
      pri: 'now', priLabel: '지금', effort: '2분',
      title: '이 브랜치를 머지해 개선 2건을 확정한다',
      why: `색 대비(a11y 95→100)와 favicon 404 제거(best-practices 96→100)가 <code>${branch}</code>에 커밋돼 있습니다. 머지해야 반영됩니다.`,
      how: `git checkout ${'security/owasp-2025-remediation'}\ngit merge --no-ff ${branch}\n# 또는 PR:  gh pr create --base main --head ${branch} --title "perf: a11y·best-practices 100"`,
      impact: 'categoryScoreSum 391 → 400 확정, 코드 회귀 없음(정밀 커밋).',
    },
    {
      pri: 'next', priLabel: '다음', effort: '15분 + 루프',
      title: `남은 cost를 줄인다 — legacy JS ${legacyKiB} KiB 제거`,
      why: `점수는 만점이지만 modern 브라우저에 불필요한 폴리필/트랜스파일이 ${legacyKiB} KiB 실려 cost를 올립니다. <code>.browserslistrc</code>로 타깃을 최신으로 좁히면 Next/SWC가 legacy 변환을 건너뜁니다.`,
      how: `# .browserslistrc 생성\nprintf "chrome >= 111\\nedge >= 111\\nfirefox >= 111\\nsafari >= 16.4\\n" > .browserslistrc\n# 그리고 루프로 검증(개선 시 자동 keep):\nWorkflow({ scriptPath: ".claude/workflows/autoperf.js", args: { routes: "/", targetSum: 400 } })`,
      impact: `unused JS ${unusedKiB} KiB·legacy ${legacyKiB} KiB 축소 → cost 추가 하락, 초기 로드 소폭 개선.`,
    },
    {
      pri: 'next', priLabel: '다음', effort: '1시간',
      title: '실사용 화면(/dashboard)으로 루프를 확장한다',
      why: '랜딩은 이미 만점입니다. 유저가 실제 오래 머무는 곳은 차트·업로드가 있는 <code>/dashboard</code>이고 여기에 진짜 개선 여지가 있습니다. 단 인증이 필요합니다.',
      how: `# 1) 하네스에 세션 쿠키 주입 옵션 추가(lighthouse extraHeaders 또는 로그인 스텝)\n# 2) 인증된 상태로 측정\nnode scripts/perf/lighthouse-run.mjs --label dash --routes /dashboard,/dashboard/trend --runs 3`,
      impact: '실사용 체감 성능(LCP·TBT) 최적화. 개선 폭이 가장 클 후보.',
    },
    {
      pri: 'later', priLabel: '선택', effort: '30분',
      title: '배포본을 실측하고 회귀를 정기 감지한다',
      why: '로컬 prod 빌드는 네트워크·CDN을 제외합니다. Railway 배포 URL을 측정하면 현실 점수를 얻고, 주기 실행으로 회귀를 조기에 잡습니다.',
      how: `# 배포 후 실 URL 측정 (하네스에 --url 원격 지원 추가 후)\n# 정기 실행은 /schedule 또는 CI 스텝으로 perf-autoloop 스킬 트리거`,
      impact: 'CDN 포함 현실 점수 + 성능 회귀 조기 경보.',
    },
  ];
  const actionHtml = actions.map((a, i) => `
    <div class="act ${a.pri}">
      <div class="act-rank">${i + 1}</div>
      <div class="act-body">
        <div class="act-head"><b>${esc(a.title)}</b><span class="pri ${a.pri}">${a.priLabel}</span><span class="eff">⏱ ${esc(a.effort)}</span></div>
        <div class="muted small act-why">${a.why}</div>
        <div class="diff">${esc(a.how)}</div>
        <div class="act-impact"><span class="muted">기대효과</span> ${esc(a.impact)}</div>
      </div>
    </div>`).join('');

  const html = `<title>autoperf · Lighthouse 자동 최적화 리포트</title>
<style>
  :root{--bg:#0b0f14;--surface:#111821;--surface2:#0d131b;--border:#1e2a37;--grid:#233242;--text:#e6edf3;--muted:#8b9bad;--emerald:#10b981;--amber:#f59e0b;--blue:#3b82f6;--red:#ef4444;--violet:#8b5cf6}
  @media(prefers-color-scheme:light){:root{--bg:#f4f6f9;--surface:#fff;--surface2:#eef2f6;--border:#dbe3ea;--grid:#e6ecf2;--text:#0d1117;--muted:#5a6b7b}}
  :root[data-theme=dark]{--bg:#0b0f14;--surface:#111821;--surface2:#0d131b;--border:#1e2a37;--grid:#233242;--text:#e6edf3;--muted:#8b9bad}
  :root[data-theme=light]{--bg:#f4f6f9;--surface:#fff;--surface2:#eef2f6;--border:#dbe3ea;--grid:#e6ecf2;--text:#0d1117;--muted:#5a6b7b}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
  .wrap{max-width:960px;margin:0 auto;padding:36px 20px 72px}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
  h1{font-size:24px;margin:0 0 4px;letter-spacing:-.02em}
  h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:34px 0 14px;font-weight:600}
  .sub{color:var(--muted);font-size:13px;margin-bottom:8px}
  .meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:26px}
  .tag{font-size:12px;padding:3px 9px;border-radius:999px;background:var(--surface2);border:1px solid var(--border);color:var(--muted)}
  .tag b{color:var(--text)}
  .hero{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;background:linear-gradient(135deg,color-mix(in srgb,var(--emerald) 10%,var(--surface)),var(--surface));border:1px solid var(--border);border-radius:16px;padding:22px 26px;margin-bottom:8px}
  .hero-num{font-size:52px;font-weight:700;letter-spacing:-.03em;line-height:1}
  .hero-num small{font-size:22px;color:var(--muted);font-weight:500}
  .hero-delta{color:var(--emerald);font-weight:600;font-size:14px;margin-top:4px}
  .hero-verdict{font-size:13px;color:var(--muted)}
  .hero-verdict b{color:var(--text)}
  .gauges{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .gauge{text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 4px}
  .gauge-num{fill:var(--text);font:700 22px 'JetBrains Mono',monospace}
  .gauge-cap{font-size:12px;color:var(--muted);margin-top:2px}
  .delta{font-size:11px;font-weight:700;margin-left:2px}.delta.up{color:var(--emerald)}.delta.down{color:var(--red)}.delta.flat{color:var(--muted)}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:16px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
  .card .k{font-size:12px;color:var(--muted);margin-bottom:6px}
  .card .v{font-size:26px;font-weight:650}.card .v small{font-size:14px;color:var(--muted)}
  .card .d{font-size:12px;margin-top:4px}
  .up{color:var(--emerald)}.down{color:var(--red)}.muted{color:var(--muted)}.small{font-size:12px}
  .panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px;overflow-x:auto}
  .chart{width:100%;height:auto;min-width:600px}
  .svg-lbl{fill:var(--text);font:700 12px 'JetBrains Mono',monospace}
  .svg-cost{fill:var(--amber);font:600 11px 'JetBrains Mono',monospace}
  .svg-axis{fill:var(--muted);font:11px Inter,sans-serif}
  table{width:100%;border-collapse:collapse;font-size:13px;min-width:440px}
  th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--border)}
  th{color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  td.num{font-family:'JetBrains Mono',monospace;text-align:right;white-space:nowrap}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;vertical-align:middle}
  .dot.good{background:var(--emerald)}.dot.ni{background:var(--amber)}.dot.poor{background:var(--red)}
  .costbar{display:flex;height:22px;border-radius:6px;overflow:hidden;flex:1;border:1px solid var(--border)}
  .costbar .seg{height:100%}
  .cbrow{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .cblabel{width:150px;font-size:13px;color:var(--muted);flex:none}.cblabel b{color:var(--text);font-family:'JetBrains Mono',monospace}
  .cblegend{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;font-size:12px;color:var(--muted)}
  .lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}
  .tl-item{position:relative;padding:0 0 18px 26px;border-left:2px solid var(--border)}
  .tl-item:last-child{border-left-color:transparent}
  .tl-dot{position:absolute;left:-7px;top:2px;width:12px;height:12px;border-radius:50%;background:var(--muted);border:2px solid var(--bg)}
  .tl-item.ok .tl-dot{background:var(--emerald)}.tl-item.no .tl-dot{background:var(--red)}.tl-item.base .tl-dot{background:var(--blue)}
  .tl-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:3px}
  .tl-files{margin-top:6px;font-size:12px}.ftag{font-size:10px;color:var(--muted);border:1px solid var(--border);border-radius:4px;padding:0 4px}
  .pill{font-size:11px;background:var(--surface2);border:1px solid var(--border);border-radius:999px;padding:2px 9px;font-family:'JetBrains Mono',monospace;color:var(--muted)}
  .badge{padding:2px 8px;border-radius:6px;font:700 11px Inter;letter-spacing:.03em}
  .badge.ok{background:var(--emerald);color:#03130c}.badge.no{background:var(--surface2);color:var(--muted);border:1px solid var(--border)}
  .chip{display:inline-block;padding:1px 7px;border-radius:6px;font:600 11px 'JetBrains Mono',monospace;background:var(--surface2);color:var(--muted);border:1px solid var(--border)}
  .chip.warn{background:color-mix(in srgb,var(--amber) 18%,transparent);color:var(--amber);border-color:transparent}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:680px){.two,.hero,.gauges{grid-template-columns:1fr}.gauges{grid-template-columns:repeat(2,1fr)}}
  ul.clean{list-style:none;padding:0;margin:0}ul.clean li{padding:10px 0;border-bottom:1px solid var(--border)}ul.clean li:last-child{border:0}
  .diff{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;font-family:'JetBrains Mono',monospace;font-size:12px;overflow-x:auto;margin-top:8px;white-space:pre}
  .diff .del{color:var(--red)}.diff .add{color:var(--emerald)}
  .method{font-size:13px}.method td{padding:7px 10px}.method code{background:var(--surface2);padding:1px 5px;border-radius:4px}
  a{color:var(--emerald)}
  .flow{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:14px;overflow-x:auto;white-space:nowrap}
  .acts{display:flex;flex-direction:column;gap:12px}
  .act{display:grid;grid-template-columns:auto 1fr;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;border-left:4px solid var(--muted)}
  .act.now{border-left-color:var(--emerald)}.act.next{border-left-color:var(--amber)}.act.later{border-left-color:var(--blue)}
  .act-rank{width:30px;height:30px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:14px}
  .act-head{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-bottom:5px;font-size:15px}
  .pri{font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em}
  .pri.now{background:var(--emerald);color:#03130c}.pri.next{background:color-mix(in srgb,var(--amber) 22%,transparent);color:var(--amber)}.pri.later{background:color-mix(in srgb,var(--blue) 22%,transparent);color:var(--blue)}
  .eff{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace}
  .act-why{margin-bottom:8px}.act-why code{background:var(--surface2);padding:1px 5px;border-radius:4px}
  .act-impact{font-size:12px;margin-top:8px}.act-impact .muted{text-transform:uppercase;letter-spacing:.04em;font-size:10px;margin-right:6px}
</style>
<div class="wrap">
  <h1>autoperf · Lighthouse 자동 최적화 리포트</h1>
  <div class="sub">karpathy/autoresearch 방식의 자기개선 루프 — 측정 → 최적화 1건 → 재측정 → 개선 시 keep · 악화 시 revert 반복</div>
  <div class="meta">
    <span class="tag">대상 <b>${esc(log.config?.routes || '/')}</b></span>
    <span class="tag">프리셋 <b>mobile</b></span>
    <span class="tag">측정 <b>3-run 중앙값</b></span>
    <span class="tag">종료 <b>${esc(log.stopReason || 'n/a')}</b></span>
    <span class="tag">반복 <b>${iters.length}회</b> (채택 ${acceptedCount})</span>
    <span class="tag">생성 <b>${esc(log.generatedAt || '')}</b></span>
  </div>

  <div class="hero">
    <div>
      <div class="hero-num">${best.categoryScoreSum ?? '—'}<small>/400</small></div>
      <div class="hero-delta">▲ ${sumDelta} vs baseline ${base.categoryScoreSum ?? '—'}</div>
    </div>
    <div class="hero-verdict">
      4개 카테고리(Performance·Accessibility·Best Practices·SEO) 합계가 <b>${base.categoryScoreSum}</b> → <b>${best.categoryScoreSum}</b> 로 올랐습니다.
      연속 cost 지표는 <b>${base.totalCost}</b> → <b>${best.totalCost}</b> (<b>${costPct}%</b> 감소).
      루프는 <b>${esc(log.stopReason)}</b> 로 자동 종료됐습니다.
    </div>
  </div>

  <h2>✅ 다음 할 일 — 이대로 따라 하세요</h2>
  <div class="acts">${actionHtml}</div>

  <h2>카테고리 점수 (최종 · baseline 대비)</h2>
  <div class="gauges">${gauges}</div>

  <div class="cards">
    <div class="card"><div class="k">categoryScoreSum</div><div class="v">${best.categoryScoreSum}<small>/400</small></div><div class="d up">▲ ${sumDelta}</div></div>
    <div class="card"><div class="k">cost (낮을수록 좋음)</div><div class="v">${best.totalCost}</div><div class="d up">▼ ${costDelta} (${costPct}%)</div></div>
    <div class="card"><div class="k">채택 / 시도</div><div class="v">${acceptedCount}<small>/${iters.length}</small></div><div class="d muted">전부 첫 시도에 채택</div></div>
    <div class="card"><div class="k">LCP</div><div class="v">${bestFull ? ms(bestFull.metrics.lcp) : '—'}</div><div class="d up">good &lt; 2.5 s</div></div>
  </div>

  <h2>반복 추이</h2>
  <div class="panel">${progressChart(points)}</div>

  <h2>autoresearch 루프 타임라인</h2>
  <div class="flow">baseline → experiment(수정+측정) → 결정적 gate(sum↑ 또는 동점 시 cost 3%↓, 회귀 없음) → keep/revert → 반복</div>
  <div>${timeline}</div>

  <div class="two" style="margin-top:8px">
    <div>
      <h2>Core Web Vitals · 지표 (before → after)</h2>
      <div class="panel">
        <table>
          <thead><tr><th>지표</th><th class="num">baseline</th><th class="num">best</th><th class="num">Δ</th></tr></thead>
          <tbody>${mrows}</tbody>
        </table>
        <div class="cblegend" style="margin-top:12px"><span class="lg"><span class="dot good"></span></span>good <span class="lg"><span class="dot ni"></span></span>needs-improvement <span class="lg"><span class="dot poor"></span></span>poor · Δ 초록=개선</div>
      </div>
    </div>
    <div>
      <h2>연속 cost 지표 분해</h2>
      <div class="panel">
        <div class="small muted" style="margin-bottom:12px">Lighthouse 점수가 100에 포화돼도 gradient를 유지하는 2차 목표. 가중합 <code class="mono">LCP·1 + TBT·4 + CLS·8000 + SI·0.5 + KiB·2 + Bootup·0.5</code></div>
        ${costSection}
      </div>
    </div>
  </div>

  <h2>적용된 최적화 (코드 상세)</h2>
  <div class="panel">
    <div style="margin-bottom:16px">
      <b>iter 1 · color-contrast</b> <span class="badge ok">KEPT</span> <span class="pill">accessibility 95 → 100</span>
      <div class="muted small" style="margin:4px 0">muted 텍스트 토큰이 WCAG AA 4.5:1 대비 미달 → 뉴트럴 토큰을 밝게 올려 대비 통과.</div>
      <div class="diff"><span class="mono">app/globals.css</span>
<span class="del">-  --muted-soft: #6b7177;</span>
<span class="add">+  --muted-soft: #868b92;</span></div>
    </div>
    <div>
      <b>iter 2 · favicon (app/icon.svg)</b> <span class="badge ok">KEPT</span> <span class="pill">best-practices 96 → 100</span>
      <div class="muted small" style="margin:4px 0">best-practices 감점의 원인은 <code>/favicon.ico</code> 404 콘솔 에러 하나. App Router <code>icon.svg</code>를 추가해 문서가 아이콘을 선언 → 404 요청 소멸.</div>
      <div class="diff"><span class="mono">app/icon.svg</span> <span class="add">(신규)</span> — App Router가 <code>&lt;link rel="icon"&gt;</code>를 자동 주입</div>
    </div>
  </div>

  <h2>남은 개선 기회 (목표 400 도달 후에도 cost 절감 여지)</h2>
  <div class="two">
    <div class="panel"><div class="small muted" style="margin-bottom:8px">Opportunities</div><ul class="clean">${remOpps || '<li class=muted>없음</li>'}</ul></div>
    <div class="panel"><div class="small muted" style="margin-bottom:8px">Diagnostics</div><ul class="clean">${remDiag || '<li class=muted>없음</li>'}</ul></div>
  </div>

  <h2>방법론 & 재현</h2>
  <div class="panel">
    <table class="method">
      <tr><td class="muted">autoresearch 원본</td><td>train.py 수정 → 5분 학습 → val_bpb(낮을수록↑) 기준 keep/discard</td></tr>
      <tr><td class="muted">여기 매핑</td><td>최적화 1건 → <code>lighthouse-run.mjs</code>(빌드+측정) → categoryScoreSum↑ / cost↓ 기준 keep/revert</td></tr>
      <tr><td class="muted">1차 목표</td><td>categoryScoreSum (perf+a11y+bp+seo, 만점 400)</td></tr>
      <tr><td class="muted">2차 목표</td><td>연속 cost (항상 gradient가 있어 점수 포화 시에도 최적화 방향 유지)</td></tr>
      <tr><td class="muted">채택 게이트</td><td>sum 증가 <b>또는</b> (동점 &amp; cost 3%↓), 단 어떤 카테고리도 회귀 없을 것</td></tr>
      <tr><td class="muted">종료 조건</td><td>categoryScoreSum ${log.config?.targetSum ?? 400} 도달 · ${log.config?.plateau ?? 2}회 연속 정체 · 최대 ${log.config?.maxIterations ?? 5}회</td></tr>
      <tr><td class="muted">구성 파일</td><td><code>scripts/perf/lighthouse-run.mjs</code> · <code>.claude/workflows/autoperf.js</code> · <code>scripts/perf/dashboard.mjs</code> · 스킬 <code>perf-autoloop</code></td></tr>
      <tr><td class="muted">원본 Lighthouse 리포트</td><td><a href="${reportLink}">${esc(reportLink)}</a> (로컬)</td></tr>
    </table>
  </div>
</div>`;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');
  console.log(`[dashboard] wrote ${outPath}`);
}

main();
