// autoperf — an autoresearch-style self-improving Lighthouse optimization loop.
// Inspired by karpathy/autoresearch: modify → run a fixed-budget experiment → keep the
// change if the metric improves, revert it if not; repeat until the target is hit or the
// search plateaus.
//
// This is a Claude Code **Workflow** script (not a plain node script). Run it with:
//   Workflow({ name: "autoperf", args: { routes: "/", maxIterations: 6, plateau: 2, targetSum: 400 } })
//
// Mapping from autoresearch → here:
//   train.py edit          → one surgical optimization applied by an "experiment" subagent
//   5-min training run     → `node scripts/perf/lighthouse-run.mjs` (build + Lighthouse median)
//   val_bpb (lower=better) → continuous `totalCost` (always has a gradient, even at score 100)
//   keep/discard by metric → deterministic accept/revert gate in this script's JS
//
// Objective (in priority order):
//   1. maximize categoryScoreSum  (perf + a11y + best-practices + seo, out of 400)
//   2. minimize totalCost         (weighted LCP/TBT/CLS/SI/bytes — the continuous tiebreaker)

export const meta = {
  name: 'autoperf',
  description: 'Autoresearch-style loop: optimize one thing → measure Lighthouse → keep/revert → repeat until target or plateau',
  phases: [
    { title: 'Baseline', detail: 'measure current Lighthouse scores' },
    { title: 'Optimize', detail: 'experiment → measure → keep-or-revert, looped' },
  ],
}

// ---- config ---------------------------------------------------------------
const CFG = {
  routes: args?.routes ?? '/',
  maxIterations: args?.maxIterations ?? 6,
  plateau: args?.plateau ?? 2,
  targetSum: args?.targetSum ?? 400,
}

