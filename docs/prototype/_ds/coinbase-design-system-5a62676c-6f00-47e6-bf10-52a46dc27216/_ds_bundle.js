/* @ds-bundle: {"format":3,"namespace":"CoinbaseDesignSystem_5a6267","components":[{"name":"Card","sourcePath":"components/cards/Card.jsx"},{"name":"FeatureCard","sourcePath":"components/cards/FeatureCard.jsx"},{"name":"PricingTier","sourcePath":"components/cards/PricingTier.jsx"},{"name":"ProductUICard","sourcePath":"components/cards/ProductUICard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Wordmark","sourcePath":"components/core/Wordmark.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SearchPill","sourcePath":"components/forms/SearchPill.jsx"},{"name":"TopNav","sourcePath":"components/navigation/TopNav.jsx"},{"name":"AssetIcon","sourcePath":"components/trading/AssetIcon.jsx"},{"name":"AssetRow","sourcePath":"components/trading/AssetRow.jsx"},{"name":"PriceCell","sourcePath":"components/trading/PriceCell.jsx"}],"sourceHashes":{"components/cards/Card.jsx":"5f6b16060f8c","components/cards/FeatureCard.jsx":"04d6012f3f26","components/cards/PricingTier.jsx":"87ed1f71d911","components/cards/ProductUICard.jsx":"2e2ad2b96642","components/core/Badge.jsx":"174bb3f4b298","components/core/Button.jsx":"65dc98d681f0","components/core/Wordmark.jsx":"16f98317bb02","components/forms/Input.jsx":"e814cdbb4b82","components/forms/SearchPill.jsx":"ce17cf958744","components/navigation/TopNav.jsx":"d4b2f5436042","components/trading/AssetIcon.jsx":"13ab7efba20b","components/trading/AssetRow.jsx":"96c07c384a1a","components/trading/PriceCell.jsx":"773ecb95d2f9","ui_kits/marketing-website/DeveloperPricing.jsx":"b752f1941a05","ui_kits/marketing-website/Explore.jsx":"50b4849be9bb","ui_kits/marketing-website/Homepage.jsx":"13025901395a","ui_kits/marketing-website/Shared.jsx":"e6c88a9a7025"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CoinbaseDesignSystem_5a6267 = window.CoinbaseDesignSystem_5a6267 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/cards/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — base container. 24px radius (xl), 32px padding. One elevation tier:
 * either flat, a hairline border, or a soft drop shadow.
 */
