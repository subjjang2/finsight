// S2: 미인증 /dashboard 접근 → /login?next= 리다이렉트 (인증 불필요)
// 전제: 로그인 안 된 상태(브라우저에 e2e_session 쿠키 없음).
// 실행: dev-browser --headless --timeout 45 run tests/e2e/s2_auth_redirect.js
const page = await browser.getPage("e2e");
await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
const url = page.url();
await saveScreenshot(await page.screenshot(), "s2_redirect.png");
console.log(
  JSON.stringify(
    {
      scenario: "S2 auth redirect",
      finalUrl: url,
      pass: /\/login/.test(url) && /next=/.test(url),
    },
    null,
    2,
  ),
);
