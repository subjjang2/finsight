import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const REPO = "acme/finsight";
const TOKEN = "ghp_fine_grained_test";

describe("dispatchRepositoryEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_DISPATCH_TOKEN = TOKEN;
    process.env.GITHUB_DISPATCH_REPO = REPO;
  });

  afterEach(() => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    delete process.env.GITHUB_DISPATCH_REPO;
    vi.unstubAllGlobals();
  });

  it("POSTs a repository_dispatch with the event_type, client_payload, and auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const { dispatchRepositoryEvent } = await import("./github");
    await dispatchRepositoryEvent("oncall-prod-alert", { fingerprint: "iss_1", alert_type: "single" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://api.github.com/repos/${REPO}/dispatches`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.headers.Accept).toBe("application/vnd.github+json");
    expect(init.headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
    expect(JSON.parse(init.body)).toEqual({
      event_type: "oncall-prod-alert",
      client_payload: { fingerprint: "iss_1", alert_type: "single" },
    });
  });

  it("throws on a non-2xx GitHub response (so the caller can 500 and retry)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 403 })));

    const { dispatchRepositoryEvent } = await import("./github");
    await expect(dispatchRepositoryEvent("oncall-prod-alert", {})).rejects.toThrow(/403/);
  });

  it("throws when the dispatch token/repo is not configured (never silently no-ops)", async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { dispatchRepositoryEvent } = await import("./github");
    await expect(dispatchRepositoryEvent("oncall-prod-alert", {})).rejects.toThrow(/GITHUB_DISPATCH/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
