/* finsight — screens. Exported to window. */
const { useState } = React;
const DS = window.CoinbaseDesignSystem_5a6267;

// ════════════════════════ AUTH ════════════════════════
function AuthScreen({ onLogin }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: 'var(--canvas)' }}>
      {/* brand panel */}
      <div style={{ padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--line)' }}>
        <Logo size={26} />
        <div style={{ maxWidth: 460 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 400, letterSpacing: '-1.4px', lineHeight: 1.08, color: 'var(--ink)' }}>
            카드 명세서를 올리면<br/>지출이 정리됩니다.
          </div>
          <p style={{ marginTop: 20, fontSize: 16, lineHeight: 1.6, color: 'var(--muted)' }}>
            카드사 양식 그대로 CSV를 업로드하세요. AI가 컬럼을 인식하고 거래를 카테고리별로 분류해 한눈에 보여줍니다.
          </p>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted-soft)' }}>모든 데이터는 암호화되어 저장됩니다 · RLS 보호</div>
      </div>
      {/* form */}
      <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.3px' }}>로그인</h2>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--muted)' }}>finsight 계정으로 계속하기</p>
          </div>
          <DS.Input label="이메일" type="email" defaultValue="jaehyun@example.com" placeholder="you@example.com" />
          <DS.Input label="비밀번호" type="password" defaultValue="········" placeholder="비밀번호" />
          <DS.Button variant="primary" onClick={onLogin} style={{ width: '100%' }}>로그인</DS.Button>
          <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--muted)' }}>
            계정이 없으신가요? <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} onClick={onLogin}>회원가입</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════ UPLOAD (empty / first-run) ════════════════════════
