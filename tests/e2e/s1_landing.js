// S1: 랜딩 페이지 렌더 + "시작하기" CTA → /login (인증 불필요)
// 실행: dev-browser --headless --timeout 45 run tests/e2e/s1_landing.js
const page = await browser.getPage("e2e");
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
const heading = (await page.textContent("h1").catch(() => null)) ?? "(no h1)";
const ctaCount = await page.getByText("시작하기").count();
const href = await page
  .locator('a:has-text("시작하기")')
  .first()
  .getAttribute("href")
  .catch(() => null);
await saveScreenshot(await page.screenshot(), "s1_landing.png");
console.log(
  JSON.stringify(
    {
      scenario: "S1 landing",
      heading,
      ctaCount,
      ctaHref: href,
      pass: ctaCount > 0 && href === "/login" && heading.includes("지출 인사이트"),
    },
    null,
    2,
  ),
);