function Card({
  children,
  variant = 'hairline',
  // hairline | flat | shadow | dark | dark-elevated
  padding = 32,
  style = {},
  ...rest
}) {
  const variants = {
    flat: {
      background: 'var(--color-canvas)'
    },
    hairline: {
      background: 'var(--color-canvas)',
      border: '1px solid var(--color-hairline)'
    },
    shadow: {
      background: 'var(--color-canvas)',
      boxShadow: 'var(--shadow-soft)'
    },
    dark: {
      background: 'var(--color-surface-dark)',
      color: 'var(--color-on-dark)'
    },
    'dark-elevated': {
      background: 'var(--color-surface-dark-elevated)',
      color: 'var(--color-on-dark)'
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: 'var(--radius-xl)',
      padding: typeof padding === 'number' ? `${padding}px` : padding,
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Card.jsx", error: String((e && e.message) || e) }); }

// components/cards/FeatureCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * FeatureCard — used in 2-up / 3-up benefit grids. Optional glyph, title,
 * body, and a tertiary link. Hairline border by default.
 */
function FeatureCard({
  glyph,
  title,
  children,
  linkLabel,
  href,
  variant = 'hairline',
  style = {},
  ...rest
}) {
  const onDark = variant === 'dark' || variant === 'dark-elevated';
  return /*#__PURE__*/React.createElement(__ds_scope.Card, _extends({
    variant: variant,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      ...style
    }
  }, rest), glyph && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '4px'
    }
  }, glyph), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-title-lg-size)',
      fontWeight: 'var(--type-title-lg-weight)',
      lineHeight: 'var(--type-title-lg-lh)',
      letterSpacing: 'var(--type-title-lg-ls)',
      color: onDark ? 'var(--color-on-dark)' : 'var(--color-ink)'
    }
  }, title), children && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-md-size)',
      lineHeight: 'var(--type-body-md-lh)',
      color: onDark ? 'var(--color-on-dark-soft)' : 'var(--color-body)'
    }
  }, children), linkLabel && /*#__PURE__*/React.createElement("a", {
    href: href || '#',
    style: {
      marginTop: 'auto',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-button-size)',
      fontWeight: 600,
      color: 'var(--color-primary)',
      textDecoration: 'none'
    }
  }, linkLabel, " \u2192"));
}
Object.assign(__ds_scope, { FeatureCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/FeatureCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/ProductUICard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ProductUICard — the floating product-UI mockup that defines the dark hero.
 * Dark-elevated surface, 24px radius, often stacked at a slight rotation.
 */
function ProductUICard({
  children,
  tone = 'dark',
  rotate = 0,
  padding = 24,
  style = {},
  ...rest
}) {
  const tones = {
    dark: {
      background: 'var(--color-surface-dark-elevated)',
      color: 'var(--color-on-dark)',
      border: '1px solid rgba(255,255,255,0.06)'
    },
    light: {
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      border: '1px solid var(--color-hairline)'
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: 'var(--radius-xl)',
      padding: typeof padding === 'number' ? `${padding}px` : padding,
      boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { ProductUICard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/ProductUICard.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small uppercase pill used as a section label ("INSTITUTIONAL").
 * Soft-gray fill, caption-strong type, pill radius.
 */
function Badge({
  children,
  tone = 'default',
  style = {},
  ...rest
}) {
  const tones = {
    default: {
      background: 'var(--color-surface-strong)',
      color: 'var(--color-ink)'
    },
    dark: {
      background: 'var(--color-surface-dark-elevated)',
      color: 'var(--color-on-dark)'
    },
    up: {
      background: 'transparent',
      color: 'var(--color-semantic-up)'
    },
    down: {
      background: 'transparent',
      color: 'var(--color-semantic-down)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 12px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-caption-strong-size)',
      fontWeight: 'var(--type-caption-strong-weight)',
      lineHeight: 1,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      borderRadius: 'var(--radius-pill)',
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — the signature Coinbase pill. Every CTA is rounded-pill (100px).
 * Coinbase Blue is the only action color; secondary uses soft gray.
 */
function Button({
  children,
  variant = 'primary',
  // primary | secondary | secondary-dark | outline-dark | tertiary
  size = 'md',
  // md (44px) | lg (56px hero pill)
  disabled = false,
  onClick,
  href,
  style = {},
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--type-button-size)',
    fontWeight: 'var(--type-button-weight)',
    lineHeight: 'var(--type-button-lh)',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
    WebkitTapHighlightColor: 'transparent'
  };
  const sizes = {
    md: {
      height: '44px',
      padding: '0 20px'
    },
    lg: {
      height: '56px',
      padding: '0 32px'
    }
  };
  const variants = {
    primary: {
      background: disabled ? 'var(--color-primary-disabled)' : 'var(--color-primary)',
      color: 'var(--color-on-primary)'
    },
    secondary: {
      background: 'var(--color-surface-strong)',
      color: 'var(--color-ink)'
    },
    'secondary-dark': {
      background: 'var(--color-surface-dark-elevated)',
      color: 'var(--color-on-dark)'
    },
    'outline-dark': {
      background: 'transparent',
      color: 'var(--color-on-dark)',
      borderColor: 'var(--color-on-dark)'
    },
    tertiary: {
      background: 'transparent',
      color: 'var(--color-primary)',
      padding: 0,
      height: 'auto'
    }
  };
  const merged = {
    ...base,
    ...(variant === 'tertiary' ? {} : sizes[size]),
    ...variants[variant],
    ...(disabled ? {
      opacity: variant === 'primary' ? 1 : 0.5
    } : {}),
    ...style
  };
  const Tag = href && !disabled ? 'a' : 'button';
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    onClick: disabled ? undefined : onClick,
    disabled: Tag === 'button' ? disabled : undefined,
    "aria-disabled": disabled || undefined,
    style: merged
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/cards/PricingTier.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PricingTier — a tier card on the Developer Platform. Standard tiers use a
 * white hairline card; the featured tier inverts to the dark surface.
 */
function PricingTier({
  name,
  price,
  period = '/mo',
  features = [],
  ctaLabel = 'Get started',
  featured = false,
  onSelect,
  style = {},
  ...rest
}) {
  const onDark = featured;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '32px',
      borderRadius: 'var(--radius-xl)',
      background: featured ? 'var(--color-surface-dark)' : 'var(--color-canvas)',
      color: featured ? 'var(--color-on-dark)' : 'var(--color-ink)',
      border: featured ? 'none' : '1px solid var(--color-hairline)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-title-md-size)',
      fontWeight: 600
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '6px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--type-display-sm-size)',
      fontWeight: 400,
      letterSpacing: '-0.5px'
    }
  }, price), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: onDark ? 'var(--color-on-dark-soft)' : 'var(--color-muted)'
    }
  }, period))), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, features.map((f, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-md-size)',
      color: onDark ? 'var(--color-on-dark-soft)' : 'var(--color-body)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      flexShrink: 0,
      marginTop: '3px'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12.5l4.5 4.5L19 7.5",
    stroke: "var(--color-primary)",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), /*#__PURE__*/React.createElement("span", null, f)))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: featured ? 'primary' : 'secondary',
    onClick: onSelect,
    style: {
      marginTop: 'auto',
      width: '100%'
    }
  }, ctaLabel));
}
Object.assign(__ds_scope, { PricingTier });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/PricingTier.jsx", error: String((e && e.message) || e) }); }

