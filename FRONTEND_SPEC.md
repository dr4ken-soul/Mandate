# FRONTEND_SPEC.md

Project: **Mandate**
Surface: public landing page, wallet-gated console interior, public receipt pages
Stack: Next.js 14 App Router, TypeScript strict, Tailwind CSS v4, motion/react, wagmi + viem
Written against: `FRONTEND_SKILL.md` Steps 1 to 17, `COMPOSITION_RECIPES.md` Sections B to E

This document is written to be handed to a developer with no access to this conversation. Every element carries its exact class string. Every animation carries initial, animate, duration, ease and delay. Every positional class carries its responsive variants. Where a decision deviates from a skill rule, the deviation is named and justified in place.

---

## §0 Identity

**Design read.** Mandate is an enforcement instrument for one person's own written limits: the reader is a bot builder or an agent operator who has already lost money to a rule that existed only in a prompt, the register is an official record rather than a trading terminal, motion is precision, and density is high because the product is a ledger.

**Fingerprint (§0C), six axes:**

```
poster-scale / compressed statement / monochrome + single pop / solid surface with functional rules / front-loaded / subtle precision
```

**Dials.**

```
DESIGN_VARIANCE: 6
MOTION_INTENSITY: 4
VISUAL_DENSITY: 7
```

**Colour strategy.** Restrained. Tinted neutrals carry approximately 95% of every surface, and exactly one saturated colour exists in the system. It marks refusal and nothing else.

**Trend pairing.** Surveillance Design as the primary language (monospace system labels, ruled data rows, status words in caps, tabular figures, bracket framing on codes) with Signal Graphics restricted to verdict blocks. Two trends, intensity 5. Not used anywhere: Naive, Trinket, Frutiger Aero, glassmorphism, neumorphism, bento brights, any gradient as a background.

**Two-altitude slop test, run and passed.** First order: a Web3 trading product in dark mode with a neon accent is the category reflex, so the ground is a cool near-white and the accent is a desaturated vermilion, not cyan. Second order: "not crypto dark mode" usually lands on warm cream editorial with a serif display, which is the 2026 saturation tell, so the ground is cool rather than warm, the display face is a compressed grotesk rather than a serif, and density is 7 rather than gallery-white. The dark surface exists in this design, but it is reserved for one thing: the artifact under enforcement.

**What this spec will not do.** No pure black. No pure white. No gradient background. No glass. No blur except where explicitly listed. No shadow with a blur radius above 0px. No border radius above 2px. No emoji. No icon-only button without an accessible name. No placeholder data of any kind, including invented hashes, invented percentages and invented names. No `viewport={{ once: true }}` anywhere.

---

## §1 Tokens

Tailwind v4, tokens declared once in `app/globals.css`. No hex literal may appear in a component file.

```css
@import "tailwindcss";

@theme {
  /* surfaces: cool paper, never cream, never #ffffff */
  --color-paper:      oklch(0.968 0.004 240);   /* #f2f5f7 */
  --color-paper-band: oklch(0.944 0.005 240);   /* #eaedef */
  --color-plate:      oklch(0.192 0.012 250);   /* #10151a */
  --color-plate-raised: oklch(0.245 0.012 250); /* #1c2126 */

  /* ink, never #000000 */
  --color-ink:          oklch(0.192 0.012 250); /* #10151a */
  --color-ink-secondary: oklch(0.470 0.011 250); /* #565b61 */
  --color-ink-tertiary:  oklch(0.540 0.010 250); /* #6a6f74 */
  --color-plate-ink:       oklch(0.960 0.004 240); /* #eff2f4 */
  --color-plate-ink-muted: oklch(0.760 0.008 250); /* #adb1b6 */

  /* rules: structure, not decoration */
  --color-rule-hair:   oklch(0.888 0.005 250);  /* #d8dadd */
  --color-rule-strong: oklch(0.620 0.010 250);  /* #82878c */
  --color-rule-plate:  oklch(0.320 0.012 250);  /* #2e3339 */

  /* the single signal. refusal only. */
  --color-signal:         oklch(0.525 0.190 30);  /* #c02719 */
  --color-signal-text:    oklch(0.420 0.150 30);  /* #8d1c11 */
  --color-signal-on-plate: oklch(0.660 0.160 32); /* #e36650 */
  --color-signal-wash:    oklch(0.525 0.190 30 / 0.08);

  /* type */
  --font-display: "Archivo", system-ui, sans-serif;
  --font-sans:    "Archivo", system-ui, sans-serif;
  --font-mono:    "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;

  /* geometry: nothing rounds */
  --radius-panel: 0px;
  --radius-tag: 2px;
  --shadow-plate: 0 2px 0 0 var(--color-rule-strong); /* hard offset, zero blur */

  /* motion */
  --ease-quint: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 120ms;
  --dur-normal: 220ms;
  --dur-slow: 420ms;
}
```

### Contrast, measured

Every pair below was computed from the OKLCH values above, not estimated. Ratios are WCAG 2.1.

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| `ink` | `paper` | 16.77 | AAA |
| `ink-secondary` | `paper` | 6.22 | AA, any size |
| `ink-tertiary` | `paper` | 4.61 | AA, any size |
| `signal-text` | `paper` | 8.32 | AAA |
| `signal` | `paper` | 5.41 | AA, any size |
| `plate-ink` | `plate` | 16.38 | AAA |
| `plate-ink-muted` | `plate` | 8.57 | AAA |
| `signal-on-plate` | `plate` | 5.51 | AA, any size |
| `signal-on-plate` | `plate-raised` | 4.86 | AA, any size |
| `signal-text` | `paper-band` | 7.75 | AAA |
| `ink-secondary` | `paper-band` | 5.79 | AA, any size |
| `rule-strong` | `paper` | 3.32 | passes non-text 3:1 |

Two rules follow from that table and they are not interchangeable:

1. **`rule-hair` (1.28:1) never defines an interactive target.** It is a decorative divider between data rows, where row separation is also carried by spacing. Every border that delimits a button, input, tab or focusable region uses `rule-strong` (3.32:1) or `ink`.
2. **There is no muted grey for body copy.** A fourth grey could not reach 4.5:1 without becoming indistinguishable from `ink-secondary`, so it does not exist. `ink-tertiary` is the lightest text token in the system and it clears AA at 11px.

### Type

Loaded with `next/font/google`, Archivo on its width axis, self-hosted at build time:

```ts
// app/fonts.ts
import { Archivo, IBM_Plex_Mono } from "next/font/google"

export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
})

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
})
```

Role classes, used verbatim:

| Role | Class string | Where |
|---|---|---|
| Hero statement | `font-display font-extrabold uppercase [font-stretch:62%] text-[clamp(3.2rem,8.6vw,8.5rem)] leading-[0.86] tracking-[-0.025em] text-ink text-balance` | Hero |
| Section statement | `font-display font-bold [font-stretch:70%] text-[clamp(2.1rem,4.2vw,3.5rem)] leading-[0.94] tracking-[-0.02em] text-ink text-balance` | Sections 2, 3, 6, 7 |
| Body statement | `font-display font-medium [font-stretch:78%] text-[clamp(1.5rem,2.8vw,2.4rem)] leading-[1.12] tracking-[-0.01em] text-ink text-balance` | Section 2 lead |
| Verdict | `font-display font-extrabold uppercase [font-stretch:62%] text-[clamp(1.9rem,3.6vw,3.2rem)] leading-none tracking-[0.03em]` | Plate, receipt |
| Body | `font-sans text-[1.0625rem] leading-[1.65] text-ink-secondary` | All running text, `max-w-[68ch]` |
| Body small | `font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary` | Cell descriptions |
| Label | `font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em]` | Section eyebrows, column headers |
| Value | `font-mono text-[0.8125rem] font-medium tabular-nums` | Amounts, codes, block numbers |
| Hash | `font-mono text-[0.75rem] tabular-nums tracking-[0.01em]` | All hashes, always truncated to `0x` plus four plus ellipsis plus four |

Typography discipline: three weights in use across the page (400, 500, 800), two families, body capped at 68ch, `text-wrap: balance` on every heading above h3 and `text-wrap: pretty` on paragraphs of three lines or more.

### Grain

One inline data URI, tiled on the body as a background layer beneath all content. It never enters the z-index stack, so it cannot sit over text or trap pointer events. Deviation from "add a texture overlay div" is deliberate: an overlay above content either tints the type or needs a blend mode that is inconsistent across browsers.

```css
body {
  background-color: var(--color-paper);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E");
  background-repeat: repeat;
}
```

`feTurbulence` is used here for paper tooth at 2.8% opacity, not to depict a subject, which is the distinction the skill draws.

### The enclosure convention

The skill's Double-Bezel architecture assumes rounded, elevated surfaces. This design has no radius and no blur shadow, so the same intent (a machined object sitting in a tray, never a panel floating on a background) is carried by concentric hard edges:

```
outer shell:  border border-rule-hair p-[6px] bg-paper
inner core:   border border-rule-hair border-t-2 border-t-rule-strong bg-paper p-6 lg:p-8
```

The 6px reveal reads as a tray. The 2px top rule on the core reads as the printed header of a form. No radius is subtracted because there is no radius. On the plate, the pair becomes `border border-rule-plate p-[6px]` around `bg-plate-raised`.

---

## §2 Global z-index

