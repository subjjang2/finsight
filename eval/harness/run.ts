// 라이브 회귀 게이트: golden set 을 subject 에 돌리고 opus judge 로 pass/fail 채점.
// 하나라도 실패하면 process.exitCode=1. 네트워크·비용이 있으므로 `npm run eval` 로만 돈다.
// (npm test 는 키 없이 파서/집계/균형만 검증한다 — lib/*.test.ts)
//
// 사용법: npm run eval
// 모델 오버라이드: EVAL_SUBJECT_MODEL, EVAL_JUDGE_MODEL
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { aggregate, formatHtmlReport, type CaseResult } from "./lib/aggregate";
import { loadEnv } from "./lib/env";
import { judgeQa, judgeReview, JUDGE_MODEL } from "./lib/judge";
import { loadCases, type EvalCase } from "./lib/parse";
import { answerQuestion, reviewSnippet, SUBJECT_MODEL } from "./lib/subjects";

// Anthropic 클라이언트 중 이 러너가 쓰는 표면만. 테스트에서 스텁으로 대체한다.
export interface EvalClient {
  messages: {
    parse(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
  };
}

/** 한 케이스: subject 실행 → judge 채점. 에러는 실패 결과로 포착한다. */
export async function runCase(
  client: EvalClient,
  c: EvalCase,
  claudeMd: string,
): Promise<CaseResult> {
  try {
    const anthropic = client as unknown as Anthropic;
    let verdict;
    if (c.track === "review") {
      const s = await reviewSnippet(anthropic, c.input);
      verdict = await judgeReview(anthropic, c, s);
    } else {
      const answer = await answerQuestion(anthropic, claudeMd, c.input);
      verdict = await judgeQa(anthropic, c, answer);
    }
    return { id: c.id, track: c.track, pass: verdict.pass, reason: verdict.reason };
  } catch (err) {
    return { id: c.id, track: c.track, pass: false, reason: `error: ${(err as Error).message}` };
  }
}

/** 전체 golden set 을 순차 실행. */
export async function runEval(
  client: EvalClient,
  cases: EvalCase[],
  claudeMd: string,
): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  for (const c of cases) {
    process.stdout.write(`• ${c.id} … `);
    const r = await runCase(client, c, claudeMd);
    console.log(r.pass ? "PASS" : `FAIL — ${r.reason}`);
    results.push(r);
  }
  return results;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..", "..");

  const env = loadEnv(resolve(repoRoot, ".env.local"));
  const apiKey = env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is required (set it in .env.local).");
    process.exitCode = 1;
    return;
  }

  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
  const claudeMd = readFileSync(resolve(repoRoot, "CLAUDE.md"), "utf8");
  const cases = loadCases(join(here, "cases"));

  if (cases.length === 0) {
    console.error("No cases found under eval/harness/cases.");
    process.exitCode = 1;
    return;
  }

  console.log(`harness eval — ${cases.length} cases · subject=${SUBJECT_MODEL} · judge=${JUDGE_MODEL}\n`);

  const results = await runEval(client, cases, claudeMd);

  const summary = aggregate(results);
  const meta = { subject: SUBJECT_MODEL, judge: JUDGE_MODEL, at: new Date().toISOString() };
  const html = formatHtmlReport(summary, results, meta, cases);

  const outDir = join(here, "reports");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "last-run.html"), html, "utf8");
  writeFileSync(join(outDir, "last-run.json"), JSON.stringify({ summary, results, meta }, null, 2), "utf8");

  console.log(
    `\n${summary.exitCode === 0 ? "PASS" : "FAIL"} — ${summary.passed}/${summary.total} · report: eval/harness/reports/last-run.html`,
  );

  // process.exit() 대신 exitCode 만 설정 (Windows libuv UV_HANDLE_CLOSING 회피, set-tier.mjs 관례).
  process.exitCode = summary.exitCode;
}

// 직접 실행(`tsx run.ts`)일 때만 main. import(테스트)로 로드되면 실행하지 않는다.
// top-level await 는 CJS 출력(tsx, "type":"module" 없음)에서 막히므로 .catch 로 처리.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
