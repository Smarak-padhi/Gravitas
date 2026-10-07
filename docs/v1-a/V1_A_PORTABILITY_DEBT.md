# GRAVITAS V1-A — MACHINE-SPECIFIC ASSUMPTION & PORTABILITY AUDIT

**WAVE:** V1-A  
**TARGET:** CLEAN-MACHINE PRODUCTIZATION PREPARATION  

---

## 1. Audit Findings: Historical vs. Active

1. **Active Production Code:**
   - Zero active production code paths depend on hardcoded paths like `C:\Users\smara` or machine-specific drive letters.
   - Subprocess launchers dynamically probe `process.env.LOCALAPPDATA`, `os.homedir()`, and `PATH`.
   - SQLite databases initialize within the caller-provided `dataRoot` or temporary directories.

2. **Cleansed Documentation & Comments:**
   - Cleansed developer-specific user path examples in `packages/harnesses/src/k1/agyAdapter.ts` and `fccAdapter.ts`.
   - Generic environment variables (`%LOCALAPPDATA%`, `%USERPROFILE%`) are now referenced.

3. **Historical Evidence Preservation:**
   - Test logs and forensic reports in `docs/skill-arena/` and `.evidence/` intentionally record the historical author environment where tests originally ran. Per specification, historical forensic data is preserved unmutated.

---

## 2. Remaining Portability Requirements (Wave V1-C Scope)

To achieve zero-configuration installation on another developer's clean Windows laptop, the following items remain slated for **Wave V1-C**:
1. **`gravitas doctor` Prerequisite Scanner:**
   - Automated checks for Node.js ($\ge 22$), Git in `PATH`, SQLite write permissions, and installed CLI harnesses.
2. **First-Run Onboarding Wizard:**
   - Electron UI wizard allowing the user to select default workspace roots and configure optional provider keys.
3. **Automated Windows Installer:**
   - Packaging via `electron-builder` into a single standalone `Gravitas-Setup.exe`.
