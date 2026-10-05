# D1 Human Approval UI Boundary Specification

## 1. Epistemological Foundations
The GRAVITAS architecture enforces strict separation between verification, human authority, and downstream release actions:

```
+--------------------+        +--------------------+        +---------------------+
| Worker Execution   |        | K5 Verification    |        | Human Approval Gate |
| - Subjective Claim |  --->  | - Independent Obs  |  --->  | - Sovereign Decision|
| - WORKER_SUCCESS   |        | - VERIFIED_PASS    |        | - Explicit Operator |
+--------------------+        +--------------------+        +---------------------+
                                                                       |
                                                                       x  DOES NOT AUTHORIZE
                                                                       |
                                                            +---------------------+
                                                            | Automated Downstream|
                                                            | - No Auto-Merge     |
                                                            | - No Auto-Deploy    |
                                                            | - No Auto-Release   |
                                                            +---------------------+
```

**Fundamental Invariants**:
- `VERIFIER != APPROVER`: The verifier observes and falsifies claims; it does not approve or authorize.
- `VERIFICATION_PASS != HUMAN_APPROVAL`: A passing test or verification report is a necessary prerequisite, never a substitute for human authorization.
- `WORKER_SUCCESS != VERIFIED_SUCCESS`: A worker claiming success is merely a subjective historical claim.
- `SUPERVISOR_ACCEPTANCE != VERIFIED_SUCCESS`: A supervisor accepting a worker result does not constitute independent verification.
- `HUMAN_APPROVAL != MERGE_AUTHORIZATION`: Human approval approves the artifact or task; it does NOT authorize automatic git merge.
- `HUMAN_APPROVAL != DEPLOY_AUTHORIZATION`: Human approval does NOT trigger deployment to cloud or production environments.
- `HUMAN_APPROVAL != RELEASE_AUTHORIZATION`: Human approval does NOT trigger package publishing or binary release.

## 2. Human Approval Interface Architecture

### 2.1 Approvals Queue View
The Command Center Approvals view displays items currently in the `WAITING_FOR_HUMAN_APPROVAL` state. Each item clearly presents:
- **Task & Run Identifier**: Cryptographically stable references, not ephemeral labels.
- **Verification Verdict**: The K5 independent verdict (`VERIFIED_PASS`, `VERIFIED_FAIL`, `INCONCLUSIVE`, or `UNVERIFIED`). Items that are not `VERIFIED_PASS` are visually flagged and mechanically ineligible for approval.
- **Criteria & Scope**: The bound criteria against which the task was evaluated.
- **Expected Revision**: The exact sequence number of the approval entity to prevent stale actions.

### 2.2 Confirmation Modal (`<dialog id="approval-dialog">`)
To prevent accidental approval, decision actions are gated through an accessible HTML `<dialog>` modal:
- **Summary Review**: The operator reviews the targeted task ID, expected revision, and verification status.
- **Explicit Input**: The operator provides an explicit reason or note for the audit log.
- **Distinct Action Buttons**:
  - `Approve`: Explicitly triggers `RECORD_HUMAN_DECISION` with `decision: 'APPROVE'`.
  - `Reject`: Explicitly triggers `RECORD_HUMAN_DECISION` with `decision: 'REJECT'`.
  - `Cancel`: Dismisses the dialog without sending any IPC intent.
- **Zero Auto-Advance**: No timeout, countdown, default selection, or heuristic will ever auto-submit the approval.

## 3. Kernel-Enforced Boundaries
Even if a compromised renderer or malicious script attempts to bypass UI restrictions, the Kernel enforces:
1. **Pre-verification Check**:
   ```typescript
   if (intent.decision === 'APPROVE' && item.verificationVerdict !== 'VERIFIED_PASS') {
     return {
       success: false,
       intentType: intent.intentType,
       status: 'REJECTED',
       safeMessage: `Cannot approve item '${item.id}' because verification verdict is '${item.verificationVerdict}' (must be VERIFIED_PASS).`,
     }
   }
   ```
2. **Actor Check**:
   ```typescript
   if (intent.actorKind !== 'HUMAN_OPERATOR') {
     return {
       success: false,
       intentType: intent.intentType,
       status: 'DENIED',
       safeMessage: 'Only an authorized HUMAN_OPERATOR may submit operator intents. Machine actors prohibited.',
     }
   }
   ```
3. **Optimistic Revision Check**:
   ```typescript
   if (intent.expectedRevision !== item.currentRevision) {
     return {
       success: false,
       intentType: intent.intentType,
       status: 'REJECTED',
       safeMessage: `Stale revision: expected ${intent.expectedRevision}, but item is at revision ${item.currentRevision}.`,
     }
   }
   ```
4. **Zero Side-Effects**:
   The Kernel explicitly guarantees:
   ```typescript
   authorizesMerge: false,
   authorizesDeploy: false,
   authorizesRelease: false
   ```
   No git merge, push, or deployment scripts are invoked.