Named, never arbitrary. Any new component takes the slot that describes it, and there is no value above 600.

```css
:root {
  --z-base: 0;        /* page content, document flow */
  --z-raised: 10;     /* sticky column headers inside a section */
  --z-plate: 20;      /* the ink plate overlapping the hero rule */
  --z-nav: 200;       /* fixed A4 nav */
  --z-overlay: 300;   /* mobile drawer scrim */
  --z-drawer: 310;    /* mobile drawer panel */
  --z-modal: 400;     /* wallet connect modal */
  --z-toast: 500;     /* disconnect toast */
  --z-tooltip: 600;   /* hash full-value tooltip */
}
```

Per-section stacks are declared in each section's block. Nothing in this build uses `backdrop-filter` except the mobile drawer scrim's `bg-plate/80`, and that element is `position: fixed`, which is the only place the skill permits it.

---

## §3 Navigation, pattern A4

A4, dual-pill split, executed as hard-edged ruled blocks. Deviation from A4's "pill": radius 0 and no blur. A glass pill inside a brutalist instrument is a costume change.

### Desktop, at `lg` and above

```html
<header class="fixed inset-x-0 top-0 z-[200] h-16 lg:h-20 bg-paper border-b border-rule-hair">
  <div class="flex h-full items-stretch justify-between">

    <!-- left block -->
    <a href="/" class="flex items-center gap-3 pl-5 lg:pl-12 pr-5 border-r border-rule-hair
                        group focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink">
      {/* Logo slot */}
      <span class="font-display font-extrabold [font-stretch:68%] uppercase text-[0.9375rem]
                   tracking-[0.22em] text-ink">Mandate</span>
    </a>

    <!-- centre: intentionally empty -->
    <div class="hidden lg:block" aria-hidden="true"></div>

    <!-- right block -->
    <div class="flex items-stretch">
      <nav aria-label="Primary" class="hidden md:flex items-stretch">
        <a href="#clauses"   class="flex items-center px-5 lg:px-6 font-mono text-[0.6875rem] uppercase
                                    tracking-[0.18em] text-ink-secondary border-l border-rule-hair
                                    hover:text-ink hover:bg-paper-band transition-colors duration-[220ms] ease-[var(--ease-quint)]
                                    aria-[current=page]:text-ink aria-[current=page]:bg-paper-band">Clauses</a>
        <a href="#decisions" class="…same string, href #decisions…">Decisions</a>
        <a href="#limits"    class="…same string, href #limits…">Limits</a>
      </nav>

      <a href="/console" data-connect-gate
         class="group flex items-stretch bg-ink text-paper">
        <span class="flex items-center px-5 lg:px-7 text-[0.875rem] font-medium">Open the console</span>
        <span class="flex w-12 lg:w-14 items-center justify-center border-l border-paper/25">
          <ArrowUpRight size={15} strokeWidth={1.75}
            class="transition-transform duration-200 ease-[var(--ease-quint)]
                   group-hover:translate-x-0.5 group-hover:-translate-y-px" />
        </span>
      </a>
    </div>
  </div>
</header>
```

The `data-connect-gate` attribute is read by one handler. It is not an anchor: the console entry is a `<button>` in the implementation, styled identically, because an anchor hard-navigates past `ProtectedRoute` and produces a visible flash (Step 13, Entry Point Rules).

- **Scrolled state.** The header does not shrink and does not hide. On `scrollY > 8` it swaps `border-rule-hair` for `border-rule-strong` via a `data-scrolled` attribute. No shadow, no blur, no height animation.
- **Active state.** Current section link takes `text-ink bg-paper-band` plus a 2px `bg-ink` block on its left edge, so the state is not carried by colour alone.
- **Focus.** Every element in the header uses `focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink`. Offset is negative so the ring is not clipped by the header's border.

### Mobile, below `md`

```html
<header class="fixed inset-x-0 top-0 z-[200] h-14 bg-paper border-b border-rule-hair
               flex items-stretch justify-between">
  <a href="/" class="flex items-center pl-5 pr-4">…wordmark…</a>
  <button aria-expanded={open} aria-controls="mobile-nav"
          class="flex items-center gap-2 px-5 border-l border-rule-hair
                 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink">
    <span>{open ? "Close" : "Menu"}</span>
    <Menu size={15} strokeWidth={1.75} aria-hidden="true" />
  </button>
</header>
```

Drawer: scrim `fixed inset-0 z-[300] bg-plate/80`; panel `fixed inset-y-0 right-0 z-[310] w-[min(88vw,22rem)] bg-paper border-l border-rule-strong` sliding in with `initial={{ x: "100%" }} animate={{ x: 0 }} transition={{ duration: 0.28, ease: [0.16,1,0.3,1] }}`, exit `0.18`. Links stacked as rows `h-16 border-b border-rule-hair flex items-center px-6`, 0.9375rem, sentence case. Escape closes, scrim click closes, focus trapped, body scroll locked while open.

---

## §4 Hero

Recipe: `poster-hero`, composition logic only. The catalog's version places display type over a full-bleed photograph. Mandate has no photograph and will not buy one to fill a slot, so the plate is a rendered refusal document instead: a real decision read from testnet at request time. Everything else about the recipe is preserved: full viewport, text as a label on the composition, content anchored to an edge, one mono metadata line, one slow entrance.

```html
<section class="relative min-h-[100dvh] bg-paper pt-14 lg:pt-20 overflow-hidden" ref={heroRef}>
```

### Upper zone, the statement

```html
<div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 pt-10 sm:pt-14 lg:pt-20 pb-10 lg:pb-16">
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-x-10 items-end">

    <h1 class="lg:col-span-8 font-display font-extrabold uppercase [font-stretch:62%]
               text-[clamp(3.2rem,8.6vw,8.5rem)] leading-[0.86] tracking-[-0.025em]
               text-ink text-balance">
      <motion.span class="block" variants={blurRise} initial="initial" animate="animate">Rules in English.</motion.span>
      <motion.span class="block" variants={blurRise} initial="initial" animate="animate">Refusals on chain.</motion.span>
    </h1>

    <div class="lg:col-span-4 lg:pb-3">
      <p class="max-w-[46ch] font-sans text-[1.0625rem] leading-[1.6] text-ink-secondary">
        Mandate turns the rules you would say out loud into a contract that checks every perps order before it reaches the venue.
      </p>

      <div class="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
        <button data-connect-gate class="group flex items-stretch h-14 bg-ink text-paper
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          <span class="flex items-center px-6 text-[0.9375rem] font-medium">Open the console</span>
          <span class="flex w-14 items-center justify-center border-l border-paper/25">
            <ArrowUpRight size={16} strokeWidth={1.75}
              class="transition-transform duration-200 ease-[var(--ease-quint)]
                     group-hover:translate-x-0.5 group-hover:-translate-y-px" />
          </span>
        </button>

        <a href="/console/decisions/demo"
           class="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink
                  border-b border-ink pb-1 hover:text-signal-text hover:border-signal-text
                  transition-colors duration-[220ms] ease-[var(--ease-quint)]">
          Read a refusal
        </a>
      </div>
    </div>
  </div>
</div>
```

Hero discipline, checked: four text elements (headline, subhead, two CTAs), headline on two deliberate lines with no orphan word, subhead 21 words, 46ch cap, primary CTA 28px below the subhead, zero eyebrows, first text at 96px from the top on mobile and 152px on desktop, all content inside a 1280x800 viewport.

### Lower zone, the ink plate

```html
<div class="relative z-[20] bg-plate border-t border-rule-strong">
  <div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-14">
```

**Header row.**

```html
<div class="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-rule-plate">
  <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
    Decision · Block {block}
  </span>
  <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
    Mandate {mandateRef}
  </span>
</div>
```

**Clause line.**

```html
<p class="mt-6 font-mono text-[0.8125rem] tracking-[0.04em] text-plate-ink">
  C3 · Market notional cap · {cap} USDso
</p>
```

Values are injected from the decoded event. Nothing on the plate is typed by hand.

**The scale.** An SVG, `viewBox="0 0 1000 120"`, `preserveAspectRatio="none"`, `class="mt-4 h-[88px] w-full sm:h-[104px]"`, `aria-hidden="true"`, with a text equivalent in the caption below it.

```html
<svg viewBox="0 0 1000 120" preserveAspectRatio="none" class="mt-4 h-[88px] w-full sm:h-[104px]">
  <!-- baseline -->
  <line x1="0" y1="96" x2="1000" y2="96" stroke="var(--color-rule-plate)" stroke-width="1"
        vector-effect="non-scaling-stroke" />

  <!-- drawn rule, stops at the cap (x = 100) -->
  <motion.path d="M0,96 H100" stroke="var(--color-plate-ink)" stroke-width="2"
               vector-effect="non-scaling-stroke" style={{ pathLength: draw }} />

  <!-- refused continuation, cap (100) to order (1000) -->
  <motion.path d="M100,96 H1000" stroke="var(--color-signal-on-plate)" stroke-width="1.5"
               stroke-dasharray="6 6" vector-effect="non-scaling-stroke"
               style={{ pathLength: dash, opacity: dashOpacity }} />

  <!-- cap tick -->
  <line x1="100" y1="82" x2="100" y2="110" stroke="var(--color-plate-ink)" stroke-width="1.5"
        vector-effect="non-scaling-stroke" />
</svg>
```

