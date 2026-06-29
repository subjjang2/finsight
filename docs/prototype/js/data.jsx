/* finsight — sample data (Korean card-spend). Exported to window. */

// 고정 12개 카테고리 (PRD 미결 #2 — 확정안)
const CATEGORIES = [
  { id: 'dining',    label: '식비',         emoji: null },
  { id: 'shopping',  label: '쇼핑',         emoji: null },
  { id: 'grocery',   label: '마트·생필품',   emoji: null },
  { id: 'cafe',      label: '카페·간식',     emoji: null },
  { id: 'transport', label: '교통',         emoji: null },
  { id: 'utilities', label: '주거·통신',     emoji: null },
  { id: 'leisure',   label: '문화·여가',     emoji: null },
  { id: 'medical',   label: '의료·건강',     emoji: null },
  { id: 'finance',   label: '보험·금융',     emoji: null },
  { id: 'education', label: '교육',         emoji: null },
  { id: 'travel',    label: '여행·숙박',     emoji: null },
  { id: 'etc',       label: '기타',         emoji: null },
];

// 2026년 5월 분석 결과 (카테고리별 집계)
const MAY_BREAKDOWN = [
  { id: 'dining',    amount: 812400, count: 38 },
  { id: 'shopping',  amount: 498200, count: 12 },
  { id: 'grocery',   amount: 356900, count: 18 },
  { id: 'cafe',      amount: 243700, count: 41 },
  { id: 'transport', amount: 187500, count: 29 },
  { id: 'utilities', amount: 168000, count: 4  },
  { id: 'leisure',   amount: 142300, count: 7  },
  { id: 'medical',   amount: 98400,  count: 5  },
  { id: 'finance',   amount: 72000,  count: 2  },
  { id: 'education', amount: 39000,  count: 1  },
  { id: 'travel',    amount: 0,      count: 0  },
  { id: 'etc',       amount: 28900,  count: 5  },
];

const MAY_TOTAL = MAY_BREAKDOWN.reduce((s, c) => s + c.amount, 0); // 2,647,300
const MAY_COUNT = MAY_BREAKDOWN.reduce((s, c) => s + c.count, 0);  // 162

// 월별 추이 (6개월)
const MONTHLY = [
  { month: '2025.12', label: '12월', total: 3210800, count: 198 },
  { month: '2026.01', label: '1월',  total: 2180400, count: 131 },
  { month: '2026.02', label: '2월',  total: 2640100, count: 154 },
  { month: '2026.03', label: '3월',  total: 2455900, count: 147 },
  { month: '2026.04', label: '4월',  total: 2512300, count: 150 },
  { month: '2026.05', label: '5월',  total: 2647300, count: 162 },
];

// 상위 3개 카테고리 월별 추이 (스택/비교용)
const TOP_TREND = [
  { id: 'dining',   values: [902000, 701000, 798000, 765000, 740000, 812400] },
  { id: 'shopping', values: [712000, 388000, 520000, 441000, 470000, 498200] },
  { id: 'cafe',     values: [198000, 171000, 205000, 219000, 207000, 243700] },
];

// 분석 이력 (저장된 명세서)
const HISTORY = [
  { id: 'h6', month: '2026.05', file: 'samsung_card_2026_05.csv', total: 2647300, count: 162, plan: 'Free' },
  { id: 'h5', month: '2026.04', file: 'samsung_card_2026_04.csv', total: 2512300, count: 150, plan: 'Free' },
  { id: 'h4', month: '2026.03', file: 'kb_check_2026_03.csv',     total: 2455900, count: 147, plan: 'Free' },
  { id: 'h3', month: '2026.02', file: 'kb_check_2026_02.csv',     total: 2640100, count: 154, plan: 'Free' },
  { id: 'h2', month: '2026.01', file: 'hyundai_2026_01.csv',      total: 2180400, count: 131, plan: 'Free' },
  { id: 'h1', month: '2025.12', file: 'hyundai_2025_12.csv',      total: 3210800, count: 198, plan: 'Free' },
];