// components/core/Wordmark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Wordmark — the Coinbase brand lockup. Logomark glyph + "Coinbase".
 * Note: the real wordmark uses custom lettering; this sets it in the
 * display font as a documented substitute.
 */
function Wordmark({
  variant = 'dark',
  symbolOnly = false,
  height = 28,
  style = {},
  ...rest
}) {
  // variant: 'dark' = ink text (on light), 'light' = white text (on dark)
  const markFill = 'var(--color-primary)';
  const textFill = variant === 'light' ? 'var(--color-on-dark)' : 'var(--color-ink)';
  const Symbol = /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 180 180",
    width: height,
    height: height,
    "aria-hidden": "true",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("path", {
    fill: markFill,
    fillRule: "evenodd",
    d: "M90 0C40.3 0 0 40.3 0 90s40.3 90 90 90 90-40.3 90-90S139.7 0 90 0zM72.7 72.1c0-2.3 1.9-4.2 4.2-4.2h26c2.3 0 4.2 1.9 4.2 4.2v35.8c0 2.3-1.9 4.2-4.2 4.2h-26c-2.3 0-4.2-1.9-4.2-4.2V72.1z"
  }));
  if (symbolOnly) {
    return /*#__PURE__*/React.createElement("span", _extends({
      role: "img",
      "aria-label": "Coinbase",
      style: {
        display: 'inline-flex',
        ...style
      }
    }, rest), Symbol);
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    role: "img",
    "aria-label": "Coinbase",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: height * 0.42,
      ...style
    }
  }, rest), Symbol, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 500,
      fontSize: height * 1.08,
      letterSpacing: '-0.04em',
      color: textFill,
      lineHeight: 1
    }
  }, "Coinbase"));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — standard text field. 12px radius, hairline border that thickens
 * to 2px Coinbase Blue on focus.
 */
function Input({
  label,
  hint,
  error,
  style = {},
  id,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || React.useId();
  const borderColor = error ? 'var(--color-semantic-down)' : focused ? 'var(--color-primary)' : 'var(--color-hairline)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontFamily: 'var(--font-sans)'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 'var(--type-title-sm-size)',
      fontWeight: 600,
      color: 'var(--color-ink)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: e => {
      setFocused(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur?.(e);
    },
    style: {
      height: '48px',
      padding: '14px 16px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-md-size)',
      color: 'var(--color-ink)',
      background: 'var(--color-canvas)',
      borderRadius: 'var(--radius-md)',
      border: `${focused ? '2px' : '1px'} solid ${borderColor}`,
      outline: 'none',
      transition: 'border-color 120ms ease, border-width 120ms ease',
      ...style
    }
  }, rest)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: error ? 'var(--color-semantic-down)' : 'var(--color-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SearchPill — pill-shaped search bar. Soft-gray fill, 44px, pill radius.
 */
