# Gravitas Background Job Architecture (Wave 12C.5)

## 1. Principles of Background Execution

Routine background work in Gravitas does NOT run persistent LLM daemons. The architecture distinguishes sharply between **Deterministic Background Jobs** and **Reasoning Workflows**:

$$\text{Background Work} = \begin{cases} 
\text{Deterministic Service (cron, download, index, test)}, & \text{if logic is algorithmic} \\
\text{Transient Role-Harness Task (planner, researcher)}, & \text{if logic requires semantic reasoning}
\end{cases}$$

### The Universal Execution Pipeline
```
[ Trigger ] 
  (USER, SCHEDULE, EVENT, CONDITION, CONNECTOR)
      │
      ▼
[ Normalized Goal / Job Proposal ]
      │
      ▼
[ Policy & Autonomy Check ] ── (Level 0-4 check)
      │
      ├── If reasoning required:
      │     ▼
      │   [ Chief Planner ] ──► [ Task DAG ] ──► [ Qualified Role & Harness ]
      │
      └── If purely deterministic:
            ▼
          [ Deterministic Service ] (Download, Cron, Git, Linter)
      │
      ▼
[ Independent Verification / Checksum ]
      │
      ▼
[ Evidence Manifest Archival ]
      │
      ▼
[ State Event & User Notification ]
```

---

## 2. Trigger Taxonomy

| Trigger Type | Source & Mechanism | Example Scenarios |
| :--- | :--- | :--- |
| **`USER`** | Explicit human prompt or button click in UI / CLI. | "Research machine learning master programs in Europe", "Fix login bug". |
| **`SCHEDULE`** | Cron timer evaluated by internal `ReminderService`. | "Every weekday at 08:30 run morning briefing", "Hourly posture reminder". |
| **`EVENT`** | Inbound webhook or system event bus alert. | GitHub webhook: "PR check suite failed on branch `feat/login`". |
| **`CONDITION`** | Periodic condition evaluation over structured state. | "Course assignment due in < 24 hours and submission status is UNFINISHED". |
| **`CONNECTOR`** | Connector state change alert. | IMAP connector: "New email received matching filter `sender:professor`". |

---

## 3. Concrete Scenario Walkthroughs

### Scenario 1: "Download these 12 research PDFs"
1. **Trigger:** `USER` command with a list of arXiv URLs.
2. **Reasoning Need:** Zero reasoning required (URLs already established).
3. **Execution:** Dispatched directly to `CourierService` (`DETERMINISTIC_SERVICE`).
4. **Lifecycle:** 12 lightweight async HTTP GET streams pipe bytes directly to `staging/papers/`.
5. **Verification:** Checksum verification passes for each downloaded file.
6. **Result:** Zero LLM tokens consumed. Task completes in 4 seconds. Notification emitted: `"12 research PDFs downloaded and indexed."`

### Scenario 2: "Research student-friendly coffee shops near university"
1. **Trigger:** `USER` command.
2. **Reasoning Need:** Semantic reasoning required (filtering, synthesizing reviews, opening hours).
3. **Execution:** Dispatched to `role:knowledge:researcher` on `fcc-worker`.
4. **Execution:** Performs bounded web searches, extracts address, WiFi availability, power outlets, quiet hours.
5. **Verification:** Validates addresses against OpenStreetMap connector.
6. **Result:** Synthesizes `coffee-shops-research.md` in knowledge vault. Notification emitted.

### Scenario 3: "GitHub CI Build Failed"
1. **Trigger:** `EVENT` (GitHub connector webhook).
2. **Policy Check:** Autonomy `L1` (PREPARE).
3. **Reasoning Need:** Dispatches `role:engineering:systems-engineer` to inspect error logs.
4. **Action:** Reproduces build locally, identifies failing dependency version, authors fix in candidate branch.
5. **Approval:** Pauses at `WAITING_APPROVAL`. Inbox item created: `"Candidate fix for failed CI build prepared. Review diff."`

---

## 4. Background Job Lifecycle

All background jobs share an unambiguous, observable finite state machine:

```
  ┌──────────┐
  │  QUEUED  │
  └────┬─────┘
       │ dispatch
       ▼
  ┌──────────┐
  │ RUNNING  │
  └────┬─────┘
       │ process completed
       ▼
  ┌──────────┐
  │VERIFYING │ (SHA256 check / test suite / assertion check)
  └────┬─────┘
       ├─────────────────────────┬─────────────────────────┐
       │ verification PASS       │ verification FAIL       │ abort
       ▼                         ▼                         ▼
 ┌───────────┐             ┌───────────┐             ┌───────────┐
 │ COMPLETED │             │  FAILED   │             │ CANCELLED │
 └───────────┘             └───────────┘             └───────────┘
```
