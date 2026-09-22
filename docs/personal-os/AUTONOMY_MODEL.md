# Gravitas Autonomy Model & Governance Boundaries (Wave 12C.5)

## 1. Principles of Autonomy

Autonomy in Gravitas is an explicit operational policy granted by the human operator—**it is never claimed or escalated by an agent**.

$$\text{Autonomy Level} = f(\text{Role}, \text{Task Kind}, \text{Authority Class}, \text{Human Policy Configuration})$$

### Core Rules:
1. **No Self-Promotion:** An agent role cannot modify its own autonomy tier or grant itself permission to bypass approval.
2. **Fail-Safe Default:** When ambiguous, the system degrades to the more restrictive autonomy level.
3. **Action-Specific Governance:** A role may operate at Level 3 for internal research, but drops to Level 1 for drafting outreach, and Level 2 for external messaging.

---

## 2. The 5 Autonomy Levels

| Level | Name | Description & Execution Rights | Human Involvement |
| :--- | :--- | :--- | :--- |
| **`L0`** | **`SUGGEST`** | The role analyzes data and produces read-only recommendations, alternatives, or strategic advice. Zero side-effects. | Human must manually read and decide whether to act. |
| **`L1`** | **`PREPARE`** | The role synthesizes candidate artifacts (e.g., code diff in worktree, email draft in staging, candidate calendar block). No real-world mutations. | Human reviews prepared artifact before execution. |
| **`L2`** | **`ASK_THEN_EXECUTE`** | The task prepares work, runs independent verification, and pauses at `WAITING_APPROVAL`. The action executes only after explicit human sign-off. | Explicit Human Approval required to proceed. |
| **`L3`** | **`BOUNDED_AUTONOMOUS`** | The task executes and verifies automatically within pre-approved budget and resource constraints without human interruption. | Human is notified upon completion; review is retrospective. |
| **`L4`** | **`STANDING_POLICY`** | Routine, repetitive background tasks (e.g., automated test runs on git push, cron reminders, cache sweeps) execute automatically under standing policy rules. | Zero human interaction unless a policy violation or failure occurs. |

---

## 3. Operational Mapping Matrix

| Role & Operation | Authority Class | Maximum Allowed Level | Default Operational Level | Escalation Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Lead Researcher:** Web market intelligence | `READ` | `L3` | `L3` | Unrestricted within token budget. |
| **Frontend Engineer:** Fix CSS styling in worktree | `SAFE_WRITE` | `L3` | `L2` (Golden Loop default) | Can be granted `L3` for non-breaking internal tickets. |
| **Integrator:** Merge candidate branch to `main` | `DESTRUCTIVE` | `L2` | `L2` | **Never escalates to L3/L4.** Human approval required. |
| **Outreach Drafter:** Draft client intro email | `SAFE_WRITE` | `L1` | `L1` | Artifact staged in inbox; awaits user edit. |
| **Outreach Sender:** Send outbound email | `EXTERNAL_WRITE`| `L2` | `L2` | **Never escalates to L3.** Human sign-off required. |
| **Personal Coach:** Suggest afternoon stretch break | `READ` | `L4` | `L4` | Scheduled cron notification under standing policy. |
| **Courier:** Download 2GB dataset from verified URL | `SAFE_WRITE` | `L3` | `L3` | Bounded by disk quota and SHA256 verification. |
| **System Admin:** Delete stale workspace branch | `DESTRUCTIVE` | `L2` | `L2` | Requires operator confirmation. |
| **Financial Agent:** Pay vendor API bill | `FINANCIAL` | `L2` | `L0` | Operator must initiate and authorize payment directly. |

---

## 4. Lifecycle Transitions Under Autonomy Levels

```
[ L1: PREPARE ]
Task: DRAFT_EMAIL
State: RUNNING -> VERIFYING -> SUCCEEDED (Draft saved to staging)
User Notification: "Candidate email prepared for review."

[ L2: ASK_THEN_EXECUTE ]
Task: MERGE_CANDIDATE_BRANCH
State: RUNNING -> VERIFYING -> WAITING_APPROVAL
Action: Halts at Approval Plinth.
User Action: Click "Approve & Integrate" in Command Center.
State: WAITING_APPROVAL -> APPROVED -> (Git merge executed).

[ L3: BOUNDED_AUTONOMOUS ]
Task: RUN_WEEKLY_TEST_SUITE
State: RUNNING -> VERIFYING -> SUCCEEDED
Action: Complete without interruption. Evidence archived.
```
