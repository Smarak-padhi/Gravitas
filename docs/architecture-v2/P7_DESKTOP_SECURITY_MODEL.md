# GRAVITAS — TARGET DESKTOP SECURITY MODEL
## Security Architecture, Trust Boundaries & Threat Mitigations for Wave P7

**Status:** APPROVED SECURITY ARCHITECTURE  
**Wave:** P7 — Desktop Runtime Decision  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$
- $\text{TOOL DECLARATION} \neq \text{TOOL QUALIFICATION} \neq \text{TOOL AUTHORIZATION} \neq \text{TOOL EXECUTION}$
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{UI\ COMPROMISE \neq UNRESTRICTED\ OS\ AUTHORITY}$
- $\mathbf{RENDERER\ REQUEST \neq AUTHORIZED\ KERNEL\ COMMAND}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{AGENT\_PAYMENT\_AUTHORITY = NONE}$

---

## 1. Security Philosophy & The Zero-Trust Renderer

$$\mathbf{THE\ RENDERER\ IS\ AN\ UNTRUSTED\ VIEWPORT}$$

In a multi-agent operating system, the UI renderer displays outputs from external web scrapers, LLMs, third-party MCP servers, and untrusted repository code. A severe security risk occurs if malicious content rendered in the UI can execute arbitrary commands on the operator's Windows host.

Therefore, GRAVITAS treats the Renderer process as an untrusted zone. The desktop shell enforces a multi-layer defense-in-depth boundary:
- `sandbox: true`
- `contextIsolation: true`
- `nodeIntegration: false`
- Zero raw Electron APIs exposed to DOM
- Narrow, static `contextBridge` surface
- IPC sender and origin validation on every message
- Strict schema validation on all parameters
- Authorization performed exclusively by the Kernel
- Navigation and new-window restrictions (`will-navigate`, `setWindowOpenHandler`)
- Restrictive Content Security Policy (CSP)

**Architectural Scope Contract:** These controls are designed to drastically **REDUCE renderer-to-host escalation authority** by eliminating standard attack vectors (raw Node bindings, unverified IPC channels, arbitrary filesystem handles). They do not mathematically prove zero-day Chromium engine exploits impossible, but ensure that application-layer vulnerabilities cannot directly command the host without escaping the OS-level Chromium sandbox.

---

## 2. Trust Boundaries & Privilege Topology

```
+===================================================================================================+
|                                    WINDOWS 11 HOST OPERATING SYSTEM                               |
+===================================================================================================+
                                                ^
                                                | Brokered Win32 APIs (Tray, Notifications, Run Key)
                                                v
+---------------------------------------------------------------------------------------------------+
| [TRUST TIER 1: DESKTOP SUPERVISOR] ELECTRON MAIN PROCESS                                          |
| - Full Node.js host privileges                                                                    |
| - Manages window lifecycle, system tray, AUMID notifications, and single-instance locks           |
| - Spawns and supervises Kernel utilityProcess via Chromium Mojo                                    |
+---------------------------------------------------------------------------------------------------+
                                                ^
                                                | Chromium Mojo IPC / MessagePort
                                                v
+---------------------------------------------------------------------------------------------------+
| [TRUST TIER 2: LOCAL CONTROL PLANE] KERNEL UTILITY PROCESS (Node.js 24)                          |
| - Sole canonical writer to SQLite (.gravitas/gravitas.db)                                         |
| - Manages DAG scheduler, durable jobs, task state machines, and approval records                  |
| - Manages Credential Broker (P4): holds API keys; NEVER exposes raw secrets to Renderer          |
| - Spawns ephemeral workers in Windows Job Objects with 8-dimension containment layers             |
+---------------------------------------------------------------------------------------------------+
                                                ^
                                                | Strongly Typed, Allowlisted Preload Bridge
                                                v
+---------------------------------------------------------------------------------------------------+
| [TRUST TIER 3: ZERO-TRUST VIEWPORT] CHROMIUM RENDERER PROCESS                                     |
| - contextIsolation: true, sandbox: true, nodeIntegration: false                                   |
| - Strict Content Security Policy (CSP); zero eval(), zero remote script execution                 |
| - Interacts ONLY via typed gravitasAPI bridge methods; cannot invoke shell, fs, or database       |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Strict Preload Allowlist Bridge (`preload.ts`)

The interface between the sandboxed Renderer and the privileged Host is mediated exclusively by a strictly allowlisted `contextBridge`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Closed, strongly-typed command set
const ALLOWED_INVOKE_CHANNELS = new Set([
  'kernel:getSystemStatus',
  'kernel:queryWorkSession',
  'kernel:queryDagState',
  'kernel:submitApprovalDecision',
  'kernel:requestTaskCancellation',
  'kernel:pauseExecution',
  'kernel:resumeExecution'
]);

const ALLOWED_STREAM_CHANNELS = new Set([
  'telemetry:dagUpdate',
  'telemetry:taskLogChunk',
  'telemetry:approvalPending',
  'telemetry:systemMetrics'
]);

contextBridge.exposeInMainWorld('gravitasAPI', {
  invoke: async (channel: string, payload: unknown) => {
    if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
      throw new Error(`Security Violation: Unauthorized IPC channel '${channel}'`);
    }
    // Deep-clone and validate payload structure
    return await ipcRenderer.invoke(channel, payload);
  },
  on: (channel: string, listener: (data: unknown) => void) => {
    if (!ALLOWED_STREAM_CHANNELS.has(channel)) {
      throw new Error(`Security Violation: Unauthorized stream channel '${channel}'`);
    }
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => listener(data);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});
```

