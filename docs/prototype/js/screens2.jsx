/* finsight — insights / trend / pricing screens. Exported to window. */
const DS2 = window.CoinbaseDesignSystem_5a6267;

// ════════════════════════ INSIGHTS (primary) ════════════════════════
function InsightsScreen({ viz, onReupload }) {
  const rows = MAY_BREAKDOWN.filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);
  const top = rows[0];
  const dailyAvg = MAY_TOTAL / 31;

  return (
    <div>
      <PageHeader
        title="2026년 5월 분석"
        sub={`${RAW_CSV.fileName} · ${MAY_COUNT}건 · Claude Sonnet 기본 분석`}
        right={<DS2.Button variant="secondary-dark" onClick={onReupload}>새 명세서 분석</DS2.Button>}
      />

      {/* stat row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Stat label="총 지출" value={won(MAY_TOTAL)} delta="5.4%" deltaDir="up" />
        <Stat label="거래 건수" value={MAY_COUNT.toLocaleString('ko-KR') + '건'} delta="8.0%" deltaDir="up" />
        <Stat label="일평균" value={won(dailyAvg)} />
        <Stat label="최다 카테고리" value={catLabel(top.id)} delta={pct(top.amount, MAY_TOTAL).toFixed(1) + '%'} deltaDir="flat" />
      </div>

      {/* AI summary */}
      <Panel style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: 'var(--accent-dim)', display: 'grid', placeItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em', marginBottom: 6 }}>AI 요약</div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--ink)' }}>{AI_SUMMARY}</p>
        </div>
      </Panel>

      {/* category breakdown — tweakable visualization */}
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>카테고리별 지출</div>
          <span className="num" style={{ fontSize: 13, color: 'var(--muted)' }}>{rows.length}개 카테고리</span>
        </div>
        {viz === 'table' && <CatTable rows={rows} total={MAY_TOTAL} />}
        {viz === 'chart' && (
          <div style={{ display: 'grid', gridTemplateColumns: '188px 1fr', gap: 40, alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              <Donut rows={rows} total={MAY_TOTAL} />
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>{wonShort(MAY_TOTAL)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>총 지출</div>
              </div>
            </div>
            <HBar rows={rows} total={MAY_TOTAL} />
          </div>
        )}
        {viz === 'cards' && <CatCards rows={rows} total={MAY_TOTAL} />}
      </Panel>
    </div>
  );
}

function CatTable({ rows, total }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 0.7fr 0.7fr', padding: '0 4px 12px', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' }}>
        <span>카테고리</span><span>비중</span><span style={{ textAlign: 'right' }}>건수</span><span style={{ textAlign: 'right' }}>금액</span>
      </div>
      {rows.map((r, i) => {
        const p = pct(r.amount, total);
        return (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 0.7fr 0.7fr', alignItems: 'center', padding: '13px 4px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: emeraldScale(i, rows.length) }} />{catLabel(r.id)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 24 }}>
              <span style={{ flex: 1, height: 8, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${p}%`, background: emeraldScale(i, rows.length), borderRadius: 99 }} />
              </span>
              <span className="num" style={{ fontSize: 12.5, color: 'var(--muted)', minWidth: 40, textAlign: 'right' }}>{p.toFixed(1)}%</span>
            </span>
            <span className="num" style={{ fontSize: 13.5, color: 'var(--muted)', textAlign: 'right' }}>{r.count}</span>
            <span className="num" style={{ fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}>{won(r.amount)}</span>
          </div>
        );
      })}
    </div>
  );
}

function CatCards({ rows, total }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
      {rows.map((r, i) => {
        const p = pct(r.amount, total);
        return (
          <div key={r.id} style={{ padding: 18, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ width: 11, height: 11, borderRadius: 4, background: emeraldScale(i, rows.length) }} />
              <span className="num" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.count}건</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{catLabel(r.id)}</div>
            <div className="num" style={{ marginTop: 4, fontSize: 19, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.4px' }}>{won(r.amount)}</div>
            <div style={{ marginTop: 12, height: 6, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${p}%`, background: emeraldScale(i, rows.length), borderRadius: 99 }} />
            </div>
            <div className="num" style={{ marginTop: 7, fontSize: 12, color: 'var(--muted)' }}>{p.toFixed(1)}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════ MONTHLY TREND ════════════════════════
function TrendScreen() {
  const max = Math.max(...MONTHLY.map((m) => m.total));
  const cur = MONTHLY[MONTHLY.length - 1], prev = MONTHLY[MONTHLY.length - 2];
  const delta = ((cur.total - prev.total) / prev.total) * 100;
  const avg = MONTHLY.reduce((s, m) => s + m.total, 0) / MONTHLY.length;

  return (
    <div>
      <PageHeader title="월별 추이" sub="최근 6개월 지출 흐름과 분석 이력" />

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Stat label="이번 달" value={won(cur.total)} delta={Math.abs(delta).toFixed(1) + '%'} deltaDir={delta >= 0 ? 'up' : 'down'} />
        <Stat label="6개월 평균" value={won(avg)} />
        <Stat label="최고 지출 월" value="2025.12" delta={won(max)} deltaDir="flat" />
      </div>

      <Panel style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 22 }}>월별 총 지출</div>
        <VBars data={MONTHLY} max={max} />
      </Panel>

      {/* top category trend */}
      <Panel style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>상위 카테고리 추이</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>지출이 큰 3개 카테고리의 월별 변화</div>
        {TOP_TREND.map((t, ti) => {
          const tmax = Math.max(...TOP_TREND.flatMap((x) => x.values));
          return (
            <div key={t.id} style={{ marginBottom: ti < TOP_TREND.length - 1 ? 20 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{catLabel(t.id)}</span>
                <span className="num" style={{ fontSize: 13, color: 'var(--muted)' }}>{won(t.values[t.values.length - 1])}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 56 }}>
                {t.values.map((v, vi) => (
                  <div key={vi} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', maxWidth: 40, height: `${(v / tmax) * 100}%`, borderRadius: '6px 6px 0 0', background: vi === t.values.length - 1 ? emeraldScale(ti, 3) : 'var(--surface-3)' }} />
                    <span style={{ fontSize: 10.5, color: 'var(--muted-soft)' }}>{MONTHLY[vi].label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Panel>

      {/* history list */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>분석 이력</div>
      <Panel pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px 1fr 70px', padding: '12px 22px', borderBottom: '1px solid var(--line)', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
          <span>월</span><span>파일</span><span style={{ textAlign: 'right' }}>건수</span><span style={{ textAlign: 'right' }}>총 지출</span><span style={{ textAlign: 'right' }}></span>
        </div>
        {HISTORY.map((h, i) => (
          <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px 1fr 70px', alignItems: 'center', padding: '14px 22px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <span className="num" style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 600 }}>{h.month}</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>{h.file}</span>
            <span className="num" style={{ fontSize: 13.5, color: 'var(--muted)', textAlign: 'right' }}>{h.count}</span>
            <span className="num" style={{ fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}>{won(h.total)}</span>
            <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>보기</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ════════════════════════ PRICING ════════════════════════
function PricingScreen({ plan, onUpgrade }) {
  return (
    <div>
      <PageHeader title="요금제" sub="분석 횟수는 매월 1일 리셋됩니다." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 720 }}>
        {/* Free */}
        <div style={{ padding: 28, borderRadius: 18, border: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Free</span>
            {plan === 'Free' && <DS2.Badge>현재 플랜</DS2.Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 400, color: 'var(--ink)', letterSpacing: '-1px' }}>₩0</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>/월</span>
          </div>
          <Features items={['월 5건 분석', 'AI 컬럼 매핑', '카테고리 분류 + 집계', '월별 추이 보관']} />
          <DS2.Button variant="secondary-dark" disabled={plan === 'Free'} style={{ width: '100%', marginTop: 'auto', opacity: plan === 'Free' ? 0.5 : 1 }}>
            {plan === 'Free' ? '사용 중' : 'Free로 변경'}
          </DS2.Button>
        </div>
        {/* Pro — featured */}
        <div style={{ padding: 28, borderRadius: 18, border: '1px solid var(--accent)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 22, position: 'relative', boxShadow: '0 0 0 1px var(--accent), 0 8px 40px -12px var(--accent-glow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Pro</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)', textTransform: 'uppercase' }}>추천</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 400, color: 'var(--ink)', letterSpacing: '-1px' }}>$9</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>/월</span>
          </div>
          <Features items={['무제한 분석 (공정사용 상한 월 200건)', 'AI 심층 분석', 'Free의 모든 기능', '우선 처리']} />
          <DS2.Button variant="primary" disabled={plan === 'Pro'} onClick={onUpgrade} style={{ width: '100%', marginTop: 'auto' }}>
            {plan === 'Pro' ? '사용 중' : 'Pro로 업그레이드'}
          </DS2.Button>
        </div>
      </div>
      <div style={{ marginTop: 20, fontSize: 13, color: 'var(--muted-soft)', maxWidth: 720 }}>
        결제는 Polar 호스팅 페이지에서 안전하게 처리됩니다 (USD). 환불·플랜 변경은 Polar 고객 포털에서 관리됩니다.
      </div>
    </div>
  );
}

function Features({ items }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((f, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--muted)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ color: 'var(--ink)' }}>{f}</span>
        </li>
      ))}
    </ul>
  );
}

window.__finsightScreens2 = { InsightsScreen, TrendScreen, PricingScreen };
Object.assign(window, window.__finsightScreens2);