function SearchPill({
  placeholder = 'Search',
  value,
  onChange,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      height: '44px',
      padding: '0 20px',
      background: 'var(--color-surface-strong)',
      borderRadius: 'var(--radius-pill)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7",
    stroke: "var(--color-muted)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 20l-3.5-3.5",
    stroke: "var(--color-muted)",
    strokeWidth: "2",
    strokeLinecap: "round"
  })), /*#__PURE__*/React.createElement("input", _extends({
    type: "search",
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    style: {
      flex: 1,
      border: 'none',
      background: 'transparent',
      outline: 'none',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-md-size)',
      color: 'var(--color-ink)'
    }
  }, rest)));
}
Object.assign(__ds_scope, { SearchPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchPill.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopNav.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TopNav — marketing top navigation. 64px tall. Wordmark left, menu center,
 * search + Sign In / Sign Up right. `onDark` variant for dark hero bands.
 */
function TopNav({
  items = ['Cryptocurrencies', 'Individuals', 'Businesses', 'Institutions', 'Developers', 'Company'],
  onDark = false,
  style = {},
  ...rest
}) {
  const text = onDark ? 'var(--color-on-dark)' : 'var(--color-ink)';
  const bg = onDark ? 'var(--color-surface-dark)' : 'var(--color-canvas)';
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '32px',
      height: '64px',
      padding: '0 24px',
      background: bg,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    variant: onDark ? 'light' : 'dark',
    height: 22
  }), /*#__PURE__*/React.createElement("ul", {
    style: {
      display: 'flex',
      gap: '24px',
      listStyle: 'none',
      margin: 0,
      padding: 0,
      flex: 1
    }
  }, items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-nav-link-size)',
      fontWeight: 'var(--type-nav-link-weight)',
      color: text,
      textDecoration: 'none',
      whiteSpace: 'nowrap'
    }
  }, it)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "Search",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      display: 'inline-flex',
      color: text
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7",
    stroke: "currentColor",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 20l-3.5-3.5",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-nav-link-size)',
      fontWeight: 500,
      color: text,
      textDecoration: 'none'
    }
  }, "Sign in"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: onDark ? 'secondary-dark' : 'primary',
    style: {
      height: '40px'
    }
  }, "Sign up")));
}
Object.assign(__ds_scope, { TopNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopNav.jsx", error: String((e && e.message) || e) }); }

// components/trading/AssetIcon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AssetIcon — circular plate behind an asset glyph. 32px default, full radius.
 * Pass a glyph (img/svg/text) as children, or `src` for an image.
 */
function AssetIcon({
  src,
  alt = '',
  children,
  size = 32,
  plate = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden',
      background: plate ? 'var(--color-surface-strong)' : 'transparent',
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    width: size,
    height: size,
    style: {
      display: 'block'
    }
  }) : children);
}
Object.assign(__ds_scope, { AssetIcon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trading/AssetIcon.jsx", error: String((e && e.message) || e) }); }

// components/trading/PriceCell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PriceCell — inline price-change cell. Trading green/red as TEXT only,
 * never a background fill. Renders in mono with tabular figures.
 */
function PriceCell({
  value,
  direction,
  showSign = true,
  style = {},
  ...rest
}) {
  // direction: 'up' | 'down' | inferred from leading sign of value string
  const dir = direction || (String(value).trim().startsWith('-') ? 'down' : 'up');
  const color = dir === 'down' ? 'var(--color-semantic-down)' : 'var(--color-semantic-up)';
  const text = showSign && dir === 'up' && !String(value).trim().startsWith('+') ? `+${value}` : value;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-number-display-size)',
      fontWeight: 'var(--type-number-display-weight)',
      fontVariantNumeric: 'tabular-nums',
      color,
      ...style
    }
  }, rest), text);
}
Object.assign(__ds_scope, { PriceCell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trading/PriceCell.jsx", error: String((e && e.message) || e) }); }

// components/trading/AssetRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AssetRow — horizontal row in asset lists. Circular icon, name + ticker,
 * mono price, and a green/red change cell. Hairline divider at bottom.
 */
function AssetRow({
  icon,
  // img src for the glyph
  name,
  ticker,
  price,
  change,
  // e.g. "+2.41%" or "-1.20%"
  divider = true,
  onClick,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 8px',
      borderBottom: divider ? '1px solid var(--color-hairline)' : 'none',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.AssetIcon, {
    src: icon,
    alt: name,
    size: 32
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-title-md-size)',
      fontWeight: 600,
      color: 'var(--color-ink)'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--color-muted)'
    }
  }, ticker)), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-number-display-size)',
      fontWeight: 'var(--type-number-display-weight)',
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--color-ink)',
      textAlign: 'right',
      minWidth: '96px'
    }
  }, price), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: '80px',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PriceCell, {
    value: change
  })));
}
Object.assign(__ds_scope, { AssetRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trading/AssetRow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-website/DeveloperPricing.jsx
try { (() => {
// Coinbase Developer Platform — pricing page with tier cards (featured
// tier inverts to dark) over a light editorial layout.
const CBD = window.CoinbaseDesignSystem_5a6267;
function DevHeader() {
  const {
    TopNav
  } = CBD;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-canvas)',
      borderBottom: '1px solid var(--color-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(TopNav, null)));
}
function DevHero() {
  const {
    Badge
  } = CBD;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-canvas)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '80px 24px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Developer Platform"), /*#__PURE__*/React.createElement("h1", {
    className: "t-display-xl",
    style: {
      margin: 0,
      maxWidth: 720
    }
  }, "Build onchain apps in minutes"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 18,
      color: 'var(--color-body)',
      maxWidth: 520
    }
  }, "One platform for wallets, payments, and data. Start free and scale as you grow.")));
}
function PricingGrid() {
  const {
    PricingTier
  } = CBD;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-canvas)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '48px 24px 96px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24,
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement(PricingTier, {
    name: "Build",
    price: "$0",
    period: "/mo",
    features: ['100 requests / sec', 'Wallet & onramp APIs', 'Testnet faucet', 'Community support'],
    ctaLabel: "Start free"
  }), /*#__PURE__*/React.createElement(PricingTier, {
    name: "Scale",
    price: "$99",
    period: "/mo",
    featured: true,
    features: ['Unlimited requests', 'Priority support', '99.99% uptime SLA', 'Advanced webhooks', 'Team seats'],
    ctaLabel: "Get started"
  }), /*#__PURE__*/React.createElement(PricingTier, {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ['Dedicated infrastructure', 'Custom rate limits', 'Solutions engineering', 'SOC 2 reports'],
    ctaLabel: "Contact sales"
  }))));
}
function DevFeatures() {
  const {
    FeatureCard
  } = CBD;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-surface-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '96px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "t-display-md",
    style: {
      margin: 0
    }
  }, "Everything you need to go onchain"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(FeatureCard, {
    variant: "flat",
    title: "Embedded Wallets",
    linkLabel: "Read docs"
  }, "Spin up secure, self-custodial wallets with a few lines of code."), /*#__PURE__*/React.createElement(FeatureCard, {
    variant: "flat",
    title: "Onramp",
    linkLabel: "Read docs"
  }, "Let users buy crypto with card or bank directly inside your app."), /*#__PURE__*/React.createElement(FeatureCard, {
    variant: "flat",
    title: "Onchain Data",
    linkLabel: "Read docs"
  }, "Query balances, transactions, and token metadata across chains."))));
}
function DeveloperPricing() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DevHeader, null), /*#__PURE__*/React.createElement(DevHero, null), /*#__PURE__*/React.createElement(PricingGrid, null), /*#__PURE__*/React.createElement(DevFeatures, null), /*#__PURE__*/React.createElement(window.CtaBandDark, null), /*#__PURE__*/React.createElement(window.MarketingFooter, null));
}
window.DeveloperPricing = DeveloperPricing;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-website/DeveloperPricing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-website/Explore.jsx
try { (() => {
// Coinbase Explore — light asset-list page with search, category chips,
// a full market table, and a light hero band.
const CBX = window.CoinbaseDesignSystem_5a6267;
const EXPLORE_ASSETS = [{
  i: 'btc.svg',
  n: 'Bitcoin',
  t: 'BTC',
  p: '$67,420.18',
  c: '+2.41%',
  cap: '$1.33T'
}, {
  i: 'eth.svg',
  n: 'Ethereum',
  t: 'ETH',
  p: '$3,512.40',
  c: '-1.20%',
  cap: '$422.1B'
}, {
  i: 'sol.svg',
  n: 'Solana',
  t: 'SOL',
  p: '$172.06',
  c: '+5.83%',
  cap: '$80.4B'
}, {
  i: 'usdc.svg',
  n: 'USD Coin',
  t: 'USDC',
  p: '$1.00',
  c: '+0.01%',
  cap: '$34.0B'
}, {
  i: 'btc.svg',
  n: 'Wrapped BTC',
  t: 'WBTC',
  p: '$67,390.02',
  c: '+2.38%',
  cap: '$10.2B'
}, {
  i: 'eth.svg',
  n: 'Lido Staked ETH',
  t: 'STETH',
  p: '$3,508.91',
  c: '-1.18%',
  cap: '$33.6B'
}];
function ExploreHeader() {
  const {
    TopNav,
    SearchPill
  } = CBX;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-canvas)',
      borderBottom: '1px solid var(--color-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(TopNav, null)));
}
function ExploreHeroLight() {
  const {
    SearchPill,
    Badge
  } = CBX;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-canvas)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '72px 24px 48px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Prices"), /*#__PURE__*/React.createElement("h1", {
    className: "t-display-xl",
    style: {
      margin: 0
    }
  }, "Explore crypto", /*#__PURE__*/React.createElement("br", null), "like never before"), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement(SearchPill, {
    placeholder: "Search all assets"
  }))));
}
function CategoryChips() {
  const chips = ['All assets', 'Top movers', 'New on Coinbase', 'Tradable', 'Layer 1', 'DeFi', 'Stablecoins'];
  const [active, setActive] = React.useState(0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 24px 24px'
    }
  }, chips.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => setActive(i),
    style: {
      height: 40,
      padding: '0 18px',
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      border: '1px solid ' + (active === i ? 'var(--color-ink)' : 'var(--color-hairline)'),
      background: active === i ? 'var(--color-ink)' : 'var(--color-canvas)',
      color: active === i ? 'var(--color-on-dark)' : 'var(--color-ink)'
    }
  }, c)));
}
function MarketTable() {
  const {
    AssetRow
  } = CBX;
  const A = '../../assets/crypto/';
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-canvas)',
      paddingBottom: 96
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '12px 8px',
      borderBottom: '1px solid var(--color-hairline)',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--color-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      marginLeft: 48
    }
  }, "Name"), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 96,
      textAlign: 'right'
    }
  }, "Price"), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 80,
      textAlign: 'right'
    }
  }, "24h")), EXPLORE_ASSETS.map((r, idx) => /*#__PURE__*/React.createElement(AssetRow, {
    key: idx,
    icon: A + r.i,
    name: r.n,
    ticker: r.t,
    price: r.p,
    change: r.c,
    divider: idx < EXPLORE_ASSETS.length - 1
  }))));
}
function Explore() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ExploreHeader, null), /*#__PURE__*/React.createElement(ExploreHeroLight, null), /*#__PURE__*/React.createElement(CategoryChips, null), /*#__PURE__*/React.createElement(MarketTable, null), /*#__PURE__*/React.createElement(window.CtaBandDark, null), /*#__PURE__*/React.createElement(window.MarketingFooter, null));
}
window.Explore = Explore;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-website/Explore.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-website/Homepage.jsx
try { (() => {
// Coinbase marketing homepage — dark hero with floating product-UI cards,
// feature grid, market list preview, dark CTA band, footer.
const CB = window.CoinbaseDesignSystem_5a6267;
function HeroDark() {
  const {
    TopNav,
    Button,
    Badge,
    ProductUICard,
    AssetRow
  } = CB;
  const A = '../../assets/crypto/';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-surface-dark)',
      color: 'var(--color-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(TopNav, {
    onDark: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '72px 24px 96px',
      display: 'grid',
      gridTemplateColumns: '1.05fr 0.95fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "dark"
  }, "Trusted by 100M+"), /*#__PURE__*/React.createElement("h1", {
    className: "t-display-mega",
    style: {
      margin: 0
    }
  }, "Jump", /*#__PURE__*/React.createElement("br", null), "start your", /*#__PURE__*/React.createElement("br", null), "crypto", /*#__PURE__*/React.createElement("br", null), "portfolio"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 18,
      lineHeight: 1.5,
      color: 'var(--color-on-dark-soft)',
      maxWidth: 420
    }
  }, "Coinbase is the easiest place to buy and sell cryptocurrency. Sign up and get started today."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg"
  }, "Get started"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline-dark",
    size: "lg"
  }, "Explore assets"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 420
    }
  }, /*#__PURE__*/React.createElement(ProductUICard, {
    tone: "dark",
    rotate: -4,
    style: {
      position: 'absolute',
      top: 0,
      left: 16,
      width: 320
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--color-on-dark-soft)'
    }
  }, "Portfolio balance"), /*#__PURE__*/React.createElement("div", {
    className: "num",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 34,
      fontWeight: 500,
      margin: '8px 0 4px'
    }
  }, "$24,108.52"), /*#__PURE__*/React.createElement("div", {
    className: "num",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 15,
      color: 'var(--color-semantic-up)'
    }
  }, "+$412.08 (1.74%) today"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      height: 78,
      display: 'flex',
      alignItems: 'flex-end',
      gap: 4
    }
  }, [30, 42, 38, 55, 48, 62, 58, 72, 66, 80, 74, 92].map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: h + '%',
      background: 'var(--color-primary)',
      opacity: 0.35 + i * 0.05,
      borderRadius: 3
    }
  })))), /*#__PURE__*/React.createElement(ProductUICard, {
    tone: "dark",
    rotate: 5,
    padding: 16,
    style: {
      position: 'absolute',
      bottom: 0,
      right: 8,
      width: 300
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-on-dark)',
      padding: '4px 8px 10px'
    }
  }, "Top movers"), [{
    i: 'btc.svg',
    n: 'Bitcoin',
    t: 'BTC',
    p: '$67,420',
    c: '+2.41%'
  }, {
    i: 'sol.svg',
    n: 'Solana',
    t: 'SOL',
    p: '$172.06',
    c: '+5.83%'
  }, {
    i: 'eth.svg',
    n: 'Ethereum',
    t: 'ETH',
    p: '$3,512',
    c: '-1.20%'
  }].map((r, idx, arr) => /*#__PURE__*/React.createElement("div", {
    key: r.t,
    style: {
      '--color-hairline': 'rgba(255,255,255,0.08)'
    }
  }, /*#__PURE__*/React.createElement(DarkRow, {
    icon: A + r.i,
    name: r.n,
    ticker: r.t,
    price: r.p,
    change: r.c,
    divider: idx < arr.length - 1
  })))))));
}

