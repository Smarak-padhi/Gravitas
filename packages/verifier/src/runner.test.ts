import { describe, expect, it } from 'vitest'
import { runVerificationCommand } from './runner.js'
import type { VerificationCommand } from './types.js'

describe('Verification Command Runner (runner.ts)', () => {
  it('executes a successful command shell-free and computes stdout/stderr SHA-256', async () => {
    const command: VerificationCommand = {
      id: 'test-success',
      executable: process.execPath,
      args: ['-e', 'console.log("HELLO VERIFIER"); process.stderr.write("LOG ERR");'],
      mandatory: true,
    }

    const result = await runVerificationCommand(command, process.cwd())

    expect(result.id).toBe('test-success')
    expect(result.exitCode).toBe(0)
    expect(result.terminationReason).toBe('COMPLETED')
    expect(result.stdout.trim()).toBe('HELLO VERIFIER')
    expect(result.stderr.trim()).toBe('LOG ERR')
    expect(result.stdoutSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(result.stderrSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(result.durationMs).toBeGreaterThan(0)
    expect(result.stdoutTruncated).toBe(false)
    expect(result.stderrTruncated).toBe(false)
  })

  it('captures non-zero exit codes accurately without throwing', async () => {
    const command: VerificationCommand = {
      id: 'test-failure',
      executable: process.execPath,
      args: ['-e', 'console.error("ASSERTION FAILED"); process.exit(42);'],
      mandatory: true,
    }

    const result = await runVerificationCommand(command, process.cwd())

    expect(result.id).toBe('test-failure')
    expect(result.exitCode).toBe(42)
    expect(result.terminationReason).toBe('COMPLETED')
    expect(result.stderr).toContain('ASSERTION FAILED')
  })

  it('handles command timeout and sets TIMEOUT terminationReason', async () => {
    const command: VerificationCommand = {
      id: 'test-timeout',
      executable: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000);'],
      timeoutMs: 400,
      mandatory: true,
    }

    const result = await runVerificationCommand(command, process.cwd())

    expect(result.id).toBe('test-timeout')
    expect(result.terminationReason).toBe('TIMEOUT')
    expect(result.exitCode).not.toBe(0)
  })

  it('handles missing executable binary gracefully', async () => {
    const command: VerificationCommand = {
      id: 'test-missing-exe',
      executable: 'C:\\__definitely_non_existent_verifier_binary_99999__.exe',
      args: [],
      mandatory: true,
    }

    const result = await runVerificationCommand(command, process.cwd())

    expect(result.id).toBe('test-missing-exe')
    expect(result.terminationReason).toBe('PROCESS_ERROR')
    expect(result.exitCode).not.toBe(0)
  })

  it('sanitizes credentials from command stdout and stderr streams', async () => {
    const command: VerificationCommand = {
      id: 'test-sanitization',
      executable: process.execPath,
      args: [
        '-e',
        'console.log("fetching https://myuser:secret123@api.internal/data"); console.error("token secret https://admin:password@host/err");',
      ],
      mandatory: true,
    }

    const result = await runVerificationCommand(command, process.cwd())

    expect(result.stdout).not.toContain('secret123')
    expect(result.stdout).toContain('https://***:***@api.internal/data')
    expect(result.stderr).not.toContain('password')
    expect(result.stderr).toContain('https://***:***@host/err')
  })
})