function UploadScreen({ onPick, picked, onStartMapping, usage, firstRun }) {
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <PageHeader
        title="명세서 업로드"
        sub="카드사 양식 그대로 CSV를 올리면 AI가 알아서 정리합니다."
        right={<DS.Badge>{`이번 달 ${usage.used}/${usage.limit}건`}</DS.Badge>}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onPick(); }}
        onClick={() => !picked && onPick()}
        style={{
          border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--line-strong)'}`,
          borderRadius: 18, background: drag ? 'var(--accent-dim)' : 'var(--surface)',
          padding: '56px 40px', textAlign: 'center', cursor: picked ? 'default' : 'pointer',
          transition: 'border-color 150ms, background 150ms',
        }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/></svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>CSV 파일을 끌어다 놓거나 클릭해서 선택</div>
        <div style={{ marginTop: 8, fontSize: 13.5, color: 'var(--muted)' }}>삼성·국민·현대·신한 등 모든 카드사 · EUC-KR / UTF-8 자동 감지</div>
      </div>

      {picked && (
        <Panel style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--accent-dim)', display: 'grid', placeItems: 'center', color: 'var(--accent)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>CSV</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{RAW_CSV.fileName}</div>
              <div className="num" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{RAW_CSV.rowCount}행 · {RAW_CSV.encoding} 인코딩 감지됨</div>
            </div>
          </div>
          <DS.Button variant="primary" onClick={onStartMapping}>AI 컬럼 매핑 시작</DS.Button>
        </Panel>
      )}

      <div style={{ marginTop: 36 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 14 }}>최근 업로드</div>
        {firstRun ? (
          <Panel style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 600 }}>아직 업로드한 명세서가 없습니다</div>
            <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--muted)' }}>첫 명세서를 올리면 여기에 분석 이력이 쌓입니다.</div>
          </Panel>
        ) : (
          <Panel pad={0} style={{ overflow: 'hidden' }}>
            {HISTORY.slice(0, 3).map((h, i) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span className="num" style={{ fontSize: 13, color: 'var(--muted)', minWidth: 56 }}>{h.month}</span>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{h.file}</span>
                </div>
                <span className="num" style={{ fontSize: 14, color: 'var(--ink)' }}>{won(h.total)}</span>
              </div>
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
}

// ════════════════════════ COLUMN MAPPING ════════════════════════
function MappingScreen({ onBack, onAnalyze }) {
  const [mapping, setMapping] = useState(COLUMN_MAPPING.map((m) => m.field));
  const setField = (i, v) => setMapping((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  const fieldLabel = (v) => FIELD_OPTIONS.find((o) => o.value === v)?.label || v;

  return (
    <div>
      <PageHeader
        title="AI 컬럼 매핑 확인"
        sub={`${RAW_CSV.fileName} · Claude가 인식한 컬럼을 확인하고 필요하면 수정하세요.`}
        right={<DS.Button variant="secondary-dark" onClick={onBack}>뒤로</DS.Button>}
      />

      <Panel pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 1fr 0.9fr', padding: '13px 22px', borderBottom: '1px solid var(--line)', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
          <span>원본 컬럼</span><span>예시 값</span><span>매핑 필드</span><span style={{ textAlign: 'right' }}>신뢰도</span>
        </div>
        {COLUMN_MAPPING.map((m, i) => {
          const ignored = mapping[i] === 'ignore';
          return (
            <div key={m.source} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 1fr 0.9fr', alignItems: 'center', padding: '14px 22px', borderTop: i ? '1px solid var(--line)' : 'none', opacity: ignored ? 0.55 : 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{m.source}</span>
              <span className="num" style={{ fontSize: 13.5, color: 'var(--muted)' }}>{m.sample}</span>
              <Select value={mapping[i]} onChange={(v) => setField(i, v)} options={FIELD_OPTIONS} />
              <span style={{ textAlign: 'right' }}>
                <span className="num" style={{ fontSize: 13, color: m.confidence >= 0.95 ? 'var(--up)' : 'var(--muted)', fontWeight: 600 }}>{Math.round(m.confidence * 100)}%</span>
              </span>
            </div>
          );
        })}
      </Panel>

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
        필수 필드 매핑됨: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{['date','merchant','amount'].filter((f) => mapping.includes(f)).map(fieldLabel).join(' · ')}</span>
      </div>

      {/* preview */}
      <div style={{ marginTop: 28, fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>정규화 미리보기</div>
      <Panel pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', padding: '12px 22px', borderBottom: '1px solid var(--line)', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
          <span>날짜</span><span>가맹점명</span><span style={{ textAlign: 'right' }}>금액</span>
        </div>
        {RAW_CSV.rows.slice(0, 5).map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', padding: '11px 22px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <span className="num" style={{ fontSize: 13, color: 'var(--muted)' }}>{r[0].replace(/\./g, '-')}</span>
            <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{r[1]}</span>
            <span className="num" style={{ fontSize: 13.5, color: 'var(--ink)', textAlign: 'right' }}>₩{r[2]}</span>
          </div>
        ))}
      </Panel>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <DS.Button variant="primary" onClick={onAnalyze}>분석 실행</DS.Button>
      </div>
    </div>
  );
}

// minimal dark select
function Select({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative', maxWidth: 150 }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        appearance: 'none', WebkitAppearance: 'none', width: '100%', padding: '8px 32px 8px 12px',
        borderRadius: 9, border: '1px solid var(--line-strong)', background: 'var(--surface-2)',
        color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 13.5, cursor: 'pointer', outline: 'none',
      }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M6 9l6 6 6-6"/></svg>
    </div>
  );
}

// ════════════════════════ ANALYZING (loading) ════════════════════════
function AnalyzingScreen() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="fs-spin" style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--surface-3)', borderTopColor: 'var(--accent)', margin: '0 auto 22px' }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Claude가 거래를 분류하고 있습니다…</div>
        <div className="num" style={{ marginTop: 8, fontSize: 13.5, color: 'var(--muted)' }}>{RAW_CSV.rowCount}건 · 12개 카테고리로 집계 중</div>
      </div>
    </div>
  );
}

window.__finsightScreens1 = { AuthScreen, UploadScreen, MappingScreen, AnalyzingScreen, Select };
Object.assign(window, window.__finsightScreens1);
