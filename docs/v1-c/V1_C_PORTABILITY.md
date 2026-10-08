# GRAVITAS — Wave V1-C Portability
## Canonical Directory Resolution & Platform Resilience

### 1. Architectural Philosophy

GRAVITAS is engineered to run seamlessly on a fresh Windows workstation without assuming hardcoded directory layouts, specific username paths, or repository-relative directories for runtime state.

The canonical data root stores:
- `kernel.db`: SQLite single-writer transactional state database.
- `kernel.lock`: Lockfile holding PID and active lease.
- `config.json`: Persistent user preferences and onboarding state.
- `logs/`: Subsystem and run audit logs.
- `artifacts/`: Bounded output files and evidence bundles.

---

### 2. Resolution Precedence

`resolveGravitasDataRoot(customPath?: string)` deterministically selects the data directory using strict hierarchy:

1. **Explicit Function Argument / Programmatic Override:**  
   If provided, normalized via `validateSafeDirectoryPath()`. Sets `isTestOverride: true`.
2. **Environment Variable (`GRAVITAS_DATA_ROOT`):**  
   If set and non-empty, resolved and verified. Sets `isTestOverride: true`.
3. **Windows Canonical User Location (`%APPDATA%\gravitas`):**  
   Resolves to `C:\Users\<user>\AppData\Roaming\gravitas` on Windows. Sets `isTestOverride: false`.
4. **Cross-Platform Home Directory Fallback (`~/.gravitas`):**  
   Resolves to `$HOME/.gravitas` when `%APPDATA%` is unset. Sets `isTestOverride: false`.

---

### 3. Path Security & Validation

- **Null-Byte Injection Protection:** Any path containing `\0` immediately throws `PathResolutionError`.
- **Normalization:** Paths are resolved to absolute form via `path.resolve()`, stripping trailing/leading whitespace.
- **Spaces & Unicode Support:** Directory paths containing spaces (e.g. `C:\Users\John Doe\AppData\...`) and Unicode characters (e.g. `üñîçødé`) are fully supported across all filesystem operations.
- **Non-Destructive Probe Testing (`testDataRootWritable`):** Writes a temporary UUID probe file `.write-test-<uuid>` and unlinks it to verify filesystem write permissions without polluting the directory or silent fallbacks.
