import "server-only";

// oncall PROD ALERT — 서버(웹훅)에서 GitHub repository_dispatch 로 판정 CI 를 깨우는 래퍼.
//
// 서버리스는 claude -p 를 못 띄우므로 판정을 헤드리스 에이전트 CI 로 위임한다. Actions 의
// built-in GITHUB_TOKEN 은 서버에서 못 쓰고, 게다가 GITHUB_TOKEN 은 다른 워크플로우를
// 트리거하지 못한다 → 별도 서버 전용 fine-grained PAT(GITHUB_DISPATCH_TOKEN, Contents: RW)이
// 필요하다. CLAUDE.md 규칙대로 서버 전용(NEXT_PUBLIC_ 아님) + lazy env 접근.

const GITHUB_API_VERSION = "2022-11-28";

export async function dispatchRepositoryEvent(
  eventType: string,
  clientPayload: Record<string, unknown>,
): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_DISPATCH_REPO;

  // 미설정 시 조용히 no-op 하지 않고 throw → 라우트가 500 을 반환해 PostHog 재시도를 유도한다.
  if (!token || !repo) {
    throw new Error("GITHUB_DISPATCH_TOKEN / GITHUB_DISPATCH_REPO is not configured");
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: eventType, client_payload: clientPayload }),
  });

  if (!response.ok) {
    // 본문은 GitHub 에러 메시지일 뿐(시크릿 아님). 상태코드를 담아 호출부가 관측/재시도하게 한다.
    const detail = await response.text().catch(() => "");
    throw new Error(`repository_dispatch failed: ${response.status} ${detail}`.trim());
  }
}
