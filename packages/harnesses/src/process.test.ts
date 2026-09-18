import { describe, expect, it } from 'vitest'
import {
  killProcessTree,
  runSubprocess,
  sanitizeOutput,
  type SubprocessHandle,
} from './process.js'

describe('Subprocess Boundary (process.ts)', () => {
  it('executes a benign subprocess and captures stdout/stderr separately', async () => {
    const result = await runSubprocess({
      executable: process.execPath,
      args: ['-e', 'console.log("hello stdout"); console.error("hello stderr");'],
      cwd: process.cwd(),
      timeoutMs: 5000,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('hello stdout')
    expect(result.stderr.trim()).toBe('hello stderr')
    expect(result.stdoutTruncated).toBe(false)
    expect(result.stderrTruncated).toBe(false)
    expect(result.terminationReason).toBe('COMPLETED')
  })

  it('streams stdin input reliably into the subprocess', async () => {
    const script = `
      let input = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => { input += chunk; });
      process.stdin.on('end', () => { console.log('RECEIVED:' + input); });
    `
    const payload = 'Gravitas Prompt Stream \u2014 Section 1\nLine 2\nLine 3'

    const result = await runSubprocess({
      executable: process.execPath,
      args: ['-e', script],
      cwd: process.cwd(),
      stdinInput: payload,
      timeoutMs: 5000,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe(`RECEIVED:${payload}`)
    expect(result.terminationReason).toBe('COMPLETED')
  })

  it('terminates a hanging process on timeout and sets TIMEOUT terminationReason', async () => {
    const script = `
      // Never ends voluntarily
      setInterval(() => {}, 1000);
    `
    const startTime = Date.now()
    const result = await runSubprocess({
      executable: process.execPath,
      args: ['-e', script],
      cwd: process.cwd(),
      timeoutMs: 1200,
    })

    const duration = Date.now() - startTime
    expect(duration).toBeGreaterThanOrEqual(1000)
    expect(duration).toBeLessThan(10000)
    expect(result.terminationReason).toBe('TIMEOUT')
  })

  it('terminates an active process on cancellation via SubprocessHandle', async () => {
    let handleRef: SubprocessHandle | undefined

    const promise = runSubprocess(
      {
        executable: process.execPath,
        args: ['-e', 'setInterval(() => {}, 1000);'],
        cwd: process.cwd(),
        timeoutMs: 10000,
      },
      (handle) => {
        handleRef = handle
      }
    )

    // Allow process to start, then kill
    await new Promise((r) => setTimeout(r, 400))
    expect(handleRef).toBeDefined()
    await handleRef?.kill('CANCELLED')

    const result = await promise
    expect(result.terminationReason).toBe('CANCELLED')
  })

  it('terminates an active process on AbortSignal trigger', async () => {
    const controller = new AbortController()

    const promise = runSubprocess(
      {
        executable: process.execPath,
        args: ['-e', 'setInterval(() => {}, 1000);'],
        cwd: process.cwd(),
        timeoutMs: 10000,
      },
      undefined,
      controller.signal
    )

    // Trigger abort after brief delay
    setTimeout(() => {
      controller.abort()
    }, 400)

    const result = await promise
    expect(result.terminationReason).toBe('CANCELLED')
  })

  it('bounds captured output when subprocess exceeds maxOutputBytes', async () => {
    // Generates 10000 bytes
    const script = `
      process.stdout.write("A".repeat(10000));
    `

    const result = await runSubprocess({
      executable: process.execPath,
      args: ['-e', script],
      cwd: process.cwd(),
      maxOutputBytes: 1024, // Limit to 1 KB
      timeoutMs: 5000,
    })

    expect(result.stdout.length).toBe(1024)
    expect(result.stdoutTruncated).toBe(true)
    expect(result.terminationReason).toBe('COMPLETED')
  })

  it('sanitizes credentials in output strings', () => {
    const raw = 'Cloning into https://user:secret-token-123@github.com/org/repo.git ...'
    const sanitized = sanitizeOutput(raw)
    expect(sanitized).toBe('Cloning into https://***:***@github.com/org/repo.git ...')

    const rawNoUser = 'Connecting to https://token456@github.com/test ...'
    expect(sanitizeOutput(rawNoUser)).toBe('Connecting to https://***@github.com/test ...')
  })

  it('killProcessTree completes safely for already exited or non-existent PID', async () => {
    // Non-existent large PID should not throw an unhandled rejection
    await expect(killProcessTree(99999999)).resolves.not.toThrow()
  })
})
