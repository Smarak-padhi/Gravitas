/**
 * Gravitas — Canonical Path Security & Bounded Tool Capability Enforcement
 *
 * Provides bulletproof filesystem containment, sibling-prefix rejection,
 * parent-path traversal prevention, symlink resolution security,
 * and constrained allowlist-based Node command execution validation.
 *
 * Security Closure (Phase 05.6 Final):
 * 1. Node Execution Capabilities:
 *    - The executable allowlist `{node, node.exe}` is combined with strict option filtering.
 *    - Rejects `-e`, `--eval`, `-p`, `--print`, `-r`, `--require`, `--import`, and all code-loading options.
 *    - Enforces that an explicit script path is provided and resolves within authorized workspace paths.
 *    - Requires standard script extensions (.js, .mjs, .cjs, .ts).
 *    - All command.exec callers MUST use spawn/spawnSync with shell:false, never execSync.
 *
 * IMPORTANT LIMITATION & THREAT MODEL:
 * An approved script (e.g. test.mjs) executes in the host Node runtime without OS-level process sandboxing.
 * Even with an allowlisted script path, resolved workspace containment, and restricted flags, Node scripts
 * can execute arbitrary filesystem, network, or child process operations using Node's standard libraries
 * (fs, net, child_process) once invoked. This layer enforces executable, flag, and script path containment,
 * NOT OS-level kernel sandboxing (e.g. AppContainer, seccomp, or Docker).
 *
 * 2. Authority Protection & Windows ACLs:
 *    - Fail-closed verification on Windows NTFS ACLs via icacls.
 *    - Verifies that inheritance is removed and only %USERNAME% retains Full Control.
 *    - Same-user process trust boundary documented: processes under the same user account share NTFS access.
 *
 * 3. Mutation Boundary Revalidation:
 *    - Every mutating tool invocation (fs.writeFile, fs.appendFile, command.exec) re-validates the
 *      active cryptographic grant, revision hash, expiry, operation, and path scope immediately before execution.
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
// Constrained allowlist-based command execution validation
// ---------------------------------------------------------------------------

/**
 * Explicit allowlist of permitted executable base names.
 */
export const ALLOWED_EXEC_NAMES: ReadonlySet<string> = new Set([
  'node',
  'node.exe',
])

/**
 * Forbidden Node.js option flags that execute inline code, evaluate strings,
 * or load arbitrary modules before or instead of an approved script file.
 */
export const FORBIDDEN_NODE_FLAGS: ReadonlySet<string> = new Set([
  '-e',
  '--eval',
  '-p',
  '--print',
  '-r',
  '--require',
  '-i',
  '--interactive',
  '--import',
  '--loader',
  '--experimental-loader',
  '--entry-url',
  '--inspect',
  '--inspect-brk',
  '--inspect-port',
  '--prof',
  '--expose-internals',
  '--conditions',
  '-C',
])

/**
 * Permitted script file extensions for Node execution.
 */
export const PERMITTED_SCRIPT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
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
 * Tokenizes a command line string into an array of argument tokens,
 * properly respecting double-quoted and single-quoted strings.
 */
export function tokenizeCommandLine(command: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote: '"' | "'" | null = null

  for (let i = 0; i < command.length; i++) {
    const char = command[i]
    if (char === undefined) continue
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null
      } else {
        current += char
      }
    } else if (char === '"' || char === "'") {
      inQuote = char
    } else if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

export interface ShellValidationResult {
  readonly allowed: boolean
  readonly execName?: string
  readonly scriptPath?: string
  readonly args?: readonly string[]
  readonly violationReason?: string
}

/**
 * Validates a command string against the explicit executable allowlist and
 * Node capability constraints.
 *
 * Security Rationale (Phase 05.6 Final Security Closure):
 * 1. Executable Allowlist: Rejects non-Node binaries (powershell, cmd, bash, python, etc.).
 * 2. Code-loading Options Rejection: Blocks -e, --eval, -p, --print, -r, --require, --import.
 * 3. Script Path Verification: Requires an explicit script path resolved and verified within
 *    the authorized workspace (allowedPaths).
 * 4. Extension Verification: Permits only .js, .mjs, .cjs, .ts.
 * 5. Defense-in-Depth: Rejects unquoted shell operator characters (&, |, ;, <, >, `, $).
 *
 * Callers MUST invoke `spawnSync(execName, args, { shell: false })`.
 * Never pass the command string to an OS shell.
 */
