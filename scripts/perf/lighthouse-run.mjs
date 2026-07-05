#!/usr/bin/env node
// Lighthouse measurement harness — the "5-minute training run" analog of karpathy/autoresearch.
// Boots a local production build, runs Lighthouse against target routes, and emits a
// deterministic JSON summary + per-route HTML reports. Kept side-effect free so the
// autoperf loop can call it repeatedly and compare scores across iterations.
//
// Usage:
//   node scripts/perf/lighthouse-run.mjs --label baseline --routes / --runs 3
//   node scripts/perf/lighthouse-run.mjs --label iter-1 --no-build         (reuse existing .next)
//
// Output:
//   reports/perf/<label>/summary.json           machine-readable scores + opportunities
//   reports/perf/<label>/<route>.report.html    official Lighthouse HTML report per route

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

// ---- arg parsing -----------------------------------------------------------
function parseArgs(argv) {
  const args = { label: 'run', routes: ['/'], runs: 3, build: true, preset: 'mobile', port: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--label') args.label = argv[++i];
    else if (a === '--routes') args.routes = argv[++i].split(',').map((s) => s.trim()).filter(Boolean).map((r) => (r.startsWith('/') ? r : '/' + r));
    else if (a === '--runs') args.runs = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (a === '--no-build') args.build = false;
    else if (a === '--preset') args.preset = argv[++i];
    else if (a === '--port') args.port = parseInt(argv[++i], 10) || 0;
  }
  return args;
}

