/**
 * Shell-free deterministic command runner for @gravitas/verifier.
 *
 * Guarantees:
 * - Direct execution via spawn (shell: false).
 * - Sanitized stdout and stderr with cryptographically recorded SHA-256 hashes.
 * - Bounded output capture to prevent memory exhaustion.
 * - Strict timeout enforcement.
 */

import { createHash } from 'node:crypto'
import { runSubprocess } from '@gravitas/harnesses'
import type { VerificationCommand, VerificationCommandResult } from './types.js'

export async function runVerificationCommand(
  command: VerificationCommand,
  defaultCwd: string
): Promise<VerificationCommandResult> {
  const startedAt = new Date().toISOString()
  const cwd = command.cwd ?? defaultCwd

  const subResult = await runSubprocess({
    executable: command.executable,
    args: command.args,
    cwd,
    timeoutMs: command.timeoutMs ?? 30000,
  })

  const completedAt = new Date().toISOString()

  const stdoutSha256 = createHash('sha256')
    .update(Buffer.from(subResult.stdout, 'utf8'))
    .digest('hex')
  const stderrSha256 = createHash('sha256')
    .update(Buffer.from(subResult.stderr, 'utf8'))
    .digest('hex')

  return {
    id: command.id,
    executable: command.executable,
    args: command.args,
    cwd,
    startedAt,
    completedAt,
    durationMs: subResult.durationMs,
    exitCode: subResult.exitCode,
    terminationReason: subResult.terminationReason,
    mandatory: command.mandatory,
    stdout: subResult.stdout,
    stderr: subResult.stderr,
    stdoutSha256,
    stderrSha256,
    stdoutTruncated: subResult.stdoutTruncated,
    stderrTruncated: subResult.stderrTruncated,
  }
}
