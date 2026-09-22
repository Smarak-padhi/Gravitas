# Gravitas Execution Budgets & Resource Ceilings (Wave 12C.5)

## 1. Principles of Budget Enforcement

To prevent run-away token consumption, infinite tool loops, runaway API costs, and resource exhaustion, every task execution in Gravitas is governed by an immutable **ExecutionBudget**.

### Core Rules:
1. **Hard Enforcement at the Boundary:** Budgets are enforced by the `WorkerHarness` supervisor and `InferenceGateway`, not by the LLM itself. When a ceiling is hit, the subprocess is immediately throttled or aborted.
2. **Recursive Child Consumption:** When a planning role spawns subtasks, the child tasks consume a partitioned slice of the parent task's budget. Recursive agent spawning can never exceed the parent root ceiling.
3. **No Budget Self-Expansion:** A worker cannot increase its own token or monetary ceiling. Only an explicit human operator approval can grant budget top-ups.

---

## 2. The `ExecutionBudget` Contract

```typescript
export interface ExecutionBudget {
  /** Maximum number of LLM inference requests allowed for this task */
  readonly maxInferenceCalls: number

  /** Hard cap on total prompt tokens consumed */
  readonly maxInputTokens: number

  /** Hard cap on total generated output tokens */
  readonly maxOutputTokens: number

  /** Maximum number of tool invocations permitted */
  readonly maxToolCalls: number

  /** Maximum process execution duration in wall-clock seconds */
  readonly maxWallTimeSeconds: number

  /** Maximum automated retry attempts on transient network error */
  readonly maxRetries: number

  /** Maximum worker subprocesses running concurrently in this task subtree */
  readonly maxConcurrentWorkers: number

  /** Maximum external write actions permitted (e.g., file writes, API posts) */
  readonly maxExternalWrites: number

  /** Hard monetary cost ceiling in USD cents */
  readonly costCeilingCents: number

  /** Whether exceeding a soft threshold triggers human approval */
  readonly requiresHumanApprovalOnExceed: boolean
}
```

---

## 3. Standard Budget Profiles

Gravitas provides pre-configured budget tiers tailored to operational needs:

| Profile | Inference Calls | Input Tokens | Output Tokens | Tool Calls | Wall Time | Cost Ceiling | Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`TIER_LIGHT`** | 2 | 8,000 | 1,000 | 5 | 30s | $0.02 | Email categorization, title generation, single AST lookup. |
| **`TIER_STANDARD`** | 10 | 64,000 | 8,000 | 25 | 180s | $0.25 | Standard feature coding, bug fixing, research summary. |
| **`TIER_DEEP`** | 30 | 250,000 | 32,000 | 100 | 600s | $1.50 | Multi-file architectural refactor, deep technical folio, browser QA test authoring. |
| **`TIER_UNRESTRICTED`**| Custom | Custom | Custom | Custom | Custom | Custom | **Requires explicit human authorization per run.** |

---

## 4. Child Task Budget Inheritance & Partitioning

When a `ChiefPlanner` role constructs a multi-task DAG:

```
Root Goal Budget: $1.00 max, 100k input tokens, 10 minutes wall-clock
  │
  ├── Task 1 (Inspect Schema):       Budget slice: $0.15, 15k tokens, 2 mins
  ├── Task 2 (Implement Endpoint):    Budget slice: $0.40, 40k tokens, 4 mins
  ├── Task 3 (Write Frontend UI):    Budget slice: $0.35, 35k tokens, 3 mins
  └── Task 4 (Run Browser QA):       Budget slice: $0.10, 10k tokens, 1 min
```

- **Invariant:** $\sum \text{ChildBudgets} \le \text{ParentBudget}$.
- If Task 2 exhausts its $0.40 budget slice before completing, it transitions to `FAILED` with error `BUDGET_EXHAUSTED`.
- The orchestrator alerts the operator with an inbox notification: `"Task 2 exhausted budget ($0.40). Click to grant $0.20 top-up or abort run."`
- Under no circumstances does the scheduler silently reallocate funds or expand budgets without human visibility.
