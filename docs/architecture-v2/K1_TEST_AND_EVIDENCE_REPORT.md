# GRAVITAS K1 — TEST AND EVIDENCE REPORT (HARDENED RECONCILIATION)

**Wave**: K1 — Recursive Harness Adapter & Execution-Surface Qualification Loop  
**Date**: 2026-10-02  
**Status**: 100% PASS (159 Total Unique Tests Across Workspaces)  

---

## 1. Test Count Accounting Reconciliation

The previous preliminary report summed disparate subsets incorrectly. The authoritative, exact accounting across repository test suites is:

```text
K0_TESTS_UNIQUE              = 51  (via npm run test:kernel)
LEGACY_HARNESS_TESTS_UNIQUE  = 60  (codex: 28, fcc: 12, claude: 7, process: 8, mutation: 5)
K1_TESTS_UNIQUE              = 48  (k1.test.ts: Parts 1 to 8)
OVERLAPPING_TESTS            =  0  (Suites are completely disjoint)
TOTAL_HARNESS_PACKAGE_TESTS  = 108 (via npm run test:harnesses)
TOTAL_UNIQUE_TESTS           = 159 (51 K0 kernel + 108 Harness package)
FAILED                       =  0
SKIPPED                      =  0
```

### Native Command Verification Records

#### A. K0 Kernel Suite (`npm run test:kernel`)
- **Command**: `node --experimental-strip-types --loader ./packages/core/scripts/test-loader.mjs --test packages/core/src/kernel/__tests__/kernel.test.ts`
- **Result**: `pass 51, fail 0, cancelled 0, skipped 0, todo 0`
- **Duration**: `4.3s`

#### B. Full Harness Package Suite (`npm run test:harnesses`)
- **Command**: `vitest run packages/harnesses`
- **Native Vitest Summary**:
  ```text
  Test Files  6 passed (6)
  Tests       108 passed (108)
  Duration    8.58s
  ```
- **File Breakdown**:
  - `packages/harnesses/src/codex.test.ts`: 28 tests (PASS)
  - `packages/harnesses/src/free-claude-code.test.ts`: 12 tests (PASS)
  - `packages/harnesses/src/claude-code.test.ts`: 7 tests (PASS)
  - `packages/harnesses/src/k1/k1.test.ts`: 48 tests (PASS)
  - `packages/harnesses/src/process.test.ts`: 8 tests (PASS)
  - `packages/harnesses/src/mutation.test.ts`: 5 tests (PASS)

---

## 2. Containment and Security Boundary Verification

1. **Process Tree Termination != Sandbox**:
   - `taskkill /pid <PID> /T /F` cleanly terminates process trees on Windows to prevent orphan background processes.
   - It does **NOT** provide OS filesystem, memory, or network sandboxing.
2. **Git Containment in Codex**:
   - Implemented via a temporary PATH shim (`git.cmd` returning exit code 128) and `.git` folder quarantine.
   - This intercepts direct `git` invocations from workers. It is not an OS restricted token.
3. **Claude Code Tool Whitelist**:
   - Implemented via `--tools Edit,Read`. This is a CLI / model-level constraint. The spawned process retains normal user permissions.
4. **Free Claude Code MCP Config**:
   - Uses an ephemeral empty `mcpServers: {}` config. Prevents MCP tool exposure; does not sandbox host OS privileges.
5. **Adversarial Input Hardening**:
   - Tested 8 dedicated attack vectors (quotes, shell metacharacters, leading dashes, path traversals, env injection, oversized stdout/stderr, malformed JSON). All handled safely without shell interpolation.
