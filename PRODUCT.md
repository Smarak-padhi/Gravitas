# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University STEM students, researchers, and self-directed knowledge workers managing high cognitive-demand workflows across study, coursework, projects, and personal tasks. Specifically designed for a computer science / engineering student handling rigorous course loads (e.g., modern computing systems, algorithms, database systems, linear algebra, microprocessors) who needs local-first organization without cloud leakage or paid SaaS dependencies.

## Product Purpose

GRAVITAS is a local-first, distraction-free study guardian and multi-agent command center. It unifies natural-language task capture, voice dictation, semester coursework organization, local markdown knowledge management, and automated study reminders into a private, high-performance desktop experience. Success means zero cognitive clutter, total data sovereignty, zero required cloud subscriptions, and an immediate, reliable assistant accessible in under 100 milliseconds via global shortcut.

## Positioning

Unlike cloud productivity suites (Notion, Todoist, Linear) that harvest data and lock users into proprietary clouds, GRAVITAS runs 100% locally on user hardware. It preserves raw user transcripts verbatim alongside extracted structured tasks, monitors an offline iCloud Drive inbox for phone-to-desktop capture without internet relay, and maintains complete compatibility with local Markdown tools (such as Obsidian) without requiring proprietary database sync or accounts.

## Operating Context

- Desktop environment (Electron on Windows/macOS/Linux) with a main Workspace window and an ultra-fast floating Companion window (toggled via `Ctrl+Shift+Space`).
- Academic semester workflow tracking exact semester courses (e.g., 7 core CSE subjects: Data Science Workshop 1, Modern Computing Systems Design, Algorithms Analysis & Design, Database Systems, Web Technologies, Computer Organization & Microprocessor Systems, Linear Algebra & Differential Equations).
- Cross-device workflow: capturing ideas, audio, or PDFs on phone into local iCloud Drive Inbox folder, auto-ingested by GRAVITAS desktop into semester-tagged tasks and study answers.
- Dual-role usage: high-focus study/revision sessions alternating with quick-fire capture and voice dictation.

## Capabilities and Constraints

- Local SQLite storage for instant sub-millisecond querying of notes, tasks, ideas, and subject syllabi.
- Universal offline Push-to-Talk (PTT) audio dictation and text command parser with explicit user confirmation before system changes.
- Strict separation between original teacher material (instructions/questions) and student answer drafts.
- Strict privacy: zero telemetry, zero mandatory cloud accounts, zero paid API locks.
- Pure local-first UI: bundled Geist / Geist Mono typography, zero external Google Fonts CDN or runtime web font fetching, zero analytics.

## Brand Commitments

- Name: GRAVITAS.
- Signature visual identity: Sculptural deep blue and obsidian forms with restrained negative space.
- Atmospheric dignity: Calm, authoritative, architectural, and restrained.
- Inviolable visual rule: ABSOLUTELY NO PILL-SHAPED BUTTONS, NAVIGATION TABS, SUGGESTION CHIPS, OR STATUS CONTAINERS. No `border-radius: 9999px`. Form language must be architectural, crisp, and geometric (0–4px subtle corners, clean hairline borders).
- No generic AI dashboard tropes: no glowing neon borders, no gratuitous purple gradients, no meaningless metric cards or nested containers.

## Evidence on Hand

- Verified 7 active semester courses with real catalog codes and credit structures.
- Bundled offline variable fonts (`assets/fonts/Geist-Variable.woff2`, `assets/fonts/GeistMono-Variable.woff2`).
- Bundled sculptural blue signature visual asset (`assets/welcome-bg.png`).
- Active suite of over 370 automated unit and integration tests verifying scheduler, storage, and IPC integrity.

## Product Principles

1. **Local-First & Data Sovereign**: Every byte belongs to the student on their own machine.
2. **Architectural Restraint**: Form follows cognitive clarity; no decorative fluff, no generic dashboard cards, and no cartoonish pill shapes.
3. **Verbatim Truth & Provenance**: Raw user prompts, dictation audio, and instructor prompts are preserved exactly as captured alongside structured summaries.
4. **Frictionless Immediacy**: Every core task (capture, search, study briefing, guardian reminders) is accessible in under one second.
