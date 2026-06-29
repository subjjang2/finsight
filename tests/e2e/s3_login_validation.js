// S3: 로그인 폼 네이티브 HTML5 검증 (required / minLength=6 / type=email) (인증 불필요)
// 실행: dev-browser --headless --timeout 45 run tests/e2e/s3_login_validation.js
const page = await browser.getPage("e2e");
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });

await page.locator('button[type="submit"]').click({ noWaitAfter: true });
await page.waitForTimeout(300);
const emptyEmail = await page.$eval("input#email", (el) => el.validity.valueMissing);

await page.fill("input#email", "user@example.com");
await page.fill("input#password", "123");
await page.locator('button[type="submit"]').click({ noWaitAfter: true });
await page.waitForTimeout(300);
const shortPw = await page.$eval("input#password", (el) => el.validity.tooShort);

await page.fill("input#email", "not-an-email");
await page.fill("input#password", "123456");
const badEmail = await page.$eval("input#email", (el) => el.validity.typeMismatch);

await saveScreenshot(await page.screenshot(), "s3_validation.png");
console.log(
  JSON.stringify(
    {
      scenario: "S3 native validation",
      emptyEmailBlocked: emptyEmail === true,
      shortPwBlocked: shortPw === true,
      badEmailFormat: badEmail === true,
      pass: emptyEmail && shortPw && badEmail,
    },
    null,
    2,
  ),
);
