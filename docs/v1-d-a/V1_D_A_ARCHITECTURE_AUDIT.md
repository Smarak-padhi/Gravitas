# GRAVITAS — V1-D-A Distribution Architecture Audit

**Audit Date:** 2026-10-11  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Target Platform:** Windows x64 (`win32 10.0.26300`)  
**Base Commit:** `9839eee27fa7273343bf05ecb56d3996ff4687cd` (Frozen V1-C Baseline)

---

## 1. Executive Summary & Tooling Assessment

This audit evaluates the packaging, distribution, and runtime process boundaries of GRAVITAS ahead of creating the first installable Windows distribution.

### Core Architecture Findings:
1. **Electron & Node Runtimes:**
   - Development & Bundled Runtime: Electron `v44.5.1` (Chrome `152.0.7977.130`, Node `24.21.0`, V8 `15.2.124.28-electron.0`).
   - Host Development Engine: Node.js `v24.13.0`.
   - Native SQLite Module: **Zero native ABI or node-gyp build dependencies**. The persistence engine utilizes Node's built-in `node:sqlite DatabaseSync` (SQLite `3.53.4`), natively included inside Electron `v44.5.1`'s Node 24 runtime.
2. **Process Boundaries & Entry Points:**
   - Production entry points are compiled via `apps/desktop/build.mjs` using `esbuild`:
     - Main Process: `apps/desktop/dist/main/index.js`
     - Preload Bridge: `apps/desktop/dist/preload/index.cjs`
     - Renderer Application: `apps/desktop/dist/renderer/index.html` + `renderer.js`
     - Kernel Host: `apps/desktop/dist/kernel-host/index.mjs`
     - Desktop Supervisor: `apps/desktop/dist/main/supervisor.js`
3. **Packaging Tool Selection:**
   - The repository currently lacks heavy external packaging frameworks (`electron-builder`, `electron-packager`, or `@electron-forge` are absent from `node_modules`).
   - Third-party compiler tools such as `makensis` (NSIS) and `iscc` (Inno Setup) are **not installed** on this Windows host.
   - **Approved Minimal Choice:** A dedicated, deterministic Node.js distribution packager (`scripts/package-windows.mjs` and `scripts/create-installer.mjs`) that:
     - Assembles the standalone Windows x64 application directory (`dist-package/gravitas-desktop-win32-x64/`) with the bundled Electron binary, assets, package descriptors, and compiled bundles.
     - Generates an installable, standalone Windows package / setup archive (`dist-package/Gravitas-Setup-0.0.1-win32-x64.zip` and automated self-installing PowerShell runner `Install-Gravitas.ps1`).
     - Emits a cryptographic SHA-256 manifest for all distribution artifacts.
     - Enforces non-administrative per-user installation (`%LOCALAPPDATA%\Programs\Gravitas`), desktop/start-menu shortcuts, clean uninstaller (`Uninstall-Gravitas.ps1`), and non-destructive user data retention under `%APPDATA%\gravitas`.

---

## 2. File:Line Architecture Mapping

### 2.1 Electron Main Process Entry Point & Security Preferences
- **File:** [`apps/desktop/src/main/index.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/main/index.ts#L68-L95)
- **Findings:**
  - `webPreferences`: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`, `preload: PRELOAD_PATH`.
  - Navigation Policy: `will-navigate` blocks all navigation away from canonical `pathToFileURL(RENDERER_HTML_PATH).href` (`apps/desktop/src/main/index.ts:83-92`).
  - New window policy: `setWindowOpenHandler(() => ({ action: 'deny' }))` (`apps/desktop/src/main/index.ts:94`).
  - CSP: Enforces `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self';` (`apps/desktop/src/main/index.ts:47-50`).

### 2.2 utilityProcess and Packaged KernelHost Resolution
- **File:** [`apps/desktop/src/main/index.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/main/index.ts#L24-L25) and [`apps/desktop/src/main/index.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/main/index.ts#L341-L354)
- **Findings:**
  - `const KERNEL_HOST_PATH = join(__dirname, '../kernel-host/index.mjs')`.
  - In a packaged layout (`resources/app/dist/main/index.js`), `__dirname` resolves to `<app_root>/resources/app/dist/main`, and `join(__dirname, '../kernel-host/index.mjs')` cleanly resolves to `<app_root>/resources/app/dist/kernel-host/index.mjs`.
  - `utilityProcess.fork(KERNEL_HOST_PATH, [], { env: { ...process.env, GRAVITAS_DATA_ROOT: customDataRoot } })` spawns a real, isolated OS process hosting `KernelHost`.

### 2.3 Built-in SQLite Engine & ABI Stability
- **Files:**
  - [`packages/core/src/kernel/persistence/schema.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/persistence/schema.ts#L13)
  - [`packages/core/src/kernel/persistence/sqliteWriter.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/persistence/sqliteWriter.ts#L11)
  - [`packages/core/src/doctor.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/doctor.ts#L22)
- **Findings:**
  - All database interactions use `import { DatabaseSync } from 'node:sqlite'`.
  - Empirically verified inside Electron `v44.5.1`'s Node 24 runtime: `typeof DatabaseSync === 'function'`.
  - Zero C++ compilation, zero node-gyp rebuilds, zero native ABI breakage risks across packaging.

### 2.4 Data Root Resolution Outside Installation Directory
- **Files:**
  - [`packages/core/src/paths.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/paths.ts#L52-L85)
  - [`apps/desktop/src/main/index.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/main/index.ts#L337)
- **Findings:**
  - Data root resolves to `%APPDATA%\gravitas` on Windows (or `GRAVITAS_DATA_ROOT` when overridden for testing).
  - It is completely decoupled from the application executable directory (`%LOCALAPPDATA%\Programs\Gravitas` or repository root).
  - Uninstallation of the application binaries will leave `%APPDATA%\gravitas` intact, preventing silent loss of user sessions, durable journals, or audit logs.

### 2.5 Caller Authorization for Restart IPC
- **File:** [`apps/desktop/src/main/index.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/main/index.ts#L209-L239)
- **Findings:**
  - `isAuthorizedRestartCaller` validates:
    1. Active window exists and is not destroyed.
    2. Invoker is `event.sender === activeWindow.webContents`.
    3. Frame is top-level (`event.senderFrame.parent === null`).
    4. Frame URL is strictly `pathToFileURL(RENDERER_HTML_PATH).href`.
  - Survives packaging seamlessly because `RENDERER_HTML_PATH` resolves to `file:///<install_dir>/resources/app/dist/renderer/index.html`.
