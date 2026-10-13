# GRAVITAS Wave V1-G-01 — Evidence Report
## iPhone Assignment Inbox + 7-Subject Study Guardian

- **Repository**: `C:\Users\smara\Desktop\Multi-agent`
- **Branch**: `feat/v0-golden-loop`
- **Pre-Wave Verified HEAD**: `dcdae8e3f4440d6a52a979183e267960c71c53ab`

---

## 0. Preflight & V1-F-01 SHA Discrepancy Investigation

### Git Parent Chain (No History Rewrite)
```text
dcdae8e3f4440d6a52a979183e267960c71c53ab  feat(desktop): add knowledge hub UI, markdown import/export, and v1-f-02 evidence
b7ca75599600e62bb2eb7d1c7640e8d4ac663c5e  feat(assistant): add knowledge hub voice/text intents, offline speech.synthesis wav stt, and notepad automation
eb3a3be2cb2c3fb744ef0c87b051b26b75e1c3f1  feat(knowledge-hub): extend ideas vault into unified local knowledge hub with collections, links, tasks, and markdown io
613d1d0944a2512142a4c8b4a6004555e6337c1b  feat(v1-f-01): implement floating desktop companion, local ideas vault, and supervised capability registry
9704b7da67d421791ff0351cdbdae41d74ec9692  fix(v1-e): preserve model routing and tighten offline authorization
1ec88d84f44824fbaf9691202c1487d84aab8cdd  fix(v1-e): repair nvidia dispatch safety and session governance
6c147baf5b01676009c90250d7e8d9225eef8650  feat(v1-e): recover nvidia nim model router and wire real dispatch
```

### V1-F-01 SHA Discrepancy Root Cause
- **Actual Git Commit SHA (`git rev-parse 613d1d0`)**: `613d1d0944a2512142a4c8b4a6004555e6337c1b` (40 hex characters; parent `9704b7da67d421791ff0351cdbdae41d74ec9692`).
- **Discrepancy in `docs/v1-f-02/EVIDENCE.md`**: Line 6 of `docs/v1-f-02/EVIDENCE.md` recorded `613d1d0944a2512142a4c8b4a6004555e637c1b` (39 hex characters — missing one `3` in `...6337c1b`).
- **Resolution**: Reported transparently without rewriting Git history or resetting any commits. Untracked review patches (`V1-E-01-review.patch` and `V1-E-01-R1-review.patch`) remain untouched and unstaged.

---

## 1. Seven Real Semester Subjects (Idempotent & Editable)

Implemented in `apps/desktop/src/assistant/icloudInbox.ts` (`SEVEN_SEMESTER_SUBJECTS` & `ICloudAssignmentInbox.seedDefaultSubjects()`):

| Subject Code | Subject Name | Credits | Structured Buckets |
| :--- | :--- | :---: | :--- |
| `CSE 2195` | Data Science Workshop 1 | 4 | `NOTES`, `ASSIGNMENTS`, `ANSWERS`, `RESOURCES`, `REVISION_TASKS` |
| `CSE 2221` | Modern Computing Systems Design | 4 | `NOTES`, `ASSIGNMENTS`, `ANSWERS`, `RESOURCES`, `REVISION_TASKS` |
| `CSE 2631` | Algorithms Analysis and Design 1 | 4 | `NOTES`, `ASSIGNMENTS`, `ANSWERS`, `RESOURCES`, `REVISION_TASKS` |
| `MTH 2002` | Probability and Statistics | 4 | `NOTES`, `ASSIGNMENTS`, `ANSWERS`, `RESOURCES`, `REVISION_TASKS` |
| `MTH 2787` | A First Course in Artificial Intelligence 1 | 2 | `NOTES`, `ASSIGNMENTS`, `ANSWERS`, `RESOURCES`, `REVISION_TASKS` |
| `CHM 2041` | Introduction to Environmental Studies | 2 | `NOTES`, `ASSIGNMENTS`, `ANSWERS`, `RESOURCES`, `REVISION_TASKS` |
| `GET 1433` | Introduction to DevOps | 0 | `NOTES`, `ASSIGNMENTS`, `ANSWERS`, `RESOURCES`, `REVISION_TASKS` |

- Seeding uses `INSERT OR IGNORE` keyed by `code`, ensuring zero duplicate records across restarts while preserving user edits (`updateSemesterSubject`) and all existing Knowledge Hub items.

---

## 2. iCloud Drive Assignment Inbox (`iPhone → iCloud Drive/GRAVITAS/Inbox → Windows → GRAVITAS`)

