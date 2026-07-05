// LLM-as-judge: subject 와 다른 모델(opus)이 pass/fail 을 채점한다.
// 프롬프트 빌더는 순수 함수로 분리해 키 없이(vitest) 검증한다.
import type Anthropic from "@anthropic-ai/sdk";
import { readParsedObject } from "./anthropic";
import type { QaCase, ReviewCase } from "./parse";
import type { ReviewVerdict } from "./subjects";

export const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL ?? "claude-opus-4-8";

const verdictSchema = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "reason"],
  properties: {
    pass: { type: "boolean" },
    reason: { type: "string" },
  },
} as const;

export interface JudgeVerdict {
  pass: boolean;
  reason: string;
}

export interface JudgePrompt {
  system: string;
  user: string;
}

export function buildReviewJudgePrompt(c: ReviewCase, subject: ReviewVerdict): JudgePrompt {
  const system = `You grade a code reviewer's conclusion against a known ground-truth label.
The snippet's true label is "${c.expect}".
- If the label is "violation", the reviewer PASSES if it flagged a genuine rule violation
  with sound reasoning. The exact rule id is for traceability only — do NOT require it to
  match "${c.rule ?? ""}"; a snippet may violate several CRITICAL rules at once, so any
  correct, on-point violation counts.
- If the label is "pass", the reviewer PASSES only if it did NOT flag a violation (no false positive).
Judge the substance of the reviewer's reasoning, not its rule label.
Respond with pass (boolean) and a one-sentence reason written in Korean (한국어).`;
  const user = JSON.stringify(
    {
      expected_label: c.expect,
      expected_rule: c.rule,
      snippet: c.input,
      reviewer_verdict: subject.verdict,
      reviewer_rule: subject.rule,
      reviewer_explanation: subject.explanation,
    },
    null,
    2,
  );
  return { system, user };
}

export function buildQaJudgePrompt(c: QaCase, answer: string): JudgePrompt {
  const premise = c.falsePremise
    ? " The question contains a FALSE PREMISE; the answer PASSES only if it explicitly corrects that premise."
    : "";
  const system = `You grade a developer-assistant answer against required facts.
Set pass=true only if the answer states ALL of the "must" facts (paraphrase is fine) and
asserts NONE of the "must_not" falsehoods.${premise}
Respond with pass (boolean) and a one-sentence reason written in Korean (한국어).`;
  const user = JSON.stringify(
    {
      question: c.input,
      must: c.must,
      must_not: c.mustNot,
      false_premise: c.falsePremise,
      answer,
    },
    null,
    2,
  );
  return { system, user };
}

async function grade(client: Anthropic, prompt: JudgePrompt): Promise<JudgeVerdict> {
  const res = await client.messages.parse({
    model: JUDGE_MODEL,
    max_tokens: 512,
    // temperature 생략: Opus 4.8/4.7 은 sampling 파라미터를 400으로 거부한다.
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
    output_config: { format: { type: "json_schema", schema: verdictSchema } },
  });
  const parsed = readParsedObject(res);
  return {
    pass: parsed.pass === true,
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
  };
}

export function judgeReview(
  client: Anthropic,
  c: ReviewCase,
  subject: ReviewVerdict,
): Promise<JudgeVerdict> {
  return grade(client, buildReviewJudgePrompt(c, subject));
}

export function judgeQa(client: Anthropic, c: QaCase, answer: string): Promise<JudgeVerdict> {
  return grade(client, buildQaJudgePrompt(c, answer));
}
