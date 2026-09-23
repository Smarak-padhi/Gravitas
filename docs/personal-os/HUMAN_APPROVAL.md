# Gravitas Human Governance & Tiered Approval Architecture (Wave 12C.5)

## 1. Principles of Human Authority

In Gravitas, the human operator is the ultimate authority. No agent role, scheduler policy, or automated heuristic may circumvent the human governance boundary.

$$\text{Human Authority} = \text{Non-Bypassable Cryptographic \& State Machine Gate}$$

### Core Governance Rules:
1. **Consequential Actions Are Gated by Default:** Any action that mutates public state, spends money, destroys data, or contacts a third party halts at a designated governance gate.
2. **Never Collapse Approval Tiers:** Preparing an action is NOT executing it; executing a test in a worktree is NOT integrating it to the base branch; and merging code is NOT publishing it to production. Each boundary is an independent, non-collapsible state transition.

---

## 2. The 4 Non-Collapsible Approval Tiers

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 1. APPROVAL TO PREPARE (L0 -> L1)                                      │
  │    Permission to spend tokens and research/author candidate work.       │
  │    Artifact: Staged code diff, draft email, candidate event.           │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 2. APPROVAL TO EXECUTE (L1 -> L2)                                      │
  │    Permission to run bounded, isolated local actions.                  │
  │    Artifact: Test runner output, local worktree commit, browser trace.  │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 3. APPROVAL TO INTEGRATE (L2 -> Golden Loop Sign-Off)                  │
  │    Permission to merge candidate branch into base repository branch.    │
  │    Artifact: Clean fast-forward merge commit on base repository.        │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 4. APPROVAL TO PUBLISH (Production Release / External Dispatch)        │
  │    Permission to send live email, push public git release, pay invoice. │
  │    Artifact: Network transmission receipt, external API response.      │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mandatory Human Approval Catalog

The following operations strictly require explicit human authorization before execution:

| Operation | Governing Tier | Presentation Surface | Action Impact |
| :--- | :--- | :--- | :--- |
| **Send External Email** | `APPROVAL_TO_PUBLISH` | Mezzanine Plinth / Inbox Drawer | Outbound SMTP dispatch to prospect or client. |
| **Send WhatsApp/Telegram Message**| `APPROVAL_TO_PUBLISH` | Mezzanine Plinth / Inbox Drawer | Outbound message sent via messaging connector. |
| **Merge to Base Branch (`main`)** | `APPROVAL_TO_INTEGRATE`| Mezzanine Plinth / Review Bar | Fast-forward merge of verified candidate task branch. |
| **Destructive File Deletion** | `APPROVAL_TO_EXECUTE` | Mezzanine Plinth / Terminal Dialog | Permanent deletion of untracked files or branches. |
| **Modify Critical Calendar Event**| `APPROVAL_TO_EXECUTE` | Mezzanine Plinth / Inbox Drawer | Rescheduling a non-flexible meeting or flight time block. |
| **Financial Expenditure / Purchase**| `APPROVAL_TO_PUBLISH`| Mezzanine Plinth / Modal Dialog | Payment processing, cloud resource scaling top-up. |
| **Share Sensitive Information** | `APPROVAL_TO_PUBLISH` | Mezzanine Plinth / Modal Dialog | Exporting private notes or contacts to third-party tool. |
| **Alter Standing Autonomy Policy**| `APPROVAL_TO_EXECUTE` | Security Settings Console | Elevating a role's default autonomy level from L2 to L3. |

---

## 4. UI Governance Surfaces

1. **3D Headquarters Mezzanine (Room 6: Approval Control):** The spatial plinth illuminates with an amber glow when any task enters `WAITING_APPROVAL`. Clicking the plinth docks the inspector, displaying the diff, evidence manifest, and `Approve` / `Reject` buttons.
2. **2D Command Center Operator Review Bar:** A persistent, high-contrast review bar docks at the top of the command center whenever approvals are pending, complete with one-click diff inspection.
3. **Mobile Companion Action Drawer:** Displays push notification cards with biometric authorization (TouchID/FaceID) to sign off on non-breaking candidate integrations remotely.

---

## 5. Wave 12H Visual Invariants & Sovereign Boundaries

- `WAITING_APPROVAL != APPROVED`: Rest on the Approval Plinth does not permit speculative advancement.
- `APPROVAL ANIMATION != APPROVAL AUTHORITY`: Mechanical seal gesture executes strictly after confirmed backend HTTP 200 response.
- `HUMAN OPERATOR != NPC`: No avatar impersonates human authority or operates the plinth.
- `INTEGRATION PREPARED != MERGED`: Preparation stages candidate diffs; only confirmed operator approval permits materialization.
- `REJECTION SOVEREIGNTY`: Rejected candidate routes immediately to `FAILURE_HOLD` with zero approval styling.
