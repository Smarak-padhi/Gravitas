# Phase 05.6 Security Addendum & Final Security Closure

**Branch:** `feat/gravitas-personal-studio`  
**Author:** Smarak Padhi \<smarakpadhi58@gmail.com\>  
**Status:** Completed and Verified (Gate 05.6 Final Security Closure)

---

## 1. Restrict Node Execution Capabilities

### Security Rationale & Threat Model

The executable allowlist `{node, node.exe}` is insufficient by itself because Node can execute arbitrary JavaScript without a shell when passed evaluation or code-loading flags. To prevent arbitrary code injection and capability escape:

1. **Option Flag Rejection:** `validateShellCommand` tokenizes the command line respecting quoted arguments and rejects any code-loading or inline evaluation options:
   - `-e`, `--eval`, `-p`, `--print`
   - `-r`, `--require`, `--import`, `--loader`, `--experimental-loader`
   - `-i`, `--interactive`, `--entry-url`, `--inspect`, `--inspect-brk`, `--prof`, `--expose-internals`, `--conditions`, `-C`
   - Flags with value syntax (`--eval=...`, `--require=...`, etc.)

2. **Script Path Resolution & Containment:**
   - Interactive REPL or flag-only commands without a script path are rejected.
   - The script path must be explicitly provided and resolves against the authorized working directory (`authorizedCwd`).
   - The resolved script path is checked via `validatePathAgainstAllowlist(resolvedScript, allowedPaths)` to ensure it resides strictly within the authorized workspace.
   - Only standard script extensions (`.js`, `.mjs`, `.cjs`, `.ts`) are permitted; arbitrary executables or script types are rejected.

3. **Shell Independence:**
   - All tool executions (`command.exec`) use `spawnSync(execBasename, args, { shell: false })`. No OS shell (`cmd.exe` or `powershell.exe`) is ever spawned.
   - Shell-character rejection is retained purely as defense-in-depth, not as the primary containment barrier.

### Documented Limitation & Threat Boundary

> [!WARNING]
> **No OS-Level Process Sandbox Claim:**
> An approved script (e.g. `test.mjs`) executes in the host Node runtime without OS-level process sandboxing. Even with an allowlisted script path, resolved workspace containment, and restricted flags, Node scripts can execute arbitrary filesystem, network, or child process operations using Node's standard libraries (`node:fs`, `node:net`, `node:child_process`) once invoked. This layer enforces executable, flag, and script path containment, NOT OS-level kernel sandboxing (e.g. AppContainer, seccomp, or Docker).

---

## 2. Fail Closed on Authority Protection Errors

### Implementation & Verification

`DeepDiscoveryEngine.ts` implements `verifyAndEnforceKeyProtection(keyPath: string)` with fail-closed semantics:

1. **Windows NTFS ACL Enforcement:**
   - Calls `icacls <keyPath> /inheritance:r /grant:r %USERNAME%:(F)` via `execFileSync` (`shell: false`).
   - Strips all inherited permissions (`/inheritance:r`) so permissions from parent directories are not inherited.
   - Grants exclusively Full Control to the active Windows user identity (`%USERNAME%`).

2. **Verification of Protection Result:**
   - Calls `icacls <keyPath>` to inspect the resulting Access Control List (ACL).
   - Verifies the exit code is 0 and output confirms `Successfully processed 1 files; Failed processing 0 files`.
   - Verifies that inheritance is absent (no `(I)` flags in ACL output).
   - Verifies that `%USERNAME%` is the granted identity.
   - If verification fails or any exception occurs, throws `AuthorityProtectionError`.

3. **Fail-Closed Execution & Grant Issuance:**
   - `recordApproval`: If `AuthorityProtectionError` is thrown, grant issuance is aborted immediately. No unverified grant is ever written to disk or recorded in the registry.
   - `checkApprovalStatus`: Catches authority protection errors and returns `{ approved: false, violationReason: 'Authority protection failure: ... Execution disabled.' }`.
   - `assertApprovalGranted`: Throws `ApprovalGateBlockedError`, completely blocking any approval-backed execution.

4. **POSIX File Mode Enforcement:**
   - On non-Windows platforms, enforces `0o600` (read/write by owner only; 0 access for group and others). If permissions cannot be restricted, throws `AuthorityProtectionError`.

### Documented Process Trust Boundary

> [!NOTE]
> **Same-User Process Trust Boundary:**
> NTFS ACLs protect `.gravitas/secure/authority.key` from other Windows user accounts on the machine. However, processes running under the SAME Windows user identity have identical OS access rights and can read or modify the key file. The approval authority trust boundary protects against unauthorized accounts and cross-user tampering, but NOT against unisolated hostile code executing within the same user session.

