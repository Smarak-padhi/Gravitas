# GRAVITAS 2.0 — Canonical Product Charter

<!-- gravitas:product-charter 2.0 -->

## 1. Product Mission & Identity

**GRAVITAS 2.0** transforms GRAVITAS from a corporate-feeling productivity dashboard into a **private, delightful personal engineering studio** and spatial workspace.

The primary product goal is **staying installed, cherished, and indispensable** — never replaced during cleanup. It serves a single owner on local hardware, creating an intimate, cozy, creative environment where real engineering work, focused study, deep note-taking, project tracking, and relaxed recovery coexist seamlessly.

---

## 2. Target Platform & Hardware Envelope

- **Target Device**: Lenovo IdeaPad Gaming 3 (Intel Core i5-12th Gen, 16 GB RAM, NVIDIA GeForce RTX 3050 Laptop GPU, Windows 11 x64).
- **Resource Constraints**:
  - Idle baseline: ≤ 200 MB RAM across all desktop processes.
  - Studio mode with 2D mascot animations: 60 FPS, ≤ 2% background CPU.
  - Optional 3D Office mode: Lazy-loaded on demand, WebGL loop paused when unmounted or hidden, strict 60 FPS cap.
  - Local speech-to-text: Offline-first with on-demand Whisper base/tiny inference, offloaded when inactive.
- **Data Sovereignty**: 100% single-owner local-first SQLite persistence (`%APPDATA%\gravitas\`). Zero required cloud accounts or telemetry.

---

## 3. Core Product Pillars

### 3.1 The Living Studio & 2D Mascot Family
- **Studio-First Environment**: An illustrated, cozy, tactile studio replaces rigid SaaS tables and cold dashboard cards.
- **Original Mascot Family led by Grav**: Expressive 2D characters with distinct personalities, authentic micro-animations, and genuine activity-driven behaviors — no generic AI orbs or corporate chatbots:
  - **Grav (Studio Lead & Personal Companion)**: Orchestrates focus, morning briefings, study schedules, and system commands.
  - **Ada (Study & Knowledge Guardian)**: Manages university courses, assignment deadlines, lecture notes, and active recall.
  - **Cipher (Backend & Systems Specialist)**: Oversees background tasks, compilers, local processes, and SQLite persistence.
  - **Pixel (Frontend & Visual Specialist)**: Inspires UI development, motion design, design tokens, and creative experiments.
  - **Scout (Researcher & Pattern Scout)**: Indexes documentation, local markdown, references, and web research.
- **Authentic Status Bubbles & On-Demand Chat**: Characters display real-time work status bubbles only when tasks or events occur; conversational drawers open on demand, never cluttering the studio space.

### 3.2 Knowledge Hub, Study & Engineering Continuity
- **Verbatim Capture & Local Persistence**: Raw voice transcripts and typed inputs are preserved verbatim alongside structured tags, summaries, and Markdown exports.
- **Semester Coursework Guardian**: Real-time tracking of semester subjects, assignments, due dates, and draft answers with sub-millisecond SQLite queries.
- **Project & Notes Workspace**: Bidirectional linking between ideas, study notes, semester projects, and plan tasks with full Obsidian-compatible Markdown export.

### 3.3 Safe Windows Automation & Media Relaxation
- **Bounded Desktop Automation**: Strict allowlist for approved external applications (`notepad`, `calc`, `mspaint`) and web entertainment services (`Spotify`, `Netflix`, `YouTube`).
- **Zero-Unbounded Shell Execution**: Dangerous or irreversible actions require explicit user confirmation.
- **Chill Mode & Focus Media**: One-click transition into relaxation and focus states with media control and ambient soundtracks.

### 3.4 Lazy-Loaded 3D Office View
- The verified Three.js 3D multi-room virtual headquarters (`apps/web/src/hq3d/`) is preserved intact as an **optional, on-demand spatial inspector**.
- Runs only when explicitly requested; never burns GPU cycles or battery in the everyday workspace.

---

## 4. Non-Negotiable Design Rules

1. **Studio First, Chat on Demand**: The everyday interface is an inviting spatial studio. Chat conversations live in responsive overlay panels summoned by click, shortcut (`Alt+Space`), or voice.
2. **Floating Spatial Panels**: Information is surfaced in transient, draggable, dockable floating panels instead of permanent rigid grids.
3. **Meaningful Animation**: Micro-interactions provide tactile confirmation (button scale, checkbox pop, character glance). Zero gratuitous loops.
4. **Zero Fake Work**: Characters and status bubbles reflect only genuine tasks, real system events, and verified SQLite data. No simulated activity or fake metrics.
5. **Distinctive Creative Personality**: Warm stone light palettes (`#F5F4F0`), dark graphite themes (`#121518`), architectural typography (`Geist` / `Geist Mono`), and custom mascot art. No purple gradients or generic SaaS tropes.
6. **Accessibility & Reduced Motion**: Full keyboard navigation, screen reader live regions, and an explicit reduced-motion media query that disables character locomotion while preserving semantic clarity.
7. **Explicit Privacy & Mute Controls**: Microphone state is clearly indicated (Muted / Active). PTT requires positive user action.
8. **Protected Secrets**: Secrets, tokens, and credentials are never stored in conversational memory or serialized into SQLite plaintext logs.
9. **Informed Opt-In for Cloud Inference**: Local inference is the default; cloud providers (NVIDIA NIM, Claude, etc.) require explicit configuration and permission.
10. **Data Inspection & Deletion**: The owner has total authority to inspect, export, and delete any recorded memory, note, or task.

---

## 5. Architectural Alignment

| Layer | Technology | Responsibility |
|---|---|---|
| **Host Shell** | Electron 44 + Node 24 | Window management, system tray, global shortcuts, power monitoring, secure IPC bridge |
| **Kernel Process** | Node 24 `utilityProcess` | Isolated process running `@gravitas/core`, scheduling, and SQLite persistence |
| **Studio Renderer** | React 19 + TypeScript + Motion + Vite | 60 FPS living studio, 2D mascot system, spatial panels, and responsive UI |
| **Voice & STT** | Native PTT + Whisper.cpp (tiny/base) | Local offline voice dictation, intent classification |
| **Persistence** | SQLite (`node:sqlite` in WAL mode) | `gravitas_kernel.db` (scheduler & runs) + `ideas-vault.db` (Knowledge Hub & Study Guardian) |
| **3D Office** | Three.js (lazy-loaded) | Multi-room spatial diorama and agent activity visualization (Phase 08) |

---

## 6. Review & Evolution Gates

- **Phase 00–01**: Baseline verification, repository cleanup, product charter lock. *(Current)*
- **Phase 02**: Desktop renderer foundation (Vite + React 19 + Motion in Electron).
- **Phase 03**: Living Studio, mascot family rendering, and 2D animation engine.
- **Phase 04**: Event-driven mascot speech bubbles and on-demand conversation drawer.
- **Phase 05**: Deep Knowledge Hub, course subjects, assignments, and Markdown workflows.
- **Phase 06**: Push-to-talk offline voice dictation and approved Windows actions.
- **Phase 07**: Chill mode and Spotify / focus media integrations.
- **Phase 08**: On-demand 3D office diorama integration, 16 GB RAM performance tuning, and owner trial.
