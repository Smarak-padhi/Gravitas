# D2 Human Gate Background Behavior Specification

## 1. Sovereignty Invariants While Backgrounded
When canonical work enters the `WAITING_FOR_HUMAN_APPROVAL` state and the Command Center window is hidden:

- `NO_AUTO_ADVANCE`: No timer, background worker, automated supervisor, or heuristic may approve the item.
- `NO_TRAY_APPROVAL`: The system tray menu contains zero approval or decision actions.
- `STALENESS_PREVENTION`: Approvals remain strictly pending at their exact revision number.

## 2. Re-Opening the Gate
When the operator reopens the Command Center from the tray:
1. The approval queue is fetched fresh from `WorkSessionKernel`.
2. The item appears in the Approvals Inbox with its full verification report, findings, and limitations.
3. The operator must explicitly invoke the accessible confirmation dialog and click either **"Approve Decision"** or **"Reject Decision"**.
4. The human decision is routed through the canonical `RECORD_HUMAN_DECISION` IPC intent.
5. Even after approval, downstream actions remain manual: `authorizesMerge: false`, `authorizesDeploy: false`, `authorizesRelease: false`.