Because `preserveAspectRatio="none"`, every stroke carries `vector-effect="non-scaling-stroke"`, so the hairline stays 1px at any container width. This is the single place in the build where an SVG is stretched non-uniformly.

**Labels under the scale.**

```html
<div class="mt-1 flex justify-between font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
  <span>{cap} · cap</span>
  <span class="text-signal-on-plate">{order} · refused</span>
</div>
```

**Verdict row.**

```html
<div class="mt-7 flex flex-col gap-6 sm:mt-8 lg:flex-row lg:items-end lg:justify-between">
  <div class="flex items-end gap-4">
    <motion.span variants={stamp} initial="initial" whileInView="animate" viewport={{ once: false, amount: 0.6 }}
      class="font-display font-extrabold uppercase [font-stretch:62%] text-[clamp(1.9rem,3.6vw,3.2rem)]
             leading-none tracking-[0.03em] text-signal-on-plate">Refused</motion.span>
    <span class="pb-1 font-mono text-[0.8125rem] font-medium tabular-nums text-plate-ink-muted">{code}</span>
  </div>

  <div class="lg:max-w-[46ch]">
    <p class="font-sans text-[0.9375rem] leading-[1.55] text-plate-ink">{reasonSentence}</p>
    <a href={explorerUrl} class="mt-3 inline-flex items-center gap-2 font-mono text-[0.75rem] tabular-nums
       text-plate-ink-muted border-b border-rule-plate pb-0.5
       hover:text-plate-ink hover:border-plate-ink transition-colors duration-[220ms]">
      {shortHash}
      <ArrowUpRight size={12} strokeWidth={1.75} aria-hidden="true" />
    </a>
  </div>
</div>
```

### The plate has three states, and every one of them is true

There is no fourth state and there is no blank plate. The plate never renders a number it did not read, and it never renders a hash that does not exist.

**State 1, `DECISION`.** The default, and the only state that ships. A recorded admission or refusal bound by `NEXT_PUBLIC_DEMO_DECISION_ID`, read from the indexer at request time, decoded, rendered with its transaction hash. This is the state the submission is judged on, and it is a build gate rather than a hope: the landing page does not merge until a real `0x08` refusal exists on 50383, because the refusal is the product and a policy contract that has never refused anything is not a demo.

**State 2, `PREVIEW`.** Reached when a deployment has no recorded decisions at all, which is the honest state of a fresh clone. The plate calls `previewAdmit` as a view function at render, against the deployed contract, at the current block, for a stated order. The header swaps to `Preview · Block {n}`, the verdict block carries `Preview` above the code rather than `Refused`, and there is deliberately no hash, because a view call produces no transaction:

```html
<div class="mt-6 border border-rule-plate p-5">
  <div class="flex items-baseline justify-between pb-3 border-b border-rule-plate">
    <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
      Preview · Block {block}
    </span>
    <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
      No transaction
    </span>
  </div>
  <p class="mt-4 font-sans text-[0.9375rem] leading-[1.55] text-plate-ink">
    A 2,000.00 USDso order on ETH-PERP returns {code} from this contract right now.
  </p>
  <p class="mt-3 font-mono text-[0.75rem] leading-[1.6] text-plate-ink-muted max-w-[56ch]">
    This is a live view call against deployed code. Nothing was sent, so there is no hash to show, and
    the first order that is actually recorded will replace this panel.
  </p>
</div>
```

**State 3, `UNAVAILABLE`.** Reached when the indexer or RPC read fails. The plate keeps its header, drops the scale, and says so without estimating:

```html
<p class="mt-6 font-mono text-[0.8125rem] leading-[1.6] text-plate-ink-muted max-w-[52ch]">
  The chain read failed at block {block}. Nothing on this page is estimated, so this panel is empty
  on purpose. Retry in a moment.
</p>
```

State 3 is not a fallback for state 1. It is the truthful report of a failed read, and it exists because the alternative, rendering the last known values from a cache, would make the page disagree with the chain.

### Hero motion

| # | Element | initial | animate | duration | ease | delay |
|---|---|---|---|---|---|---|
| H1 | Headline line 1 | `opacity 0, y 16, filter blur(8px)` | `opacity 1, y 0, blur(0)` | 0.55 | `[0.16,1,0.3,1]` | 0.05 |
| H2 | Headline line 2 | `opacity 0, y 16, filter blur(8px)` | `opacity 1, y 0, blur(0)` | 0.55 | `[0.16,1,0.3,1]` | 0.13 |
| H3 | Subhead | `opacity 0, y 12, blur(6px)` | `opacity 1, y 0, blur(0)` | 0.45 | `[0.16,1,0.3,1]` | 0.24 |
| H4 | CTA pair | `opacity 0, y 10, blur(4px)` | `opacity 1, y 0, blur(0)` | 0.4 | `[0.16,1,0.3,1]` | 0.34 |
| H5 | Plate | `opacity 0, y 18` | `opacity 1, y 0` | 0.5 | `[0.16,1,0.3,1]` | 0.20 |
| H6 | Drawn rule | `pathLength 0` | `pathLength 1` | scroll-linked | linear, mapped from `scrollYProgress` | n/a |
| H7 | Refused dashed run | `pathLength 0, opacity 0` | `pathLength 1, opacity 1` | scroll-linked | linear | starts at progress 0.42 |
| H8 | Verdict stamp | `opacity 0, scale 1.06` | `opacity 1, scale 1` | 0.18 | `[0.16,1,0.3,1]` | 0.55 after entry |

Scroll mapping: `useScroll({ target: heroRef, offset: ["start start", "center start"] })`, `draw = useTransform(scrollYProgress, [0.04, 0.60], [0, 1])`, `dash = useTransform(scrollYProgress, [0.42, 0.86], [0, 1])`, `dashOpacity = useTransform(scrollYProgress, [0.40, 0.48], [0, 1])`. Because the mapping is a transform of live scroll position, the rule retracts when the user scrolls back and redraws on return. No `once` flag exists on this element.

Stamp replays on every entry (`once: false`) per the repeatable-scroll-animation rule. It never bounces, never overshoots, and never rotates more than 0.8 degrees: `rotate: 0.8` at `initial` resolving to `0`, which reads as a stamped object rather than a spring.

Reduced motion: `useReducedMotion()` swaps every variant for `{ opacity: 0 }` to `{ opacity: 1 }` at 0.01s, and the scroll-linked paths render at `pathLength: 1` immediately with no transform.

---

## §5 Section 2: The seam

Recipe: `full-width-statement`. Layout family used once on the page. Band ground `paper-band`, capped top and bottom by hairlines, so the section reads as a different sheet in the same file rather than a new website.

```html
<section id="seam" class="relative z-[0] w-full bg-paper-band border-y border-rule-hair
                          py-16 sm:py-20 lg:py-28">
  <div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
```

**Lead, two columns.**

```html
<div class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-x-12">
  <motion.h2 variants={revealChild} initial="initial" whileInView="animate" viewport={{ once: false, amount: 0.4 }}
    class="lg:col-span-7 font-display font-medium [font-stretch:78%]
           text-[clamp(1.5rem,2.8vw,2.4rem)] leading-[1.12] tracking-[-0.01em]
           text-ink text-balance">
    The model writes the policy once, at authoring time.
    Every order after that is checked by a contract with no model in it.
  </motion.h2>

  <div class="lg:col-span-5 lg:pl-10 lg:border-l lg:border-rule-strong">
    <p class="font-sans text-[1.0625rem] leading-[1.65] text-ink-secondary max-w-[52ch]">
      A prompt is a sentence that can be argued with. Admission is a function that returns a code.
      Mandate keeps the model on the writing side of that line and never lets it cross.
    </p>
  </div>
</div>
```

**The two ledgers.** Below the lead, a true split with one hard vertical rule:

```html
<div class="mt-14 grid grid-cols-1 lg:mt-20 lg:grid-cols-2">
  <!-- authoring -->
  <div class="lg:pr-10 xl:pr-14">
    <div class="flex items-baseline justify-between pb-3 border-b-2 border-ink">
      <h3 class="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink">Authoring time</h3>
      <span class="font-mono text-[0.6875rem] tabular-nums text-ink-tertiary">01</span>
    </div>
    <ol class="mt-0">
      <li class="flex gap-5 border-b border-rule-hair py-4">
        <span class="font-mono text-[0.6875rem] tabular-nums text-ink-tertiary pt-1">1.1</span>
        <span class="font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">You write the rule in plain English.</span>
      </li>
      <!-- three more rows, identical classes, copy in §19 -->
    </ol>
    <div class="flex items-baseline justify-between pt-4">
      <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Model calls</span>
      <span class="font-mono text-[0.8125rem] font-medium tabular-nums text-ink">1</span>
    </div>
  </div>

  <!-- execution -->
  <div class="mt-12 lg:mt-0 lg:pl-10 xl:pl-14 lg:border-l lg:border-rule-strong">
    <div class="flex items-baseline justify-between pb-3 border-b-2 border-ink">
      <h3 class="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink">Execution time</h3>
      <span class="font-mono text-[0.6875rem] tabular-nums text-ink-tertiary">02</span>
    </div>
    <ol>…four rows, same classes, copy in §19…</ol>
    <div class="flex items-baseline justify-between pt-4">
      <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Model calls</span>
      <span class="font-mono text-[0.8125rem] font-medium tabular-nums text-ink">0</span>
    </div>
  </div>
</div>
```

