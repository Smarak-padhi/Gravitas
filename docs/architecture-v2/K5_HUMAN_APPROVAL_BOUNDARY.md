# GRAVITAS K5 — HUMAN APPROVAL & AUTHORITY BOUNDARIES
## Epistemological Gate Architecture, Actor Approval Matrix, and Non-Autonomous Release

**Wave**: K5  
**Status**: APPROVED_AND_FROZEN  

---

### 1. Sovereign Human Gate Invariants

```
VERIFIER != APPROVER
VERIFICATION_PASS != HUMAN_APPROVAL
VERIFIED_SUCCESS != MERGE_AUTHORIZATION
VERIFIED_SUCCESS != RELEASE_AUTHORIZATION
VERIFIED_SUCCESS != DEPLOY_AUTHORIZATION
```

Independent verification produces a technical finding and verdict. It does **not** make decisions, approve deployments, merge branches, or trigger releases.

---

### 2. Complete Actor Approval Matrix

| Actor Kind | Can Approve? | Code Enforcement |
| :--- | :--- | :--- |
| `HUMAN_OPERATOR` | **YES** | Allowed in `recordHumanDecision` if report is `VERIFIED_PASS` |
| `VERIFIER` | **NO** | Throws `ACTOR_NOT_AUTHORIZED` |
| `WORKER` | **NO** | Throws `ACTOR_NOT_AUTHORIZED` |
| `SUPERVISOR` | **NO** | Throws `ACTOR_NOT_AUTHORIZED` |
| `TOOL` | **NO** | Throws `ACTOR_NOT_AUTHORIZED` |
| `TIMER` | **NO** | Throws `ACTOR_NOT_AUTHORIZED` |
| `MODEL` | **NO** | Throws `ACTOR_NOT_AUTHORIZED` |
| `EVIDENCE_BUNDLE` | **NO** | Throws `ACTOR_NOT_AUTHORIZED` |

---

### 3. Non-Autonomous Release Contracts

Even when a human operator approves a `VERIFIED_PASS` report:
- `rec.authorizesMerge = false`
- `rec.authorizesRelease = false`
- `rec.authorizesDeploy = false`
- `rec.integrationPerformedByK5 = false`

K5 never automates git merges, git pushes, or production deployments. All downstream integration remains subject to explicit human execution.
