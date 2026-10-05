# GRAVITAS K1 — EXECUTION REQUEST AND RESULT SPECIFICATION

**Wave**: K1 — Recursive Harness Adapter & Execution-Surface Qualification Loop  
**Date**: 2026-10-02  
**Status**: APPROVED_SPECIFICATION  

---

## 1. Execution Request Specification (`ExecutionRequest`)

```typescript
export interface ExecutionRequest {
  readonly executionId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly executorId: string
  readonly roleId: string
  readonly harnessId: string
  readonly workingDirectory: string
  readonly input: string
  readonly timeoutPolicy: TimeoutPolicy
  readonly credentialReference?: CredentialReference | undefined
  readonly environmentOverrides?: Readonly<Record<string, string>> | undefined
  readonly requestedCapabilities?: Partial<HarnessCapabilities> | undefined
  readonly requiredCostEligibility?: CostEligibility | undefined
  readonly correlationId?: string | undefined
  readonly durableJobId?: string | undefined
  readonly outputMode?: 'STRUCTURED' | 'TEXT' | 'STREAMING' | undefined
  readonly maxOutputBytes?: number | undefined
}
```

### Invariant Controls
1. **Directory Containment**: `workingDirectory` MUST be an absolute path and must exist. Relative paths or unverified paths trigger `WORKING_DIRECTORY_INVALID` fail-closed.
2. **Credential Cleanliness**: `credentialReference` MUST only carry an opaque ID (`referenceId`). Raw strings containing API keys, Bearer tokens, or secret keys are forbidden.
3. **Environment Scrubbing**: Environment variables are checked against regex patterns for known cloud providers. Matches are stripped before child process invocation.

---

## 2. Execution Result Specification (`ExecutionResult`)

```typescript
export interface ExecutionResult {
  readonly executionId: string
  readonly harnessId: string
  readonly harnessKind: HarnessKind
  readonly success: boolean
  readonly terminationReason: ExecutionTerminationReason
  readonly startedAt: string
  readonly finishedAt: string
  readonly durationMs: number
  readonly stdout: string
  readonly stderr: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
  readonly structuredOutput?: Record<string, unknown> | null | undefined
  readonly structuredOutputValid?: boolean | undefined
  readonly exitCode?: number | null | undefined
  readonly pid?: number | undefined
  readonly signal?: string | null | undefined
  readonly modelId?: string | undefined
  readonly providerId?: string | undefined
  readonly inputTokens?: number | undefined
  readonly outputTokens?: number | undefined
  readonly finishReason?: string | undefined
  readonly costObservation?: CostObservation | undefined
  readonly provenance: ExecutionProvenance
}
```

---

## 3. Cryptographic Provenance Model (`ExecutionProvenance`)

Every execution output binds:
- `executionId` & `durableJobId`
- `harnessId`, `harnessKind`, `harnessVersion`
- `startedAt`, `finishedAt`
- `costEligibilityAtDispatch`
- `workingDirectory`
- `resultDigest`: `SHA-256(executionId + harnessId + success + exitCode + SHA256(stdout) + SHA256(stderr) + timing)`
