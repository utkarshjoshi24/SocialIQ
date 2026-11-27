---
name: "SocialIQ — Precision Dark Analytics"
description: "A dark-first, data-focused SaaS design system for SocialIQ, balancing Linear-like minimalism with subtle 3D surface depth and strategic Electric Cyan and Violet accents."
---

## Overview

SocialIQ is a modern social media analytics and performance prediction platform designed for content creators, college organizations, social media managers, and small teams. The interface communicates a clear progression: **DATA → ANALYSIS → INSIGHT**.

The visual language is dark, minimal, and precision-engineered—inspired by modern developer and analytics tools (Linear, Vercel, Stripe) without copying any single product. Surfaces step cleanly from deep obsidian (`#050505`) to elevated slate (`#171A20`), using subtle translucent borders, controlled radial depth, and restrained typography to keep data and charts as the undisputed focal point.

## Colors

The palette is built on deep neutral surfaces (`#050505` through `#171A20`) that eliminate halation and maximize chart legibility. Color is used with strict discipline: **Electric Cyan** (`#22D3EE`) marks primary actions, active navigation, and primary data series, while **Violet** (`#A78BFA`) serves as a secondary analytical series and prediction accent. Semantic status colors (`success`, `warning`, `error`) are reserved exclusively for performance deltas, validation states, and system feedback.

```yaml
colors:
  background: "#050505"
  on-background: "#F5F7FA"
  background-secondary: "#0B0D10"
  on-background-secondary: "#F5F7FA"
  surface: "#111318"
  on-surface: "#F5F7FA"
  surface-elevated: "#171A20"
  on-surface-elevated: "#F5F7FA"
  surface-hover: "#1E222A"
  text-secondary: "#9CA3AF"
  text-muted: "#828B99"
  outline: "#2B303B"
  outline-variant: "#1D2028"
  primary: "#22D3EE"
  on-primary: "#042830"
  primary-container: "#0B2933"
  on-primary-container: "#67E8F9"
  secondary: "#A78BFA"
  on-secondary: "#190D33"
  secondary-container: "#241942"
  on-secondary-container: "#DDD6FE"
  success: "#34D399"
  on-success: "#04261B"
  success-container: "#0A281F"
  on-success-container: "#6EE7B7"
  warning: "#FBBF24"
  on-warning: "#2B1900"
  warning-container: "#2B210B"
  on-warning-container: "#FDE68A"
  error: "#F87171"
  on-error: "#2B0909"
  error-container: "#2D1215"
  on-error-container: "#FCA5A5"
```

## Typography

SocialIQ pairs **Alata** for crisp geometric headings and large KPI figures with **Instrument Sans** for highly legible UI controls, table rows, and analytical body copy, plus **Spline Sans Mono** for tabular metrics, timestamps, and model identifiers. All numerical data, percentages, and table figures use `tabular-nums`.

```yaml
typography:
  display-lg:
    fontFamily: "Alata"
    fontSize: 40px
    fontWeight: 400
    lineHeight: 48px
    letterSpacing: -0.5px
  display-lg-mobile:
    fontFamily: "Alata"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 36px
    letterSpacing: -0.25px
  kpi-lg:
    fontFamily: "Alata"
    fontSize: 34px
    fontWeight: 400
    lineHeight: 40px
    letterSpacing: -0.5px
  kpi-lg-mobile:
    fontFamily: "Alata"
    fontSize: 26px
    fontWeight: 400
    lineHeight: 32px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: "Alata"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 32px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Instrument Sans"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 26px
    letterSpacing: -0.15px
  title-sm:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  body-md:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Instrument Sans"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0px
  label-md:
    fontFamily: "Instrument Sans"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.4px
  mono-sm:
    fontFamily: "Spline Sans Mono"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
```

## Layout & Spacing

SocialIQ is a **desktop-first** analytics application structured around a persistent `224px` left sidebar (`#0B0D10`), a compact `56px` sticky top header, and a scrollable fluid-grid main canvas (`#050505`) with a `1280px` max content width. Spacing follows a strict `4px` / `8px` grid. On tablet and mobile breakpoints, the sidebar collapses into a compact drawer/navigation bar, multi-column KPI and chart grids stack cleanly to single columns, and data tables become horizontally scrollable.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
  section: 24px
  page-margin: 24px
```

## Elevation & Depth

Hierarchy is achieved through **tonal surface stepping** (`#050505` → `#0B0D10` → `#111318` → `#171A20`) paired with subtle `1px` structural borders (`outline-variant` and `outline`) and top-edge inner highlights (`rgba(255,255,255,0.04)`). Subtle 3D depth is communicated through layered card planes, soft ambient shadows (`0 8px 24px rgba(0,0,0,0.45)`), and ultra-restrained radial glows behind primary KPI and prediction surfaces—never heavy glassmorphism, neon cyberpunk, or distracting 3D objects.

## Shapes

Corner radii are crisp and architectural, avoiding overly bubbly cards. Buttons, inputs, and badges use `6px`–`8px` radii; cards and chart containers use `10px`–`12px`; pills and status dots use `9999px`.

```yaml
rounded:
  sm: 6px
  DEFAULT: 8px
  md: 10px
  lg: 12px
  xl: 16px
  full: 9999px
```

## Motion & Micro-interaction

Motion is crisp, fast, and purposeful. Interactive state changes (hover depth, button feedback, sidebar active states) resolve within `120ms`. Filter transitions and modals enter with a decelerating curve in `200ms`. All animations respect `prefers-reduced-motion` and animate only `transform`, `opacity`, and color.

```yaml
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 200ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

Copy is **analytical, direct, and restrained**—focused on data, patterns, and next actions without hype or buzzwords.

- **Capitalisation:** Sentence case for page titles, subtitles, insight statements, and button labels; uppercase tracking for compact KPI eyebrows (`TOTAL VIEWS`, `ENGAGEMENT RATE`).
- **Action Labels:** Specific verb-noun pairs (`Predict Performance`, `Add Post`, `Export CSV`, `Compare Periods`).
- **Numbers & Dates:** Compact abbreviations for large KPIs (`2.84M`, `412.6K`), one decimal place for percentages (`+18.4%`, `6.8%`), and `tabular-nums` everywhere.
- **States:** Every data view accounts for empty, loading, filtered, and error states with clear, actionable recovery copy.

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Badge** → `@components/badge.html` — `badge-numeric`, `badge-dot`
- **Button** → `@components/button.html` — `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html` — `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Input Field** → `@components/input-field.html` — `input-field-text`, `input-field-icon`
- **Table** → `@components/table.html` — `table-standard`, `table-interactive`, `table-selectable`