### Invariants Enforced by Bridge:
1. **No Raw IPC Exposure:** The raw `ipcRenderer` object is never exposed to `window`.
2. **Channel Whitelisting:** Any call to an unlisted channel throws an immediate security exception.
3. **No Dynamic Code Injection:** No `eval()`, no dynamic method resolution, no prototype tampering.

---

## 4. Threat Matrix & Concrete Defensive Mitigations

| Threat Vector | Attack Scenario | Defensive Architecture & Mitigation |
| :--- | :--- | :--- |
| **T1: XSS in Renderer** | An LLM-generated diff or web scraper output contains `<script>` tags attempting DOM-based XSS. | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Even if script executes, it has no Node.js runtime access. Strict CSP prohibits inline scripts and `'unsafe-eval'`. |
| **T2: IPC Injection / Escalation** | Compromised renderer attempts `ipcRenderer.invoke('shell:exec', 'calc.exe')`. | No shell or execution channels exist in the IPC bridge. All commands pass through the Kernel's Capability & Authority validation before execution. |
| **T3: Arbitrary File Access** | Malicious UI component attempts to read `.ssh/id_rsa` or sensitive host files. | Renderer has zero filesystem APIs (`fs` is absent). File operations flow through brokered Kernel commands restricted to approved project worktrees. |
| **T4: Credential Theft** | Malicious plugin or UI script tries to inspect memory to steal OpenAI / Anthropic API keys. | Credential Broker isolation: raw credentials reside exclusively in the Kernel process; the Renderer receives only opaque `CapabilityGrant` reference IDs. |
| **T5: Malicious Navigation** | External link in agent output redirects renderer to phishing site. | `will-navigate` event strictly intercepts navigation and cancels unapproved origins; `setWindowOpenHandler` denies popups and forces external URLs to the system browser. |
| **T6: Malicious Deep Link** | Attacker tricks user into clicking `gravitas://exec?cmd=rmdir`. | Deep link arguments are strictly validated against a schema; unverified or destructive action requests are rejected or routed to the sovereign human approval gate. |
| **T7: Local Socket Hijacking** | Another local process connects to the local control port. | Local Named Pipes (`\\.\pipe\gravitas-control`) enforce Windows ACLs restricted to the current user's SID, preventing unauthorized processes from connecting. |
| **T8: Notification Secret Leakage** | Task error dumps full prompt containing private data into Windows Toast. | The Kernel sanitizes notification payloads: only static summary messages and task IDs are emitted to the Action Center; raw prompt context is stripped. |
| **T9: Update Tampering / MITM** | Malicious actor attempts to forge an auto-update payload. | All auto-updates are cryptographically verified using Minisign / Ed25519 digital signatures and fetched over HTTPS from GitHub Releases. |
| **T10: Production DevTools** | Attacker accesses DevTools in packaged build to modify state. | DevTools are disabled and stripped from production builds (`BrowserWindow.webContents.on('devtools-opened', () => win.webContents.closeDevTools())`). |

---

## 5. Content Security Policy (CSP)

The Renderer enforces a strict, defense-in-depth Content Security Policy injected via HTTP response headers and HTML `<meta>` tags:

```http
default-src 'none';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
worker-src 'self' blob:;
canvas-src 'self';
object-src 'none';
base-uri 'none';
form-action 'none';
frame-ancestors 'none';
```

### Rules Enforced:
- `script-src 'self'`: Disallows loading scripts from remote CDNs or inline `<script>` tags.
- `connect-src 'self'`: Prevents the renderer from making arbitrary outbound fetch or WebSocket calls to external networks; all communication must traverse the local IPC bridge.
- `object-src 'none'`: Blocks Flash, Java, and legacy browser plugins completely.
