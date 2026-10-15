/**
 * Gravitas — Canonical Path Security & Bounded Tool Capability Enforcement
 *
 * Provides bulletproof filesystem containment, sibling-prefix rejection,
 * parent-path traversal prevention, symlink resolution security,
 * and allowlist-based command execution validation.
 *
 * Security Addendum (Phase 05.6):
 * - validateShellCommand now enforces an explicit executable allowlist instead of
 *   regex-based shell-operator scanning, which is bypassable on Windows via carets (^),
 *   percent-expansion (%VAR%), parentheses grouping, and encoded commands.
 * - All command.exec callers MUST use spawn/spawnSync with shell:false, never execSync.
 * - TOCTOU gap: validation and spawn are separate OS calls; a race window exists.
 *   Mitigated by re-verifying the approval grant immediately before every tool call.
 * - Windows ACL: fs.chmodSync(0o600) is a no-op on Windows (NTFS ignores POSIX mode bits).
 *   See DeepDiscoveryEngine.getOrCreateAuthorityKey() for icacls hardening.
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
 * 5. Uses case-insensitive comparison on Windows (NTFS is case-insensitive).
 *
 * Limitations:
 * - TOCTOU: path.resolve() does not touch the filesystem; realpathSync() does.
 *   Between validation and the actual write, the filesystem may change.
 *   Callers should re-verify the approval grant immediately before every write.
 * - Windows junctions: realpathSync resolves them, so junction attacks are covered.
 * - Non-existent targets: realpathSync is skipped; only the path-arithmetic checks apply.
 */
export function isPathContained(targetPath: string, allowedRootOrFile: string): boolean {
  if (!targetPath || !allowedRootOrFile) {
    return false
  }

  // Canonicalize paths (arithmetic only — does not touch the filesystem)
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

// ---------------------------------------------------------------------------
// Allowlist-based command execution validation
// ---------------------------------------------------------------------------

/**
 * Explicit allowlist of permitted executable base names.
 *
 * Security rationale: Regex-based pattern matching cannot contain Windows shell execution.
 * cmd.exe and powershell.exe support operator forms (carets ^, percent-expansion %VAR%,
 * parentheses grouping, -EncodedCommand, call chains) that bypass simple regex scans.
 *
 * The only safe approach on Windows is:
 *   1. Parse the executable name from argv[0].
 *   2. Verify it is in this allowlist.
 *   3. Spawn with { shell: false } so no shell interpreter is ever invoked.
 *      Use spawnSync(execName, args, { shell: false }), NOT execSync(rawCommand).
 *
 * TOCTOU NOTE: A race window exists between validateShellCommand() and the actual spawn()
 * call. Mitigated by: (a) this allowlist is a compile-time constant, not runtime-editable
 * data; (b) the approval grant is re-verified immediately before each tool execution.
 * No further mitigation is possible without a full OS-level sandbox.
 *
 * Windows case-insensitivity NOTE: executable comparison uses .toLowerCase() on Windows.
 */
export const ALLOWED_EXEC_NAMES: ReadonlySet<string> = new Set([
  'node',
  'node.exe',
])

/**
 * Parses argv[0] (the executable basename) from a raw command string.
 * Handles quoted executables such as `"node" script.mjs`.
 */
export function parseExecName(command: string): string {
  const trimmed = command.trim()
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1)
    if (end > 1) {
      return path.basename(trimmed.slice(1, end))
    }
  }
  const first = trimmed.split(/\s+/)[0] ?? ''
  return path.basename(first)
}

/**
 * Validates a command string against the explicit executable allowlist.
 *
 * Returns:
 * - `{ allowed: false, violationReason }` if rejected.
 * - `{ allowed: true, execName }` if permitted; `execName` is the normalized basename.
 *
 * Callers MUST use `spawnSync(execName, args, { shell: false })`.
 * Never pass the raw `command` string to any shell interpreter.
 *
 * Previous implementation used regex pattern matching to scan for shell operators.
 * That approach is documented here as INSUFFICIENT for Windows security because:
 * - The caret (^) is a Windows CMD escape character invisible to JS regex.
 * - Percent-expansion (%PATHEXT%) runs before the command is parsed by the regex.
 * - Parentheses grouping and -EncodedCommand bypass operator-character scans entirely.
 * This function replaces it with allowlist + shell:false as the primary containment.
 */
export function validateShellCommand(
  command: string,
  authorizedCwd: string,
  allowedPaths: readonly string[]
): { allowed: boolean; execName?: string; violationReason?: string } {
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

  // 2. Parse and allowlist-check the executable name
  const rawExecName = parseExecName(command)
  const isWindows = process.platform === 'win32'
  const normalizedExec = isWindows ? rawExecName.toLowerCase() : rawExecName

  if (!ALLOWED_EXEC_NAMES.has(normalizedExec)) {
    return {
      allowed: false,
      violationReason:
        `Executable "${rawExecName}" is not in the permitted allowlist ` +
        `[${[...ALLOWED_EXEC_NAMES].join(', ')}]. ` +
        `Rejected to prevent arbitrary shell execution. ` +
        `Callers must use spawnSync with shell:false and an explicit allowlist.`,
    }
  }

  // 3. Defense-in-depth: reject shell operator characters in the argument portion.
  // NOTE: With shell:false these characters are passed as literal argv bytes and are NOT
  // interpreted by any shell. This check is belt-and-suspenders only.
  const argPart = command.trim().slice(rawExecName.length)
  if (/[&|;<>`$]/.test(argPart)) {
    return {
      allowed: false,
      violationReason: `Command arguments contain shell operator characters that are forbidden as a defense-in-depth measure.`,
    }
  }

  return { allowed: true, execName: normalizedExec }
}
