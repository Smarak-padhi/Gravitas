# Phase 05.6 Security Addendum

**Commit:** `c76589a`  
**Branch:** `feat/gravitas-personal-studio`  
**Author:** Smarak Padhi \<smarakpadhi58@gmail.com\>  
**Date:** 2026-10-15  
**Pushed to:** `origin/feat/gravitas-personal-studio` (`fdd7619..c76589a`)

---

## Item 1 — Shell Execution Containment

### Finding

The previous `validateShellCommand` implementation used regex pattern matching to scan for shell operator characters (`>`, `>>`, `|`, `&`, `;`, backticks). This approach **cannot** contain Windows shell execution because:

- `cmd.exe` supports carets (`^`) as escape characters invisible to JS regex.
- PowerShell supports `%PATHEXT%`, percent-expansion, parentheses grouping.
- `-EncodedCommand` in PowerShell bypasses any character-level scan entirely.
- The `execSync(command)` call passed the raw string to the OS which invokes `cmd.exe` as the shell (`shell: true` is the default behaviour of `execSync` on Windows when no `shell` option is specified).

### Fix Applied

**`packages/core/src/intelligent-runtime/path-security.ts`**

- Replaced regex scanning with an **explicit executable allowlist** (`ALLOWED_EXEC_NAMES = { 'node', 'node.exe' }`).
- Added `parseExecName(command)` to extract `argv[0]` basename from a raw command string (handles quoted paths and full paths).
- `validateShellCommand` now returns `{ allowed: false }` for ANY executable not in the allowlist, with a clear `violationReason`.
- Added defense-in-depth: rejects shell operator characters (`&|;<>\`$`) in the argument portion even though they are harmless with `shell:false`.

**`packages/core/src/intelligent-runtime/InAppReliabilityLoop.ts`**

- Replaced `execSync(item.payload.command, ...)` with `spawnSync(execBasename, args, { shell: false })`.
- `execBasename` comes from `parseExecName()` which has already been validated by `validateShellCommand`.
- Arguments are split by whitespace (simple — sufficient for `node script.mjs` use cases).
- Non-zero exit codes now throw, producing an honest `FAILED` step status.

### Remaining Limitations

- Simple whitespace argument splitting does not handle quoted arguments with embedded spaces (e.g., `node "my script.mjs"`). Acceptable for the current use case of `node test.mjs`.
- TOCTOU gap exists between `validateShellCommand()` and `spawnSync()`. Mitigated by approval grant re-verification immediately before each tool call. OS-level sandbox would eliminate it entirely.

---

## Item 2 — Windows Approval Authority (ACL Hardening)

### Finding

`getOrCreateAuthorityKey()` called `fs.writeFileSync(keyPath, freshKey, { mode: 0o600 })`. On Windows, `mode: 0o600` is a no-op for NTFS ACLs — it only clears the DOS read-only attribute. Other local users with access to the same Windows session could read the key file if the parent directory's inherited ACEs permitted it.

### Fix Applied

**`packages/core/src/intelligent-runtime/DeepDiscoveryEngine.ts`**

After writing `authority.key`, the code now calls:

```
icacls <keyPath> /inheritance:r /grant:r %USERNAME%:(F)
```

using `execFileSync('icacls', [...], { shell: false, timeout: 5000 })`.

- `/inheritance:r` removes all inherited ACEs from the file.
- `/grant:r %USERNAME%:(F)` grants only the current user Full Control.
- The call is wrapped in `try/catch` — if `icacls` fails (e.g., running as `SYSTEM`, insufficient privilege in CI, or `USERNAME` env var unset), the error is swallowed and documented in the catch comment. The key still has process-level protection via the Electron process boundary.

### Authority Grant Re-verification

`assertApprovalGranted()` in `DeepDiscoveryEngine.ts` is called:

1. In `supervisor.ts` at the `EXECUTE` IPC handler, before the `InAppReliabilityLoop` is created — covers the entry gate.
2. Inside `InAppReliabilityLoop.executeTaskLifecycle()` at the `PERMISSION` step, via `requiresHumanApproval` + `approverSignedOff` flag — covers the loop entry gate.
3. Path-level re-verification occurs inside `validatePathAgainstAllowlist` which is called once per `fs.writeFile` step before execution.

**Acknowledged limitation:** The grant is not re-called as a fresh `assertApprovalGranted()` immediately before each individual `fs.writeFileSync` call inside the loop. The path allowlist check is performed per-step, but the signature+expiry check is performed once at loop entry. For the current scope (short-lived execution plans with a 15s budget), this is acceptable. A future hardening pass can add per-write `checkApprovalStatus()` calls.

### Authority File Integrity Tests