// ---- schema returned by measuring agents ----------------------------------
const MEASURE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['approach', 'filesChanged', 'buildOk', 'summary'],
  properties: {
    approach: { type: 'string', description: 'Short label of the optimization applied ("" for baseline)' },
    rationale: { type: 'string', description: 'One sentence: why this should help the objective' },
    filesChanged: {
      type: 'array',
      description: 'Every file this experiment touched, so the orchestrator can revert precisely',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'created'],
        properties: {
          path: { type: 'string' },
          created: { type: 'boolean', description: 'true if newly created (delete to revert), false if modified (git checkout to revert)' },
        },
      },
    },
    buildOk: { type: 'boolean', description: 'false if the build or Lighthouse run failed' },
    summary: {
      type: 'object',
      additionalProperties: true,
      required: ['categoryScoreSum', 'totalCost', 'overallScore', 'results'],
      properties: {
        categoryScoreSum: { type: 'number' },
        totalCost: { type: 'number' },
        overallScore: { type: 'number' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
            properties: {
              route: { type: 'string' },
              score: { type: 'number' },
              cost: { type: 'number' },
              categories: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
  },
}

// ---- accept/revert gate (deterministic) -----------------------------------
function catSums(summary) {
  const acc = { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 }
  for (const r of summary.results || []) for (const k of Object.keys(acc)) acc[k] += r.categories?.[k] ?? 0
  return acc
}
function regressed(cand, best) {
  const c = catSums(cand), b = catSums(best)
  return ['performance', 'accessibility', 'bestPractices', 'seo'].some((k) => c[k] < b[k] - 1) // >1pt drop = real regression
}
function isBetter(cand, best) {
  if (!cand || regressed(cand, best)) return false
  if (cand.categoryScoreSum > best.categoryScoreSum) return true // primary objective improved
  // tiebreak: same category sum, meaningfully lower continuous cost (>3% beats run-to-run noise)
  return cand.categoryScoreSum === best.categoryScoreSum && cand.totalCost <= best.totalCost * 0.97
}

// ---- prompts --------------------------------------------------------------
const RULES = `Follow the repo's CLAUDE.md architecture rules. For any UI/style change, follow the finsight-ui design skill (dark + emerald tool dashboard tone; no AI-slop). Make a SURGICAL edit — one optimization only, no unrelated refactors, do not touch tests unless strictly required, and do NOT modify any file outside the one you are changing. Never run git. Never run \`git clean\`.`

function measurePrompt(label) {
  return `You are the baseline measurement of an autoresearch-style performance loop for the finsight Next.js app.
Do NOT change any code. Just measure the current state.
Run the Lighthouse harness using the **PowerShell tool** (not Bash — Bash mangles the "/" route argument on Windows):
  node scripts/perf/lighthouse-run.mjs --label ${label} --routes ${CFG.routes} --runs 3
It builds the app, boots a prod server, and runs Lighthouse (~2-3 min). When done, read reports/perf/${label}/summary.json and return: approach="" , filesChanged=[], buildOk=true, and summary={categoryScoreSum, totalCost, overallScore, results}. If the build fails, return buildOk=false.`
}

function experimentPrompt(i, best, bestLabel, tried) {
  return `You are iteration ${i} of an autoresearch-style Lighthouse optimization loop for the finsight Next.js app.

Current best state: categoryScoreSum ${best.categoryScoreSum}/400, totalCost ${best.totalCost}.
Full Lighthouse detail (opportunities + diagnostics + per-category scores) is in reports/perf/${bestLabel}/summary.json — READ IT FIRST to choose your target.

Already-tried approaches (do NOT repeat these): ${tried.length ? tried.map((t) => `"${t}"`).join(', ') : '(none yet)'}

Your job: pick exactly ONE concrete, high-ROI optimization that will either raise categoryScoreSum (accessibility and best-practices have headroom — e.g. color-contrast, console errors) or lower totalCost (e.g. legacy-javascript via browserslist/next config, unused-javascript, render-blocking resources), and IMPLEMENT it.
${RULES}

Then measure your change with the **PowerShell tool** (not Bash):
  node scripts/perf/lighthouse-run.mjs --label iter-${i} --routes ${CFG.routes} --runs 3
Read reports/perf/iter-${i}/summary.json and return: approach (short label), rationale (one sentence), filesChanged (every file you edited/created with created:true|false), buildOk (false if build/measure failed), and summary from the json. Do NOT commit or revert — the orchestrator decides that.`
}

function finalizePrompt(i, approach, accepted, filesChanged) {
  if (accepted) {
    return `Iteration ${i} ("${approach}") IMPROVED the metric and is being KEPT. Stage and commit ONLY the files this iteration changed, then confirm.
Files: ${JSON.stringify(filesChanged)}
Run: git add ${filesChanged.map((f) => `"${f.path}"`).join(' ')} && git commit -m "perf(auto): ${approach}"
Return the commit short hash. Do not add any other files.`
  }
  return `Iteration ${i} ("${approach}") did NOT improve the metric and must be REVERTED. Revert ONLY these files — nothing else. Do NOT run \`git clean\` (there are unrelated untracked files that must be preserved).
Files: ${JSON.stringify(filesChanged)}
For each file with created:false → \`git checkout -- "<path>"\`. For each file with created:true → delete it (\`rm "<path>"\`). Then confirm the working tree matches HEAD for those paths. Return "reverted".`
}

// ---- main loop ------------------------------------------------------------
phase('Baseline')
const base = await agent(measurePrompt('baseline-wf'), { schema: MEASURE_SCHEMA, label: 'measure:baseline', phase: 'Baseline' })
if (!base?.buildOk || !base?.summary) {
  log('baseline measurement failed — aborting')
  return { error: 'baseline_failed', base }
}
let best = base.summary
let bestLabel = 'baseline-wf'
const iterations = []
let stale = 0

log(`baseline: categoryScoreSum ${best.categoryScoreSum}/400, cost ${best.totalCost}`)

for (let i = 1; i <= CFG.maxIterations && stale < CFG.plateau && best.categoryScoreSum < CFG.targetSum; i++) {
  phase('Optimize')
  const tried = iterations.map((it) => it.approach).filter(Boolean)
  const exp = await agent(experimentPrompt(i, best, bestLabel, tried), { schema: MEASURE_SCHEMA, label: `experiment:${i}`, phase: 'Optimize' })

  const cand = exp?.buildOk ? exp.summary : null
  const accepted = isBetter(cand, best)

  // Deterministic keep/revert, executed by a tiny git agent (Workflow JS can't shell out).
  if (exp?.filesChanged?.length) {
    await agent(finalizePrompt(i, exp.approach, accepted, exp.filesChanged), { label: `${accepted ? 'keep' : 'revert'}:${i}`, phase: 'Optimize' })
  }

  iterations.push({
    i,
    approach: exp?.approach ?? '(failed)',
    rationale: exp?.rationale ?? '',
    filesChanged: exp?.filesChanged ?? [],
    buildOk: !!exp?.buildOk,
    summary: cand,
    accepted,
  })

  if (accepted) {
    best = cand
    bestLabel = `iter-${i}`
    stale = 0
    log(`iter ${i} ACCEPTED "${exp.approach}" → sum ${cand.categoryScoreSum}/400, cost ${cand.totalCost}`)
  } else {
    stale++
    log(`iter ${i} rejected "${exp?.approach ?? 'failed'}" (sum ${cand?.categoryScoreSum ?? 'n/a'}, cost ${cand?.totalCost ?? 'n/a'}) — stale ${stale}/${CFG.plateau}`)
  }
}

const stopReason =
  best.categoryScoreSum >= CFG.targetSum ? 'target_reached' : stale >= CFG.plateau ? 'plateau' : 'max_iterations'
log(`done: ${stopReason} — best sum ${best.categoryScoreSum}/400, cost ${best.totalCost}`)
return { baseline: base.summary, best, bestLabel, iterations, config: CFG, stopReason }
