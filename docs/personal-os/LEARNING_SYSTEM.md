# Gravitas Academic Learning & Study Subsystem (Wave 12C.5)

## 1. Purpose of the Learning System

The Gravitas Learning System is an integrated academic and conceptual mastery engine. It is designed to assist an operator through rigorous computer science, mathematics, and software engineering curricula through spaced repetition, mistake analysis, and hands-on project synthesis.

$$\text{Learning System} = \text{Concept Graph} + \text{Spaced Repetition Engine} + \text{Practice Project Synthesizer}$$

---

## 2. Concept Mastery States

Every concept in the learning knowledge base progresses through a 7-stage finite state lifecycle:

| State | Definition | Entry Criteria | Next Action Required |
| :--- | :--- | :--- | :--- |
| **`NEW`** | Unencountered topic present in syllabus. | Ingested from course syllabus or textbook outline. | Initial reading & conceptual notes. |
| **`LEARNING`** | Currently under active study. | First reading session logged; initial flashcards created. | Active recall quizzes & practice exercises. |
| **`KNOWN`** | Basic conceptual understanding demonstrated. | Passed initial review quiz with $\ge 80\%$ score. | Schedule spaced interval review (3 days). |
| **`WEAK`** | Persistent conceptual mistakes or failed quiz recall. | Missed flashcard recall or logic bug in practice task. | Targeted re-explanation & small code exercise. |
| **`REVIEW_DUE`** | Spaced repetition interval has elapsed. | Interval timer expired (SuperMemo SM-2 / FSRS algorithm). | Immediate flashcard / quiz review session. |
| **`MASTERED`** | High-retention conceptual fluency demonstrated. | Successfully passed 4 consecutive spaced reviews. | Long-interval maintenance (30+ days). |
| **`APPLIED`** | Successfully implemented in a verified real-world project. | Code utilizing concept passed independent test verification. | Peak mastery; archived in portfolio. |

---

## 3. Inter-Role Cooperation & Division of Responsibility

To avoid overlapping responsibilities or conflicting agent prompts, the four participating components maintain strict functional boundaries:

```
┌──────────────────────────┐          ┌──────────────────────────┐
│      Learning Coach      │          │      Project Scout       │
│ - Concept mastery graph  │          │ - Evaluates weak areas   │
│ - Spaced interval review │─────────►│ - Synthesizes small,     │
│ - Mistake diagnosis      │          │   practical project spec │
└──────────────────────────┘          └────────────┬─────────────┘
                                                   │ Project Proposal
                                                   ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│    Calendar Connector    │          │      Chief Planner       │
│ - Queries free blocks    │◄─────────│ - Finds available slot   │
│ - Stages candidate event │          │ - Decomposes project DAG │
└──────────────────────────┘          └──────────────────────────┘
```

1. **Learning Coach (`role:knowledge:learning-coach`):** Owns the concept mastery graph, tracks quiz scores, calculates review intervals, and diagnoses recurring mistakes.
2. **Project Scout (`role:strategy:project-scout`):** Inspects topics marked `WEAK` or `KNOWN` and designs small, practical programming projects specifically requiring that concept.
3. **Chief Planner (`role:strategy:chief-planner`):** Breaks the scouted project into verifiable task DAGs and calculates estimated wall-clock duration.
4. **Calendar Connector (`CONNECTOR`):** Inspects user's actual calendar availability and stages a candidate study block for human confirmation.

---

## 4. End-to-End Walkthrough: Resolving a Recursion Weakness

1. **Detection:** During a practice quiz on binary search trees, the user incorrectly evaluates tree traversal base cases. The `LearningCoach` transitions concept `recursion-base-cases` to state **`WEAK`**.
2. **Synthesis:** `LearningCoach` alerts `ProjectScout`: `"Concept recursion-base-cases is WEAK. Propose practical practice application."`
3. **Project Proposal:** `ProjectScout` synthesizes a mini-project brief:
   - *Title:* "Build a Recursive Directory Tree JSON Serializer".
   - *Skills Practiced:* Base case termination, recursive accumulator patterns, filesystem edge cases.
   - *Estimated Time:* 45 minutes.
4. **Scheduling:** `ChiefPlanner` queries `CalendarConnector` for an open 45-minute focus block on Thursday afternoon.
5. **Approval:** The UI surfaces an action item: `"Learning Coach detected recursion weakness. Scheduled 45m practice project for Thursday 15:30. Click to confirm."`
6. **Execution & Mastery:** On Thursday, `FrontendEngineer` / `BackendEngineer` assists user in implementing the serializer. Independent verifier passes all unit tests. Concept transitions from `WEAK` -> **`APPLIED`**.
