// S7: 대시보드 네비게이션(업로드/월별 추이/요금제) + 로그아웃 + 재게이팅 (인증 필요)
// ⚠️ 인증 정책: 실행 전 우회 vs 정식 인증 확인. S6로 먼저 로그인된 세션을 전제로 한다.
// 실행: dev-browser --headless --timeout 90 run tests/e2e/s7_nav_logout.js
const page = await browser.getPage("e2e");
const results = {};

async function go(url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  return ((await page.textContent("h1").catch(() => "")) || "").trim();
}

results.uploadH1 = await go("http://localhost:3000/dashboard/upload");
results.trendH1 = await go("http://localhost:3000/dashboard/trend");
results.pricingH1 = await go("http://localhost:3000/dashboard/pricing");
results.pricingLoggedIn = (await page.getByText("로그인이 필요합니다").count()) === 0;
results.pricingHasPlans =
  (await page.getByText("Free").count()) > 0 && (await page.getByText("Pro").count()) > 0;
await saveScreenshot(await page.screenshot(), "s7_pricing.png");

await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
await Promise.all([
  page.waitForURL("**/login**", { timeout: 15000 }).catch(() => {}),
  page.getByRole("button", { name: "로그아웃" }).click().catch(() => {}),
]);
await page.waitForTimeout(400);
results.afterLogoutUrl = page.url();

await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
results.dashboardAfterLogout = page.url();

console.log(
  JSON.stringify(
    {
      scenario: "S7 navigation + logout",
      ...results,
      pass:
        results.uploadH1.includes("명세서 업로드") &&
        results.trendH1.includes("월별 추이") &&
        results.pricingH1.includes("요금제") &&
        results.pricingLoggedIn &&
        results.pricingHasPlans &&
        /\/login/.test(results.afterLogoutUrl) &&
        /\/login/.test(results.dashboardAfterLogout),
    },
    null,
    2,
  ),
);
