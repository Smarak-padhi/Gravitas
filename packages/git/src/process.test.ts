import { describe, it, expect } from 'vitest'
import { GitExecutionError } from './errors.js'
import { executeGit, runGit, sanitizeGitOutput } from './process.js'

describe('Git Process Boundary', () => {
  describe('Credential sanitization', () => {
    it('redacts username:password in URLs', () => {
      const input = 'remote: https://bot_user:ghp_SuperSecretPassword123@github.com/my-org/repo.git'
      const sanitized = sanitizeGitOutput(input)
      expect(sanitized).toBe('remote: https://***:***@github.com/my-org/repo.git')
      expect(sanitized).not.toContain('ghp_SuperSecretPassword123')
      expect(sanitized).not.toContain('bot_user')
    })

    it('redacts token-only basic auth in URLs', () => {
      const input = 'Fetch URL: https://glpat-SecretToken99@gitlab.com/project.git'
      const sanitized = sanitizeGitOutput(input)
      expect(sanitized).toBe('Fetch URL: https://***@gitlab.com/project.git')
      expect(sanitized).not.toContain('glpat-SecretToken99')
    })

    it('leaves clean URLs unchanged', () => {
      const input = 'https://github.com/Smarak-padhi/Gravitas.git'
      expect(sanitizeGitOutput(input)).toBe(input)
    })
  })

  describe('Direct shell-free execution', () => {
    it('executes git --version successfully and captures telemetry', async () => {
      const result = await executeGit({
        cwd: process.cwd(),
        args: ['--version'],
      })

      expect(result.exitCode).toBe(0)
      expect(result.executable).toBe('git')
      expect(result.args).toEqual(['--version'])
      expect(result.stdout).toContain('git version')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('runGit asserts exit code 0 and throws GitExecutionError on failure', async () => {
      await expect(
        runGit({
          cwd: process.cwd(),
          args: ['rev-parse', '--verify', 'non-existent-commit-hash-abcdef12345'],
        })
      ).rejects.toThrow(GitExecutionError)
    })

    it('treats shell metacharacters as literal arguments (shell: false guarantee)', async () => {
      // In a shell, "; echo injected" would execute echo. With shell: false, git treats it as a ref argument.
      const result = await executeGit({
        cwd: process.cwd(),
        args: ['check-ref-format', '--branch', 'foo; echo injected && rm -rf /'],
      })

      // git check-ref-format rejects the literal string because it contains spaces and semicolons
      expect(result.exitCode).not.toBe(0)
    })
  })
})
