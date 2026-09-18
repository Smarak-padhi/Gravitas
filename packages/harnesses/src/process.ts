/**
 * Safe AI subprocess execution boundary for @gravitas/harnesses.
 *
 * Guarantees:
 * - Direct shell-free execution via child_process.spawn (shell: false).
 * - Stdin streaming for prompts (no CLI string length limits or shell expansion).
 * - Strict output bounding with explicit truncation telemetry.
 * - Credential scrubbing on all streams.
 * - Gravitas-owned timeout and external cancellation.
 * - Windows process-tree cleanup via taskkill /T /F to prevent orphan processes.
 */

import { spawn } from 'node:child_process'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { TerminationReason } from './types.js'

const execFileAsync = promisify(execFile)

/** Default maximum captured output per stream: 2 MB */
export const DEFAULT_MAX_OUTPUT_BYTES = 2 * 1024 * 1024

/**
 * Strips basic-auth credentials from URLs.
 */
export function sanitizeOutput(text: string): string {
  return text.replace(/(https?:\/\/)([^@\s/]+)@/g, (_match, protocol, userInfo) => {
    if (userInfo.includes(':')) {
      return `${protocol}***:***@`
    }
    return `${protocol}***@`
  })
}

/**
 * Terminates a process and all its child descendants cleanly.
 * On Windows, uses taskkill /pid <PID> /T /F to kill the entire tree.
 */
export async function killProcessTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    try {
      await execFileAsync('taskkill', ['/pid', String(pid), '/T', '/F'], {
        windowsHide: true,
      })
    } catch {
      // Process may already have exited
    }
  } else {
    try {
      // Try killing the process group
      process.kill(-pid, 'SIGKILL')
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // Already exited
      }
    }
  }
}

export interface SubprocessLaunchOptions {
  readonly executable: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly stdinInput?: string | undefined
  readonly timeoutMs?: number | undefined
  readonly maxOutputBytes?: number | undefined
  readonly env?: Readonly<Record<string, string | undefined>> | undefined
}

export interface SubprocessHandle {
  readonly pid?: number | undefined
  kill(reason?: TerminationReason): Promise<void>
}

export interface SubprocessRunResult {
  readonly exitCode: number | null
  readonly stdout: string
  readonly stderr: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
  readonly durationMs: number
  readonly terminationReason: TerminationReason
  readonly pid?: number | undefined
}

/**
 * Executes an external worker subprocess with timeout, cancellation, and output bounding.
 */
export async function runSubprocess(
  options: SubprocessLaunchOptions,
  onLaunch?: ((handle: SubprocessHandle) => void) | undefined,
  abortSignal?: AbortSignal | undefined
): Promise<SubprocessRunResult> {
  const maxBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  const timeoutMs = options.timeoutMs ?? 60000
  const startTime = Date.now()

  let stdoutBuffer = ''
  let stderrBuffer = ''
  let stdoutTruncated = false
  let stderrTruncated = false
  let stdoutBytes = 0
  let stderrBytes = 0

  let terminationReason: TerminationReason = 'COMPLETED'
  let timerId: ReturnType<typeof setTimeout> | undefined
  let isTerminated = false

  return new Promise<SubprocessRunResult>((resolve) => {
    const child = spawn(options.executable, options.args as string[], {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: options.env ? { ...process.env, ...options.env } : process.env,
    })

    const pid = child.pid

    const terminate = async (reason: TerminationReason) => {
      if (isTerminated) return
      isTerminated = true
      terminationReason = reason

      if (timerId) {
        clearTimeout(timerId)
        timerId = undefined
      }

      if (pid) {
        await killProcessTree(pid)
      } else {
        child.kill('SIGKILL')
      }
    }

    // Register handle
    if (onLaunch) {
      onLaunch({
        pid,
        kill: (reason = 'CANCELLED') => terminate(reason),
      })
    }

    // Set timeout
    if (timeoutMs > 0) {
      timerId = setTimeout(() => {
        void terminate('TIMEOUT')
      }, timeoutMs)
    }

    // Wire external abort signal
    if (abortSignal) {
      abortSignal.addEventListener(
        'abort',
        () => {
          void terminate('CANCELLED')
        },
        { once: true }
      )
    }

    // Stream stdin if provided
    if (options.stdinInput !== undefined) {
      child.stdin.write(options.stdinInput, 'utf8', () => {
        child.stdin.end()
      })
    } else {
      child.stdin.end()
    }

    // Stream stdout with bounding
    child.stdout.on('data', (chunk: Buffer) => {
      if (stdoutBytes < maxBytes) {
        const remaining = maxBytes - stdoutBytes
        const toAppend = chunk.subarray(0, remaining)
        stdoutBuffer += toAppend.toString('utf8')
        stdoutBytes += toAppend.length
        if (chunk.length > remaining) {
          stdoutTruncated = true
        }
      } else {
        stdoutTruncated = true
      }
    })

    // Stream stderr with bounding
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrBytes < maxBytes) {
        const remaining = maxBytes - stderrBytes
        const toAppend = chunk.subarray(0, remaining)
        stderrBuffer += toAppend.toString('utf8')
        stderrBytes += toAppend.length
        if (chunk.length > remaining) {
          stderrTruncated = true
        }
      } else {
        stderrTruncated = true
      }
    })

    child.on('error', (err) => {
      if (!isTerminated) {
        stderrBuffer += `\nProcess error: ${err.message}`
        void terminate('PROCESS_ERROR')
      }
    })

    child.on('close', (exitCode) => {
      if (timerId) {
        clearTimeout(timerId)
        timerId = undefined
      }

      const durationMs = Date.now() - startTime
      resolve({
        exitCode,
        stdout: sanitizeOutput(stdoutBuffer),
        stderr: sanitizeOutput(stderrBuffer),
        stdoutTruncated,
        stderrTruncated,
        durationMs,
        terminationReason,
        ...(pid !== undefined ? { pid } : {}),
      })
    })
  })
}
