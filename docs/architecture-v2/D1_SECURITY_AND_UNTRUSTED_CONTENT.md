# D1 Security and Untrusted Content Containment Specification

## 1. Threat Model & Security Architecture
The Command Center displays complex, unstructured data originating from untrusted or semi-trusted sources: LLM responses, external tool execution outputs, git diffs, third-party library metadata, and worker candidate payloads.

**Threat Vectors**:
1. **Cross-Site Scripting (XSS) to Remote Code Execution (RCE)**: A malicious worker payload or tool output containing HTML/JavaScript injection attempts to break out of the renderer to execute host commands.
2. **Confused Deputy / Privilege Escalation**: A worker output attempting to simulate an operator instruction (e.g. `[APPROVE]`, `intentType: 'RECORD_HUMAN_DECISION'`) to trick the system into auto-approving mutations.
3. **IPC Channel Hijacking**: A compromised renderer attempting to invoke unregistered IPC channels or invoke privileged main-process functions.
4. **Data Exfiltration**: Malicious payloads attempting to open network connections (`fetch`, `XMLHttpRequest`, `WebSocket`) to exfiltrate session data or tokens.

## 2. Defensive Controls

### 2.1 Process Sandboxing & Node Isolation
The Electron BrowserWindow is configured with strict defense-in-depth settings:
```typescript
webPreferences: {
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  preload: PRELOAD_PATH,
}
```
- Zero Node.js primitives (`fs`, `child_process`, `process`, `require`, `Buffer`) exist in the renderer context.
- Neither `window.process` nor `window.require` is defined.

### 2.2 Preload Boundary & Narrow Allowlisting
The preload script (`apps/desktop/src/preload/index.ts`) uses `contextBridge.exposeInMainWorld` to expose ONLY an explicit, strongly-typed interface:
```typescript
contextBridge.exposeInMainWorld('gravitasDesktop', {
  getOverview: () => ipcRenderer.invoke('gravitas:get-overview'),
  getWorkHierarchy: () => ipcRenderer.invoke('gravitas:get-work-hierarchy'),
  getTaskDetail: (taskId) => ipcRenderer.invoke('gravitas:get-task-detail', taskId),
  getExecution: () => ipcRenderer.invoke('gravitas:get-execution'),
  getVerification: () => ipcRenderer.invoke('gravitas:get-verification'),
  getApprovalQueue: () => ipcRenderer.invoke('gravitas:get-approval-queue'),
  getSystem: () => ipcRenderer.invoke('gravitas:get-system'),
  getActivity: () => ipcRenderer.invoke('gravitas:get-activity'),
  submitIntent: (intent) => ipcRenderer.invoke('gravitas:submit-intent', intent),
  onProjectionUpdate: (callback) => { ... },
})
```
- `ipcRenderer` is NEVER exposed to `window`.
- No generic `send`, `invoke`, or `emit` methods exist.
- No dynamic method dispatch or channel reflection is permitted.

### 2.3 Content Security Policy (CSP)
Enforced in `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'none';
  object-src 'none';
  base-uri 'none';
  form-action 'none';
">
```
- `connect-src 'none'`: All network access (fetch, XHR, WebSockets) from the renderer is blocked at the browser engine level.
- `script-src 'self'`: Prohibits inline scripts, string evaluation (`eval`), and remote script loading.

### 2.4 Untrusted Data Containment
Untrusted worker outputs, terminal logs, and tool results are strictly treated as inert data:
- Content is inserted into the DOM exclusively via `textContent` or inside `<pre class="untrusted-data">`.
- `innerHTML` is never used for external or dynamic content.
- If an agent generates text stating `"Approved"` or embedding `<script>` tags, it is displayed as harmless plain text.
- Worker text cannot fabricate operator intent: intents require `actorKind: 'HUMAN_OPERATOR'` and originate exclusively from user click handlers bound to native buttons.

## 3. Negative Dogfood Verification
Negative security fixtures in `apps/desktop/src/dogfood-d1-negative.mjs` verify:
- **Fixture D**: Malicious worker instruction has zero authority and is rejected if passed as an intent (`DENIED`).
- **Fixture E**: Generic command bridge (`dispatch`, `execute`, `run`) is absent from `window.gravitasDesktop`.
- **Fixture F**: Raw IPC (`ipcRenderer`), Node primitives (`require`, `process`), and filesystem access are completely unavailable.
- **Fixture G**: Cost policy blocks unauthorized payments or paid fallbacks (`AUTONOMOUS_INCREMENTAL_SPEND = 0`).
