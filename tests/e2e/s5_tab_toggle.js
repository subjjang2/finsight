// S5: 로그인/회원가입 탭 전환 → 제출 버튼 문구 변화 (인증 불필요)
// 실행: dev-browser --headless --timeout 45 run tests/e2e/s5_tab_toggle.js
const page = await browser.getPage("e2e");
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });

const submitBefore = (await page.locator('button[type="submit"]').textContent()).trim();
await page.getByRole("button", { name: "회원가입", exact: true }).click({ noWaitAfter: true });
await page.waitForTimeout(300);
const submitAfter = (await page.locator('button[type="submit"]').textContent()).trim();
await saveScreenshot(await page.screenshot(), "s5_signup_tab.png");

console.log(
  JSON.stringify(
    {
      scenario: "S5 tab toggle",
      submitBefore,
      submitAfter,
      pass: submitBefore === "로그인" && submitAfter === "계정 만들기",
    },
    null,
    2,
  ),
);