// AssetRow renders ink text; on dark we wrap with overrides via a thin re-impl.
function DarkRow({
  icon,
  name,
  ticker,
  price,
  change
}) {
  const {
    PriceCell,
    AssetIcon
  } = CB;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px',
      borderBottom: '1px solid rgba(255,255,255,0.08)'
    }
  }, /*#__PURE__*/React.createElement(AssetIcon, {
    src: icon,
    size: 28
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-on-dark)'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--color-on-dark-soft)'
    }
  }, ticker)), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      color: 'var(--color-on-dark)',
      marginRight: 10
    }
  }, price), /*#__PURE__*/React.createElement(PriceCell, {
    value: change,
    style: {
      fontSize: 14
    }
  }));
}
function FeatureBand() {
  const {
    FeatureCard
  } = CB;
  const Glyph = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 'var(--radius-full)',
      background: 'var(--color-surface-strong)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, children);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-canvas)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '96px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 48
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "t-display-lg",
    style: {
      margin: 0,
      maxWidth: 640
    }
  }, "The future of money is here"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(FeatureCard, {
    title: "Trade in minutes",
    linkLabel: "Start trading",
    glyph: /*#__PURE__*/React.createElement(Glyph, null, /*#__PURE__*/React.createElement(Dot, null))
  }, "Buy, sell, and swap 250+ assets with industry-low fees and deep liquidity."), /*#__PURE__*/React.createElement(FeatureCard, {
    title: "Earn while you hold",
    linkLabel: "View rewards",
    glyph: /*#__PURE__*/React.createElement(Glyph, null, /*#__PURE__*/React.createElement(Dot, null))
  }, "Put your crypto to work and earn rewards on eligible assets, automatically."), /*#__PURE__*/React.createElement(FeatureCard, {
    title: "Security you can trust",
    linkLabel: "How we protect you",
    glyph: /*#__PURE__*/React.createElement(Glyph, null, /*#__PURE__*/React.createElement(Dot, null))
  }, "Industry-leading cold storage and insurance keep your assets protected."))));
}
const Dot = () => /*#__PURE__*/React.createElement("span", {
  style: {
    width: 18,
    height: 18,
    borderRadius: 6,
    background: 'var(--color-primary)',
    display: 'block'
  }
});
function MarketBand() {
  const {
    AssetRow,
    Button
  } = CB;
  const A = '../../assets/crypto/';
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-surface-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '96px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "t-display-md",
    style: {
      margin: 0
    }
  }, "Markets"), /*#__PURE__*/React.createElement(Button, {
    variant: "tertiary"
  }, "See all assets \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-canvas)',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--color-hairline)',
      padding: '8px 24px'
    }
  }, /*#__PURE__*/React.createElement(AssetRow, {
    icon: A + 'btc.svg',
    name: "Bitcoin",
    ticker: "BTC",
    price: "$67,420.18",
    change: "+2.41%"
  }), /*#__PURE__*/React.createElement(AssetRow, {
    icon: A + 'eth.svg',
    name: "Ethereum",
    ticker: "ETH",
    price: "$3,512.40",
    change: "-1.20%"
  }), /*#__PURE__*/React.createElement(AssetRow, {
    icon: A + 'sol.svg',
    name: "Solana",
    ticker: "SOL",
    price: "$172.06",
    change: "+5.83%"
  }), /*#__PURE__*/React.createElement(AssetRow, {
    icon: A + 'usdc.svg',
    name: "USD Coin",
    ticker: "USDC",
    price: "$1.00",
    change: "+0.01%",
    divider: false
  }))));
}
function Homepage() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(HeroDark, null), /*#__PURE__*/React.createElement(FeatureBand, null), /*#__PURE__*/React.createElement(MarketBand, null), /*#__PURE__*/React.createElement(window.CtaBandDark, null), /*#__PURE__*/React.createElement(window.MarketingFooter, null));
}
window.Homepage = Homepage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-website/Homepage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-website/Shared.jsx
try { (() => {
// Shared marketing footer for the Coinbase UI kit.
function MarketingFooter() {
  const {
    Wordmark
  } = window.CoinbaseDesignSystem_5a6267;
  const FOOTER_COLS = [{
    h: 'Company',
    links: ['About', 'Careers', 'Affiliates', 'Newsroom', 'Investors']
  }, {
    h: 'Individuals',
    links: ['Buy & sell', 'Wallet', 'Card', 'Earn', 'Derivatives']
  }, {
    h: 'Businesses',
    links: ['Prime', 'Asset Hub', 'Commerce', 'Custody']
  }, {
    h: 'Developers',
    links: ['Cloud', 'Wallet SDK', 'Base', 'Faucet', 'Docs']
  }, {
    h: 'Learn',
    links: ['Browse crypto', 'What is Bitcoin?', 'Tax center', 'Glossary']
  }, {
    h: 'Support',
    links: ['Help center', 'Contact us', 'Status', 'Security']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--color-canvas)',
      borderTop: '1px solid var(--color-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '64px 24px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 24
    }
  }, FOOTER_COLS.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.h,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-ink)'
    }
  }, c.h), c.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--color-body)',
      textDecoration: 'none'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 56,
      paddingTop: 24,
      borderTop: '1px solid var(--color-hairline)'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    height: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--color-muted)'
    }
  }, "\xA9 2026 Coinbase \xB7 Privacy \xB7 Terms \xB7 Cookie preferences"))));
}
function CtaBandDark() {
  const {
    Button
  } = window.CoinbaseDesignSystem_5a6267;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-surface-dark)',
      color: 'var(--color-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '96px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "t-display-md",
    style: {
      margin: 0,
      maxWidth: 640
    }
  }, "Take control of your money"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 18,
      color: 'var(--color-on-dark-soft)',
      maxWidth: 520
    }
  }, "Sign up for a Coinbase account today and start your crypto journey."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg"
  }, "Get started"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline-dark",
    size: "lg"
  }, "Contact sales"))));
}
window.MarketingFooter = MarketingFooter;
window.CtaBandDark = CtaBandDark;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-website/Shared.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Card = __ds_scope.Card;

__ds_ns.FeatureCard = __ds_scope.FeatureCard;

__ds_ns.PricingTier = __ds_scope.PricingTier;

__ds_ns.ProductUICard = __ds_scope.ProductUICard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SearchPill = __ds_scope.SearchPill;

__ds_ns.TopNav = __ds_scope.TopNav;

__ds_ns.AssetIcon = __ds_scope.AssetIcon;

__ds_ns.AssetRow = __ds_scope.AssetRow;

__ds_ns.PriceCell = __ds_scope.PriceCell;

})();
