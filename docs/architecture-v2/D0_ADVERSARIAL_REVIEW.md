# D0 Adversarial Review & Red-Team Audit

## 1. Attack Vectors Tested
1. **Renderer Node.js Injection**: `require`, `process`, `Buffer` in renderer context -> BLOCKED (ReferenceError).
2. **Raw IPC Channel Exploitation**: Unexposed channel access -> BLOCKED.
3. **Projection State Corruption**: Modifying snapshot objects client-side -> BLOCKED (Backend state unmodified).
4. **Window Navigation Escape**: Triggering navigation to external URL -> BLOCKED (`will-navigate` cancelled).
5. **Popup / Window Opening Escape**: Triggering `window.open` -> BLOCKED (`setWindowOpenHandler` denies).
