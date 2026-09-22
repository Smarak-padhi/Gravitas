# Gravitas Personal Operations & Daily Rhythm Architecture (Wave 12C.5)

## 1. Principles of Personal Operations

Personal Operations in Gravitas is an objective workload coordination and daily rhythm assistant. It balances engineering commitments, academic study goals, and health habits to support sustained human performance.

### Strict Ethical & Medical Boundaries
- **Objective Pattern Identification Only:** Personal Operations observes calendar density, unbroken screen duration, task backlog depth, and scheduled routine adherence.
- **STRICT PROHIBITION ON MEDICAL / PSYCHOLOGICAL DIAGNOSIS:** Personal Operations **MUST NEVER** attempt to diagnose medical, clinical, or psychiatric conditions.
  - ❌ It must NOT declare or infer: `"You have burnout"`, `"You are showing signs of clinical depression"`, `"This pattern suggests ADHD"`, or `"Your insomnia is worsening"`.
  - ✅ Permitted objective observations: `"You have scheduled 7 hours of back-to-back meetings today without a lunch break"`, `"You have worked for 90 continuous minutes without an eye break"`, or `"Three tasks from yesterday remain in the backlog"`.

---

## 2. Input Sources & Privacy Guardrails

| Input Stream | Origin | Access Policy | Storage Location |
| :--- | :--- | :--- | :--- |
| **Calendar Schedule** | Google / Apple Calendar via `CalendarConnector` | Standard `PERSONAL` context | Local SQLite (cached 7 days) |
| **Task Backlog** | Gravitas Task Database | Native internal state | Canonical Run/Task DB |
| **Study Consistency** | Learning Subsystem records | `LEARNING` context | Learning Mastery Graph |
| **Continuous Screen Time** | Local UI activity detector (mouse/keyboard events) | Local OS level only | Ephemeral in-memory counter |
| **Health / Activity Data** | Apple Health / Google Fit via Connector | **STRICT USER OPT-IN ONLY** | Encrypted local storage |

---

## 3. Division of Labor: Personal Coach vs. Deterministic Services

To avoid token waste and latency, routine health reminders are handled entirely by deterministic cron schedulers:

| Routine Reminder | Handling Mechanism | Interval / Trigger | LLM Involvement |
| :--- | :--- | :--- | :---: |
| **Hydration Alert** | `ReminderService` (cron) | Every 60 minutes during work hours | ZERO |
| **20-20-20 Eye Break** | `ReminderService` (timer) | Every 20 minutes of continuous UI activity | ZERO |
| **Posture & Stretch** | `ReminderService` (cron) | Every 90 minutes | ZERO |
| **Meal Break Reminder** | `ReminderService` (calendar) | Triggered 15 minutes before lunch/dinner slot | ZERO |
| **Sleep Wind-Down Alert**| `ReminderService` (cron) | Triggered at pre-configured bedtime target (e.g. 23:00)| ZERO |
| **Workload Rebalancing**| `PersonalCoach` (reasoning role)| Invoked when calendar load > 8 hours or upon user prompt| FULL REASONING |

---

## 4. The Daily Operating Experience

Gravitas structures the operator's day around three primary operational checkpoints:

### 1. The Morning Briefing (08:30)
Delivered via 2D Command Center, Mobile Companion, or optional Voice TTS. Combines:
- **Calendar Topology:** Scheduled meetings, focus time blocks, and hard deadlines.
- **Active Engineering State:** Unresolved branches, tasks awaiting human approval.
- **Academic Review Queue:** High-priority concepts marked `REVIEW_DUE`.
- **Weather & Commute:** Relevant external context if travel is scheduled.
- **Proposed Daily Plan:** Recommended sequence of deep work vs. study vs. admin tasks.

### 2. The Today View (Continuous Operations Surface)
A unified, distraction-free control panel organizing:
- Current active task & countdown timer.
- Next upcoming calendar commitment.
- Approval plinth queue (consequential actions needing attention).
- Quick capture box for rapid goal dispatch.

### 3. The Evening Review (20:30)
An objective retrospective focusing on evidence and completion trends—**never a manipulative single "productivity score"**:
- Tasks verified and completed vs. planned.
- Study flashcards reviewed and retention rate.
- Unfinished backlog items automatically carried over or flagged for rescheduling.
- Tomorrow's preview: first scheduled morning commitment.