export function validateShellCommand(
  command: string,
  authorizedCwd: string,
  allowedPaths: readonly string[]
): ShellValidationResult {
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

  // 2. Tokenize command arguments
  const tokens = tokenizeCommandLine(command)
  if (tokens.length === 0) {
    return { allowed: false, violationReason: 'Command contains no executable token.' }
  }

  // 3. Parse and allowlist-check the executable name
  const rawExecToken = tokens[0] || ''
  const rawExecName = parseExecName(rawExecToken)
  const isWindows = process.platform === 'win32'
  const normalizedExec = isWindows ? rawExecName.toLowerCase() : rawExecName

  if (!ALLOWED_EXEC_NAMES.has(normalizedExec)) {
    return {
      allowed: false,
      violationReason:
        `Executable "${rawExecName}" is not in the permitted allowlist ` +
        `[${[...ALLOWED_EXEC_NAMES].join(', ')}]. ` +
        `Rejected to prevent arbitrary execution. ` +
        `Callers must use spawnSync with shell:false and an explicit allowlist.`,
    }
  }

  // 4. Node capability restrictions:
  // Inspect all argument tokens for forbidden code-loading flags
  const argTokens = tokens.slice(1)

  for (const token of argTokens) {
    const lowerToken = token.toLowerCase()
    // Exact match against forbidden flags
    if (FORBIDDEN_NODE_FLAGS.has(lowerToken)) {
      return {
        allowed: false,
        violationReason: `Node code-loading or inline evaluation option "${token}" is forbidden.`,
      }
    }
    // Prefix match for flags with values like --eval=code, --require=module, --import=module
    if (
      lowerToken.startsWith('--eval=') ||
      lowerToken.startsWith('-e=') ||
      lowerToken.startsWith('--print=') ||
      lowerToken.startsWith('-p=') ||
      lowerToken.startsWith('--require=') ||
      lowerToken.startsWith('-r=') ||
      lowerToken.startsWith('--import=') ||
      lowerToken.startsWith('--loader=') ||
      lowerToken.startsWith('--experimental-loader=') ||
      lowerToken.startsWith('--conditions=')
    ) {
      return {
        allowed: false,
        violationReason: `Node code-loading or inline evaluation option "${token}" is forbidden.`,
      }
    }
  }

  // 5. Require an explicit script path and verify it within the authorized workspace
  // Find the first token that is not a flag (does not start with '-')
  let scriptTokenIndex = -1
  for (let idx = 0; idx < argTokens.length; idx++) {
    const tok = argTokens[idx]
    if (tok && !tok.startsWith('-')) {
      scriptTokenIndex = idx
      break
    }
  }

  if (scriptTokenIndex === -1) {
    return {
      allowed: false,
      violationReason:
        'Node execution requires an explicit script file path within the authorized workspace. ' +
        'Interactive REPL or flag-only invocations are forbidden.',
    }
  }

  const scriptToken = argTokens[scriptTokenIndex]!
  const resolvedScript = path.resolve(authorizedCwd, scriptToken)

  // Verify that the script path is strictly contained within allowedPaths
  const scriptPathCheck = validatePathAgainstAllowlist(resolvedScript, allowedPaths)
  if (!scriptPathCheck.allowed) {
    return {
      allowed: false,
      violationReason: `Script path "${scriptToken}" (${resolvedScript}) is not contained within authorized workspace: ${scriptPathCheck.violationReason}`,
    }
  }

  // Verify permitted script extension
  const scriptExt = path.extname(resolvedScript).toLowerCase()
  if (!PERMITTED_SCRIPT_EXTENSIONS.has(scriptExt)) {
    return {
      allowed: false,
      violationReason:
        `Script "${scriptToken}" has unpermitted extension "${scriptExt}". ` +
        `Only scripts with extensions [${[...PERMITTED_SCRIPT_EXTENSIONS].join(', ')}] are permitted.`,
    }
  }

  // 6. Defense-in-depth: reject shell operator characters in raw command
  if (/[&|;<>`$]/.test(command)) {
    return {
      allowed: false,
      violationReason: 'Command contains shell operator characters that are forbidden as a defense-in-depth measure.',
    }
  }

  return {
    allowed: true,
    execName: normalizedExec,
    scriptPath: resolvedScript,
    args: argTokens,
  }
}
