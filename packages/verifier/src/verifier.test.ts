import { describe, expect, it } from 'vitest'
import { executeGit } from '@gravitas/git'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VerificationPolicyError } from './errors.js'
import type { VerificationPlan } from './types.js'
import { executeVerification } from './verifier.js'

describe('Independent Verifier (verifier.ts)', () => {
  let tempRepo: string

  async function createTestWorktree(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'gravitas-verifier-test-'))
    await executeGit({ cwd: dir, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: dir, args: ['config', 'user.name', 'Tester'] })
    await executeGit({ cwd: dir, args: ['config', 'user.email', 'tester@test.local'] })
    // create dummy commit
    await executeGit({ cwd: dir, args: ['commit', '--allow-empty', '-m', 'Initial'] })
    return dir
  }

  it('reports PASSED when all mandatory commands exit 0', async () => {
    tempRepo = await createTestWorktree()
    try {
      const plan: VerificationPlan = {
        id: 'plan-success',
        commands: [
          {
            id: 'cmd-1',
            executable: process.execPath,
            args: ['-e', 'process.exit(0)'],
            mandatory: true,
          },
          {
            id: 'cmd-2',
            executable: process.execPath,
            args: ['-e', 'process.exit(0)'],
            mandatory: true,
          },
        ],
      }

      const result = await executeVerification({ plan, worktreePath: tempRepo })

      expect(result.status).toBe('PASSED')
      expect(result.commands.length).toBe(2)
      expect(result.commands[0]?.exitCode).toBe(0)
      expect(result.commands[1]?.exitCode).toBe(0)
      expect(result.verifierGeneratedChanges).toEqual([])
      expect(result.failureReason).toBeUndefined()
    } finally {
      await rm(tempRepo, { recursive: true, force: true })
    }
  })

  it('reports FAILED when any mandatory command fails, halting further execution', async () => {
    tempRepo = await createTestWorktree()
    try {
      const plan: VerificationPlan = {
        id: 'plan-mandatory-failure',
        commands: [
          {
            id: 'cmd-fail',
            executable: process.execPath,
            args: ['-e', 'process.exit(1)'],
            mandatory: true,
          },
          {
            id: 'cmd-should-not-run',
            executable: process.execPath,
            args: ['-e', 'process.exit(0)'],
            mandatory: true,
          },
        ],
      }

      const result = await executeVerification({ plan, worktreePath: tempRepo })

      expect(result.status).toBe('FAILED')
      expect(result.commands.length).toBe(1)
      expect(result.commands[0]?.exitCode).toBe(1)
      expect(result.failureReason).toContain('cmd-fail')
    } finally {
      await rm(tempRepo, { recursive: true, force: true })
    }
  })

  it('records optional command failure without failing overall verification', async () => {
    tempRepo = await createTestWorktree()
    try {
      const plan: VerificationPlan = {
        id: 'plan-optional-failure',
        commands: [
          {
            id: 'optional-cmd',
            executable: process.execPath,
            args: ['-e', 'process.exit(2)'],
            mandatory: false,
          },
          {
            id: 'mandatory-cmd',
            executable: process.execPath,
            args: ['-e', 'process.exit(0)'],
            mandatory: true,
          },
        ],
      }

      const result = await executeVerification({ plan, worktreePath: tempRepo })

      expect(result.status).toBe('PASSED')
      expect(result.commands.length).toBe(2)
      expect(result.commands[0]?.exitCode).toBe(2)
      expect(result.commands[0]?.mandatory).toBe(false)
      expect(result.commands[1]?.exitCode).toBe(0)
      expect(result.commands[1]?.mandatory).toBe(true)
    } finally {
      await rm(tempRepo, { recursive: true, force: true })
    }
  })

  it('detects verifier-generated mutations in the worktree', async () => {
    tempRepo = await createTestWorktree()
    try {
      const plan: VerificationPlan = {
        id: 'plan-with-mutation',
        commands: [
          {
            id: 'create-temp-artifact',
            executable: process.execPath,
            args: ['-e', 'require("node:fs").writeFileSync("verifier-leak.tmp", "test")'],
            mandatory: true,
          },
        ],
      }

      const result = await executeVerification({ plan, worktreePath: tempRepo })

      expect(result.status).toBe('PASSED')
      expect(result.verifierGeneratedChanges).toContain('verifier-leak.tmp')
    } finally {
      await rm(tempRepo, { recursive: true, force: true })
    }
  })

  it('throws VerificationPolicyError if plan has zero commands', async () => {
    tempRepo = await createTestWorktree()
    try {
      const plan: VerificationPlan = {
        id: 'empty-plan',
        commands: [],
      }

      await expect(
        executeVerification({ plan, worktreePath: tempRepo })
      ).rejects.toThrow(VerificationPolicyError)
    } finally {
      await rm(tempRepo, { recursive: true, force: true })
    }
  })
})