Implemented in `apps/desktop/src/assistant/icloudInbox.ts` and wired in `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, and `apps/desktop/src/renderer/companion.ts`:

- **Trusted Folder Picker**: `gravitas:select-inbox-folder` uses Electron `dialog.showOpenDialog({ properties: ['openDirectory'] })` in the main process and persists the selected path in `inbox_config`.
- **Watcher + Reconciliation + Manual Import**: Supports `fs.watch` on the configured folder plus deterministic reconciliation scans (`SCAN_INBOX` / `"Import now"` button).
- **Supported Formats**: `.txt`, `.md`, `.url`, `.webloc`, `.png`, `.jpg`, `.jpeg`, and `.pdf`.
- **Safe Cloud Placeholder & Incomplete File Handling**:
  - `.icloud` placeholder files (e.g., `.Lab2_Cache.pdf.icloud`) and zero-byte/in-flight files are recorded as `PENDING_ICLOUD_DOWNLOAD` with incremented `retryCount` and re-checked on subsequent scans without crashing.
- **Safety & Custody Guarantees**:
  - SHA-256 content-hash deduplication (`DUPLICATE_SKIPPED`).
  - Configurable size bound (`ERROR_SIZE_LIMIT`, default 15 MB).
  - Preserves original attachments under `<dataRoot>/inbox-attachments/` and preserves `sourceModifiedAt` timestamps.
  - Never executes imported files and never deletes original files from the user's iCloud Drive folder.

---

## 3. Assignment Detection & Honest Review Status

Implemented in `apps/desktop/src/assistant/icloudInbox.ts`:

- **Syllabus Keyword Subject Classification**: Matches course codes (`CSE 2631`, `MTH 2002`, etc.), aliases, and syllabus keywords (`Dijkstra`, `Bayes`, `Docker`, `cache coherence`, `pandas`, etc.). Ambiguous or multi-subject matches set `subjectConfidence: 'AMBIGUOUS'` and `subjectConfirmationRequired: true`.
- **Explicit vs. Relative Deadlines**:
  - Extracts explicit ISO/calendar deadlines (`2026-10-20`, `October 20, 2026`) into `extractedDueDate`.
  - Never fabricates due dates when none are present; flags relative expressions (`"next week"`, `"tomorrow"`, `"this Friday"`) in `relativeDeadlineExpression` with `dueDateConfirmationRequired: true`.
- **PDF & Screenshot Handling**:
  - Local PDF text stream extraction (`extractLocalPdfText`) extracts readable text from uncompressed and Flate-compressed PDF streams.
  - Screenshots (`.png`, `.jpg`, `.jpeg`) and unreadable/binary-only PDFs are marked `extractionStatus: 'NEEDS_MANUAL_REVIEW'` without fabricating OCR text.

---

## 4. Study Guardian & Study Answers

Implemented in `apps/desktop/src/assistant/studyGuardian.ts`:

- **Persistent Assignments**: Tracks `TODO | IN_PROGRESS | COMPLETED`, confirmed due date, `progressPercent` (`0..100`), `subjectCode`, `teacherInstructions`, `subtasks`, `originalAttachmentPath`, `reminderIntervalMinutes`, `snoozedUntil`, `paused`, and `quietHoursStart` / `quietHoursEnd`.
- **Deduplicated Reminders & Quiet Hours**:
  - `evaluateReminders()` respects quiet hours, snooze timestamps, pause flags, and `COMPLETED` status.
  - Uses deterministic `dedupKey` values in `assignment_reminders` (`UNIQUE(dedup_key)`) so repeated evaluations never spam duplicate notifications.
  - Immediately stops all follow-ups once an assignment is marked `COMPLETED`.
- **Startup & Active Windows Session Briefing**:
  - `getSessionBriefing()` summarizes unfinished and due-this-week assignments on startup and when Electron `powerMonitor` fires `unlock-screen` or `resume` (`supervisor.notifyStudyGuardianActiveSession()`).
- **Study Answers**:
  - `prepareAnswerDraft()` uses an authorized local model callback when available (`GENERATED_BY_LOCAL_MODEL`) or generates a structured `"Copy for ChatGPT/Claude"` prompt (`MANUAL_COPY_FOR_EXTERNAL_AI`).
  - `saveStudyAnswer()` persists pasted/generated answers under the assignment's subject (`ANSWERS` bucket + Knowledge Hub `STUDY_NOTE`), keeps `teacherInstructionsVerbatim` strictly separate from `answerDraftText`, and **never** marks the assignment `COMPLETED` or submitted.

---

## 5. Companion Commands & Supervised Self-Improvement

- **Natural-Language Companion Commands** (`apps/desktop/src/assistant/commandParser.ts` & `kernelHost.ts`):
  - `"Show my assignments."` → `STUDY_SHOW_ASSIGNMENTS`
  - `"What's due this week?"` → `STUDY_DUE_THIS_WEEK`
  - `"Show Algorithms assignments."` → `STUDY_SHOW_SUBJECT_ASSIGNMENTS` (resolves `Algorithms` → `CSE 2631`)
  - `"I'm 50% done with Physics."` / `"I'm 50% done with Algorithms."` → `STUDY_UPDATE_PROGRESS`
  - `"Remind me tomorrow evening."` → `STUDY_SNOOZE_REMINDER`
  - `"Mark this assignment complete."` → `STUDY_COMPLETE_ASSIGNMENT`
  - When multiple unfinished assignments match a command, returns `status: 'CLARIFICATION_REQUIRED'` with `clarificationCandidates` so the user can disambiguate.
- **Supervised Capability Registry** (`apps/desktop/src/assistant/capabilityRegistry.ts`):
  - Registered `cap:study:subject-classification`, `cap:study:inbox-import`, `cap:study:assignment-extraction`, `cap:study:reminder-scheduling`, and `cap:study:answer-drafting`.
  - Records failures and creates non-destructive `ImprovementProposal` entries (`autoApplied: false`, `sourceCodeModified: false`, `permissionsEscalated: false`).

---

## 6. Required Working Demonstration (A–J) — Actual Results

Verified end-to-end in `apps/desktop/src/study-guardian.test.ts` (Test 4 & Test 5):

| Step | Demonstration Requirement | Actual Verified Result |
| :---: | :--- | :--- |
| **A** | Verify all 7 subjects exist and do not duplicate after restart | **PASS** — `LIST_SEMESTER_SUBJECTS` returns 7 subjects (`CSE 2195`, `CSE 2221`, `CSE 2631`, `MTH 2002`, `MTH 2787`, `CHM 2041`, `GET 1433`) before and after `KernelHost` restart with custom edits preserved. |
| **B** | Configure a local test Inbox folder representing `iCloud Drive/GRAVITAS/Inbox` | **PASS** — `SET_INBOX_FOLDER` persists path in SQLite `inbox_config` and activates watcher + reconciliation. |
| **C** | Drop sample assignment files (text note, screenshot image, PDF) into Inbox | **PASS** — Imported `CSE2631_ShortestPath_HW.txt`, `MTH2002_Bayes_Sheet.pdf`, and `Whiteboard_Capture.png`; original files remain untouched in Inbox folder. |
| **D** | Verify GRAVITAS imports them once and skips duplicates on re-scan | **PASS** — First scan imports 3 files and creates 3 drafts; second scan marks all 3 `DUPLICATE_SKIPPED` via SHA-256 content digest and creates `0` duplicate drafts. |
| **E** | Confirm subject classification and due date for an extracted assignment | **PASS** — `CONFIRM_ASSIGNMENT` promotes draft into active `CSE 2631` assignment due `2026-10-20` with subtasks and mirrors into `CSE 2631` `ASSIGNMENTS` bucket + Knowledge Hub `PLAN_TASK`. |
| **F** | Update progress to 50% by command | **PASS** — Companion command `"I'm 50% done with Algorithms Assignment 3."` transitions status to `IN_PROGRESS` and `progressPercent: 50`. |
| **G** | Trigger and verify a deduplicated reminder | **PASS** — `EVALUATE_REMINDERS` triggers 1 reminder; immediate re-evaluation at the same timestamp triggers `0` (`deduplicatedSkippedCount: 1`). |
| **H** | Generate or paste a study answer draft and verify it is stored under the subject | **PASS** — `PREPARE_ANSWER_DRAFT` + `SAVE_STUDY_ANSWER` stores answer in `CSE 2631` `ANSWERS` bucket with `teacherInstructionsVerbatim` separated from `answerDraftText`; assignment status remains `IN_PROGRESS`. |
| **I** | Mark the assignment completed and verify reminders stop | **PASS** — Companion command `"Mark Algorithms Assignment 3 complete."` sets `status: 'COMPLETED'`, `progressPercent: 100`, syncs Knowledge Hub task completion, and subsequent `EVALUATE_REMINDERS` skips completed assignment (`triggeredReminders: []`). |
| **J** | Restart GRAVITAS and verify subjects, assignments, progress, answers, and inbox history persist | **PASS** — After `supervisor.shutdown()` and fresh `KernelHost` + `DesktopSupervisor` restart on the same `dataRoot`, all 7 subjects, `COMPLETED` assignment (`100%`), saved answer draft, and 3 inbox import records persist intact. |

> **Hardware Boundary Disclosure (`NOT RUN`)**:
> Physical iPhone hardware Share Sheet → live Apple iCloud server sync to Windows was **NOT RUN** in this automated local environment. The Windows-side `iCloud Drive/GRAVITAS/Inbox` folder watcher, `.icloud` placeholder file state machine, and file ingestion pipeline were verified locally on Windows filesystem directories.

---

## 7. Commit Log & Verification Commands

### Slice Commits
1. **Slice 1 (`b23449964deabd965457865b6363d98427cd962f`)**:
   `feat(inbox): seed 7 semester subjects, add icloud inbox scanner, and assignment detection`
2. **Slice 2 (`8bd5c0b9b7ba9f9156cd905e72955700d49689da`)**:
   `feat(study-guardian): add persistent assignments, deduplicated reminders, study answers, and companion commands`
3. **Slice 3**:
   `feat(desktop): wire study guardian inbox UI, trusted folder picker, and v1-g-01 evidence`

### Test, Typecheck, and Build Verification
- `npx vitest run apps/desktop/src`: **14 test files passed, 346 tests passed (0 failures)**
- `npx vitest run packages/gateways`: **10 test files passed, 120 tests passed (0 failures)**
- `npm run test:kernel`: **51 passed, 0 failed**
- `npm run typecheck`: **All 12 workspaces passed (`tsc --noEmit` exit code 0)**
- `npm run build --workspace=@gravitas/desktop`: **`Desktop package bundled successfully.` (exit code 0)**