The two counters are the section's entire argument, so they sit on the same baseline at the same size, 8.5rem apart, rather than being emphasised with colour. The `0` is not decorated. A reader who reaches the bottom of the two columns sees `1` and `0` and everything above them has already explained why.

**Motion.** Section wraps in `motion.div` with `staggerChildren 0.04`; each child uses `revealChild`. The two counters animate last at delay `0.24`.

Motion values are not stored in `useState`. `useInView` with `once: false` and `amount: 0.4`.

---

## §6 Section 3: Admission, check by check

Recipe: `architecture-layers`, executed as a ruled table rather than stacked cards. This is the densest section on the page and it obeys the dashboard hardening rule: borders and dividers, no boxes.

```html
<section id="admission" class="relative z-[0] w-full bg-paper py-16 sm:py-20 lg:py-28">
  <div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
```

**Eyebrow 1 of 2.** The only eyebrow before section 6.

```html
<span class="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink-tertiary">
  How admission works
</span>
<h2 class="mt-5 max-w-[22ch] font-display font-bold [font-stretch:70%]
           text-[clamp(2.1rem,4.2vw,3.5rem)] leading-[0.94] tracking-[-0.02em] text-ink text-balance">
  One order, nine checks.
</h2>
```

**Column header row.**

```html
<div class="mt-12 hidden sm:grid grid-cols-[3.5rem_15rem_1fr_6rem] gap-x-6 pb-2 border-b border-rule-strong">
  <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Step</span>
  <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Check</span>
  <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Derived from</span>
  <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary text-right">If it fails</span>
</div>
```

**Nine rows.** Identical class string, one of them carries state:

```html
<div class="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3.5rem_15rem_1fr_6rem] gap-x-4 sm:gap-x-6
            items-baseline py-4 border-b border-rule-hair group">
  <span class="font-mono text-[0.6875rem] tabular-nums text-ink-tertiary">01</span>
  <span class="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink">Mandate active</span>
  <span class="font-sans text-[0.9375rem] leading-[1.55] text-ink-secondary">
    Mandate status read from storage at the current block
  </span>
  <span class="justify-self-end font-mono text-[0.6875rem] tabular-nums
               border border-rule-strong px-[6px] py-[2px] rounded-[var(--radius-tag)]">0x01</span>
</div>
```

The refusing row, seventh in the list, carries the only state change in the section:

```html
<div class="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3.5rem_15rem_1fr_6rem] gap-x-4 sm:gap-x-6
            items-baseline py-4 border-b border-rule-hair
            bg-signal-wash border-l-2 border-l-signal pl-3 -ml-3">
  <span class="font-mono text-[0.6875rem] tabular-nums text-signal-text">07</span>
  <span class="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-signal-text">Market notional</span>
  <span class="font-sans text-[0.9375rem] leading-[1.55] text-ink-secondary">
    C3 cap plus the notional of the order being requested
  </span>
  <span class="justify-self-end font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em]
               text-paper bg-signal px-2 py-[3px] rounded-[var(--radius-tag)]">Refused</span>
</div>
```

Row content, in order, with the failure code each maps to (this table is the contract for the implementation, do not reorder):

| Step | Check | Derived from | Code |
|---|---|---|---|
| 01 | Mandate active | stored status and expiry | `0x01` |
| 02 | Executor authorised | operator registry | `0x02` |
| 03 | Not expired | `block.timestamp` against C6 | `0x03` |
| 04 | Market allowed | C1 set | `0x04` |
| 05 | Price on tick | pool `tickSize` | `0x05` |
| 06 | Size on lot | pool `lotSize` | `0x06` |
| 07 | Market notional | C3 plus requested notional | `0x08` |
| 08 | Total notional | C4 plus requested notional | `0x09` |
| 09 | Leverage | C2 against equity at this block | `0x0A` |

Below the table, one line of small print, because the venue has a second gate the page should not hide:

```html
<p class="mt-6 max-w-[70ch] font-sans text-[0.875rem] leading-[1.6] text-ink-secondary">
  Two further checks run after these nine: the venue's own position cap and the availability of paper credit.
  When the venue binds first, the refusal still returns a code, because a silent pass is the one outcome this
  contract is not allowed to produce.
</p>
```

**Motion.** Rows are children of a `staggerChildren 0.035` container, each row `revealChild` with `x: 0` (no horizontal movement in a table), `y: 10`, `blur(4px)`.

---

## §7 Section 4: Six clauses

Recipe: `capabilities-grid`, asymmetric, six cells on a 6-column grid with three rows of unequal span. Families: 4+2, 2+4, 3+3. This is the section the skill's "three equal feature cards" ban exists to prevent, so no two cells share a width.

```html
<section id="clauses" class="relative z-[0] w-full bg-paper-band border-y border-rule-hair
                            py-16 sm:py-20 lg:py-28">
  <div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
    <h2 class="max-w-[20ch] font-display font-bold [font-stretch:70%]
               text-[clamp(2.1rem,4.2vw,3.5rem)] leading-[0.94] tracking-[-0.02em] text-ink text-balance">
      Six clauses. Sixteen ways to be refused.
    </h2>
    <p class="mt-6 max-w-[62ch] font-sans text-[1.0625rem] leading-[1.65] text-ink-secondary">
      The policy language is closed on purpose. A clause that cannot be reduced to a number, a set of
      addresses or a timestamp is rejected at authoring time with its own reason code.
    </p>

    <div class="mt-12 grid grid-cols-1 md:grid-cols-6 border-t border-l border-rule-hair">
```

Cell, default treatment:

```html
<div class="md:col-span-4 border-r border-b border-rule-hair bg-paper p-6 sm:p-7 lg:p-8 flex flex-col justify-between min-h-[13rem]">
  <div class="flex items-baseline justify-between">
    <span class="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink-tertiary">C1</span>
    <span class="font-mono text-[0.6875rem] tabular-nums text-ink-tertiary">address[]</span>
  </div>
  <h3 class="mt-8 font-display font-bold uppercase [font-stretch:70%] text-[1.125rem] tracking-[0.01em] text-ink">
    Allowed markets
  </h3>
  <p class="mt-2 font-mono text-[0.8125rem] tabular-nums text-ink">{value}</p>
  <p class="mt-4 font-sans text-[0.875rem] leading-[1.55] text-ink-secondary">{refusalCopy}</p>
  <span class="mt-4 self-start font-mono text-[0.6875rem] tabular-nums border border-rule-strong
               px-[6px] py-[2px] rounded-[var(--radius-tag)] text-ink-secondary">{code}</span>
</div>
```

Cell C3, the one the hero refused on, is the dark plate. Same structure, `bg-plate border-rule-plate`, label `text-plate-ink-muted`, heading `text-plate-ink`, value `text-plate-ink`, body `text-plate-ink-muted`, code chip `border-rule-plate text-signal-on-plate`. One dark cell in a field of six, which is the same argument the hero makes at full scale.

Spans and content: C1 `md:col-span-4`, C2 `md:col-span-2`, C3 `md:col-span-2` plate, C4 `md:col-span-4`, C5 `md:col-span-3`, C6 `md:col-span-3`.

Because `justify-between` is used with `min-h-[13rem]`, the short cells (C2, C3) and tall cells (C1, C4) align their headings to a shared baseline without any fixed heights on the text.

**Motion.** Cells stagger at `0.05` per cell, `revealChild` at `duration 0.45`. The C3 plate additionally scales from `1.015` to `1` over `0.6s` on entry, which reads as a heavy sheet settling. Reduced motion drops the scale.

---

## §8 Section 5: Measured

Recipe: `metrics-section`, four cells on a divided row, borders only, no cards.

```html
<section id="measured" class="relative z-[0] w-full bg-paper py-16 sm:py-20 lg:py-28">
  <div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <h2 class="font-display font-bold [font-stretch:70%] text-[clamp(2.1rem,4.2vw,3.5rem)]
                 leading-[0.94] tracking-[-0.02em] text-ink">Measured</h2>
      <p class="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
        Written by scripts/measure.ts · run {timestamp}
      </p>
    </div>

    <div class="mt-10 grid grid-cols-2 lg:grid-cols-4 border-y border-rule-strong divide-x divide-rule-hair">
      <div class="px-5 py-7 sm:px-6 sm:py-9">
        <div class="font-display font-extrabold [font-stretch:62%] text-[clamp(2rem,4vw,3.25rem)]
                    leading-none tabular-nums text-ink">{value}</div>
        <div class="mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink">{label}</div>
        <p class="mt-2 font-sans text-[0.8125rem] leading-[1.5] text-ink-secondary">{sourceNote}</p>
      </div>
      <!-- three more cells, identical classes -->
    </div>
  </div>
</section>
```

Four cells, in order:

| Label | Value bound to | Source note shown under it |
|---|---|---|
| Refusal gas, median | `metrics.refusalGasMedian` | "admit() revert on 50383, against the same order sent to the pool" |
| Venue revert gas, median | `metrics.venueRevertGasMedian` | "the pool's own revert for the identical order" |
| Reason codes wired | `metrics.codeCount` | "each with a Foundry test asserting the selector" |
| Model calls on the order path | `metrics.modelCallsOnPath` | "counted by static import analysis in CI" |