// ---- helpers ---------------------------------------------------------------
function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not become ready at ${url} within ${timeoutMs}ms`);
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Lighthouse throttling presets. Desktop is lower-variance; mobile matches PageSpeed default.
const PRESETS = {
  mobile: { formFactor: 'mobile', screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false } },
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10_240, cpuSlowdownMultiplier: 1 },
  },
};

// ---- main ------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const outDir = path.join(repoRoot, 'reports', 'perf', args.label);
  await mkdir(outDir, { recursive: true });

  if (args.build) {
    console.log('[perf] building production bundle…');
    await run('npx', ['next', 'build'], { cwd: repoRoot });
  }

  const port = args.port || (await freePort());
  const base = `http://localhost:${port}`;
  console.log(`[perf] starting production server on ${base}…`);
  const server = spawn('npx', ['next', 'start', '-p', String(port)], {
    cwd: repoRoot,
    shell: process.platform === 'win32',
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });

  let chrome;
  try {
    await waitForServer(base);
    console.log('[perf] server ready, launching Chrome…');
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });

    const presetCfg = PRESETS[args.preset] || PRESETS.mobile;
    const results = [];

    for (const route of args.routes) {
      const url = base + route;
      console.log(`[perf] measuring ${route} (${args.runs} run${args.runs > 1 ? 's' : ''})…`);
      const runsData = [];
      for (let i = 0; i < args.runs; i++) {
        const lhr = await lighthouse(
          url,
          { port: chrome.port, output: ['json', 'html'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] },
          { extends: 'lighthouse:default', settings: presetCfg },
        );
        runsData.push(lhr);
      }
      // Pick the median run by performance score, report its full detail.
      const scores = runsData.map((r) => r.lhr.categories.performance.score ?? 0);
      const medScore = median(scores);
      const medIdx = scores.indexOf(scores.reduce((best, s) => (Math.abs(s - medScore) < Math.abs(best - medScore) ? s : best), scores[0]));
      const chosen = runsData[medIdx];
      const lhr = chosen.lhr;

      const routeSlug = route === '/' ? 'root' : route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
      await writeFile(path.join(outDir, `${routeSlug}.report.html`), chosen.report[1], 'utf8');

      const a = lhr.audits;
      const num = (id) => (a[id] ? a[id].numericValue ?? null : null);
      const cat = (id) => Math.round(((lhr.categories[id]?.score) ?? 0) * 100);
      const categories = {
        performance: cat('performance'),
        accessibility: cat('accessibility'),
        bestPractices: cat('best-practices'),
        seo: cat('seo'),
      };
      const opportunities = Object.values(a)
        .filter((au) => au.details?.type === 'opportunity' && (au.numericValue ?? 0) > 0 && au.score !== 1)
        .map((au) => ({ id: au.id, title: au.title, savingsMs: Math.round(au.numericValue), description: au.description }))
        .sort((x, y) => y.savingsMs - x.savingsMs)
        .slice(0, 12);
      const diagnostics = Object.values(a)
        .filter((au) => au.scoreDisplayMode !== 'notApplicable' && au.score !== null && au.score < 0.9 && au.details?.type !== 'opportunity')
        .map((au) => ({ id: au.id, title: au.title, score: au.score, displayValue: au.displayValue || '' }))
        .slice(0, 15);

      const metrics = {
        lcp: num('largest-contentful-paint'),
        fcp: num('first-contentful-paint'),
        tbt: num('total-blocking-time'),
        cls: num('cumulative-layout-shift'),
        si: num('speed-index'),
        tti: num('interactive'),
        totalByteWeight: num('total-byte-weight'),
        mainThreadWork: num('mainthread-work-breakdown'),
        bootupTime: num('bootup-time'),
        unusedJsBytes: a['unused-javascript']?.details?.overallSavingsBytes ?? 0,
        legacyJsBytes: a['legacy-javascript']?.details?.overallSavingsBytes ?? 0,
      };
      // Continuous cost objective (lower = better), the val_bpb analog: always has a gradient
      // even when the capped Lighthouse score is saturated at 100. Weighted, normalized units.
      const cost = Math.round(
        (metrics.lcp ?? 0) * 1.0 +
          (metrics.tbt ?? 0) * 4.0 +
          (metrics.cls ?? 0) * 8000 +
          (metrics.si ?? 0) * 0.5 +
          (metrics.totalByteWeight ?? 0) / 1024 * 2 +
          (metrics.bootupTime ?? 0) * 0.5,
      );
      results.push({
        route,
        score: categories.performance,
        categories,
        categoryScoreSum: categories.performance + categories.accessibility + categories.bestPractices + categories.seo,
        scoresAllRuns: scores.map((s) => Math.round(s * 100)),
        cost,
        metrics,
        opportunities,
        diagnostics,
      });
      console.log(`[perf]   ${route} → perf ${categories.performance} a11y ${categories.accessibility} bp ${categories.bestPractices} seo ${categories.seo} | cost ${cost} (perf runs: ${scores.map((s) => Math.round(s * 100)).join(', ')})`);
    }

    const summary = {
      label: args.label,
      timestamp: new Date().toISOString(),
      preset: args.preset,
      runs: args.runs,
      overallScore: Math.round(results.reduce((s, r) => s + r.score, 0) / results.length),
      categoryScoreSum: results.reduce((s, r) => s + r.categoryScoreSum, 0),
      totalCost: results.reduce((s, r) => s + r.cost, 0),
      results,
    };
    await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    // Emit machine-parseable line for the loop orchestrator.
    console.log(`[perf] SUMMARY ${JSON.stringify({ label: args.label, overallScore: summary.overallScore, categoryScoreSum: summary.categoryScoreSum, totalCost: summary.totalCost, routes: results.map((r) => ({ route: r.route, score: r.score, categories: r.categories, cost: r.cost })) })}`);
    console.log(`[perf] wrote ${path.join(outDir, 'summary.json')}`);
  } finally {
    if (chrome) { try { await chrome.kill(); } catch { /* already dead */ } }
    server.kill();
    // On Windows, next spawns a child; ensure the port is released.
    if (process.platform === 'win32') {
      try { await run('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' }); } catch { /* already gone */ }
    }
  }
}

main().catch((err) => {
  console.error('[perf] FAILED:', err);
  process.exit(1);
});
