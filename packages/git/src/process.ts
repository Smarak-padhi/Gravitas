/**
 * Shell-free Git subprocess boundary.
 *
 * Guarantees:
 * - Direct execution via child_process.execFile (shell: false).
 * - Exact argument array passing (no string concatenation, no shell injection).
 * - Sanitization of credentials in URLs across all outputs and errors.
 * - Comprehensive execution telemetry (duration, exit code, stdout, stderr).
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { GitExecutionError } from './errors.js'
import type { GitExecutionOptions, GitExecutionResult } from './types.js'

const execFileAsync = promisify(execFile)

/**
 * Strips basic-auth credentials from URLs in command output.
 * Replaces `https://user:pass@host` with `https://***:***@host`.
 */
export function sanitizeGitOutput(text: string): string {
  return text.replace(/(https?:\/\/)([^@\s/]+)@/g, (_match, protocol, userInfo) => {
    if (userInfo.includes(':')) {
      return `${protocol}***:***@`
    }
    return `${protocol}***@`
  })
}

/**
 * Executes Git directly without shell interpretation.
 * Does not throw on non-zero exit codes; returns the raw execution result.
 */
export async function executeGit(options: GitExecutionOptions): Promise<GitExecutionResult> {
  const executable = 'git'
  const startTime = Date.now()

  try {
    const { stdout, stderr } = await execFileAsync(executable, options.args as string[], {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024, // 20 MB buffer
      timeout: options.timeoutMs ?? 30000,
      env: options.env ? { ...process.env, ...options.env } : process.env,
    })

    const durationMs = Date.now() - startTime
    return {
      executable,
      args: Object.freeze([...options.args]),
      cwd: options.cwd,
      exitCode: 0,
      stdout: sanitizeGitOutput(stdout.toString()),
      stderr: sanitizeGitOutput(stderr.toString()),
      durationMs,
    }
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime
    const err = error as {
      code?: number | string | undefined
      stdout?: string | Buffer | undefined
      stderr?: string | Buffer | undefined
      message?: string | undefined
    }

    const exitCode = typeof err.code === 'number' ? err.code : 1
    const rawStdout = err.stdout ? err.stdout.toString() : ''
    const rawStderr = err.stderr ? err.stderr.toString() : (err.message ?? '')

    return {
      executable,
      args: Object.freeze([...options.args]),
      cwd: options.cwd,
      exitCode,
      stdout: sanitizeGitOutput(rawStdout),
      stderr: sanitizeGitOutput(rawStderr),
      durationMs,
    }
  }
}

/**
 * Executes Git directly without shell interpretation and asserts success.
 * Throws GitExecutionError if the exit code is non-zero.
 */
export async function runGit(options: GitExecutionOptions): Promise<GitExecutionResult> {
  const result = await executeGit(options)
  if (result.exitCode !== 0) {
    throw new GitExecutionError({
      executable: result.executable,
      args: result.args,
      cwd: result.cwd,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    })
  }
  return result
}
