# Gravitas Living Office Interaction Model
**Wave 7.5 Design Collaboration Document**

---

## 1. Vision & Core Principles

The **Living Office** is a spatial visualization of the Gravitas multi-agent orchestration engine. It represents active AI workers, verification gates, and human checkpoints as stations on an engineering floor.

### Inviolable Rules:
1. **The Office is a projection of the engine**: Every visual state corresponds 100% to backend contracts (`TaskState`, `RunStatus`, `VerificationSummary`).
2. **Zero fake simulation**: No wandering avatars, no cartoon desks, no coffee machines, no fabricated progress bars, no fake thinking percentages.
3. **Data-driven scaling**: Workers are rendered from a generic `WorkerPresentation` interface; no hardcoded per-agent JSX components.
4. **Serious engineering credibility**: Styled as a clean, high-density aerospace or software studio workstation card.

---

## 2. Worker Presentation Data Contract

```typescript
export type WorkerVisualState =
  | 'IDLE'
  | 'ASSIGNED'
  | 'READING'
  | 'THINKING'
  | 'WORKING'
  | 'VERIFYING'
  | 'BLOCKED'
  | 'WAITING_FOR_DEPENDENCY'
  | 'NEEDS_YOU'
  | 'DONE'
  | 'FAILED'

export type AttentionLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface WorkerPresentation {
  readonly id: string
  readonly displayName: string
  readonly role: string
  readonly capabilities: readonly string[]
  readonly state: WorkerVisualState
  readonly currentTaskId?: string | undefined
  readonly currentTaskTitle?: string | undefined
  readonly attentionLevel: AttentionLevel
  readonly lastActiveTimestamp?: string | undefined
  readonly executionDurationMs?: number | undefined
  readonly failureReason?: string | undefined
}
```

---

## 3. Worker State Derivation Rules

The state of a worker is deterministically derived from authoritative engine contracts:

| Backend State Condition | Worker Visual State | Attention Level | Visual Representation |
| :--- | :--- | :--- | :--- |
| No active task assigned | `IDLE` | `NONE` | Muted slate border, dimmed badge `[IDLE]`, ready indicator |
| Task in `READY` state | `ASSIGNED` | `LOW` | Border highlighted with role color, task title badge displayed |
| Task in `RUNNING` state | `WORKING` | `MEDIUM` | Subtle cyan pulse indicator (`#38bdf8`), active duration counter |
| Task in `VERIFYING` state | `VERIFYING` | `MEDIUM` | Amber/gold indicator (`#fbbf24`), verification gate focus |
| Task in `WAITING_APPROVAL` | `NEEDS_YOU` | `HIGH` | High-contrast yellow badge (`#fde047`), pulsing review banner |
| Task in `BLOCKED` state | `BLOCKED` | `MEDIUM` | Orange slash indicator, blocked dependency IDs listed |
| Task in `APPROVED` / `SUCCEEDED` | `DONE` | `NONE` | Solid emerald checkmark (`#4ade80`), completion timestamp |
| Task in `FAILED` / `REJECTED` | `FAILED` | `CRITICAL` | Red error border (`#f87171`), error snippet, inspect action |

---

## 4. Standard Agent Roster & Station Identities

While workers are rendered dynamically from data, Gravitas defines canonical worker profiles based on registered harnesses:

1. **Codex (`worker-codex`)**:
   - Role: `Engineering & Implementation`
   - Accent: `#3b82f6` (Sapphire Blue)
   - Capabilities: `['Code Generation', 'Refactoring', 'Unit Tests', 'Git Mutations']`
2. **Astra (`worker-astra`)**:
   - Role: `Visual & Interaction Design`
   - Accent: `#a855f7` (Violet)
   - Capabilities: `['UX Audit', 'Motion Systems', 'Component Design', 'Adversarial Review']`
3. **FCC / Claude (`free-claude-code`)**:
   - Role: `Autonomous Worker Harness`
   - Accent: `#06b6d4` (Cyan)
   - Capabilities: `['Full-stack Implementation', 'File Editing', 'Shell Verification']`
4. **Independent Verifier (`gate-verifier`)**:
   - Role: `Deterministic Gate Authority`
   - Accent: `#10b981` (Emerald)
   - Capabilities: `['Isolated Worktree Execution', 'Mandatory Command Runner', 'Mutation Scope Enforcement']`

---

## 5. Spatial Layout & Scaling Behavior

How does the Office behave across different team sizes?

### 1 Worker:
- Centered workstation spotlight with full telemetry: active task details, command preview, change scope, and immediate action buttons.
- Clean empty slots hint at available capacity without clutter.

### 3 to 6 Workers (Typical Team):
- High-density responsive grid (`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`).
- Each card displays worker identity, role chip, state tag, current task progress, and mini status pills.

### 10 to 30 Workers (Large Organization):
- Compact card density with automatic grouping by Role (`Implementation`, `Verification`, `Review`).
- Filter bar at top of Office Floor allowing instant filtering by state (`All`, `Active`, `Needs You`, `Idle`, `Failed`).

---

## 6. Interaction & Selection Mechanics

1. **Selection**: Clicking any worker card selects that worker and its associated task.
2. **Inspector Synchronization**: Selecting a worker highlights their current task in the bottom/side inspector, immediately loading its git diff, prompt compilation details, and verification reports.
3. **Quick Actions**:
   - If worker is `NEEDS_YOU`: Displays direct **"Review & Approve"** button right on the card.
   - If worker is `FAILED`: Displays direct **"Inspect Failure"** button navigating to the Evidence View.
   - If worker is `ASSIGNED` / `READY`: Displays direct **"Execute Task"** trigger.
4. **Handoff Representation**:
   - When a worker finishes implementation (`WORKER_FINISHED`), an unambiguous directional transition indicator (`Worker -> Verifier`) lights up, showing work entering the verification station.
   - When verification passes and requires human approval, an attention badge directs the operator to the Human Inbox.
