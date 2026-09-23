# Gravitas 3D Headquarters — Human Approval Visual Contract

**Wave 12H Architectural Specification**  
**Branch:** `feat/v0-golden-loop`  
**Status:** SEALED  

---

## 1. Governance Boundary

> **HUMAN OPERATOR IS SOVEREIGN. NO AUTOMATION CAN APPROVE WORK PRODUCT.**  
> **APPROVAL ANIMATION DOES NOT EXECUTE APPROVAL. IT ACKNOWLEDGES BACKEND AUTHORITY.**

The central governance point of the headquarters is the **Approval Plinth** located in the Executive Office ($X = 0.0\text{m}, Y = 0.88\text{m}, Z = 2.5\text{m}$).

### Core Rules

1. **Stationary Staging:** When a task reaches `WAITING_APPROVAL` with `requiresHumanApproval = true`, its physical work product dossier is staged upon the Approval Plinth.
2. **Infinite Rest:** The dossier remains upon the plinth indefinitely. No avatar locomotion, time elapsed, or ambient interaction will trigger approval or completion.
3. **Dedicated Operator UI:** Approval and rejection actions are solely accessible through the authenticated operator web interface (`POST /api/v1/runs/:runId/tasks/:taskId/approve` or `reject`).
4. **Causal Visual Gesture:** Only AFTER the server returns HTTP 200 and the updated snapshot is ingested will the 3D scene render the mechanical brass clasp press / closure gesture.
5. **Rejection Safety:** If the operator rejects the candidate, the dossier is immediately transferred to `FAILURE_HOLD` with `APPROVAL_REJECTED` reason code and a crimson clasp treatment. No approval seal is ever displayed.
6. **Reduced Motion:** When `prefers-reduced-motion` is active, the dossier snaps instantly to its approved position in `COMPLETED_TRAY` or `FAILURE_HOLD` without transition animations.
