---
name: GRAVITAS
description: Local-first study guardian and multi-agent command center
colors:
  primary: "#4A89C8"
  primary-hover: "#5D9BD8"
  bg-app: "#121518"
  bg-surface: "#1C2025"
  bg-surface-hover: "#262B31"
  bg-surface-subtle: "#16191D"
  border: "#2E3339"
  border-subtle: "#24282D"
  border-focus: "#4A89C8"
  text-primary: "#F0EEE8"
  text-secondary: "#9FA4A8"
  text-tertiary: "#686E74"
  accent-sage: "#8EA89D"
  accent-blue: "#4A89C8"
typography:
  display:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2rem, 3.5vw, 2.5rem)"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 550
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Cascadia Code, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.04em"
rounded:
  none: "0px"
  sm: "2px"
  md: "4px"
  lg: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.bg-app}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "7px 14px"
---

# Design System: GRAVITAS

## Overview

**Creative North Star: "The Architectural Monolith & Deep Cyan Chamber"**

GRAVITAS is a disciplined, distraction-free environment built for high-focus intellectual work. It explicitly rejects consumer SaaS tropes: no playful rounded capsules, no cheerful confetti colors, no generic dashboard metric tiles, and no neon glowing borders. The aesthetic is rooted in structural precision, reminiscent of architectural blueprints, high-end optical instruments, and typographic journals.

Surfaces are anchored in deep warm graphite and obsidian tones (`#121518`), elevated strictly through tonal separation rather than heavy drop-shadows. The signature sculptural blue asset provides an atmospheric horizon without ever compromising foreground typographic legibility.

**Key Characteristics:**
- **Zero Pill Shapes**: All containers, tags, chips, buttons, and navigation elements use sharp or micro-beveled corners (0–4px radius). Circular pill capsules (`border-radius: 9999px`) are strictly forbidden.
- **Architectural Hierarchy**: Information is organized into clean, unbordered or hairline-delimited planes with generous breathing room.
- **Atmospheric Blue Depth**: The sculptural blue texture is woven seamlessly into the backdrop with deep black negative space protecting readable content.
- **Dual-Mode Integrity**: Light mode is authored as warm editorial parchment (`#F5F4F0` / `#FCFBF9`), not bleached clinic white, maintaining the same architectural dignity.

## Colors

The palette balances deep basalt dark tones with restrained slate-cyan accents and crisp, warm high-contrast text.

### Primary
- **Sculptural Horizon Blue** (#4A89C8 in Dark, #1D548F in Light): Used intentionally on focused interactive accents, key action markers, and subtle selection states (strictly ≤10% visual surface area).

### Neutral
- **Basalt App Canvas** (#121518 in Dark, #F5F4F0 in Light): The foundational atmosphere.
- **Elevated Chamber Surface** (#1C2025 in Dark, #FCFBF9 in Light): Functional workspaces and panels.
- **Hairline Divider / Boundary** (#2E3339 in Dark, #E2DFD8 in Light): 1px structural framing without visual heaviness.
- **Primary Editorial Text** (#F0EEE8 in Dark, #1C2024 in Light): High readability text with warm undertone.
- **Secondary Metadata Text** (#9FA4A8 in Dark, #60666D in Light): Secondary descriptions, timestamps, and counts.
- **Tertiary Muted Code** (#686E74 in Dark, #8E959E in Light): Monospaced technical indicators.

### Named Rules
**The Zero-Pill Rule.** No interactive element, status indicator, tag, or button may use a pill shape or `border-radius: 9999px`. All boundaries must use geometric or subtle micro-radii (0–4px).

**The Ten-Percent Accent Rule.** The primary blue accent is reserved exclusively for focal actions and active indicator lines. It must never coat generic backgrounds or create garish glow effects.

## Typography

**Display Font:** Geist Variable (with -apple-system, BlinkMacSystemFont, Segoe UI fallback)  
**Body Font:** Geist Variable  
**Label/Mono Font:** Geist Mono Variable  

**Character:** Calm, geometric, balanced grotesk typography with wide weight range (300 to 700) paired with tabular monospaced metadata.

### Hierarchy
- **Display** (Weight 550, 32–38px, line-height 1.2, letter-spacing -0.035em): Hero section greetings and landmark headers.
- **Headline** (Weight 550, 20–24px, line-height 1.3, letter-spacing -0.02em): Major section headers and view titles.
- **Title** (Weight 550, 14–16px, line-height 1.4, letter-spacing -0.01em): Card titles, subject names, and task summaries.
- **Body** (Weight 400, 13.5–14.5px, line-height 1.55): Task details, study notes, instructions, and search inputs.
- **Label** (Weight 500, 11–12px, letter-spacing 0.04em, Monospaced): Subject codes, status indicators, keyboard shortcuts, and metadata tags.

## Layout

The workspace employs an asymmetric editorial layout:
- **Primary Work Stream (1.65fr)**: Houses the active work agenda, urgent semester assignments, and study note drafts.
- **Secondary Reference Rail (1fr)**: Anchors semester subject manifests, iCloud inbox status, and quick knowledge filters.
- Spacing operates on a strict 8px rhythmic grid with 24–36px gutters between major sections and 12–16px internal padding.

## Elevation & Depth

Surfaces rely on tonal layering and crisp 1px borders rather than heavy blur drop shadows.
Depth is structural and planar:
- Base: Deepest layer (`--bg-app`).
- Surface: Elevated workspace boards (`--bg-surface`).
- Hover: Subtle background shift (`--bg-surface-hover`) with 0px offset hairline border focus.

## Shapes

- **Corner Strategy**: Strictly 2px to 4px subtle rounded corners for cards and inputs. 0px sharp corners for dividers, headers, and tabs.
- **Borders**: Continuous 1px hairlines using `--border` tokens. No drop shadows pretending to be borders.

## Components

### Buttons
- **Shape**: Rectangular with subtle micro-corner (2px to 4px radius). Never pill-shaped.
- **Primary Action**: Crisp high-contrast (`--text-primary` on dark canvas or solid accent), 8px 16px padding.
- **Secondary / Ghost**: Transparent fill, 1px hairline border, hover color shift.

### Tags & Status Indicators
- **Shape**: Rectangular with 2px radius and 1px hairline outline.
- **Typography**: Monospaced 11px uppercase with tracked letter spacing.
- **State Dot**: 5px square or circular pip paired with textual state (e.g. `READY`, `LISTENING`).

### Cards / Containers
- **Corner Style**: 4px subtle radius.
- **Background**: Solid `--bg-surface`.
- **Border**: 1px subtle boundary (`--border-subtle`).
- **Padding**: 16px to 20px.

### Navigation
- **Style**: Underlined active tabs or sharp rectangular segments. No rounded bubble navs.

## Do's and Don'ts

### Do:
- **Do** preserve 100% of user and instructor transcripts verbatim.
- **Do** use geometric 2–4px micro-radii on buttons, inputs, and cards.
- **Do** use Geist Mono for subject codes, keyboard shortcuts, and status indicators.
- **Do** maintain generous 28–36px section margins to give complex academic material breathing room.

### Don't:
- **Don't** use pill-shaped elements (`border-radius: 9999px` / `border-radius: 999px`) anywhere.
- **Don't** use generic multi-card grid layouts that fragment related information into tiny boxes.
- **Don't** use glowing neon borders, purple accents, or gratuitous blur effects.
- **Don't** use bleached pure-white (#FFFFFF) in light mode; use warm tactile parchment (#F5F4F0).
