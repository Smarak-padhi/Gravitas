# Gravitas Observability & Audit Trail Architecture (Wave 12C.5)

## 1. Traceability Principles

In Gravitas, every action, decision, mutation, and token expenditure across the Personal OS is deterministically linked through a correlated **Audit Graph**.

$$\text{Action Trace} = \text{Run} \rightarrow \text{Task} \rightarrow \text{Role} \rightarrow \text{Harness} \rightarrow \text{Gateway} \rightarrow \text{Provider} \rightarrow \text{Model} \rightarrow \text{Capabilities} \rightarrow \text{Verifier} \rightarrow \text{Approval}$$

### Core Invariants:
1. **End-to-End Correlation:** A single user-facing result can be traced back to the exact compiled prompt bytes, worker stdout stream, git commit SHA, and human approval timestamp.
2. **Strict Redaction Before Archival:** Diagnostic logs, stdout buffers, and evidence files are filtered to redact API keys and bearer tokens prior to persistence.

---

## 2. The Universal Audit Log Entity Correlation

| Entity Level | Identifiers Captured | Telemetry Captured |
| :--- | :--- | :--- |
| **Run** | `runId` | Initiator, goal string, execution budget, overall duration. |
| **Task** | `taskId`, `runId` | Task kind, FSM state history, dependencies satisfied, change scope. |
| **Role** | `roleId` | Assigned organizational role, declared context scopes, required capabilities. |
| **Harness** | `harnessId`, `workerProcessId` | Subprocess PID, execution duration, peak RAM usage, exit code. |
| **Gateway / Route** | `routeId`, `transportType` | `DIRECT` vs. `OMNIROUTE_HTTP`, retry count, upstream latency. |
| **Provider & Model** | `providerId`, `modelId` | Prompt token count, completion token count, monetary cost in cents. |
| **Capabilities** | `grantId`, `capabilityId[]` | Resource paths accessed, permissions exercised. |
| **Verifier** | `verificationExecutionId` | Test command exit codes, assertion results, worktree mutation diff. |
| **Approval** | `approvalToken`, `approverId` | Human actor identifier, approval timestamp, decision (`APPROVED`/`REJECTED`). |
| **Evidence** | `evidenceSha256`, `archiveUri` | Cryptographic manifest hash, zip bundle location. |

---

## 3. Cost & Resource Tiering Model

Gravitas ensures that the system costs **effectively zero dollars while idle**:
- Background services (cron scheduler, reminder queue, courier downloads, git status checks) run natively on host CPU without making LLM inference requests.
- When an inference task is scheduled, it is routed to the optimal resource tier:

| Resource Tier | Target Workloads | Model Class | Cost Profile |
| :--- | :--- | :--- | :--- |
| **`LIGHT`** | Title generation, email header categorization, task classification. | Fast / Small (e.g. GPT-4o-mini, Claude 3.5 Haiku) | ~$0.001 - $0.005 |
| **`STANDARD`** | Feature authoring, bug fixing, research synthesis. | Balanced (e.g. GPT-4o, Claude 3.5 Sonnet) | ~$0.02 - $0.15 |
| **`DEEP`** | Multi-file architectural refactoring, complex mathematical proofs. | High-Reasoning (e.g. Claude 3.7 Sonnet Thinking, o1) | ~$0.30 - $1.50 |
