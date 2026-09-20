/**
 * Test utilities and deterministic test harness for @gravitas/orchestrator.
 * Zero real AI calls. 100% deterministic local testing.
 */

import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runGit } from '@gravitas/git'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
} from '@gravitas/harnesses'

export interface TestRepo {
  readonly dir: string
  readonly baseSha: string
  readonly defaultBranch: string
  readonly cleanup: () => Promise<void>
}

/**
 * Creates a disposable git repository for tests.
 */
export async function createTestRepo(prefix = 'gravitas-orch-test-'): Promise<TestRepo> {
  const targetDir = await mkdtemp(join(tmpdir(), prefix))

  // git init -b main
  await runGit({ cwd: targetDir, args: ['init', '-b', 'main'] })
  await runGit({ cwd: targetDir, args: ['config', 'user.name', 'Gravitas Tester'] })
  await runGit({ cwd: targetDir, args: ['config', 'user.email', 'tester@gravitas.local'] })
  await runGit({ cwd: targetDir, args: ['config', 'commit.gpgsign', 'false'] })
  await runGit({ cwd: targetDir, args: ['config', 'core.autocrlf', 'false'] })

  // Initial file
  await writeFile(join(targetDir, 'shared.txt'), 'line 1: base content\nline 2: base line\n', 'utf8')
  await writeFile(join(targetDir, 'feature.txt'), 'feature base\n', 'utf8')

  await runGit({ cwd: targetDir, args: ['add', '.'] })
  await runGit({ cwd: targetDir, args: ['commit', '-m', 'initial baseline commit'] })

  const headResult = await runGit({ cwd: targetDir, args: ['rev-parse', 'HEAD'] })
  const baseSha = headResult.stdout.trim()

  const cleanup = async () => {
    try {
      await rm(targetDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch {
      // Best-effort cleanup
    }
  }

  return { dir: targetDir, baseSha, defaultBranch: 'main', cleanup }
}

export interface FakeHarnessOptions {
  readonly id?: string
  /**
   * Optional file operations to perform in worktree on execution.
   */
  readonly onExecute?: (req: AgentExecutionRequest) => Promise<void> | void
  readonly delayMs?: number
  readonly exitCode?: number
}

/**
 * Deterministic fake agent harness for unit tests.
 */
export function createDeterministicHarness(options?: FakeHarnessOptions): AgentHarness {
  return {
    id: options?.id ?? 'deterministic-test-harness',
    async availability(): Promise<HarnessAvailability> {
      return { status: 'AVAILABLE', installed: true, usableNoninteractive: true }
    },
    async execute(req: AgentExecutionRequest): Promise<AgentExecutionResult> {
      const startTime = Date.now()
      const startedAt = new Date(startTime).toISOString()

      if (options?.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs))
      }

      if (options?.onExecute) {
        await options.onExecute(req)
      }

      const finishedAt = new Date().toISOString()
      return {
        executionId: req.executionId,
        harnessId: options?.id ?? 'deterministic-test-harness',
        startedAt,
        finishedAt,
        durationMs: Date.now() - startTime,
        exitCode: options?.exitCode ?? 0,
        terminationReason: (options?.exitCode ?? 0) === 0 ? 'COMPLETED' : 'PROCESS_ERROR',
        stdout: 'Deterministic worker execution completed',
        stderr: '',
        stdoutTruncated: false,
        stderrTruncated: false,
        worktreePath: req.worktreePath,
      }
    },
    async cancel(_executionId: string): Promise<boolean> {
      return true
    },
  }
}