// 업로드된 원본 CSV (카드사 양식 그대로 — 헤더/날짜형식 제각각)
const RAW_CSV = {
  fileName: 'samsung_card_2026_05.csv',
  rowCount: 162,
  encoding: 'EUC-KR',
  headers: ['이용일자', '가맹점', '이용금액(원)', '승인번호', '할부'],
  rows: [
    ['2026.05.02', '스타벅스 강남R점',   '6,300',  '00481234', '일시불'],
    ['2026.05.02', '배달의민족',         '23,500', '00481235', '일시불'],
    ['2026.05.03', 'GS25 역삼점',        '4,800',  '00481239', '일시불'],
    ['2026.05.04', '쿠팡',              '38,900', '00481244', '일시불'],
    ['2026.05.05', '이마트 성수점',       '74,210', '00481251', '일시불'],
    ['2026.05.06', '카카오T',           '11,200', '00481260', '일시불'],
    ['2026.05.07', '메가커피 선릉점',     '2,500',  '00481268', '일시불'],
    ['2026.05.08', '올리브영',           '29,400', '00481275', '3개월'],
  ],
};

// Claude 컬럼 매핑 결과 (각 원본 헤더 → date/merchant/amount/ignore)
const COLUMN_MAPPING = [
  { source: '이용일자',     sample: '2026.05.02',      field: 'date',     confidence: 0.98 },
  { source: '가맹점',       sample: '스타벅스 강남R점',  field: 'merchant', confidence: 0.99 },
  { source: '이용금액(원)', sample: '6,300',           field: 'amount',   confidence: 0.97 },
  { source: '승인번호',     sample: '00481234',         field: 'ignore',   confidence: 0.93 },
  { source: '할부',         sample: '일시불',           field: 'ignore',   confidence: 0.88 },
];

const FIELD_OPTIONS = [
  { value: 'date',     label: '날짜' },
  { value: 'merchant', label: '가맹점명' },
  { value: 'amount',   label: '금액' },
  { value: 'ignore',   label: '무시' },
];

// 분류된 거래 (가맹점 → 카테고리, 인사이트 표 보강용)
const CLASSIFIED = [
  { date: '2026.05.02', merchant: '스타벅스 강남R점', amount: 6300,  cat: 'cafe' },
  { date: '2026.05.02', merchant: '배달의민족',       amount: 23500, cat: 'dining' },
  { date: '2026.05.03', merchant: 'GS25 역삼점',      amount: 4800,  cat: 'grocery' },
  { date: '2026.05.04', merchant: '쿠팡',            amount: 38900, cat: 'shopping' },
  { date: '2026.05.05', merchant: '이마트 성수점',     amount: 74210, cat: 'grocery' },
  { date: '2026.05.06', merchant: '카카오T',          amount: 11200, cat: 'transport' },
  { date: '2026.05.07', merchant: '메가커피 선릉점',   amount: 2500,  cat: 'cafe' },
  { date: '2026.05.08', merchant: '올리브영',         amount: 29400, cat: 'shopping' },
];

// 요금제 (PRD 미결 #1 — 확정안: Pro $9/mo, fair-use 200건/월)
const PRICING = {
  free:  { name: 'Free', price: '₩0',     period: '/월', cap: '월 5건 분석' },
  pro:   { name: 'Pro',  price: '$9',     period: '/월', cap: '무제한 (공정사용 상한 월 200건)' },
};

// AI 인사이트 요약 (Claude 생성 결과 — 서술형)
const AI_SUMMARY =
  '5월 총 지출은 ₩2,647,300으로 전월 대비 5.4% 늘었습니다. 식비가 전체의 30.7%(₩812,400)로 가장 큰 비중을 차지했고, ' +
  '카페·간식이 41건으로 거래 건수가 가장 많았습니다. 전월 대비 카페·간식 지출이 17.7% 증가한 점이 눈에 띕니다.';

const FREE_USAGE = { used: 2, limit: 5 }; // 이번 달 분석 횟수 (게이팅 기준)

// ── helpers ──
function won(n) {
  return '₩' + Math.round(n).toLocaleString('ko-KR');
}
function wonShort(n) {
  if (n >= 10000) return (n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '만';
  return n.toLocaleString('ko-KR');
}
function catLabel(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.label : id;
}
function pct(n, total) {
  return total ? (n / total) * 100 : 0;
}

Object.assign(window, {
  CATEGORIES, MAY_BREAKDOWN, MAY_TOTAL, MAY_COUNT, MONTHLY, TOP_TREND,
  HISTORY, RAW_CSV, COLUMN_MAPPING, FIELD_OPTIONS, CLASSIFIED, PRICING,
  AI_SUMMARY, FREE_USAGE, won, wonShort, catLabel, pct,
});
