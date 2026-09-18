# 11 - Command Center User Experience & Desktop Architecture

> **Document Type:** Phase 0 Technical Architecture Specification  
> **Status:** Authoritative  
> **Classification:** FACT (Tauri 2.x vs Electron benchmarks) / INFERENCE (UX design)  

---

## 1. Desktop Application Platform: Tauri 2.x vs. Electron

To provide a high-performance local command center on Windows 11, we evaluated the desktop container landscape:

| Dimension | Tauri 2.x (Recommended) | Electron | Neutralinojs | Local Web App (Browser) |
| :--- | :--- | :--- | :--- | :--- |
| **Underlying Webview** | Windows Native WebView2 [FACT] | Bundled Chromium [FACT] | Native WebView2 | User's Default Browser |
| **Idle Memory Footprint**| **40 - 80 MB** [FACT] | 150 - 400 MB [FACT] | ~20 - 40 MB | 100 - 300 MB |
| **Binary Installer Size**| **3 - 10 MB** [FACT] | 120 - 200 MB [FACT] | ~5 MB | None |
| **Cold Startup Time** | **< 250 ms** [FACT] | 1.5 - 4.5 seconds | < 200 ms | Instant (tab) |
| **Native Windows Security**| Rust Capability IPC boundaries | Node.js context isolation | Minimal IPC | Sandboxed Web APIs |
| **System Tray & Hotkeys**| Built-in native plugins | Built-in | Plugin-based | Limited / Web APIs |
| **Verdict** | **Chosen for Command Center** | Fallback / Rejected | Rejected (small ecosystem) | Dev Mode Only |

**Architectural Decision**: We select **Tauri 2.x** with a **React / Tailwind / React Flow** frontend. It provides desktop-grade speed, tiny memory consumption on Windows, and native Rust IPC hooks for managing child processes and ConPTY terminals.

---

## 2. Command Center Layout Architecture

```
+--------------------------------------------------------------------------------------------------+
| MULTI-AGENT COMMAND CENTER   [Project: ALGORYXZ / 000]   [Active Goal: Finish Gate 1]   [$0.48]  |
+------------------------------+---------------------------------------------------+---------------+
| AGENT POOL                   | TASK DEPENDENCY GRAPH (React Flow Canvas)         | LIVE TELEMETRY|
|                              |                                                   |               |
| Astra (Critic)               |   [T-01: Repo Forensics] (DONE)                   | 19:12:01      |
|  * Reviewing /work           |             |                                     | Claude edit   |
| Claude (Worker)              |             v                                     | src/nav.tsx   |
|  * Editing components        |   [T-02: Responsive Nav] (RUNNING *)              |               |
| Codex (Worker)               |        /        \                                 | 19:12:15      |
|  * Unit test suite           |       v          v                                | Vitest passed |
| Browser QA (Verifier)        |   [T-03: QA]   [T-04: Critic]                     | 18/18 tests   |
|  * Capturing 390px           |        \        /                                 |               |
|                              |             v                                     | 19:13:02      |
|                              |   [T-05: Human Gate] (WAITING)                    | Verifier took |
|                              |             |                                     | screenshot    |
|                              |             v                                     | (390x844)     |
|                              |   [T-06: Git Merge]                               |               |
+------------------------------+---------------------------------------------------+---------------+
| INSPECTOR DOCK (Tabbed: Terminal / Live Playwright Stream / Git Diff / Evidence Proof Bundle)    |
|                                                                                                  |
| [Terminal (ConPTY)]  [Playwright Viewport: 390x844]  [Diff: +42 -12 lines]  [Evidence Bundle]   |
|                                                                                                  |
| $ vitest run src/components/Navigation.test.tsx                                                  |
| ✓ Navigation > renders mobile hamburger button under 768px (12ms)                                |
| ✓ Navigation > closes mobile menu when backdrop is clicked (18ms)                                |
| Test Files  1 passed (1) | Tests  2 passed (2)                                                   |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Human-in-the-Loop Approval Modal

When a task transitions to `WAITING_HUMAN` (e.g. before merging to `main` or deploying):

```
+---------------------------------------------------------------------------------------------+
| HUMAN APPROVAL REQUIRED: Task T-02 (Responsive Navigation Header)                           |
+---------------------------------------------------------------------------------------------+
| Acceptance Criteria:                                                                        |
| [✓] AC-1: Zero horizontal scroll on mobile viewport (390x844)                               |
| [✓] AC-2: All unit tests exit 0 (Vitest: 18 passed)                                         |
| [✓] AC-3: Visual Critic Score >= 85 (Score: 92/100 by Astra)                                |
+-------------------------------------------------------------+-------------------------------+
| VISUAL VERIFICATION (Mobile 390x844 Screenshot)             | GIT DIFF SUMMARY              |
|                                                             |                               |
| [ Embedded Content-Addressed Screenshot (.evidence/png) ]   | M src/components/Nav.tsx      |
|                                                             | + const [isOpen, setOpen]     |
|                                                             | + <MobileMenu open={isOpen}/> |
|                                                             | - <div className="hidden"/>   |
+-------------------------------------------------------------+-------------------------------+
| [ REJECT & RETURN TO WORKER (With Feedback) ]             [ APPROVE & MERGE TO BASE ]       |
+---------------------------------------------------------------------------------------------+
```