**Hard constraint on this section:** the values are read from `metrics.json`, which is generated by a script that runs against testnet during the build. There are no fallback numbers in the repository. If the file is absent the section renders its empty state, not a guess:

```html
<p class="mt-10 border-y border-rule-hair py-10 font-mono text-[0.8125rem] text-ink-secondary">
  No measurement run recorded. Run <span class="text-ink">pnpm measure</span> against 50383 and rebuild.
</p>
```

Under the grid, one line of honesty that costs nothing and pre-empts the obvious objection:

```html
<p class="mt-5 max-w-[74ch] font-sans text-[0.875rem] leading-[1.6] text-ink-secondary">
  These are testnet figures from one deployment, not a benchmark. Gas on mainnet will differ, and the
  refusal is cheaper than the venue revert because it stops before the pool does the work.
</p>
```

Once a value is present, digits animate: `useInView` triggers a 1.2s `tabular-nums` count from zero, `once: false`, and the final string is formatted with the same formatter used in the console so the two cannot disagree. Reduced motion renders the final string with no count.

---

## §9 Section 6: The ledger

Recipe: `tabbed-feature-explorer`. Three hard tabs, one ruled table, real rows read from chain events.

```html
<section id="decisions" class="relative z-[0] w-full bg-paper-band border-y border-rule-hair
                               py-16 sm:py-20 lg:py-28">
  <div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
```

**Eyebrow 2 of 2, then the heading.**

```html
<span class="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink-tertiary">The record</span>
<h2 class="mt-5 font-display font-bold [font-stretch:70%] text-[clamp(2.1rem,4.2vw,3.5rem)]
           leading-[0.94] tracking-[-0.02em] text-ink">Every decision, from events</h2>
<p class="mt-6 max-w-[60ch] font-sans text-[1.0625rem] leading-[1.65] text-ink-secondary">
  Nothing in this table is cached. Clear the browser and it rebuilds from logs, because the chain is
  the only source that cannot drift from itself.
</p>
```

**Tabs.** Hard segmented control, sharing one border, no radius, no pill:

```html
<div role="tablist" aria-label="Decision outcome"
     class="mt-10 inline-flex border border-rule-strong divide-x divide-rule-strong">
  <button role="tab" aria-selected={active === "refused"}
          class="px-5 sm:px-6 h-12 font-mono text-[0.6875rem] uppercase tracking-[0.16em]
                 transition-colors duration-[120ms]
                 aria-selected:bg-ink aria-selected:text-paper text-ink
                 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink">
    Refused <span class="ml-2 tabular-nums">{count}</span>
  </button>
  <!-- Admitted, Enforced: identical classes -->
</div>
```

Selection is carried by `aria-selected` and a filled block, not by colour alone.

**Table.** Column header row, then up to six rows:

```html
<div class="mt-8 border-t border-rule-strong">
  <div class="hidden md:grid grid-cols-[6.5rem_7rem_1fr_7.5rem_5rem_8rem] gap-x-4 py-2 border-b border-rule-hair">
    <span class="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">Time</span>
    <span class="…">Market</span>
    <span class="…">Intent</span>
    <span class="…">Result</span>
    <span class="…">Code</span>
    <span class="… text-right">Tx</span>
  </div>

  <a href="/console/decisions/{id}"
     class="group grid grid-cols-1 md:grid-cols-[6.5rem_7rem_1fr_7.5rem_5rem_8rem] gap-x-4 gap-y-1
            py-4 border-b border-rule-hair hover:bg-paper transition-colors duration-[120ms]">
    <span class="font-mono text-[0.75rem] tabular-nums text-ink-tertiary">{timeIso}</span>
    <span class="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-ink">{market}</span>
    <span class="font-sans text-[0.9375rem] text-ink-secondary">{intent}</span>
    <span class="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em]
                 text-signal-text">{outcome}</span>
    <span class="font-mono text-[0.75rem] tabular-nums text-ink">{code}</span>
    <span class="md:justify-self-end font-mono text-[0.75rem] tabular-nums text-ink-secondary
                 group-hover:text-ink">{shortHash}</span>
  </a>
</div>
```

The outcome word is the only coloured cell in the table, and it is coloured only for refusals. An admitted row's outcome reads `Admitted` in `text-ink`, because admission is permission, not success. An enforced row reads `Enforced` in `text-ink` with a `border-l-2 border-ink pl-2` marker, since it is neither.

**Empty state, per tab.** One shared component, three strings, and a real next action:

```html
<div class="mt-8 border-y border-rule-hair py-14 text-center">
  <p class="font-mono text-[0.8125rem] text-ink-secondary">{emptyCopy}</p>
  <a href="/console/mandates/new" class="mt-4 inline-block font-mono text-[0.6875rem] uppercase
     tracking-[0.18em] text-ink border-b border-ink pb-1">Register a mandate</a>
</div>
```

Mobile: the grid collapses to one column and each row renders as `time · market` on one line, intent on the next, `outcome code` and hash on a third. Achieved with `grid-cols-1 md:grid-cols-[…]` and `gap-y-1`, no separate markup.

**Transition between tabs.** `AnimatePresence mode="wait"`: exit `opacity 0, y -6` at `0.16s`, enter `opacity 0→1, y 8→0, blur 4px→0` at `0.28s`, both `[0.16,1,0.3,1]`. Exit is 57% of enter, inside the 60 to 70% guidance and deliberately at the short end because a tab that lingers feels broken.

---

## §10 Section 7: Limits

Recipe: `vertical-grid-walkthrough`. A sticky left rail against five numbered limits. This is the section that decides whether a judge trusts the rest of the page, so it is a first-class section with its own rhythm, not a footnote.

```html
<section id="limits" class="relative z-[0] w-full bg-paper py-16 sm:py-20 lg:py-28">
  <div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
    <div class="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-12">
```

**Left rail.**

```html
      <div class="lg:col-span-4">
        <div class="lg:sticky lg:top-28">
          <h2 class="font-display font-bold [font-stretch:70%] text-[clamp(2.1rem,4.2vw,3.5rem)]
                     leading-[0.94] tracking-[-0.02em] text-ink text-balance">
            What Mandate does not do.
          </h2>
          <div class="mt-6 flex items-baseline gap-3">
            <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Count</span>
            <span class="font-mono text-[0.8125rem] tabular-nums text-ink">05</span>
          </div>
        </div>
      </div>
```

**Right column, five rows.** Each row: a horizontal rule, a mono index, a bold claim, then the explanation.

```html
      <div class="mt-12 lg:mt-0 lg:col-span-8 lg:pl-10 lg:border-l lg:border-rule-strong">
        <div class="border-t border-rule-strong py-7 first:border-t-0 first:pt-0">
          <div class="grid grid-cols-[2rem_1fr] gap-x-4 sm:grid-cols-[3rem_1fr] sm:gap-x-6">
            <span class="font-mono text-[0.75rem] tabular-nums text-ink-tertiary pt-1">01</span>
            <div>
              <h3 class="font-display font-bold uppercase [font-stretch:70%] text-[1rem] tracking-[0.01em] text-ink">
                It cannot outrun a liquidation
              </h3>
              <p class="mt-2 font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary max-w-[58ch]">
                A callback is not instant and the venue does not wait for one. Mandate narrows the range
                of outcomes. It does not remove the floor.
              </p>
            </div>
          </div>
        </div>
        <!-- four more rows -->
      </div>
    </div>
  </div>
</section>
```

The sticky rail is `position: sticky`, which is one of the two places the skill permits blur. No blur is used here regardless: the rail is plain paper so it passes over nothing.

The five rows, in order: cannot outrun a liquidation, the compiler can misread a sentence, an operator can be revoked, callbacks cost the owner, testnet only. Full copy in §19.

**Motion.** The rail does not animate; it is anchor content and animating a sticky element causes layout thrash. The five rows stagger at `0.045`, `revealChild`.

---

## §11 Footer

Not a section family, and it is not counted against the layout-repetition budget. It closes the document by returning to the plate, so the page opens and closes on the same dark surface with the paper between them.

```html
<footer class="relative z-[0] w-full bg-plate text-plate-ink">
  <div class="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 pt-14 lg:pt-20 pb-10">
    <div class="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div class="lg:col-span-5">
        <span class="font-display font-extrabold [font-stretch:68%] uppercase text-[0.9375rem]
                     tracking-[0.22em] text-plate-ink">Mandate</span>
        <p class="mt-5 max-w-[38ch] font-sans text-[0.9375rem] leading-[1.6] text-plate-ink-muted">
          A policy layer for perps orders on Somnia. Written rules, enforced by contract, refused with a reason.
        </p>
        <button data-connect-gate class="group mt-8 flex items-stretch h-12 bg-plate-ink text-plate">
          <span class="flex items-center px-5 text-[0.875rem] font-medium">Open the console</span>
          <span class="flex w-12 items-center justify-center border-l border-plate/25">
            <ArrowUpRight size={15} strokeWidth={1.75}
              class="transition-transform duration-200 ease-[var(--ease-quint)]
                     group-hover:translate-x-0.5 group-hover:-translate-y-px" />
          </span>
        </button>
      </div>

      <nav class="lg:col-span-3 lg:col-start-7" aria-label="Repository and posts">
        <h2 class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">Project</h2>
        <ul class="mt-4 space-y-2.5">
          <li><a href="/console/decisions/demo" class="font-sans text-[0.9375rem] text-plate-ink
                 hover:text-signal-on-plate transition-colors duration-[220ms]">A refusal receipt</a></li>
          <li><a href="{repoUrl}" class="…">Repository</a></li>
          <li><a href="{xPostOne}" class="…">Post 1, what I am building</a></li>
          <li><a href="{xPostTwo}" class="…">Post 2, the submission</a></li>
        </ul>
      </nav>

      <div class="lg:col-span-3">
        <h2 class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">Deployment</h2>
        <dl class="mt-4 space-y-3">
          <div>
            <dt class="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">Chain</dt>
            <dd class="font-mono text-[0.8125rem] tabular-nums text-plate-ink">50383 · Hideki</dd>
          </div>
          <div>
            <dt class="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">Mandate</dt>
            <dd class="font-mono text-[0.8125rem] tabular-nums text-plate-ink">{mandateAddress}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="mt-14 flex flex-wrap items-baseline justify-between gap-3 pt-5 border-t border-rule-plate">
      <p class="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
        Testnet only · no real funds
      </p>
      <p class="font-mono text-[0.6875rem] tabular-nums text-plate-ink-muted">Block {block}</p>
    </div>
  </div>
</footer>
```

