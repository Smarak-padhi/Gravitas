# GRAVITAS Wave V1-F-01 — Floating Assistant + Local Ideas Vault Evidence

**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Base Commit (V1-E-01-R2):** `9704b7da67d421791ff0351cdbdae41d74ec9692`  
**Target Milestone:** Wave V1-F-01 (Floating Desktop Companion + Local Ideas Vault)  
**Date:** 2026-10-13  

---

## 1. Executive Summary

Wave V1-F-01 delivers the first working, offline-first **GRAVITAS Desktop Companion** and **Local Ideas Vault** within the Electron application while preserving all GRAVITAS process, capability, and security boundaries:
- **Floating Desktop Companion (`companion.html` / `companion.ts`):** Small (`420×560`), draggable (`-webkit-app-region: drag`), always-on-top (`alwaysOnTop: true`) Electron `BrowserWindow` with global keyboard shortcut (`CommandOrControl+Shift+Space`, fallback `Alt+Shift+G`), Tray toggle, and Command Center header toggle.
- **Visible Operational States & Immediate STOP Control:** Displays explicit visual states (`IDLE`, `LISTENING`, `PROCESSING`, `SUCCESS`, `ERROR`, `CANCELLED`) and provides an always-available `STOP` button that immediately aborts active execution and transitions canonical tasks to `CANCELLED`.
- **Local Ideas Vault (`IdeasVaultStore` in `ideas-vault.db`):** Persistent, offline-first SQLite storage owned by `KernelHost` (`DatabaseSync` in WAL mode with `BEGIN IMMEDIATE` transactions and parameterized queries). Supports saving, listing, searching, opening/editing (preserving `originalText` verbatim even when updating summaries), and confirmation-gated deletion (`confirmed === true`). Requires zero cloud accounts, API keys, or models.
- **Deterministic Natural-Language Command Handling (`parseAssistantCommand`):** Parses structured intents (`SAVE_IDEA`, `LIST_IDEAS`, `SEARCH_IDEAS`, `LAUNCH_APP`, `DELETE_IDEA_PROMPT`, `SIMULATE_LONG_TASK`) and launches only allowlisted Windows applications (`Notepad`, `Calculator`, `Paint`) via `spawn` with `shell: false` under scoped capability `cap:desktop:launch-app`.
- **Push-to-Talk & Offline Speech-to-Text (`OfflineVoiceController`):** User-initiated-only Push-to-Talk control (`userInitiated === true`) with visible `LISTENING` indicator, zero silent background capture, zero cloud audio egress, and zero silent downloads. When no local Whisper model is installed at `<dataRoot>/stt-models/ggml-base.en.bin`, reports an understandable setup message without falsely claiming transcription succeeded while keeping text commands operational.
- **Supervised Self-Improvement Preparation (`AssistantCapabilityRegistry`):** Registers assistant capabilities (`cap:assistant:ideas-vault`, `cap:assistant:nl-command`, `cap:desktop:launch-app`, `cap:assistant:voice-ptt`), tracks test coverage, failed attempts, and user feedback, and generates non-destructive `ImprovementProposal` records (`autoApplied: false`, `modifiedSourceCode: false`, `installedTools: false`, `grantedPermissions: false`, `deployedUpdates: false`).

---

## 2. Implemented Subsystems & Files

1. [`apps/desktop/src/assistant/ideasVault.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/assistant/ideasVault.ts)
   - SQLite-backed `IdeasVaultStore` (`<dataRoot>/ideas-vault.db`) using WAL mode and `BEGIN IMMEDIATE` transactions.
   - Deterministic offline title, summary, category, and tag derivation (`deriveIdeaTitle`, `deriveIdeaSummary`, `deriveIdeaTagsAndCategory`).
   - Enforces immutable `originalText` preservation across `updateIdea` calls and requires `confirmed === true` on `deleteIdea`.
2. [`apps/desktop/src/assistant/commandParser.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/assistant/commandParser.ts)
   - Deterministic natural-language parser supporting `"Save this idea: ..."`, `"Show my ideas."`, `"Find my ... idea."`, `"Open Notepad."`, `"Delete idea: ..."`, and `"Hold action ..."`.
   - Rejects shell metacharacters, flags, and non-allowlisted applications fail-closed (`BLOCKED_APP`).
3. [`apps/desktop/src/assistant/appLauncher.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/assistant/appLauncher.ts)
   - Scoped `AllowlistedAppLauncher` enforcing `cap:desktop:launch-app` and spawning resolved Windows System32 binaries (`notepad.exe`, `calc.exe`, `mspaint.exe`) with `shell: false`.
4. [`apps/desktop/src/assistant/voiceStt.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/assistant/voiceStt.ts)
   - `OfflineVoiceController` managing user-initiated Push-to-Talk (`IDLE` -> `LISTENING` -> `PROCESSING` -> `IDLE`) and local Whisper model readiness checks (`<dataRoot>/stt-models/ggml-base.en.bin`).
5. [`apps/desktop/src/assistant/capabilityRegistry.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/assistant/capabilityRegistry.ts)
   - SQLite-backed `AssistantCapabilityRegistry` tracking capability metadata, test coverage, failed attempts, user feedback, and human-reviewed `ImprovementProposal` generation.
6. [`apps/desktop/src/renderer/companion.html`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/renderer/companion.html) & [`apps/desktop/src/renderer/companion.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/renderer/companion.ts)
   - Sandboxed Floating Companion UI with draggable header, state badge, `STOP` button, command input, Push-to-Talk button, Ideas Vault search/list/detail/edit/confirm-delete drawer, and Voice & Capabilities inspector.
