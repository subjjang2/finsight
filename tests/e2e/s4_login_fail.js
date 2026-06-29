// S4: 잘못된 자격증명 로그인 실패 → 에러 메시지 (인증 불필요)
// 주의: 정식(비-E2E) 빌드에서 실행. E2E 우회 모드에서는 어떤 값이든 통과하므로 의미 없음.
// 실행: dev-browser --headless --timeout 45 run tests/e2e/s4_login_fail.js
const page = await browser.getPage("e2e");
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
await page.fill("input#email", "nobody-qa@example.com");
await page.fill("input#password", "wrong-password-123");
await page.locator('button[type="submit"]').click({ noWaitAfter: true });

let msg = "";
try {
  await page.waitForFunction(
    () => {
      const p = document.querySelector('p[aria-live="polite"]');
      const t = p && p.textContent ? p.textContent.trim() : "";
      return t && t !== "이메일과 비밀번호로 계속하세요." && t !== "로그인 중입니다.";
    },
    { timeout: 20000 },
  );
  msg = await page.textContent('p[aria-live="polite"]');
} catch {
  msg = "(timeout) " + (await page.textContent('p[aria-live="polite"]').catch(() => ""));
}

await saveScreenshot(await page.screenshot(), "s4_login_fail.png");
console.log(
  JSON.stringify(
    {
      scenario: "S4 wrong credentials",
      message: (msg || "").trim(),
      pass: /확인해 주세요/.test(msg || ""),
    },
    null,
    2,
  ),
);