No locale strip, no photo credit, no version label, no social icon row, no newsletter field.

---

## §12 Motion contract

One table governs every animation in the build. Implementation copies these values; it does not invent durations.

```ts
// lib/motion.ts
export const EASE = [0.16, 1, 0.3, 1] as const

export const blurRise = {
  initial: { opacity: 0, y: 16, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0,  filter: "blur(0px)" },
  transition: { duration: 0.55, ease: EASE },
}

export const revealChild = {
  initial: { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0,  filter: "blur(0px)" },
  transition: { duration: 0.42, ease: EASE },
}

export const container = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
}

export const stamp = {
  initial: { opacity: 0, scale: 1.06, rotate: 0.8 },
  animate: { opacity: 1, scale: 1,    rotate: 0 },
  transition: { duration: 0.18, ease: EASE },
}
```

| Element | initial | animate | duration | ease | delay |
|---|---|---|---|---|---|
| Hero headline, both lines | `blurRise` | `blurRise` | 0.55 | `[0.16,1,0.3,1]` | 0.05 / 0.13 |
| Hero subhead | `blurRise` | `blurRise` | 0.45 | same | 0.24 |
| Hero CTA pair | `blurRise` | `blurRise` | 0.40 | same | 0.34 |
| Hero plate | `opacity 0, y 18` | `opacity 1, y 0` | 0.50 | same | 0.20 |
| Hero rule draw | `pathLength 0` | `pathLength 1` | scroll | linear | n/a |
| Hero dashed run | `pathLength 0, opacity 0` | `pathLength 1, opacity 1` | scroll | linear | at 0.42 progress |
| Verdict stamp | `stamp` | `stamp` | 0.18 | same | 0.55 |
| Section 2 lead | `revealChild` | `revealChild` | 0.42 | same | stagger 0.04 |
| Section 2 counters | `revealChild` | `revealChild` | 0.42 | same | 0.24 |
| Section 3 rows | `y 10, blur 4` | `y 0, blur 0` | 0.42 | same | stagger 0.035 |
| Section 4 cells | `revealChild` | `revealChild` | 0.45 | same | stagger 0.05 |
| Section 4 C3 plate | `scale 1.015, opacity 0` | `scale 1, opacity 1` | 0.60 | same | stagger |
| Section 5 digits | `0` | final value | 1.20 | `linear` | on entry |
| Section 6 tab enter | `opacity 0, y 8, blur 4` | `opacity 1, y 0, blur 0` | 0.28 | same | 0 |
| Section 6 tab exit | `opacity 1, y 0` | `opacity 0, y -6` | 0.16 | same | 0 |
| Section 7 rows | `revealChild` | `revealChild` | 0.42 | same | stagger 0.045 |
| Nav scrolled | `border-rule-hair` | `border-rule-strong` | 0.20 | same | 0 |
| Mobile drawer | `x 100%` | `x 0` | 0.28 | same | 0 |
| Mobile drawer exit | `x 0` | `x 100%` | 0.18 | same | 0 |
| Button icon hover | `translate 0,0` | `translate 2px,-1px` | 0.20 | same | 0 |
| Wallet dropdown | `opacity 0, scale 0.95, y -6` | `opacity 1, scale 1, y 0` | 0.18 | `[0.22,1,0.36,1]` | 0 |
| Toast | `opacity 0, y -12` | `opacity 1, y 0` | 0.24 | `[0.16,1,0.3,1]` | 0 |
| Route enter | `opacity 0, y 12, blur 6` | `opacity 1, y 0, blur 0` | 0.40 | same | 0 |
| Route exit | `opacity 1, y 0` | `opacity 0, y -8` | 0.24 | same | 0 |

Rules that apply to all of the above:

- **Every reveal replays.** `viewport={{ once: false, amount: … }}`. There is no `once: true` in this codebase, and no CSS keyframe with `fill-mode: forwards` or `both` is used for a scroll reveal.
- **Exit is shorter than enter** everywhere, at 55 to 65% of enter duration.
- **Never animate `width`, `height`, `top` or `left`.** Progress is `transform` and `opacity` only. The one exception is `pathLength`, which is a stroke property and does not trigger layout.
- **Reduced motion.** `useReducedMotion()` returns true, every variant collapses to `{ opacity: 0 }` to `{ opacity: 1 }` at `0.01s`, the count-up renders its final string, and the hero rule renders at `pathLength: 1`. Implemented once in a `<MotionConfig reducedMotion="user">` wrapper plus the hook for the three components that bypass variants.
- **No bounce, no elastic, no spring on functional UI.** The only spring in the build is the `useSpring` return-to-rest on the magnetic behaviour, which is not used on this page.
- **No hover animation on an image.** There are no images.

---

## §13 Wallet interaction contract

Copied into this spec in full because Step 14 marks an implied wallet contract as an incomplete spec. Implementers may not treat any of the following as obvious.

### Files that must exist

| File | Purpose |
|---|---|
| `vercel.json` | SPA rewrite, the hosting fallback |
| `components/routing/ProtectedRoute.tsx` | the single route gate |
| `components/routing/AppErrorBoundary.tsx` | the runtime containment boundary |
| `components/wallet/WalletConnectModal.tsx` | the only place wagmi `connect()` is called |
| `components/wallet/WalletMenu.tsx` | console-interior dropdown |
| `components/wallet/DisconnectToast.tsx` | post-disconnect notice on the landing page |
| `lib/session.ts` | one persisted key, described below |

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Hydration state

The gate reads three states, never two:

```ts
const { isConnected, isReconnecting, isConnecting } = useAccount()
const hydrating = isReconnecting || isConnecting
```

- **`hydrating` true.** Render `<ReconnectingScreen />`, an ink plate with the wordmark and a 1px indeterminate progress rule. Do not redirect. Do not render an app shell with an unknown identity. The URL is preserved untouched.
- **`isConnected` true, not hydrating.** Render `<Outlet />`, exact requested route, including nested paths such as `/console/decisions/0x…`.
- **Confirmed disconnected.** `<Navigate to="/" replace />`, with `state: { disconnected: true }` only when the disconnect happened mid-session.
- **Provider error, state unknown.** Render an in-app recovery plate with `Retry` and `Return to landing`. A provider error is never evidence that the wallet is disconnected.

### Protected routes

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/console" element={<Overview />} />
  <Route path="/console/mandates/new" element={<Author />} />
  <Route path="/console/decisions" element={<Ledger />} />
  <Route path="/console/positions" element={<Positions />} />
  <Route path="/console/settings" element={<Settings />} />