---

## 3. Revalidate Authorization at the Mutation Boundary

### Continuous Verification Invariant

In `InAppReliabilityLoop.ts`, every mutating capability step (`fs.writeFile`, `fs.appendFile`, `command.exec`, or any step specifying a `targetPath`):

1. **Pre-Mutation Check:** Immediately before executing the mutation, the loop re-validates:
   - Cryptographic grant signature against the application authority key.
   - Specification revision hash against current `PROJECT.md + ARCHITECTURE.md + PLAN.md`.
   - Grant expiration timestamp.
   - Permitted operation (`EXECUTE_PLAN`).
   - Permitted path scope (`allowedPaths`).
   - Permitted tool scope (`allowedTools`).

2. **Mid-Execution Revocation Handling:**
   - If the grant is revoked, deleted, or expired mid-execution, the step is immediately marked `FAILED` with `MUTATION_BOUNDARY_BLOCKED`.
   - The execution loop halts further mutations.
   - Pre-execution snapshots are restored via real rollback, undoing any prior mutations in that execution run.
   - Final task receipt status is marked `FAILED`.

3. **Mid-Execution Specification Mutation Handling:**
   - If any specification artifact (`PLAN.md`, `PROJECT.md`, `ARCHITECTURE.md`) is modified while a multi-step task is executing, the revision hash recalculation fails the check at the next mutation boundary.
   - Step is blocked, prior changes rolled back, and task receipt records `FAILED`.

### Regression Tests Added

In `in-app-reliability-loop.test.ts`:
- `revalidates grant before each mutating step and halts + rolls back on mid-execution revocation` — verified step 1 executed, step 2 blocked at mutation boundary, step 1 rolled back, receipt `FAILED`.
- `blocks step and rolls back if specification is mutated mid-execution (revision hash mismatch)` — verified `PLAN.md` post-approval injection halts execution and restores snapshot.
- `blocks step via custom revalidateAuthorization hook` — verified custom hook rejection halts mutation and rolls back.

---

## 4. Verification Evidence & Test Results

### 1. Monorepo TypeScript Typecheck

```
Command: npm run typecheck
Exit Code: 0
```
All packages compile cleanly with zero diagnostics under `exactOptionalPropertyTypes: true` and `noUncheckedIndexedAccess: true`:
- `@gravitas/agents`
- `@gravitas/browser-qa`
- `@gravitas/core`
- `@gravitas/gateways`
- `@gravitas/git`
- `@gravitas/harnesses`
- `@gravitas/orchestrator`
- `@gravitas/prompts`
- `@gravitas/verifier`
- `@gravitas/desktop`
- `@gravitas/server`
- `@gravitas/web`

### 2. Intelligent Runtime Vitest Test Suite

```
Command: npx vitest run packages/core/src/intelligent-runtime
Exit Code: 0
```

```
Test Files  4 passed (4)
     Tests  61 passed (61)
  Duration  1.09s
```

| Test File | Tests | Status |
|-----------|-------|--------|
| `path-security.test.ts` | 37 tests | ✅ All passed |
| `in-app-reliability-loop.test.ts` | 13 tests | ✅ All passed |
| `deep-discovery-engine.test.ts` | 10 tests | ✅ All passed |
| `multi-agent-acceptance.test.ts` | 1 test | ✅ All passed |

### 3. Playwright E2E Electron & Living Studio Verification

```
Command: node scripts/verify-phase-05-6.mjs
Exit Code: 0
```

All 6 acceptance steps passed cleanly:
- Step 1: Mocked inference IPC regression test (`01-mocked-inference-regression.png`)
- Step 1b: Offline honest unfamiliar notice (`01b-offline-honest-unfamiliar-notice.png`)
- Step 2: Deep Discovery 3-round interview flow (`02-discovery-round-1.png`, `02b-discovery-round-2.png`, `02c-discovery-round-3-engineering.png`)
- Step 3: Specification compilation & Review Card (`03-specification-review-panel.png`)
- Step 4: Approval gate blocking pre-approval execution (`04-approval-gate-blocked.png`)
- Step 5: Cryptographic grant issuance (`05-approval-grant-signed.png`)
- Step 6: Verified execution & task inspector receipt (`06-verified-execution-task-inspector.png`)
- Walkthrough video: `docs/gravitas2-evidence/videos/phase-05-6-verification.webm`

---

## 5. Invariants Preserved

- Frozen website untouched.
- SQLite persistence intact.
- No merge to `main`, no force-push, no deployment.
- No Telemetry Codex redesign started.
- All work strictly confined to `feat/gravitas-personal-studio`.
