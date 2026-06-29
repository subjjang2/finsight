// S6: 로그인 → 대시보드 (인증 필요)
// ⚠️ 인증 정책: 실행 전 우회(E2E_LOCAL) vs 정식 인증 여부를 사용자에게 확인할 것.
//    우회 모드에서는 아무 값이나 입력해도 통과한다.
// 실행: dev-browser --headless --timeout 60 run tests/e2e/s6_login_pass.js
const page = await browser.getPage("e2e");

// 잔존 세션 정리: 이미 로그인돼 있으면 로그아웃해 깨끗한 상태에서 로그인 테스트.
await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
if (!/\/login/.test(page.url())) {
  await Promise.all([
    page.waitForURL("**/login**", { timeout: 10000 }).catch(() => {}),
    page.getByRole("button", { name: "로그아웃" }).click().catch(() => {}),
  ]);
}

await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
const redirectedUrl = page.url();

await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
await page.fill("input#email", "anybody@anywhere.test");
await page.fill("input#password", "whatever123");
await Promise.all([
  page.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {}),
  page.locator('button[type="submit"]').click(),
]);
await page.waitForTimeout(500);

const url = page.url();
const h1 = (await page.textContent("h1").catch(() => "")) || "";
const emptyState = await page.getByText("분석 이력이 없습니다").count().catch(() => 0);
await saveScreenshot(await page.screenshot(), "s6_dashboard.png");

console.log(
  JSON.stringify(
    {
      scenario: "S6 login -> dashboard",
      redirectedBeforeLogin: /\/login/.test(redirectedUrl),
      urlAfterLogin: url,
      dashboardHeading: h1.trim(),
      emptyStateShown: emptyState > 0,
      pass: /\/dashboard/.test(url) && h1.includes("인사이트"),
    },
    null,
    2,
  ),
);