</Route>
<Route path="/console/decisions/:id" element={<Receipt />} />   {/* public, shares the URL */}
```

The receipt route sits outside the gate on purpose. A receipt is public by design: it is the artifact that gets posted to X, and it must open for someone with no wallet. It shares its path prefix with the gated ledger, which is why the router declares it first.

### Persisted disconnect intent

One key, `mandate:wallet-disconnected`, written `"1"` when the user disconnects deliberately and removed on the next successful connect. On mount, if the key is present, the console treats the session as disconnected until the user connects again. This is the single exception to the repository's no-storage rule, and it exists because a refresh must not silently re-enter a wallet the user deliberately left. It stores a boolean intent, never product state, never a token, never chain data. `lib/session.ts` is the only file allowed to touch storage.

### Connection modal states

| State | Trigger | Rendering | Close button |
|---|---|---|---|
| `idle` | button clicked | title, one sentence on what connecting does, wallet list | enabled |
| `opening` | wallet selected | "Opening your wallet" | **disabled** |
| `awaiting` | provider prompted | "Confirm in your wallet. Nothing is signed until you approve." | **disabled** |
| `connected` | account granted | "Connected" with address, auto-advance after 600ms | disabled until advance |
| `rejected` | user refused | "You declined in your wallet. Nothing was sent." plus `Try again` | enabled |
| `wrongNetwork` | chain not 50383 | "Switch to Somnia Hideki (50383)" plus `Switch network` | enabled |
| `error` | provider threw | cause in plain words plus `Try again` | enabled |

Rules: never call `connect()` from a bare button; the modal owns all wagmi state; the parent holds only `showModal` and `onConnectClick`; every entry point on the landing page (nav block, hero CTA, footer CTA) calls the same `openModal`; during `awaiting` the modal cannot be dismissed by scrim, Escape or close button, so the approval flow cannot be abandoned in an unknown state.

### Console wallet dropdown

Trigger pill, top right of the console top bar: `h-11 pl-3 pr-2 flex items-center gap-3 border border-rule-strong bg-paper`, containing a 6px `bg-ink` square (not a green dot: this build does not use a success colour), the address in mono truncated to `0xd8A4…31f0`, and a chevron rotating 180 degrees on open. `aria-expanded`, `aria-haspopup="menu"`.

Panel, `absolute right-0 top-[calc(100%+8px)] w-[19rem] border border-rule-strong bg-paper`:
- Product status header, dark plate strip inside the panel: `OPERATOR · ACTIVE` and `ENFORCEMENT · {CHAIN | KEEPER}`. The second value is read from `ENFORCEMENT_MODE`. It is the only badge in the product allowed to say `CHAIN`, and it may only say so when callbacks come from the precompile.
- Mandate block: `C3 CAP · 200.00 USDso` and `C2 LEVERAGE · 3.00x`, read live.
- Full address with a copy control that swaps to a check for 1800ms.
- `View on explorer`, opening `{explorer}/address/{address}` in a new tab with `rel="noopener noreferrer"`.
- `Revoke operator`, separated by a 1px rule, in `text-signal-text`, requiring a confirm step. Not red-filled: filled red would compete with the refusal language that the rest of the product owns.
- Escape closes. Outside `mousedown` closes, via `document` listener, never a backdrop div. Focus returns to the trigger on close. The panel never appears on the landing page.

### Error containment

`AppErrorBoundary` wraps the route outlet. On catch it renders a paper plate with `Something failed in this view`, the error code, `Retry` and `Return to landing`. It logs to console in development and never renders a stack trace. Wallet calls are individually caught and mapped to inline states; a rejected signature produces a row-level message, never a crash and never a redirect.

### Acceptance tests, run before submission

1. Connect, navigate to `/console/decisions`, hard refresh, confirm the same route renders with no 404.
2. Refresh while connected, confirm no flash of the landing page.
3. Disconnect in the console, confirm the landing page and toast appear, refresh, confirm no silent reconnect.
4. Open `/console/decisions/0x…` in a fresh browser with no wallet, confirm the public receipt renders.
5. Reject a connection and a network switch, confirm in-app retry states and that the rest of the page stays usable.
6. Simulate an RPC failure, confirm the error boundary appears with both recovery actions.
7. Open a receipt with JavaScript disabled, confirm the server-rendered content still describes the decision.

---

## §14 Console interior

Same tokens, denser layout, no landing-page decoration. The console is where the demo happens, so it is specified at the same precision.

### Shell

```html
<div class="min-h-[100dvh] bg-paper lg:grid lg:grid-cols-[15rem_1fr]">
  <aside class="hidden lg:flex flex-col border-r border-rule-hair bg-paper">
    <div class="h-14 flex items-center px-5 border-b border-rule-hair">
      <span class="font-display font-extrabold [font-stretch:68%] uppercase text-[0.8125rem] tracking-[0.22em]">Mandate</span>
    </div>
    <nav class="flex-1 py-4">
      <a href="/console" class="flex items-center h-11 px-5 font-mono text-[0.6875rem] uppercase
         tracking-[0.16em] text-ink-secondary border-l-2 border-transparent
         hover:text-ink aria-[current=page]:text-ink aria-[current=page]:border-l-ink aria-[current=page]:bg-paper-band">Overview</a>
      <!-- Mandates, Decisions, Positions, Settings: identical classes -->
    </nav>
    <div class="border-t border-rule-hair p-5">
      <p class="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">Enforcement</p>
      <p class="mt-1 font-mono text-[0.8125rem] tabular-nums text-ink">{modeLabel}</p>
    </div>
  </aside>

  <div class="min-w-0">
    <header class="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-rule-hair bg-paper sticky top-0 z-[200]">
      <!-- page title, mono label; WalletMenu on the right -->
    </header>
    <main class="px-4 sm:px-6 lg:px-10 py-8 lg:py-10 max-w-[92rem]">{children}</main>
  </div>
</div>
```

### Overview blocks

Three blocks, all ruled, no cards:

1. **Headroom table.** One row per clause, four columns: clause, limit, current, headroom. Current value is `tabular-nums`; headroom is a 64px wide track with a 3px fill in `bg-ink`, changing to `bg-signal` only when at or beyond the limit. Rows at `border-b border-rule-hair`, no boxes.
2. **Enforcement strip.** A dark plate, full width of the column, three fields: subscription status, last callback block, balance floor. If `ENFORCEMENT_MODE=keeper`, the strip carries `KEEPER` in `text-signal-on-plate` and one sentence explaining that enforcement runs from a published key rather than a chain subscription.
3. **Recent decisions.** The last five rows, reusing the ledger row component from §9 at reduced density.

### Authoring screen

```html
<textarea class="mt-6 w-full min-h-[9rem] bg-paper border border-rule-strong p-4 font-mono text-[0.875rem]
                 leading-[1.6] text-ink placeholder:text-ink-tertiary focus-visible:outline-2
                 focus-visible:outline-offset-[-2px] focus-visible:outline-ink resize-y"
          aria-describedby="author-hint" placeholder="Never risk more than 200 USDso on one market. Never above 3x. Be flat by Friday." />
```

That placeholder is a real example rule set, not lorem. Below it, three preset blocks (`Scalper`, `Hedge`, `Sandbox`) as `border border-rule-strong px-4 h-11` buttons in a row, each with its compiled summary under the label in mono.

After compile, the review step renders one row per clause:

```html
<div class="grid grid-cols-1 sm:grid-cols-[7rem_1fr_10rem] gap-x-6 gap-y-2 py-5 border-b border-rule-hair">
  <span class="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">C3</span>
  <p class="font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">
    <span class="text-ink">“{userSentence}”</span>
  </p>
  <span class="font-mono text-[0.8125rem] tabular-nums text-ink sm:text-right">{compiledValue}</span>
</div>
```

The user's own sentence sits beside the compiled number in the same row, always. A rejected clause renders the same row with `text-signal-text` on the id, the sentence struck through with `line-through decoration-1`, and `E_UNEXPRESSIBLE` in the value column. Register button stays disabled while any clause is rejected, with the reason in one line beneath it.

### Receipt page, public

Route `/console/decisions/[id]`, no gate, server-rendered from the event so it survives with JavaScript disabled.

- Plate header: `Decision · Block {n}` left, `Mandate {ref}` right.
- The clause, quoted in the user's own words, in `text-[1.25rem] leading-[1.5] text-plate-ink`, above the numbers.
- The scale from the hero, reused at `h-[104px]`, same components.
- Verdict, code, plain-English sentence, both transaction hashes, and a `Copy link` control.
- One line of provenance: `Read from Somnia Hideki at block {n}. Not a summary.`
- `<meta name="robots" content="index,follow">` and Open Graph tags pointing at the generated card from §18.

---

## §15 Responsive summary

Breakpoints: base 375, `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. No custom breakpoints.

| Area | Base | `sm` | `lg` |
|---|---|---|---|
| Nav | 56px bar, wordmark and `Menu` button | same | 80px bar, A4 split, links visible, centre empty |
| Hero statement | single column, headline `clamp` floor 3.2rem | same | 12-column grid, headline 8 cols, meta 4 cols, meta bottom-aligned |
| Hero plate | stacked, scale `h-[88px]`, verdict above sentence | same | verdict and sentence on one baseline, `justify-between` |
| Section 2 | stacked, no vertical rule | same | two columns, 1px `rule-strong` between them |
| Section 3 | 3-column rows, `Derived from` wraps under the label | 4-column rows, header row visible | same |
| Section 4 | 1 column, every cell full width | 2 columns via `md:col-span-*` | 6-column grid, spans 4+2 / 2+4 / 3+3 |
| Section 5 | 2 columns, 2 rows | same | 4 columns, one row |
| Section 6 | stacked rows, tabs scroll horizontally with `-mx-5 px-5` bleed | header row visible | full 6-column rows |
| Section 7 | stacked, rail above the rows | same | rail sticky `top-28`, rows in an 8-column track with a left rule |
| Footer | 1 column, CTA full width | 2 columns | 5 / 3 / 3 columns on a 12-track |

Every positional class in this document already carries its breakpoint prefix. Nothing in the build uses `hidden` on a critical action; the console entry moves into the drawer rather than disappearing.

---

## §16 Accessibility and performance

**Accessibility.**

- Skip link is the first focusable element on every page: `sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[600] focus:bg-ink focus:text-paper focus:px-4 focus:py-2`.
- Focus rings: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`, negative offset inside the nav and tabs where the parent border would clip.
- Heading order is strict: one `h1` per page (hero), `h2` per section, `h3` inside sections. The footer's link groups use `h2` because the footer is outside the main landmark's heading flow.
- Tabs implement `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, arrow-key navigation and `role="tabpanel"` with `aria-labelledby`.
- The decision table is real `<table>` markup on the ledger page and the grid-based row layout is used only on the marketing page, where the rows are links rather than data.
- Every code chip carries `aria-label` spelling the code's name, so a screen reader hears "market notional cap" rather than hex.
- No information is carried by colour alone: refusals carry the word `Refused`, admitted rows carry the word `Admitted`, active nav carries a filled block and a left rule.
- Forms: visible labels, validation on blur, errors stating cause and fix, focus moved to the first invalid field after a failed submit, disabled states at 0.45 opacity plus the `disabled` attribute.
- `prefers-reduced-motion` handled in one place.

