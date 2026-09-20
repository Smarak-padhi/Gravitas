/**
 * Domain contracts and data types for @gravitas/verifier.
 *
 * Core Principle:
 * AN AGENT CLAIM IS NEVER PROOF OF COMPLETION.
 *
 * Verification commands are strictly owned and executed by Gravitas,
 * entirely shell-free, inside the allocated task worktree.
 */

import type { TaskState } from '@gravitas/core'
import type { MutationCapture } from '@gravitas/harnesses'

export type VerificationStatus = 'PASSED' | 'FAILED'

/**
 * Shell-free deterministic command specification.
 */
export interface VerificationCommand {
  /** Stable unique identifier (e.g. 'node-test-suite'). */
  readonly id: string
  /** Explicit executable binary (e.g. process.execPath or 'node'). */
  readonly executable: string
  /** Explicit argument array passed directly to spawn (shell: false). */
  readonly args: readonly string[]
  /** Optional working directory override. Defaults to task worktree path. */
  readonly cwd?: string | undefined
  /** Command timeout in milliseconds. Defaults to 30,000 ms. */
  readonly timeoutMs?: number | undefined
  /**
   * If true, non-zero exit code or process error causes overall verification to FAIL.
   * If false, failure is recorded but does not fail overall verification.
   */
  readonly mandatory: boolean
}

/**
 * Deterministic plan comprising one or more verification commands.
 */
export interface VerificationPlan {
  readonly id: string
  readonly commands: readonly VerificationCommand[]
  readonly timeoutMs?: number | undefined
}

/**
 * Result of executing a single verification command.
 */
export interface VerificationCommandResult {
  readonly id: string
  readonly executable: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly startedAt: string
  readonly completedAt: string
  readonly durationMs: number
  readonly exitCode: number | null
  readonly terminationReason: string
  readonly mandatory: boolean
  readonly stdout: string
  readonly stderr: string
  readonly stdoutSha256: string
  readonly stderrSha256: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
}

/**
 * Complete result of an independent verification run.
 */
export interface VerificationResult {
  readonly planId: string
  readonly status: VerificationStatus
  readonly startedAt: string
  readonly completedAt: string
  readonly durationMs: number
  readonly commands: readonly VerificationCommandResult[]
  /** Any unexpected repository files created by the verifier itself. */
  readonly verifierGeneratedChanges: readonly string[]
  readonly failureReason?: string | undefined
}

/**
 * Audit-ready manifest documenting complete evidence for a task.
 */
export interface EvidenceManifest {
  readonly schemaVersion: 'gravitas.evidence.v1'
  readonly runId: string
  readonly taskId: string
  readonly goal: string
  readonly repository: {
    readonly path: string
    readonly isClean: boolean
  }
  readonly baseBranch: string
  readonly baseSha: string
  readonly taskBranch: string
  readonly worktreePath: string
  readonly worker: {
    readonly harnessId: string
    readonly executionId: string
    readonly exitCode: number | null
    readonly terminationReason: string
    readonly durationMs: number
    readonly promptSha256: string
    /** Prompt compiler version that produced the compiled prompt. */
    readonly compilerVersion?: string | undefined
    /** Global policy version used in the compiled prompt. */
    readonly globalPolicyVersion?: string | undefined
    /** Role template version used in the compiled prompt. */
    readonly roleTemplateVersion?: string | undefined
  }
  readonly mutation: {
    readonly changedPaths: readonly string[]
    readonly allowedChanges: readonly string[]
    readonly unexpectedChanges: readonly string[]
    readonly headMutated: boolean
    readonly diffSha256: string
  }
  readonly verification: {
    readonly status: VerificationStatus
    readonly startedAt: string
    readonly completedAt: string
    readonly commands: readonly {
      readonly id: string
      readonly executable: string
      readonly args: readonly string[]
      readonly cwd: string
      readonly startedAt: string
      readonly completedAt: string
      readonly durationMs: number
      readonly exitCode: number | null
      readonly terminationReason: string
      readonly mandatory: boolean
      readonly stdoutSha256: string
      readonly stderrSha256: string
      readonly stdoutTruncated: boolean
      readonly stderrTruncated: boolean
    }[]
    readonly verifierGeneratedChanges: readonly string[]
  }
  readonly finalTaskState: TaskState
  readonly artifactHashes: Record<string, string>
  /** Optional route provenance details from deterministic router / gateway. */
  readonly routeProvenance?: Record<string, unknown> | undefined
}

/**
 * Input for writing the external evidence bundle.
 */
export interface EvidenceBundleInput {
  readonly runtimeRoot: string
  readonly runId: string
  readonly taskId: string
  readonly goal: string
  readonly repositoryPath: string
  readonly baseBranch: string
  readonly baseSha: string
  readonly taskBranch: string
  readonly worktreePath: string
  readonly worker: {
    readonly harnessId: string
    readonly executionId: string
    readonly exitCode: number | null
    readonly terminationReason: string
    readonly durationMs: number
    readonly promptSha256: string
    /** Prompt compiler version. Optional for backward compatibility with existing tests. */
    readonly compilerVersion?: string | undefined
    /** Global policy version. Optional for backward compatibility. */
    readonly globalPolicyVersion?: string | undefined
    /** Role template version. Optional for backward compatibility. */
    readonly roleTemplateVersion?: string | undefined
    /**
     * Full compiled prompt text for writing as prompt.txt evidence artifact.
     * Optional: only set when Prompt Manager was used (Wave 7+).
     * Must contain no secrets (API keys, env vars, credentials).
     */
    readonly compiledPromptText?: string | undefined
    readonly rawResult?: unknown
  }
  readonly mutation: MutationCapture
  readonly verification: VerificationResult
  readonly finalTaskState: TaskState
  /** Optional route provenance details from deterministic router / gateway. */
  readonly routeProvenance?: Record<string, unknown> | undefined
}

/**
 * Result of writing the external evidence bundle.
 */
export interface EvidenceBundleResult {
  readonly bundleDir: string
  readonly manifest: EvidenceManifest
  readonly manifestSha256: string
  readonly artifactPaths: Record<string, string>
}
