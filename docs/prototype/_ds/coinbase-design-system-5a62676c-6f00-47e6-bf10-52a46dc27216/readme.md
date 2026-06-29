# Coinbase Design System

A from-spec recreation of Coinbase's **marketing** brand system: the quiet, white-canvas, editorially-spaced institutional look that happens to trade crypto. One brand voltage — **Coinbase Blue (#0052ff)** — used scarcely, against ink, soft-gray elevation bands, and deep near-black editorial heroes carrying floating product-UI mockup cards.

> **Scope.** This system covers Coinbase **marketing surfaces** only (homepage, Explore, Developer Platform, CTA/footer). In-product trading surfaces (order book, charts, order forms) live behind login walls and are out of scope.

## Sources

This system was built from a written design-spec brief (provided in-chat), not from a codebase or Figma file. No GitHub repo, Figma URL, or product codebase was attached. If you have access to:
- the Coinbase brand portal / licensed font binaries (CoinbaseDisplay, CoinbaseSans, CoinbaseMono, CoinbaseIcons),
- the production marketing codebase or Figma libraries,

…please attach them so the substitutions below can be replaced with the real assets.

---

## Brand context

Coinbase reads like an **institutional financial brand** — closer to Bloomberg or the Financial Times than to a trading dashboard. Marketing pages are calm, white, generously spaced (96px between bands), and almost monochromatic. Density lives behind the login wall, never on marketing.

The page rhythm rotates three modes:
1. **Bright white editorial** sections (the default floor).
2. **Soft-gray elevation bands** (`#f7f7f7`) for alternating rhythm.
3. **Full-bleed dark editorial heroes** (`#0a0b0d`) carrying layered product-UI mockup cards — the single most distinctive component.

---

## Content fundamentals

How Coinbase marketing copy is written:

- **Voice: calm, plain, confident.** Short declarative headlines. "Jumpstart your crypto portfolio." "Take control of your money." "The future of money is here." No hype words, no exclamation marks, no urgency.
- **Second person ("you / your").** Copy addresses the reader directly — "your money," "get started today," "put your crypto to work."
- **Sentence case everywhere** except the small uppercase badge pills ("INSTITUTIONAL", "REGULATED") which use all-caps + letter-spacing as a labeling device.
- **Verbs lead CTAs:** "Get started," "Sign up," "Explore assets," "Contact sales," "Read docs." Single verb + object, never "Click here."
- **Numbers are precise and trust-building:** "Trusted by 100M+," "250+ assets," "99.99% uptime SLA." Always rendered in mono.
- **No emoji.** The brand voice is institutional; emoji never appear in marketing copy or UI.
- **Tone toward calm authority:** it explains, it reassures (security, regulation, insurance), it never pressures.

Examples in use: hero subhead — *"Coinbase is the easiest place to buy and sell cryptocurrency. Sign up and get started today."* · feature card — *"Industry-leading cold storage and insurance keep your assets protected."*

---

## Visual foundations

**Color.** A single accent: Coinbase Blue (`#0052ff`), reserved for primary CTA pills, the wordmark, brand-glyph illustration, and inline accent links — one or two blue moments per band, no more. Everything else is ink (`#0a0b0d`), cool-gray body (`#5b616e`), soft-gray surfaces (`#f7f7f7` / `#eef0f3`), and the deep dark canvas (`#0a0b0d`). Trading green (`#05b169`) and red (`#cf202f`) are **semantic text colors only — never background fills, never buttons.** Accent yellow (`#f4b000`) appears only inside Bitcoin/asset glyph illustrations.

**Type.** CoinbaseDisplay for hero headlines, CoinbaseSans for everything else, CoinbaseMono on every number. The signature choice: **display stays at weight 400** — not the 700+ of typical trading platforms — signalling editorial calm and institutional trust. Display carries **negative letter-spacing** (-1px to -2px); body stays at 0. Never bold display copy; never mix display + sans inside one headline.

**Spacing.** 4px base unit. **96px between major bands** — generous editorial pacing. Cards inside bands sit 24px apart; card internal padding is 32px. Content caps at 1200px centered; hero photography goes full-bleed.

**Backgrounds.** No gradients, no textures, no repeating patterns. Backgrounds are flat fills: white, soft-gray, or near-black. The dark hero is the one place depth appears — via **layered product-UI mockup cards** (a `ProductUICard` floats above the dark canvas, often with a second smaller card overlapping at a slight angle), not via shadows or gradients.

