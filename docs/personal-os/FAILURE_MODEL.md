# Gravitas Failure Modes & Graceful Degradation Model (Wave 12C.5)

## 1. Principles of Truthful Failure

In Gravitas, system failure is handled honestly, deterministically, and visibly:

$$\text{Failure Invariant: NO FAKE SUCCESS, NO SILENT MASKING.}$$

If an external provider is down, a connector token is revoked, or the client's GPU crashes, the system transitions to a degraded state with clear operator diagnostics. It never fabricates fallback metrics or hides errors behind synthetic completion states.

---

## 2. Failure Matrix & Degradation Behaviors

| Component Failure | Root Cause | Immediate System Action | Fallback Behavior & Degradation Policy |
| :--- | :--- | :--- | :--- |
| **Inference Provider Down** | Upstream API 500/503/429. | Mark provider `DEGRADED` in registry. | OmniRoute attempts alternate qualified provider. If policy is `GATEWAY_ONLY` and all fail, task transitions to `FAILED`. |
| **Inference Gateway Down** | OmniRoute process unreachable. | Log gateway transport error. | If task policy allows `GATEWAY_WITH_DIRECT_FALLBACK`, falls back to `DIRECT`. If `GATEWAY_ONLY`, fails fast with `GATEWAY_UNAVAILABLE`. |
| **Worker Harness Crashed** | Subprocess segfault / OOM. | Capture exit code & stderr tail. | Mark task `FAILED` with `SUBPROCESS_CRASHED`. Clean up ephemeral worktree immediately. |
| **Calendar Connector Lost**| OAuth token expired / revoked. | Mark connector `OFFLINE`. | Read operations return cached 7-day schedule; write operations blocked. UI prompts: *"Reconnect Google Calendar"*. |
| **Email Connector Error** | SMTP socket timeout. | Retain candidate draft in staging. | `CAP_SEND_EMAIL` disabled. Draft remains safely stored in inbox. UI prompts: *"SMTP dispatch failed. Retry?"* |
| **Courier Download Failed** | Remote HTTP 404 / connection drop. | Abort streaming, delete partial file. | Mark Courier job `FAILED`. Emit notification to operator. LLM is not invoked. |
| **3D HQ WebGL Crash** | GPU driver hang or context loss. | Unmount Three.js Canvas safely. | Automatically switch `activeView` to **2D Operations Floor**. System remains 100% operational. |
| **Notification Channel Down** | Desktop notification service denied. | Log OS notification failure. | Fallback to in-app Command Center Inbox drawer. |

---

## 3. The 3D HQ WebGL Resilience Guarantee

To guarantee that a WebGL rendering error never disrupts active operational workflows:
1. **Error Boundary Isolation:** The `<LivingHqCanvas3D />` component is wrapped inside a strict React Error Boundary.
2. **Context Loss Recovery:** If a `webglcontextlost` event fires, the engine attempts exactly one clean context restoration. If restoration fails, it automatically dispatches `onViewChange('OFFICE')`.
3. **Headless Operational Parity:** Every single feature in Gravitas (DAG composition, run execution, diff inspection, human approvals, inbox alerts) is fully accessible in the dense 2D view without WebGL.
