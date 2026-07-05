// Anthropic 응답에서 구조화 출력/텍스트를 안전하게 꺼내는 헬퍼.
// services/claude.ts 의 readStructuredObject/parseTextOutput 와 같은 규약을 따른다.
interface ParsedMessage {
  parsed_output?: unknown;
  content?: Array<{ type: string; text?: string }>;
}

function parseTextOutput(message: ParsedMessage): unknown {
  const text = message.content
    ?.filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  if (!text) {
    throw new Error("response did not include structured output");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("response was not valid JSON");
  }
}

/** parsed_output 우선, 없으면 text 블록을 JSON 파싱. 객체가 아니면 throw. */
export function readParsedObject(response: unknown): Record<string, unknown> {
  const message = response as ParsedMessage;
  const raw = message.parsed_output !== undefined ? message.parsed_output : parseTextOutput(message);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("response was not a JSON object");
  }
  return raw as Record<string, unknown>;
}

/** text 블록들을 이어 붙인 평문 (qa responder 용). */
export function textOf(response: unknown): string {
  const message = response as ParsedMessage;
  return (
    message.content
      ?.filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("") ?? ""
  );
}