**Corner radii.** Pill (100px) for everything interactive — CTAs, search bars, badges. Card-radius (24px / `--radius-xl`) for containers — feature cards, product mockups, pricing tiers. Full circle for asset glyphs and avatars. Form inputs at 12px. **Sharp 0px corners are absent from the system.**

**Cards.** Three looks only: flat (no border, no shadow — ~80% of surfaces), 1px hairline border (`#dee1e6`) on white, or a single soft drop shadow (`0 4px 12px rgba(0,0,0,0.04)`) on hover. **There is exactly one shadow tier** — do not invent more. The dark-hero mockup cards carry a deeper photographic shadow as a decorative exception.

**Borders.** 1px hairlines (`#dee1e6`, lighter `#eef0f3`) divide rows and outline cards. That's the entire border vocabulary.

**Elevation & depth.** Mostly flat. Depth comes from the layered dark-hero mockups and geometric brand illustration, not from shadow stacks.

**Buttons / states.** The spec documents only Default and Active/Pressed — hover is intentionally undocumented. Primary pill darkens to `#003ecc` on press; disabled is a faded blue tint (`#a8b8cc`). Secondary buttons are soft-gray. Outline-on-dark is a transparent pill with a white border. Transitions are short and subtle (~120ms color fades); no bounces.

**Transparency & blur.** Not part of the marketing system — surfaces are opaque flat fills.

**Imagery vibe.** Product-UI mockups are cool/dark (the dark-elevated surface, blue chart accents). Marketing photography (where used) is full-bleed and editorial. No grain, no heavy filters.

---

## Iconography

- **Production set:** Coinbase ships a licensed **CoinbaseIcons** icon font. It was not available to this build.
- **Substitution:** UI glyphs here (search, checkmarks) are drawn inline as minimal 2px-stroke SVGs matching the clean, geometric Coinbase icon style. If you have CoinbaseIcons, swap these for the real glyphs. A close CDN match in the same stroke style is **Lucide** (2px round-cap line icons) — link from CDN if you need a fuller set.
- **Asset glyphs:** crypto coins (BTC, ETH, SOL, USDC) are circular glyphs on a soft-gray (`surface-strong`) plate at `--radius-full`. Stored in `assets/crypto/` as SVG. These are simplified stand-ins for the official token marks.
- **Logo:** the Coinbase logomark (blue circle + centered rounded-square knockout) and wordmark are recreated as SVG in `assets/`. The wordmark lettering is the real custom typeface in production; here it's set in the display-font substitute. **Flag: replace with official brand assets when available.**
- **No emoji, no unicode-as-icon.** Icons are SVG or the icon font only.

---

## Font substitution (please replace)

CoinbaseDisplay, CoinbaseSans, and CoinbaseMono are licensed Coinbase typefaces and were not provided. This system loads documented substitutes from Google Fonts:

| Coinbase typeface | Substitute | Notes |
|---|---|---|
| CoinbaseDisplay | **Inter** weight 400 | tight tracking (-1.5%) |
| CoinbaseSans | **Inter** 400/500/600/700 | body, nav, captions, buttons |
| CoinbaseMono | **JetBrains Mono** 500 | all numbers (Geist Mono also acceptable) |

To use the real fonts: drop the binaries in `assets/fonts/`, replace the `@import` in `tokens/fonts.css` with `@font-face` rules, and point `--font-display` / `--font-sans` / `--font-mono` at them.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (consumers link this). `@import`s only.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill front-matter for Claude Code use.

**`tokens/`** — CSS custom properties + fonts
- `fonts.css` · `colors.css` · `typography.css` (+ `.t-*` utility classes) · `spacing.css` · `radius.css` · `base.css`

**`components/`** — reusable React primitives (`window.CoinbaseDesignSystem_5a6267.*`)
- `core/` — **Button**, **Badge**, **Wordmark**
- `forms/` — **Input**, **SearchPill**
- `trading/` — **AssetRow**, **PriceCell**, **AssetIcon**
- `cards/` — **Card**, **FeatureCard**, **ProductUICard**, **PricingTier**
- `navigation/` — **TopNav**

**`ui_kits/marketing-website/`** — click-through recreation of Coinbase.com
- `index.html` (screen switcher) · `Homepage.jsx` · `Explore.jsx` · `DeveloperPricing.jsx` · `Shared.jsx`

**`guidelines/`** — foundation specimen cards (Design System tab): Colors, Type, Spacing/Shapes, Brand.

**`assets/`** — `coinbase-logomark[-white].svg`, `coinbase-wordmark[-white].svg`, `crypto/*.svg`.

> The compiler generates `_ds_bundle.js`, `_ds_manifest.json`, and `_adherence.oxlintrc.json` — never edit these by hand.
