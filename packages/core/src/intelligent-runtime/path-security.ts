/**
 * Gravitas — Canonical Path Security & Bounded Tool Capability Enforcement
 *
 * Provides bulletproof filesystem containment, sibling-prefix rejection,
 * parent-path traversal prevention, symlink resolution security,
 * and command redirection auditing.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export interface PathValidationResult {
  readonly allowed: boolean
  readonly canonicalTarget?: string
  readonly matchedAllowedRule?: string
  readonly violationReason?: string
}

/**
 * Validates whether targetPath is strictly contained within allowedRootOrFile.
 *
 * Protections:
 * 1. Denies access if targetPath or allowedRootOrFile is empty.
 * 2. Rejects sibling-prefix attacks (e.g. /app/project-evil vs /app/project).
 * 3. Rejects parent-path traversal (e.g. /app/project/../secret.txt).
 * 4. Rejects symlink traversal pointing outside the allowed root.
 * 5. Uses case-insensitive comparison on Windows.
 */
export function isPathContained(targetPath: string, allowedRootOrFile: string): boolean {
  if (!targetPath || !allowedRootOrFile) {
    return false
  }

  // Canonicalize paths
  const canonicalTarget = path.resolve(targetPath)
  const canonicalAllowed = path.resolve(allowedRootOrFile)

  const isWindows = process.platform === 'win32'
  const normTarget = isWindows ? canonicalTarget.toLowerCase() : canonicalTarget
  const normAllowed = isWindows ? canonicalAllowed.toLowerCase() : canonicalAllowed

  // 1. Exact match (file or directory)
  if (normTarget === normAllowed) {
    return true
  }

  // 2. Relative traversal check
  const rel = path.relative(canonicalAllowed, canonicalTarget)
  // If rel starts with '..' or is absolute, target is outside allowed!
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return false
  }

  // 3. Single-file rule check:
  // If canonicalAllowed is a single file, target cannot be a child path inside it.
  if (fs.existsSync(canonicalAllowed)) {
    try {
      const stat = fs.statSync(canonicalAllowed)
      if (!stat.isDirectory()) {
        return normTarget === normAllowed
      }
    } catch {
      // Fall through to boundary check
    }
  }

  // 4. Sibling prefix protection:
  // Ensure the segment immediately following canonicalAllowed is a path separator
  const prefixWithSep = canonicalAllowed.endsWith(path.sep) ? canonicalAllowed : canonicalAllowed + path.sep
  const normPrefixWithSep = isWindows ? prefixWithSep.toLowerCase() : prefixWithSep
  if (!normTarget.startsWith(normPrefixWithSep) && normTarget !== normAllowed) {
    return false
  }

  // 5. Symlink security: Check realpath for existing targets or closest existing ancestor
  try {
    if (fs.existsSync(canonicalTarget)) {
      const realTarget = fs.realpathSync(canonicalTarget)
      const realAllowed = fs.existsSync(canonicalAllowed) ? fs.realpathSync(canonicalAllowed) : canonicalAllowed
      const normRealTarget = isWindows ? realTarget.toLowerCase() : realTarget
      const normRealAllowed = isWindows ? realAllowed.toLowerCase() : realAllowed

      if (normRealTarget === normRealAllowed) {
        return true
      }
      const realRel = path.relative(normRealAllowed, normRealTarget)
      if (realRel.startsWith('..') || path.isAbsolute(realRel)) {
        return false
      }
      const realPrefixWithSep = normRealAllowed.endsWith(path.sep) ? normRealAllowed : normRealAllowed + path.sep
      if (!normRealTarget.startsWith(realPrefixWithSep)) {
        return false
      }
    } else {
      // For non-existent target (e.g. pending write), check if any existing parent along the target path is a symlink
      let curr = path.dirname(canonicalTarget)
      while (curr && curr !== path.dirname(curr)) {
        if (fs.existsSync(curr)) {
          const lstat = fs.lstatSync(curr)
          if (lstat.isSymbolicLink()) {
            const realCurr = fs.realpathSync(curr)
            if (fs.existsSync(canonicalAllowed)) {
              const realAllowed = fs.realpathSync(canonicalAllowed)
              const rel = path.relative(realAllowed, realCurr)
              if (rel.startsWith('..') || path.isAbsolute(rel)) {
                return false
              }
            } else {
              let allowedAncestor = path.dirname(canonicalAllowed)
              while (allowedAncestor && !fs.existsSync(allowedAncestor) && allowedAncestor !== path.dirname(allowedAncestor)) {
                allowedAncestor = path.dirname(allowedAncestor)
              }
              if (allowedAncestor && fs.existsSync(allowedAncestor)) {
                const realAncestor = fs.realpathSync(allowedAncestor)
                const rel = path.relative(realAncestor, realCurr)
                if (rel.startsWith('..') || path.isAbsolute(rel)) {
                  return false
                }
              }
            }
          }
          break
        }
        curr = path.dirname(curr)
      }
    }
  } catch {
    // Fail closed on filesystem inspection errors
    return false
  }

  return true
}

/**
 * Validates a target path against an array of allowed paths.
 * Denies access if allowedPaths is empty or undefined.
 */
export function validatePathAgainstAllowlist(
  targetPath: string,
  allowedPaths: readonly string[]
): PathValidationResult {
  if (!targetPath) {
    return { allowed: false, violationReason: 'Target path violates contract allowedPaths: empty or undefined.' }
  }
  if (!allowedPaths || allowedPaths.length === 0) {
    return { allowed: false, violationReason: 'No write scope authorized (allowedPaths is empty).' }
  }

  const canonicalTarget = path.resolve(targetPath)

  for (const allowedRule of allowedPaths) {
    if (isPathContained(canonicalTarget, allowedRule)) {
      return {
        allowed: true,
        canonicalTarget,
        matchedAllowedRule: allowedRule,
      }
    }
  }

  return {
    allowed: false,
    canonicalTarget,
    violationReason: `Path "${canonicalTarget}" violates contract allowedPaths (not contained within any authorized scope: [${allowedPaths.join(', ')}])`,
  }
}

/**
 * Validates shell command execution against authorized working directory and output redirection.
 */
export function validateShellCommand(
  command: string,
  authorizedCwd: string,
  allowedPaths: readonly string[]
): { allowed: boolean; violationReason?: string } {
  if (!command || typeof command !== 'string') {
    return { allowed: false, violationReason: 'Command is empty or invalid.' }
  }

  // 1. Ensure cwd is within authorized scope
  const cwdCheck = validatePathAgainstAllowlist(authorizedCwd, allowedPaths)
  if (!cwdCheck.allowed) {
    return {
      allowed: false,
      violationReason: `Command working directory "${authorizedCwd}" is not in authorized scope.`,
    }
  }

  // 2. Reject commands attempting to escape via redirection outside allowed paths
  const redirectMatch = command.match(/>>\s*([^\s;&|]+)|>\s*([^\s;&|]+)/)
  if (redirectMatch) {
    const redirectTarget = redirectMatch[1] || redirectMatch[2]
    if (redirectTarget) {
      const resolvedRedirect = path.resolve(authorizedCwd, redirectTarget)
      const redirectCheck = validatePathAgainstAllowlist(resolvedRedirect, allowedPaths)
      if (!redirectCheck.allowed) {
        return {
          allowed: false,
          violationReason: `Command output redirection target "${redirectTarget}" escapes authorized scope.`,
        }
      }
    }
  }

  return { allowed: true }
}
