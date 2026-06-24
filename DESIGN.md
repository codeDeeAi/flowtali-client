# Flowtali Design System

Based on [Vercel Geist](https://vercel.com/design) — adapted for a dark-first financial application with green accent.

---

## Principles

- **High contrast, restrained color.** Neutral surfaces; color signals state and hierarchy, never decoration.
- **Signal over chrome.** Every element earns its pixels. No gratuitous gradients, glows, or shadows.
- **Motion clarifies change.** Animate only when it helps comprehension. Honor `prefers-reduced-motion`.
- **Accessibility first.** WCAG AA contrast (4.5:1 body text). Visible focus rings on every interactive element. Never signal state with color alone.

---

## Color System

### Philosophy

Colors use a 10-step scale where the step encodes **intent**, not just lightness:

| Step | Intent |
|------|--------|
| 100 | Default background |
| 200 | Hover background |
| 300 | Active background |
| 400 | Default border |
| 500 | Hover border |
| 600 | Active border |
| 700 | Solid fill, high contrast |
| 800 | Solid fill, hover |
| 900 | Secondary text / icons |
| 1000 | Primary text / icons |

### Gray Scale (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| `gray-100` | `#1a1a1a` | Default surface |
| `gray-200` | `#1f1f1f` | Hover surface |
| `gray-300` | `#292929` | Active surface |
| `gray-400` | `#2e2e2e` | Default border |
| `gray-500` | `#454545` | Hover border |
| `gray-600` | `#878787` | Active border |
| `gray-700` | `#8f8f8f` | Solid fill |
| `gray-800` | `#7d7d7d` | Solid fill hover |
| `gray-900` | `#a0a0a0` | Secondary text |
| `gray-1000` | `#ededed` | Primary text |

### Gray Alpha (Translucent)

For overlays and translucent borders on dark surfaces:

| Token | Value |
|-------|-------|
| `gray-alpha-100` | `rgba(255,255,255,0.07)` |
| `gray-alpha-200` | `rgba(255,255,255,0.09)` |
| `gray-alpha-300` | `rgba(255,255,255,0.13)` |
| `gray-alpha-400` | `rgba(255,255,255,0.14)` |
| `gray-alpha-500` | `rgba(255,255,255,0.24)` |
| `gray-alpha-600` | `rgba(255,255,255,0.51)` |
| `gray-alpha-700` | `rgba(255,255,255,0.54)` |
| `gray-alpha-800` | `rgba(255,255,255,0.47)` |
| `gray-alpha-900` | `rgba(255,255,255,0.61)` |
| `gray-alpha-1000` | `rgba(255,255,255,0.92)` |

### Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-100` | `#000000` | Page background |
| `bg-200` | `#000000` | Subtle separation (same in dark) |

### Green Accent Scale (Primary Brand)

| Token | Hex | Usage |
|-------|-----|-------|
| `green-100` | `#0a2e1a` | Tinted background |
| `green-200` | `#0d3b21` | Hover tinted bg |
| `green-300` | `#114a2a` | Active tinted bg |
| `green-400` | `#145c34` | Default accent border |
| `green-500` | `#1a7a44` | Hover accent border |
| `green-600` | `#22a05a` | Active accent border |
| `green-700` | `#00c853` | **Primary accent** — buttons, links, active states |
| `green-800` | `#2ee67a` | Accent hover |
| `green-900` | `#6ff5a4` | Light accent text |
| `green-1000` | `#c1fcd8` | Lightest accent |

### Semantic Colors

| Purpose | Color | Hex |
|---------|-------|-----|
| Success / Paid | Green | `#00c853` |
| Warning / Due | Amber | `#f5a623` |
| Error / Overdue | Red | `#ea001d` |
| Info / Links | Blue | `#006efe` |

### Status Badge Palette

| Status | BG | Text | Border |
|--------|----|------|--------|
| Paid / Active | `rgba(0,200,83,0.10)` | `#00c853` | `rgba(0,200,83,0.22)` |
| Due / Pending | `rgba(245,166,35,0.10)` | `#f5a623` | `rgba(245,166,35,0.22)` |
| Overdue | `rgba(248,113,113,0.10)` | `#f87171` | `rgba(248,113,113,0.22)` |
| Draft / Inactive | `rgba(160,160,160,0.10)` | `#a0a0a0` | `rgba(160,160,160,0.22)` |

---

## Typography

### Font Families

| Token | Family | Usage |
|-------|--------|-------|
| `--font-sans` | `'Geist Sans', sans-serif` | All UI text and prose |
| `--font-mono` | `'Geist Mono', monospace` | Code, data, tabular figures |

### Type Scale

**Headings** — weight 600, tighter letter-spacing at larger sizes:

| Token | Size | Line height | Letter spacing |
|-------|------|-------------|----------------|
| `heading-48` | 48px | 1.1 | -2.88px |
| `heading-32` | 32px | 1.2 | -1.28px |
| `heading-24` | 24px | 1.25 | -0.72px |
| `heading-20` | 20px | 1.3 | -0.4px |
| `heading-16` | 16px | 1.4 | -0.16px |
| `heading-14` | 14px | 1.4 | 0 |

**Labels** — weight 500, single-line scannable text:

| Token | Size | Line height |
|-------|------|-------------|
| `label-16` | 16px | 24px |
| `label-14` | 14px | 20px |
| `label-12` | 12px | 16px |
| `label-10` | 10px | 14px |

**Body / Copy** — weight 400, taller line height for multi-line:

| Token | Size | Line height |
|-------|------|-------------|
| `copy-16` | 16px | 26px |
| `copy-14` | 14px | 22px |
| `copy-13` | 13px | 20px |

**Buttons** — weight 500:

| Token | Size | Line height |
|-------|------|-------------|
| `button-16` | 16px | 24px |
| `button-14` | 14px | 20px |
| `button-12` | 12px | 16px |

### Rules

- Use tokens, never hand-set font size / weight / line height.
- Max two font weights per view.
- Use `--font-mono` for aligned numerals in tables and data.

---

## Spacing

### Scale

All spacing follows a **4px base grid**: `4, 8, 12, 16, 24, 32, 40, 64, 96px`.

### Rhythm

| Context | Spacing |
|---------|---------|
| Inside a group | 8px |
| Between groups | 16px |
| Between sections | 32–40px |

### Card Padding

| Variant | Padding |
|---------|---------|
| Compact | 16px |
| Standard | 24px |
| Hero | 32px |

### Layout Container

- Max width: `1200px`, centered
- Side padding responsive: 16px (mobile) → 24px (md) → 32px (lg)

### Breakpoints

| Name | Width |
|------|-------|
| `sm` | 401px |
| `md` | 601px |
| `lg` | 961px |
| `xl` | 1200px |
| `2xl` | 1400px |

---

## Shapes & Radii

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Controls, inputs, buttons |
| `radius-md` | 12px | Menus, popovers, cards |
| `radius-lg` | 16px | Modals, large panels |
| `radius-full` | 9999px | Pills, avatars, badges |

**Rule:** Keep one radius family per view — don't mix rounded and sharp corners.

---

## Elevation & Shadows (Dark Theme)

Hierarchy comes from **tonal surfaces and borders first**. Shadows are supplementary.

| Level | Value | Usage |
|-------|-------|-------|
| Raised | `0 1px 2px rgba(0,0,0,0.16)` | Cards |
| Popover | `0 1px 1px rgba(0,0,0,0.02), 0 4px 8px -4px rgba(0,0,0,0.04), 0 16px 24px -8px rgba(0,0,0,0.06)` | Menus, dropdowns |
| Modal | `0 1px 1px rgba(0,0,0,0.02), 0 8px 16px -4px rgba(0,0,0,0.04), 0 24px 32px -8px rgba(0,0,0,0.06)` | Dialogs, overlays |

---

## Motion

| Context | Duration |
|---------|----------|
| Most interactions | 0ms (instant) |
| State changes | ~150ms |
| Popovers / tooltips | ~200ms |
| Overlays / modals | ~300ms |

**Easing:** `cubic-bezier(0.175, 0.885, 0.32, 1.1)` — short and physical.

**Rules:**
- No looping, decorative, or attention-grabbing animation.
- Honor `prefers-reduced-motion` by removing nonessential motion.
- Fade-in/up for page content: 150ms ease.

---

## Components

### Buttons

**Variants:**

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Primary | `green-700` (#00c853) | `bg-100` (#000) | none | Single most important action |
| Secondary | `bg-100` (#000) | `gray-1000` (#ededed) | `gray-alpha-400` | Supporting actions |
| Tertiary | transparent | `gray-1000` | none | Low-emphasis actions |
| Error | `red-700` (#ea001d) | white | none | Destructive actions |

**Sizes:**

| Size | Height | Typography | Padding | Radius |
|------|--------|------------|---------|--------|
| Small | 32px | button-14 | 0 6px | 6px |
| Medium | 40px | button-14 | 0 10px | 6px |
| Large | 48px | button-16 | 0 14px | 6px |

### Inputs

| Size | Height | Typography | Padding | Radius |
|------|--------|------------|---------|--------|
| Small | 32px | label-14 | 0 12px | 6px |
| Medium (default) | 40px | label-14 | 0 12px | 6px |
| Large | 48px | label-16 | 0 12px | 6px |

- Background: `gray-100` (#1a1a1a)
- Border: `gray-400` (#2e2e2e)
- Text: `gray-1000` (#ededed)
- Placeholder: `gray-900` (#a0a0a0)
- Focus: `0 0 0 2px #000, 0 0 0 4px #00c853` (2px gap, 2px green ring)

### States

| State | Background | Border |
|-------|-----------|--------|
| Default | step 100 | step 400 |
| Hover | step 200 | step 500 |
| Active | step 300 | step 600 |
| Disabled | `gray-100` fill, `gray-700` text, `not-allowed` cursor |
| Focus | Two-ring: `0 0 0 2px bg-100, 0 0 0 4px green-700` |

---

## Content & Voice

### Capitalization
- **Title Case**: Labels, buttons, titles, tabs
- **Sentence case**: Body text, helper text, toasts

### Action Naming
Name actions with a verb and a noun: `Create Invoice`, `Delete Member`. Never `Confirm`, `OK`, or a bare verb.

### Error Messages
Write as what happened + what to do: `"Invoice not found. Check the URL or return to your dashboard."`

### Toasts
Name the specific thing that changed. Drop the trailing period. Never say "successfully":
- `Invoice created`
- `Client archived`
- `Payment recorded`

### Empty States
Point to the first action: `"No invoices yet. Create your first invoice to get started."`

### In-Progress States
Present participle with ellipsis: `Creating...`, `Saving...`, `Sending...`

---

## Token Quick Reference (Tailwind)

```
/* Colors — use as Tailwind classes: bg-gray-100, text-gray-1000, border-gray-400, etc. */
bg-surface      → bg-gray-100
bg-surface-hover → bg-gray-200
text-primary    → text-gray-1000
text-secondary  → text-gray-900
text-muted      → text-gray-700
border-default  → border-gray-400
accent          → green-700 (#00c853)
accent-hover    → green-800 (#2ee67a)

/* Semantic */
text-success    → #00c853
text-warning    → #f5a623
text-error      → #f87171
text-info       → #006efe
```