7. [`apps/desktop/src/main/index.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/main/index.ts), [`apps/desktop/src/main/supervisor.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/main/supervisor.ts), [`apps/desktop/src/kernel-host/kernelHost.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/kernel-host/kernelHost.ts), [`apps/desktop/src/preload/index.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/preload/index.ts), [`apps/desktop/src/types.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/types.ts)
   - Wired companion window lifecycle, global shortcut registration, top-level frame authorization for both `index.html` and `companion.html`, canonical `WorkSession` task tracking for assistant commands, and allowlisted preload methods.

---

## 3. Mandatory Working Demonstrations (A through F)

Both **automated Vitest integration tests** (`apps/desktop/src/companion-vault.test.ts`) and **live Windows Electron GUI execution** (`npx electron` against the bundled `apps/desktop/dist/main/index.js` and `dist/renderer/companion.html`) were performed on Windows:

### Live Windows Electron GUI Demonstration Results

Executed against the bundled Electron runtime on Windows (`C:\Users\smara\Desktop\Multi-agent\apps\desktop\dist\main\index.js`):

- **Demonstration A (Launch floating companion using shortcut):**
  - Registered global shortcut: `CommandOrControl+Shift+Space`
  - Companion window shown and verified: `visible: true`, `alwaysOnTop: true`, `bounds: { x: 557, y: 127, width: 423, height: 562 }`.
- **Demonstration B (Enter `"Save this idea: build a free AI study planner."`):**
  - Companion DOM state transitioned to `SUCCESS`.
  - Status message: `"Saved idea \"Build a free AI study planner\" to Local Ideas Vault."`
  - Vault badge count: `1`, `firstIdeaOriginal: "build a free AI study planner."`.
- **Demonstration C (Close and reopen companion; confirm idea persists):**
  - Hid and destroyed the companion `BrowserWindow`, then reopened via `showCompanionWindow()`.
  - Reopened window read from `KernelHost` SQLite `ideas-vault.db`: `vaultCount: "1"`, `firstIdeaOriginal: "build a free AI study planner."`.
- **Demonstration D (Search for saved idea and display original text):**
  - Entered `"Find my study planner idea."` in the Companion input.
  - Status message: `"Found 1 matching idea(s) for \"study planner\": \"build a free AI study planner.\""`
  - Displayed original text in DOM card: `"build a free AI study planner."`.
- **Demonstration E (Enter `"Open Notepad."` and verify application launches):**
  - Entered `"Open Notepad."` in the Companion input.
  - Status message: `"Launched Notepad (PID 23224)."` via `C:\Windows\System32\notepad.exe` (`shell: false`).
- **Demonstration F (Cancel an active action and verify safe terminal state):**
  - Started active command `"Hold action 5000ms"` (`inFlightBadgeBeforeStop: "PROCESSING"`).
  - Clicked `#companion-stop-btn` (`STOP`).
  - Companion immediately transitioned to `stateBadge: "CANCELLED"` with status `"Cancelled active command cmd_ui_1791865410860. Safe terminal state (CANCELLED) verified."` and canonical task state `CANCELLED`.

---

## 4. Verification & Test Suite Results

### A. Focused V1-F-01 Companion & Ideas Vault Suite
- **Command:** `npx vitest run apps/desktop/src/companion-vault.test.ts`
- **Result:** `1 passed` test file, `12 passed` tests (`0 failed`).

### B. Full Gateway & Desktop Test Suites
- **Command:** `npx vitest run packages/gateways apps/desktop`
- **Result:** `22 passed` test files (`10` gateway + `12` desktop), `451 passed` tests (`120` gateway + `331` desktop, `0 failed`).

### C. Kernel Core Test Suite
- **Command:** `npm run test:kernel`
- **Result:** `51 passed` tests (`0 failed`).

### D. Monorepo Typecheck
- **Command:** `npm run typecheck`
- **Result:** `12 passed` workspaces (`0 errors`).

### E. Desktop Build
- **Command:** `npm run build --workspace=@gravitas/desktop`
- **Result:** `Desktop package bundled successfully.` (including `dist/renderer/companion.js` and `dist/renderer/companion.html`).

---

## 5. Offline Speech Recognition Status & Deferred Features

- **Offline Speech Recognition Status:**
  - Push-to-Talk (`Mic PTT`) state machine and local model readiness detection (`<dataRoot>/stt-models/ggml-base.en.bin`) are active and verified.
  - By default, no large STT model binary is bundled or silently downloaded (`sttStatus: 'MODEL_NOT_INSTALLED'`, `cloudAudioSent: false`, `silentDownloadPerformed: false`). Clicking `Mic PTT` enters `LISTENING` and, upon release without a local model installed, displays the setup path (`<dataRoot>/stt-models/ggml-base.en.bin`) while keeping all text commands operational.
- **Deferred to Future Waves:**
  - **Wave V1-F-02:** Notion integration, voice dictation into external Windows apps, and bounded Windows UI Automation.
  - **Wave V1-F-03:** Supervised self-improvement execution pipeline with test-backed patch proposals and explicit human approval gates.
