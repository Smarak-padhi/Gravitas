/**
 * Git ref and identifier safety for @gravitas/git.
 *
 * Enforces strict boundaries on untrusted runId, taskId, and branch ref strings
 * to prevent:
 * - Git flag injection (e.g. arguments starting with `-`)
 * - Path traversal (e.g. `../`)
 * - Malformed Git ref creation (e.g. `~`, `^`, `:`, `?`, `*`, `[`, `..`)
 * - Git check-ref-format violations
 */

import { UnsafeRefError } from './errors.js'
import { executeGit } from './process.js'

/**
 * Characters strictly forbidden in Git ref components.
 */
const FORBIDDEN_CHAR_REGEX = /[\s~^:?*\\\[\]]/

/**
 * Validates that an untrusted identifier (e.g. runId or taskId) is safe for use
 * in Git branch names and file paths.
 *
 * Rules:
 * - Must be non-empty string.
 * - Cannot start with `-` (flag injection defense).
 * - Cannot start or end with `/` or `.`.
 * - Cannot contain `..` (path traversal / Git sequence).
 * - Cannot contain whitespace.
 * - Cannot contain Git special ref characters (~, ^, :, ?, *, [, ], \).
 * - Cannot contain `@` or `@{`.
 * - Cannot end with `.lock`.
 * - Only alphanumeric characters, dashes, underscores, and internal non-consecutive dots allowed.
 */
export function validateIdentifier(input: unknown, fieldName = 'identifier'): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new UnsafeRefError(String(input), `${fieldName} cannot be blank`)
  }

  const trimmed = input.trim()

  if (trimmed.startsWith('-')) {
    throw new UnsafeRefError(trimmed, `${fieldName} cannot start with a hyphen (flag injection defense)`)
  }

  if (trimmed.startsWith('.') || trimmed.endsWith('.')) {
    throw new UnsafeRefError(trimmed, `${fieldName} cannot start or end with a period`)
  }

  if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
    throw new UnsafeRefError(trimmed, `${fieldName} cannot start or end with a slash`)
  }

  if (trimmed.includes('..')) {
    throw new UnsafeRefError(trimmed, `${fieldName} cannot contain consecutive dots ("..")`)
  }

  if (trimmed.includes('//')) {
    throw new UnsafeRefError(trimmed, `${fieldName} cannot contain consecutive slashes ("//")`)
  }

  if (trimmed.endsWith('.lock')) {
    throw new UnsafeRefError(trimmed, `${fieldName} cannot end with ".lock"`)
  }

  if (FORBIDDEN_CHAR_REGEX.test(trimmed)) {
    throw new UnsafeRefError(trimmed, `${fieldName} contains forbidden characters (whitespace, ~, ^, :, ?, *, [, ], or \\)`)
  }

  if (trimmed.includes('@{') || trimmed === '@' || trimmed.toUpperCase() === 'HEAD') {
    throw new UnsafeRefError(trimmed, `${fieldName} cannot be or contain Git reserved tokens ("@", "@{", "HEAD")`)
  }

  // Strict whitelist for identifier components: alphanumeric, hyphen, underscore, single dots
  const validComponentRegex = /^[a-zA-Z0-9_.-]+$/
  if (!validComponentRegex.test(trimmed)) {
    throw new UnsafeRefError(trimmed, `${fieldName} contains invalid characters (only [a-zA-Z0-9_.-] allowed)`)
  }

  return trimmed
}

/**
 * Constructs a safe Git task branch name from runId and taskId.
 * Format: `gravitas/<safe-run-id>/<safe-task-id>`
 */
export function buildTaskBranchName(runId: string, taskId: string): string {
  const safeRunId = validateIdentifier(runId, 'runId')
  const safeTaskId = validateIdentifier(taskId, 'taskId')
  return `gravitas/${safeRunId}/${safeTaskId}`
}

/**
 * Validates a Git branch name using Git's native `git check-ref-format --branch`.
 * This provides an authoritative secondary verification backed by git.exe itself.
 */
export async function assertValidGitBranchRef(branchName: string, cwd = process.cwd()): Promise<void> {
  // First run pure JS validation
  if (branchName.startsWith('-')) {
    throw new UnsafeRefError(branchName, 'Branch name cannot start with a hyphen')
  }

  const result = await executeGit({
    cwd,
    args: ['check-ref-format', '--branch', branchName],
  })

  if (result.exitCode !== 0) {
    throw new UnsafeRefError(
      branchName,
      `Git check-ref-format rejected branch name "${branchName}": ${result.stderr || result.stdout || 'invalid ref format'}`
    )
  }
}
