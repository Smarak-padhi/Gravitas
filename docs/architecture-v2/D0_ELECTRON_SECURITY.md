# D0 Electron Security Architecture

## 1. WebPreferences Security Invariants
All `BrowserWindow` instances enforce:
- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`
- `allowRunningInsecureContent: false`

## 2. Navigation & Window Open Blocking
- `will-navigate` event listener calls `event.preventDefault()` for all external navigation.
- `setWindowOpenHandler` unconditionally returns `{ action: 'deny' }`.

## 3. Strict Content Security Policy (CSP)
- CSP header: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'none';`
- Prevents remote script execution and code injection.
