# Gravitas Capability & Authority Architecture (Wave 12C.5)

## 1. Principles of the Expanded Capability System

In Gravitas, capabilities extend far beyond repository coding. As a Personal Operating System, Gravitas must govern interactions with communications platforms, calendars, cloud storage, payment gateways, and local file systems.

### Core Principle: Logical Capability Denial vs. OS Sandboxing
- **Logical Capability Denial:** The orchestrator refuses to pass tools, credentials, or prompt instructions for capabilities that have not been granted. If a role lacks `CAP_SEND_EMAIL`, the email sending connector tool is simply omitted from its runtime schema and API access is denied at the gateway.
- **Critical Architectural Truth:** **Logical capability denial is not a hardware-isolated OS sandbox.** An LLM subprocess running natively on the host OS could theoretically execute arbitrary shell commands if granted unrestricted bash access. Therefore, high-risk tasks are bounded by worktree containment, strict subshell wrappers, and separate container profiles. We never falsely claim logical policy denial provides hardware-level sandboxing.

---

## 2. Authority Classes

Every capability belongs to one of six **Authority Classes**, which determine the required level of human governance and security isolation:

| Authority Class | Definition & Risk Profile | Default Policy | Example Operations |
| :--- | :--- | :--- | :--- |
| **`READ`** | Safe read-only inspection of non-sensitive public or project resources. | Allowed by default for matching role scopes. | Read project source files, run linter, query public web APIs, inspect git log. |
| **`SAFE_WRITE`** | Non-destructive writes within isolated, rollback-safe staging areas. | Allowed within task-declared change scope. | Modify files in isolated worktree, write test output, generate research folio markdown. |
| **`SENSITIVE_READ`** | Access to private user data (emails, calendar entries, personal notes, browsing history). | Requires explicit role context scope grant. | Read calendar event titles, inspect incoming email subjects, read local study notes. |
| **`EXTERNAL_WRITE`** | Outbound communications or actions that impact external third parties or public state. | Staging allowed; execution requires Human Approval. | Send email, post GitHub issue/comment, send WhatsApp/Slack message. |
| **`DESTRUCTIVE`** | Irreversible modification or deletion of user data, history, or system state. | Strict Human Approval; never granted automatically. | `rm -rf`, delete branch, wipe database table, drop calendar series, revoke credentials. |
| **`FINANCIAL`** | Operations that authorize monetary charges, commitments, purchases, or paid API scaling. | Human Approval mandatory for every transaction. | Pay cloud invoice, buy domain, submit paid API order, renew subscription. |

---

## 3. Capability Domain Models

```typescript
export type AuthorityClass =
  | 'READ'
  | 'SAFE_WRITE'
  | 'SENSITIVE_READ'
  | 'EXTERNAL_WRITE'
  | 'DESTRUCTIVE'
  | 'FINANCIAL'

export interface CapabilityDefinition {
  /** Unique capability identifier (e.g., 'CAP_SEND_EMAIL') */
  readonly id: string

  /** Human-readable name */
  readonly name: string

  /** Assigned authority class */
  readonly authorityClass: AuthorityClass

  /** Detailed description of risks and actions permitted */
  readonly description: string

  /** Associated connector or service ID */
  readonly handlerComponentId: string

  /** Target resource pattern (e.g., 'workspace://*', 'email://*') */
  readonly resourcePattern: string
}

export interface CapabilityGrant {
  readonly grantId: string
  readonly capabilityId: string
  readonly granteeRoleId: string
  readonly taskId: string
  readonly runId: string
  readonly grantedAt: string // ISO-8601
  readonly expiresAt?: string // ISO-8601
  readonly resourceConstraint?: string // e.g., 'apps/web/**'
}

export interface CapabilityRequest {
  readonly requestId: string
  readonly taskId: string
  readonly roleId: string
  readonly requestedCapabilityId: string
  readonly targetResource: string
  readonly justification: string
}

export interface CapabilityDecision {
  readonly requestId: string
  readonly isGranted: boolean
  readonly decidedBy: 'POLICY_ENGINE' | 'HUMAN_OPERATOR'
  readonly decidedAt: string
  readonly reason: string
  readonly activeGrant?: CapabilityGrant
}
```

---

## 4. Canonical Capability Catalog

| Capability ID | Authority Class | Description | Governing Policy |
| :--- | :--- | :--- | :--- |
| `CAP_READ_PROJECT` | `READ` | Read source files in task worktree. | Auto-granted to Engineering & QA roles. |
| `CAP_SAFE_WRITE_CODE`| `SAFE_WRITE` | Modify source files within declared task change scope. | Bounded by task worktree; validated by mutation detector. |
| `CAP_EXEC_TESTS` | `SAFE_WRITE` | Execute test runner (`vitest`, `playwright`) in task worktree. | Auto-granted to Engineering & Verifier. |
| `CAP_AUDIT_DIFF` | `READ` | Read complete worktree git diff across branches. | Auto-granted to Independent Reviewer. |
| `CAP_READ_CALENDAR` | `SENSITIVE_READ`| Read scheduled calendar events and time blocks. | Granted strictly to `PersonalCoach` and `Planner`. |
| `CAP_WRITE_CALENDAR`| `SAFE_WRITE` | Propose calendar time blocks or study sessions. | Staged as candidate event; requires user confirmation. |
| `CAP_READ_EMAIL` | `SENSITIVE_READ`| Read incoming email headers and selected message bodies. | Scoped to explicitly filtered queries. |
| `CAP_DRAFT_EMAIL` | `SAFE_WRITE` | Author candidate email draft in staging store. | Auto-granted to `OutreachDrafter`. |
| `CAP_SEND_EMAIL` | `EXTERNAL_WRITE`| Dispatch email over SMTP/SendGrid. | **Requires explicit Human Approval.** |
| `CAP_SEND_MESSAGE` | `EXTERNAL_WRITE`| Dispatch WhatsApp / Telegram / Slack message. | **Requires explicit Human Approval.** |
| `CAP_DOWNLOAD_FILE` | `SAFE_WRITE` | Download external asset/archive to `staging/downloads/`. | Granted to Courier execution service. |
| `CAP_READ_HEALTH` | `SENSITIVE_READ`| Read sleep duration, workout activity, or step counts. | **Requires explicit toggle in Personal Settings.** |
| `CAP_DELETE_FILES` | `DESTRUCTIVE` | Delete files outside temporary scratch directories. | **Requires explicit Human Approval.** |
| `CAP_MERGE_MAIN` | `DESTRUCTIVE` | Fast-forward or merge candidate branch into base branch. | **Requires verified Golden Loop and Human Approval.** |
| `CAP_SPEND_MONEY` | `FINANCIAL` | Commit funds or trigger external payment checkout. | **Strict Human Approval; zero automated delegation.** |