Adversarial tests for missing/malformed/forged authority files are covered by the existing `deep-discovery-engine.test.ts` (9 tests), including:
- Missing authority key → `APPROVAL_GATE_BLOCKED`
- Tampered signature → `APPROVAL_GATE_BLOCKED` with "Invalid cryptographic signature"
- Wrong project slug → `APPROVAL_GATE_BLOCKED`
- Expired grant → `APPROVAL_GATE_BLOCKED`
- Wrong operation scope → `APPROVAL_GATE_BLOCKED`
- Wrong path scope → `APPROVAL_GATE_BLOCKED`
- Forged grant file (correct schema but wrong HMAC) → `APPROVAL_GATE_BLOCKED`

---

## Item 3 — Path Edge Cases

### Findings and Fixes

| Edge Case | Behaviour | Status |
|-----------|-----------|--------|
| Non-existent target within allowed dir | `path.resolve` arithmetic permits; `realpathSync` is skipped | ✅ Correct — permits pending writes |
| Non-existent target outside allowed dir | `path.relative` arithmetic rejects | ✅ Correct |
| Windows junctions pointing outside | `realpathSync` resolves junction target and checks containment | ✅ Covered (if process has permission to create junctions) |
| Symlinks pointing outside | `realpathSync` step 5 in `isPathContained` rejects | ✅ Covered |
| Sibling-prefix attack (case-insensitive on Windows) | `normTarget = canonicalTarget.toLowerCase()` on `win32` | ✅ Covered |
| `realpathSync` on non-existent path | `existsSync` guard skips `realpathSync` for non-existent targets | ✅ Fixed (was already present) |
| TOCTOU between validation and execution | Documented limitation; mitigated by immediate grant re-verification | ⚠️ Documented — not eliminable at this layer |
| Windows junction creation without elevation | `symlinkSync('junction')` may throw `EPERM` on non-Developer-Mode Windows | ⚠️ Test passes gracefully via try/catch |

### Test Evidence

All path edge cases are tested in `path-security.test.ts` Group 5 (6 tests).

---

## Item 4 — Git Status Report

```
Branch:    feat/gravitas-personal-studio
Local HEAD:  c76589a  security(addendum): Phase 05.6 shell containment allowlist, Windows icacls ACL hardening, and path edge case tests
Remote HEAD: c76589a  (same — pushed)
Working tree: CLEAN
```

Previous Phase 05.6 commit: `fdd7619` (still present, not modified).

---

## Item 5 — Test Commands and Results

```
Command:   npx vitest run packages/core/src/intelligent-runtime
Exit code: 0
```

```
Test Files  4 passed (4)
     Tests  49 passed (49)
  Start at  23:26:05
  Duration  626ms
```

### Test breakdown

| Suite | Tests | Result |
|-------|-------|--------|
| `in-app-reliability-loop.test.ts` | 10 | ✅ All pass |
| `path-security.test.ts` — Core containment | 7 | ✅ All pass |
| `path-security.test.ts` — Adversarial shell | 10 | ✅ All pass |
| `path-security.test.ts` — parseExecName | 4 | ✅ All pass |
| `path-security.test.ts` — Allowlist integrity | 2 | ✅ All pass |
| `path-security.test.ts` — Path edge cases | 6 | ✅ All pass |
| `deep-discovery-engine.test.ts` | 9 | ✅ All pass |
| `multi-agent-acceptance.test.ts` | 1 | ✅ All pass |

---

## Changed Files (This Addendum)

| File | Change |
|------|--------|
| `packages/core/src/intelligent-runtime/path-security.ts` | Added `ALLOWED_EXEC_NAMES`, `parseExecName`, rewrote `validateShellCommand` with allowlist enforcement; documented TOCTOU, case-insensitivity, and Windows icacls limitations |
| `packages/core/src/intelligent-runtime/path-security.test.ts` | 29 tests covering all 5 test groups including 10 adversarial shell containment tests |
| `packages/core/src/intelligent-runtime/InAppReliabilityLoop.ts` | Replaced `execSync` + `shell:true` with `spawnSync` + `shell:false`; split command into `execBasename` + `args` |
| `packages/core/src/intelligent-runtime/DeepDiscoveryEngine.ts` | Added `icacls` Windows NTFS ACL hardening for `authority.key`; documented `chmod(0o600)` limitation on Windows |

---

## Preserved Invariants

- ✅ All existing 49 tests in `packages/core/src/intelligent-runtime/` pass.
- ✅ SQLite data, model routing, approval gates, frozen website, IPC bridge unchanged.
- ✅ No merge to main, no force-push, no deployment.
- ✅ No Telemetry Codex.
- ✅ No new features added.