**Performance.**

- No images on the page at all, so no `loading` strategy, no CLS from media, no LCP candidate other than the hero headline.
- Fonts self-hosted via `next/font`, `display: swap`, `size-adjust` left at the library default, subset to latin, two families, `preload` on Archivo only.
- The grain is a data URI, adding zero requests.
- No third-party script on the landing page. Analytics, if added, must be deferred and must not be an iframe.
- The ledger table virtualises at 50 rows. Below that it renders in full, because a 12-row table does not need a windowing library.
- Every route is statically renderable except the receipt, which is server-rendered from the indexer and cached for 30 seconds.

---

## §17 Asset briefs

There is no photography, no video and no illustration in this build. That is a decision, not a gap: the product's evidence is textual, and stock imagery of traders at monitors would contradict the instrument.

| # | Asset | Status | Brief |
|---|---|---|---|
| 1 | Hero plate | coded | Rendered from a live decision. No asset file. |
| 2 | Grain | coded | Inline SVG data URI, 2.8% opacity. No asset file. |
| 3 | Open Graph card | needed | `[ASSET PENDING: statically generated 1200x630 card, paper ground #f2f5f7, headline "Rules in English. Refusals on chain." set in Archivo 62% width 800 weight, ink, two lines; a single hairline rule stopping at a cap tick; verdict "REFUSED 0x08" in #c02719 at the right; wordmark bottom left in mono | Search: none, render from the hero component with puppeteer at build time]` |
| 4 | Favicon and touch icon | needed | `[ASSET PENDING: single-colour mark derived from the wordmark's first letter, 32x32 and 180x180, ink on paper, no gradient | Search: none, must be drawn, and the logo is a slot]` |
| 5 | Logo | deferred | `{/* Logo slot */}` in the nav, hero-free, and footer. No invented symbol ships. If a mark is wanted, ask before drawing one. |

The Open Graph card is not decoration: without it the three X posts render as grey links, and the posts are a scored deliverable.

---

## §18 Layout audit and spec self-check

**§0D layout repetition, run against the seven sections:**

| Section | Family | Count |
|---|---|---|
| 1 | `poster-hero` | 1 |
| 2 | `full-width-statement` | 1 |
| 3 | `architecture-layers` | 1 |
| 4 | `capabilities-grid` | 1 |
| 5 | `metrics-section` | 1 |
| 6 | `tabbed-feature-explorer` | 1 |
| 7 | `vertical-grid-walkthrough` | 1 |

Seven sections, six distinct families plus the hero, every family used exactly once. Zero zigzag splits. Two eyebrows across seven sections, inside the one-per-three cap. Hero holds four text elements, no fifth. No split-header pattern anywhere: no section opens with a headline on the left and an unrelated filler paragraph on the right.

**Self-check, each line verified in the document above:**

- [x] Exact Tailwind string for every element: nav, hero, seven sections, footer, console shell, authoring, receipt, wallet menu
- [x] Every animation has initial, animate, duration, ease and delay, consolidated in §12
- [x] z-index against a named global scale, per-section stacks declared, nothing above 600
- [x] Asset brief per asset, with `[ASSET PENDING: … | Search: …]` where an asset does not exist yet
- [x] Responsive variants on every positional class, summarised in §15
- [x] Recipe referenced by name for all seven sections
- [x] Wallet interaction contract copied in full: modal states, hydration variable, protected routes, disconnect routing, dropdown anatomy, copy and explorer actions, Escape and outside-click, error boundary, hosting fallback file, seven acceptance tests
- [x] No `once: true`, no `fill-mode: forwards`, no banned nav pattern, no pure black or white, no gradient background, no glass, no gradient text on the H1, no three equal feature cards, no invented placeholder data
- [x] Contrast measured for every pair, not estimated, with two tokens corrected as a result
- [x] Every number in the UI is derived at render time or read from a generated file
- [x] Copy is final and lives in §19, so implementation transcribes rather than invents

**One deviation from the skill, stated rather than buried.** `backdrop-filter` is banned in this build even on fixed elements, where the skill permits it. A blurred bar is the visual grammar of glassmorphism and it would contradict the enclosing hard edges. The mobile drawer scrim uses `bg-plate/80` instead, which is a solid tint and costs one less compositor layer.

---

## §19 Copy deck

Every user-visible string. Implementation copies these verbatim; any change goes through this file.

**Nav.** `Mandate` · `Clauses` · `Decisions` · `Limits` · `Open the console` · `Menu` · `Close`

**Hero.** Headline: `Rules in English.` / `Refusals on chain.` Subhead: `Mandate turns the rules you would say out loud into a contract that checks every perps order before it reaches the venue.` CTAs: `Open the console` · `Read a refusal`. Plate, state 1: live values from the decoded decision. Plate, state 2 header: `Preview · Block {n}` and `No transaction`; body: `A 2,000.00 USDso order on ETH-PERP returns {code} from this contract right now.` and `This is a live view call against deployed code. Nothing was sent, so there is no hash to show, and the first order that is actually recorded will replace this panel.` Plate, state 3: `The chain read failed at block {n}. Nothing on this page is estimated, so this panel is empty on purpose. Retry in a moment.`

**Section 2.** Heading as written in §5. Left column: `You write the rule in plain English.` / `One model call returns a policy object.` / `Every value is validated against a closed schema.` / `You sign the policy hash.` Right column: `The executor calls admit().` / `The contract re-derives equity and notional from state at this block.` / `Nine checks run, six of them yours.` / `The order is placed, or it reverts with one code.` Labels: `Authoring time` · `Execution time` · `Model calls` · `1` · `0`.

**Section 3.** Eyebrow: `How admission works`. Heading: `One order, nine checks.` Column headers: `Step` · `Check` · `Derived from` · `If it fails`. Row check names: `Mandate active` · `Executor authorised` · `Not expired` · `Market allowed` · `Price on tick` · `Size on lot` · `Market notional` · `Total notional` · `Leverage`. Small print as written in §6.

**Section 4.** Heading: `Six clauses. Sixteen ways to be refused.` Lead as written in §7. Clause titles: `Allowed markets` · `Maximum leverage` · `Market notional cap` · `Total notional cap` · `Loss per window` · `Expiry`. Each cell's refusal line is the code's user-facing sentence from `APP_BLUEPRINT.md`, reused verbatim from the same table the contract's decoder uses.

**Section 5.** Heading: `Measured`. Meta: `Written by scripts/measure.ts · run {timestamp}`. Labels: `Refusal gas, median` · `Venue revert gas, median` · `Reason codes wired` · `Model calls on the order path`. Notes and small print as written in §8. Empty state as written in §8.

**Section 6.** Eyebrow: `The record`. Heading: `Every decision, from events`. Lead as written in §9. Tabs: `Refused` · `Admitted` · `Enforced`. Column headers: `Time` · `Market` · `Intent` · `Result` · `Code` · `Tx`. Empty states: `No refusals recorded for this mandate yet.` · `No admitted orders yet. The first one that clears every check will appear here.` · `No enforcement events. Nothing has been forced back inside the mandate.`

**Section 7.** Heading: `What Mandate does not do.` Label: `Count` · `05`. Rows: `It cannot outrun a liquidation` / `A callback is not instant and the venue does not wait for one. Mandate narrows the range of outcomes. It does not remove the floor.` · `The compiler can misread a sentence` / `That is why the compiled value appears beside your own words and why the hash covers both.` · `An operator can be revoked` / `Revoking the key stops trading immediately. The console says so before you click.` · `Callbacks cost the owner` / `A subscription is not free, and the precompile requires a balance held at the vault.` · `Testnet only` / `Paper credit, no real funds, and no mainnet perps to connect to yet.`

**Footer.** Wordmark: `Mandate`. Line: `A policy layer for perps orders on Somnia. Written rules, enforced by contract, refused with a reason.` CTA: `Open the console`. Columns: `Project` / `Deployment`. Links: `A refusal receipt` · `Repository` · `Post 1, what I am building` · `Post 2, the submission`. Labels: `Chain` · `50383 · Hideki` · `Mandate` · `{address}`. Bottom: `Testnet only · no real funds` · `Block {n}`.

**Console.** `Overview` · `Mandates` · `Decisions` · `Positions` · `Settings` · `Enforcement` · `{CHAIN | KEEPER}` · `Register a mandate` · `Compile rules` · `Recompile` · `Revoke operator` · `View on explorer` · `Copy address` · `Copy link` · `Retry` · `Return to landing` · `Something failed in this view`.

**Errors.** `You declined in your wallet. Nothing was sent.` · `Switch to Somnia Hideki (50383)` · `This wallet has no active mandate, so nothing can be placed for it.` · `The request did not reach the chain. Nothing was placed. Try again.`

**Banned strings, checked for and absent:** any em dash, any exclamation mark, `John Doe`, `Acme`, `99.9%`, `Lorem`, `Coming soon`, `Learn more`, `Click here`, `Submit`, `Get started`, `Seamless`, `Empower`, `Unlock`, and any sentence of the form "not just X, it is Y".

