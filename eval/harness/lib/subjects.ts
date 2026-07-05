// 두 subject: (1) review = 경량 리뷰어(sonnet, temp0, CLAUDE.md CRITICAL 룰 요약을
// 시스템 프롬프트로), (2) qa = 라이브 CLAUDE.md 를 컨텍스트로 답하는 응답자.
import type Anthropic from "@anthropic-ai/sdk";
import { readParsedObject, textOf } from "./anthropic";

export const SUBJECT_MODEL = process.env.EVAL_SUBJECT_MODEL ?? "claude-sonnet-4-6";

// CLAUDE.md CRITICAL 룰의 요약. 리뷰어는 이 룰만으로 스니펫을 판정한다.
export const REVIEWER_SYSTEM = `You are a strict code reviewer for the "finsight" Next.js 15 codebase.
Judge the given code snippet ONLY against these CRITICAL guardrails:

A1. All external-API logic (Claude/Anthropic calls, CSV parsing, Polar webhook, Supabase
    service-role usage) must live in app/api route handlers or server-only modules — never
    in client components ("use client").
A2. Secret keys (ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, POLAR_*) are server-only and
    must never reach the client bundle. Only NEXT_PUBLIC_* vars may be used client-side.
    Prefixing a secret with NEXT_PUBLIC_ is itself a violation.
A3. Tables holding financial PII (transactions, card data, etc.) MUST enable Row Level
    Security so only the owner can read them. A migration that creates such a table without
    "enable row level security" + owner policies is a violation.
ENUM. Transaction classification must use the fixed category enum only; a schema that lets the
    model emit an arbitrary category string is a violation.

Compliance notes (do NOT flag these): a module marked import "server-only" MAY use the
service-role key; a route handler MAY call external APIs; a client component MAY read a
NEXT_PUBLIC_* var; a non-PII lookup table MAY omit RLS.

Decide whether the snippet VIOLATES any rule. Respond with verdict "violation" or "pass",
the rule id, and a one-sentence explanation.`;

export function responderSystem(claudeMd: string): string {
  return `You answer finsight developer questions. Treat the following CLAUDE.md as the single
source of truth. Answer concisely in Korean (한국어). If the question assumes something false
(a wrong premise), explicitly correct the premise before answering.

<claude_md>
${claudeMd}
</claude_md>`;
}

const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "explanation"],
  properties: {
    verdict: { type: "string", enum: ["violation", "pass"] },
    rule: { type: "string" },
    explanation: { type: "string" },
  },
} as const;

export interface ReviewVerdict {
  verdict: "violation" | "pass";
  rule?: string;
  explanation: string;
}

/** Track 1 subject: 스니펫을 룰 위반 여부로 판정한다. */
export async function reviewSnippet(client: Anthropic, snippet: string): Promise<ReviewVerdict> {
  const res = await client.messages.parse({
    model: SUBJECT_MODEL,
    max_tokens: 512,
    temperature: 0,
    system: REVIEWER_SYSTEM,
    messages: [{ role: "user", content: `Review this snippet:\n\n${snippet}` }],
    output_config: { format: { type: "json_schema", schema: reviewSchema } },
  });
  const parsed = readParsedObject(res);
  return {
    verdict: parsed.verdict === "violation" ? "violation" : "pass",
    rule: typeof parsed.rule === "string" ? parsed.rule : undefined,
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
  };
}

/** Track 2 subject: 라이브 CLAUDE.md 컨텍스트로 코드베이스 질문에 답한다. */
export async function answerQuestion(
  client: Anthropic,
  claudeMd: string,
  question: string,
): Promise<string> {
  const res = await client.messages.create({
    model: SUBJECT_MODEL,
    max_tokens: 800,
    temperature: 0,
    system: responderSystem(claudeMd),
    messages: [{ role: "user", content: question }],
  });
  return textOf(res);
}
