// S8: 업로드 → 자동 매핑(실제 Sonnet) → 자동 분석(실제 Sonnet) → 인사이트 (인증 + Claude 과금)
// 매핑 확인 화면은 제거됨: 파일 주입 즉시 매핑 추정 → 분석이 자동으로 이어지고 /dashboard로 이동한다.
// ⚠️ 인증 정책 + 유료 호출: 실행 전 (1) 우회 vs 정식 인증, (2) Claude 유료 호출(매핑 1 + 분류 1) 사전 승인 필수.
//    유효한 ANTHROPIC_API_KEY 필요.
// 실행: dev-browser --headless --timeout 200 run tests/e2e/s8_upload_analyze.js
const CSV_TEXT = [
  "거래일자,가맹점,이용금액,승인번호",
  "2026-06-01,스타벅스 강남,5800,00012345",
  "2026-06-02,쿠팡,32000,00012346",
  "2026-06-03,GS25 역삼,4200,00012347",
  "2026-06-05,넷플릭스,17000,00012348",
  "2026-06-10,이마트 성수,86500,00012349",
  "2026-06-15,카카오택시,9300,00012350",
  "",
].join("\n");

// QuickJS 샌드박스에는 TextEncoder/fs가 없어 UTF-8을 수동 인코딩한다.
function utf8Bytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return bytes;
}
const byteArr = utf8Bytes(CSV_TEXT);
const csvBytes = typeof Buffer !== "undefined" ? Buffer.from(byteArr) : new Uint8Array(byteArr);
const out = {};

const page = await browser.getPage("e2e");
// 1) 로그인 (이미 인증된 세션이면 건너뜀)
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
const hasEmail = (await page.locator("input#email").count()) > 0;
out.alreadyAuthed = !hasEmail;
if (hasEmail) {
  await page.fill("input#email", "qa@finsight.test");
  await page.fill("input#password", "whatever123");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {}),
    page.locator('button[type="submit"]').click(),
  ]);
}

// 2) 업로드 페이지 → 파일 주입
await page.goto("http://localhost:3000/dashboard/upload", { waitUntil: "domcontentloaded" });
await page.locator('input[type="file"]').setInputFiles({
  name: "sample.csv",
  mimeType: "text/csv",
  buffer: csvBytes,
});

// 3) 자동 로딩 단계 대기 (실제 Sonnet mapColumns 호출 중)
out.reachedLoading = await page
  .getByText("CSV를 읽고 컬럼을 매핑하는 중입니다.")
  .waitFor({ timeout: 60000 })
  .then(() => true)
  .catch(() => false);
await saveScreenshot(await page.screenshot(), "s8_loading.png");

// 4) 매핑 추정 → 분석(실제 Sonnet classifyTransactions)이 자동으로 이어지고 /dashboard로 이동
await page.waitForURL("**/dashboard", { timeout: 150000 }).catch(() => {});
await page.waitForTimeout(1500);
out.urlAfterAnalyze = page.url();

// 7) 인사이트 검증
out.hasTotalStat = (await page.getByText("총 지출").count()) > 0;
out.hasBreakdown = (await page.getByText("카테고리별 지출").count()) > 0;
out.hasRecentTx = (await page.getByText("최근 거래").count()) > 0;
out.errorShown = (await page.getByText("요청 실패").count().catch(() => 0)) > 0;
await saveScreenshot(await page.screenshot(), "s8_insight.png");

out.pass =
  /\/dashboard$/.test(out.urlAfterAnalyze) &&
  out.hasTotalStat &&
  out.hasBreakdown &&
  !out.errorShown;

console.log(JSON.stringify({ scenario: "S8 upload->auto-analysis (real Sonnet)", ...out }, null, 2));
