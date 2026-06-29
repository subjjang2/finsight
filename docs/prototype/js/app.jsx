/* finsight — app root: nav, core flow, tweaks. Mounts to #root. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "insightsViz": "table",
  "accent": "#10b981",
  "tone": "charcoal"
}/*EDITMODE-END*/;

const ACCENTS = {
  "#10b981": { glow: "rgba(16,185,129,0.35)", dim: "rgba(16,185,129,0.12)" },   // emerald
  "#14b8c4": { glow: "rgba(20,184,196,0.35)", dim: "rgba(20,184,196,0.12)" },   // teal
  "#84cc16": { glow: "rgba(132,204,22,0.32)", dim: "rgba(132,204,22,0.12)" },   // lime
};

const TONES = {
  charcoal: { canvas: '#0a0b0d', surface: '#121417', s2: '#16181c', s3: '#22252b', line: '#23262d', lineStrong: '#33373f' },
  slate:    { canvas: '#0b0e14', surface: '#11151d', s2: '#161b24', s3: '#222a37', line: '#222a37', lineStrong: '#323c4c' },
};

function applyTheme(t) {
  const a = ACCENTS[t.accent] || ACCENTS['#10b981'];
  const tn = TONES[t.tone] || TONES.charcoal;
  const r = document.documentElement.style;
  // finsight dark theme vars
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent-glow', a.glow);
  r.setProperty('--accent-dim', a.dim);
  r.setProperty('--canvas', tn.canvas);
  r.setProperty('--surface', tn.surface);
  r.setProperty('--surface-2', tn.s2);
  r.setProperty('--surface-3', tn.s3);
  r.setProperty('--line', tn.line);
  r.setProperty('--line-strong', tn.lineStrong);
  r.setProperty('--ink', '#f3f5f6');
  r.setProperty('--muted', '#9aa0a8');
  r.setProperty('--muted-soft', '#6b7177');
  r.setProperty('--up', '#34d399');
  r.setProperty('--down', '#f0716b');
  // retarget Coinbase DS tokens so its components render in the dark/emerald theme
  r.setProperty('--color-primary', t.accent);
  r.setProperty('--color-primary-active', t.accent);
  r.setProperty('--color-primary-disabled', tn.s3);
  r.setProperty('--color-on-primary', '#04140d');
  r.setProperty('--color-canvas', tn.surface);
  r.setProperty('--color-surface-strong', tn.s3);
  r.setProperty('--color-surface-dark', tn.s2);
  r.setProperty('--color-surface-dark-elevated', tn.s3);
  r.setProperty('--color-ink', '#f3f5f6');
  r.setProperty('--color-body', '#9aa0a8');
  r.setProperty('--color-muted', '#9aa0a8');
  r.setProperty('--color-hairline', tn.lineStrong);
  r.setProperty('--color-on-dark', '#f3f5f6');
  r.setProperty('--color-on-dark-soft', '#9aa0a8');
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [authed, setAuthed] = React.useState(false);
  const [screen, setScreen] = React.useState('insights'); // insights|upload|trend|pricing|mapping|analyzing
  const [picked, setPicked] = React.useState(false);
  const [plan, setPlan] = React.useState('Free');
  const [firstRun, setFirstRun] = React.useState(false);

  React.useEffect(() => { applyTheme(t); }, [t.accent, t.tone]);
  React.useEffect(() => { applyTheme(t); }, []);

  const usage = { used: FREE_USAGE.used, limit: FREE_USAGE.limit };

  if (!authed) {
    return (
      <>
        <AuthScreen onLogin={() => { setAuthed(true); setScreen('insights'); }} />
        <TweaksUI t={t} setTweak={setTweak} />
      </>
    );
  }

  const nav = (id) => {
    if (id === 'auth') { setAuthed(false); return; }
    setScreen(id);
  };

  let content;
  if (screen === 'upload') content = <UploadScreen usage={usage} picked={picked} firstRun={firstRun} onPick={() => setPicked(true)} onStartMapping={() => setScreen('mapping')} />;
  else if (screen === 'mapping') content = <MappingScreen onBack={() => setScreen('upload')} onAnalyze={() => { setScreen('analyzing'); setTimeout(() => { setScreen('insights'); setPicked(false); }, 1900); }} />;
  else if (screen === 'analyzing') content = <AnalyzingScreen />;
  else if (screen === 'trend') content = <TrendScreen />;
  else if (screen === 'pricing') content = <PricingScreen plan={plan} onUpgrade={() => setPlan('Pro')} />;
  else content = <InsightsScreen viz={t.insightsViz} onReupload={() => { setScreen('upload'); }} />;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--canvas)' }}>
      <Sidebar current={['mapping','analyzing'].includes(screen) ? 'upload' : screen} onNav={nav} usage={usage} plan={plan} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 48px 80px' }}>
          {content}
        </div>
      </main>
      <TweaksUI t={t} setTweak={setTweak} />
    </div>
  );
}

function TweaksUI({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="인사이트 시각화" />
      <TweakRadio label="카테고리 표시" value={t.insightsViz}
        options={[{ value: 'table', label: '표' }, { value: 'chart', label: '차트' }, { value: 'cards', label: '카드' }]}
        onChange={(v) => setTweak('insightsViz', v)} />
      <TweakSection label="테마" />
      <TweakColor label="포인트 색" value={t.accent}
        options={['#10b981', '#14b8c4', '#84cc16']}
        onChange={(v) => setTweak('accent', v)} />
      <TweakRadio label="배경 톤" value={t.tone}
        options={[{ value: 'charcoal', label: '차콜' }, { value: 'slate', label: '슬레이트' }]}
        onChange={(v) => setTweak('tone', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
