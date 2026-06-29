/* finsight — shared dark dashboard chrome + chart primitives. Exported to window. */

// ── Brand logo: emerald glyph + wordmark ──
function Logo({ size = 22, showWord = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="0" y="0" width="32" height="32" rx="9" fill="var(--accent)" />
        <path d="M9 20.5 L14 13 L18.5 17.5 L23 10.5" stroke="#04140d" strokeWidth="2.6"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="23" cy="10.5" r="2.4" fill="#04140d" />
      </svg>
      {showWord && (
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500,
          letterSpacing: '-0.6px', color: 'var(--ink)' }}>finsight</span>
      )}
    </div>
  );
}

// ── Sidebar nav ──
function Sidebar({ current, onNav, usage, plan }) {
  const items = [
    { id: 'insights', label: '대시보드', icon: 'grid' },
    { id: 'upload',   label: '업로드',   icon: 'upload' },
    { id: 'trend',    label: '월별 추이', icon: 'trend' },
    { id: 'pricing',  label: '요금제',   icon: 'spark' },
  ];
  return (
    <nav style={{
      width: 232, flexShrink: 0, height: '100%', borderRight: '1px solid var(--line)',
      background: 'var(--canvas)', display: 'flex', flexDirection: 'column',
      padding: '22px 16px', gap: 4,
    }}>
      <div style={{ padding: '4px 8px 22px' }}><Logo /></div>
      {items.map((it) => {
        const active = current === it.id;
        return (
          <button key={it.id} onClick={() => onNav(it.id)} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 14,
            fontWeight: active ? 600 : 500,
            color: active ? 'var(--ink)' : 'var(--muted)',
            background: active ? 'var(--surface-2)' : 'transparent',
            transition: 'background 120ms, color 120ms',
          }}>
            <NavIcon name={it.icon} active={active} />
            {it.label}
          </button>
        );
      })}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <UsageMeter usage={usage} plan={plan} onNav={onNav} />
        <button onClick={() => onNav('auth')} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--muted)', fontFamily: 'var(--font-sans)', fontSize: 13,
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-3)',
            display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--ink)', fontWeight: 600,
          }}>이</span>
          이재현
        </button>
      </div>
    </nav>
  );
}

function UsageMeter({ usage, plan, onNav }) {
  if (plan === 'Pro') {
    return (
      <div style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Pro</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>무제한 분석</div>
      </div>
    );
  }
  const ratio = usage.used / usage.limit;
  return (
    <div style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>이번 달 분석</span>
        <span className="num" style={{ fontSize: 13, color: 'var(--muted)' }}>{usage.used}/{usage.limit}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${ratio * 100}%`, background: 'var(--accent)', borderRadius: 99 }} />
      </div>
      <button onClick={() => onNav('pricing')} style={{
        marginTop: 12, width: '100%', padding: '8px', borderRadius: 99, border: '1px solid var(--line)',
        background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-sans)',
        fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
      }}>Pro로 업그레이드</button>
    </div>
  );
}

function NavIcon({ name, active }) {
  const c = active ? 'var(--ink)' : 'var(--muted)';
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'grid') return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  if (name === 'upload') return <svg {...p}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/></svg>;
  if (name === 'trend') return <svg {...p}><path d="M3 17l5-5 4 4 8-9"/><path d="M21 7v5"/><path d="M16 7h5"/></svg>;
  if (name === 'spark') return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>;
  return null;
}

// ── Page header (topbar inside content) ──
function PageHeader({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--ink)' }}>{title}</h1>
        {sub && <div style={{ marginTop: 6, fontSize: 14, color: 'var(--muted)' }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ── Surface card ──
function Panel({ children, style = {}, pad = 24, ...rest }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: pad, ...style }} {...rest}>
      {children}
    </div>
  );
}

// ── Stat tile ──
function Stat({ label, value, delta, deltaDir }) {
  const dc = deltaDir === 'up' ? 'var(--up)' : deltaDir === 'down' ? 'var(--down)' : 'var(--muted)';
  return (
    <Panel pad={20} style={{ flex: 1 }}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{label}</div>
      <div className="num" style={{ fontSize: 26, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.5px' }}>{value}</div>
      {delta && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: dc, display: 'flex', alignItems: 'center', gap: 4 }}>
          {deltaDir === 'up' ? '▲' : deltaDir === 'down' ? '▼' : ''} <span className="num">{delta}</span>
        </div>
      )}
    </Panel>
  );
}

// ── emerald sequential scale for category bars (brightest = largest) ──
function emeraldScale(i, n) {
  // i=0 brightest. fade toward neutral as rank drops.
  const t = n <= 1 ? 0 : i / (n - 1);
  const light = 62 - t * 26;     // 62% → 36%
  const chroma = 0.16 - t * 0.135; // saturated emerald → near-gray
  return `oklch(${light}% ${chroma} 165)`;
}

// ── horizontal bar (category breakdown chart variant) ──
function HBar({ rows, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {rows.map((r, i) => {
        const p = pct(r.amount, total);
        return (
          <div key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13.5 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{catLabel(r.id)}</span>
              <span style={{ display: 'flex', gap: 12 }}>
                <span className="num" style={{ color: 'var(--muted)' }}>{p.toFixed(1)}%</span>
                <span className="num" style={{ color: 'var(--ink)', minWidth: 88, textAlign: 'right' }}>{won(r.amount)}</span>
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${p}%`, background: emeraldScale(i, rows.length), borderRadius: 99, transition: 'width 600ms cubic-bezier(.2,.7,.2,1)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── donut (used in cards variant + summary) ──
function Donut({ rows, total, size = 168 }) {
  const r = size / 2 - 14, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
      {rows.filter((x) => x.amount > 0).map((row, i) => {
        const frac = row.amount / total;
        const dash = `${frac * c} ${c}`;
        const off = -acc * c;
        acc += frac;
        return <circle key={row.id} cx={size/2} cy={size/2} r={r} fill="none"
          stroke={emeraldScale(i, rows.length)} strokeWidth="14" strokeDasharray={dash}
          strokeDashoffset={off} strokeLinecap="butt" />;
      })}
    </svg>
  );
}

// ── vertical bar chart (monthly trend) ──
function VBars({ data, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 220, padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = (d.total / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, height: '100%', justifyContent: 'flex-end' }}>
            <span className="num" style={{ fontSize: 11.5, color: isLast ? 'var(--ink)' : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>{wonShort(d.total)}</span>
            <div style={{ width: '100%', maxWidth: 54, height: `${h}%`, borderRadius: '8px 8px 0 0',
              background: isLast ? 'var(--accent)' : 'var(--surface-3)', transition: 'height 600ms cubic-bezier(.2,.7,.2,1)' }} />
            <span style={{ fontSize: 12, color: isLast ? 'var(--ink)' : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { Logo, Sidebar, PageHeader, Panel, Stat, HBar, Donut, VBars, emeraldScale });
