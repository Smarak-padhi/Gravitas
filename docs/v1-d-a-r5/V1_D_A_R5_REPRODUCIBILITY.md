# GRAVITAS Wave V1-D-A-R5: Packaging Reproducibility and File Accounting Audit

**Date:** 2026-10-12  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Base Commit:** `cb723e09dadfa90748d5e19e7821b31ec7f8426a`

---

## 1. Executive Summary

This audit independently verifies full deterministic packaging reproducibility across two independent executions of `node scripts/package-windows.mjs` on the Wave V1-D-A-R5 working tree.

### 1.1 Independent Auditor (Subagent C) Dual-Build Verification

| Metric | Subagent C Run 1 | Subagent C Run 2 | Match Status |
|:---|:---|:---|:---|
| **Total Packaging Output Artifacts** | 126 | 126 | **100% IDENTICAL** |
| **Packaged Application Payload Files** | 122 | 122 | **100% IDENTICAL** |
| **Top-Level Distribution Artifacts** | 4 | 4 | **100% IDENTICAL** |
| **Distribution ZIP (`Gravitas-0.0.1-win32-x64.zip`)** | `da761a7e5f277718ce065a041a16bb11c00a18c6c7d6dd25004dd6813fbd5cb3` | `da761a7e5f277718ce065a041a16bb11c00a18c6c7d6dd25004dd6813fbd5cb3` | **MATCH (SHA-256)** |
| **Manifest (`manifest.json`)** | `1e277514552f5ef1a44b469a507ccf56c3a71d450694d4c0fc4934410462fb2b` | `1e277514552f5ef1a44b469a507ccf56c3a71d450694d4c0fc4934410462fb2b` | **MATCH (SHA-256)** |
| **Installer Script (`Install-Gravitas.ps1`)** | `d51c88d51aadbaa858fcad2f3d3e6718cf8a5637aa83455cb88778601b47cc2d` | `d51c88d51aadbaa858fcad2f3d3e6718cf8a5637aa83455cb88778601b47cc2d` | **MATCH (SHA-256)** |
| **Launcher CMD (`Install-Gravitas.cmd`)** | `21a4f0bb4e3e31a293c35b6c0b90e9d970e7e17cb25e219fb09be73426726917` | `21a4f0bb4e3e31a293c35b6c0b90e9d970e7e17cb25e219fb09be73426726917` | **MATCH (SHA-256)** |
| **Application Binary (`Gravitas.exe`)** | `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa` | `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa` | **MATCH (SHA-256)** |
| **Mismatches across all 126 files** | 0 | 0 | **ZERO MISMATCHES** |

---

## 2. File Accounting Reconciliation (126 Files Total)

The total distribution package contains exactly 126 artifacts:

1. **4 Top-Level Distribution Artifacts:**
   - `dist-package/Gravitas-0.0.1-win32-x64.zip`
   - `dist-package/manifest.json`
   - `dist-package/Install-Gravitas.ps1`
   - `dist-package/Install-Gravitas.cmd`
2. **122 Application Runtime Files (`dist-package/gravitas-desktop-win32-x64/`):**
   - 1 Main Executable: `Gravitas.exe`
   - 1 Generated Uninstaller: `Uninstall.ps1`
   - 1 Payload Inventory: `resources/app/payload-inventory.json`
   - 1 Application Manifest: `resources/app/package.json`
   - 4 Application Code Bundles (`resources/app/dist/`):
     - `main/index.cjs`
     - `preload/index.cjs`
     - `renderer/index.html`
     - `kernelHost/index.cjs`
   - 114 Electron & Chromium Runtime Assets (DLLs, locales, ICU data, ANGLE, V8 snapshots).

Zero files were added, deleted, or altered between packaging runs.

---

## 3. Determinism Mechanisms

1. **Fixed Timestamp Normalization:**
   `SOURCE_DATE_EPOCH` is derived from git commit epoch (or fixed fallback epoch). File modification times in the ZIP archive are normalized to DOS epoch `1980-01-01 00:00:00`.
2. **Strict Alphabetical Entry Ordering:**
   All entries written to `Gravitas-0.0.1-win32-x64.zip` and `payload-inventory.json` are sorted lexicographically using deterministic UTF-8 path comparisons.
3. **Deterministic Stream Compression:**
   ZIP creation uses fixed DEFLATE compression levels without system-dependent metadata or local path leakage.
