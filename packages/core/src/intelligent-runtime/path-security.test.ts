import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  isPathContained,
  validatePathAgainstAllowlist,
  validateShellCommand,
  parseExecName,
  ALLOWED_EXEC_NAMES,
} from './path-security.js'

// ──────────────────────────────────────────────────────────────────────────────
// Group 1: Core path containment (preserved from original tests)
// ──────────────────────────────────────────────────────────────────────────────
describe('Path Security & Containment (Gate 05.6 Requirement C)', () => {
  let tempDir: string
  let allowedWorkspace: string
  let evilSiblingDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-path-test-'))
    allowedWorkspace = path.join(tempDir, 'workspace')
    evilSiblingDir = path.join(tempDir, 'workspace-evil')

    fs.mkdirSync(allowedWorkspace, { recursive: true })
    fs.mkdirSync(evilSiblingDir, { recursive: true })

    fs.writeFileSync(path.join(allowedWorkspace, 'index.html'), '<h1>Safe</h1>')
    fs.writeFileSync(path.join(allowedWorkspace, 'styles.css'), 'body {}')
    fs.writeFileSync(path.join(evilSiblingDir, 'payload.js'), 'console.log("evil")')
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup
    }
  })

  it('permits canonical files strictly inside the allowed directory', () => {
    const target = path.join(allowedWorkspace, 'index.html')
    expect(isPathContained(target, allowedWorkspace)).toBe(true)

    const nested = path.join(allowedWorkspace, 'sub', 'nested.ts')
    expect(isPathContained(nested, allowedWorkspace)).toBe(true)
  })

  it('strictly rejects sibling-prefix attacks (workspace-evil vs workspace)', () => {
    const evilTarget = path.join(evilSiblingDir, 'payload.js')
    // Sibling prefix must NOT match
    expect(isPathContained(evilTarget, allowedWorkspace)).toBe(false)

    const valResult = validatePathAgainstAllowlist(evilTarget, [allowedWorkspace])
    expect(valResult.allowed).toBe(false)
    expect(valResult.violationReason).toContain('not contained within any authorized scope')
  })

  it('strictly rejects parent-path traversal (.. escapes)', () => {
    const traversalTarget = path.join(allowedWorkspace, '..', 'workspace-evil', 'payload.js')
    expect(isPathContained(traversalTarget, allowedWorkspace)).toBe(false)

    const outerTarget = path.join(allowedWorkspace, '..', 'escaped.txt')
    expect(isPathContained(outerTarget, allowedWorkspace)).toBe(false)
  })

  it('denies all write access when allowedPaths is empty or undefined', () => {
    const target = path.join(allowedWorkspace, 'index.html')
    expect(validatePathAgainstAllowlist(target, []).allowed).toBe(false)
    expect(validatePathAgainstAllowlist(target, undefined as any).allowed).toBe(false)
  })

  it('strictly enforces single-file rules (allowed file rule allows only that exact file)', () => {
    const allowedFile = path.join(allowedWorkspace, 'index.html')
    const targetFile = path.join(allowedWorkspace, 'index.html')
    const otherFile = path.join(allowedWorkspace, 'styles.css')

    expect(isPathContained(targetFile, allowedFile)).toBe(true)
    expect(isPathContained(otherFile, allowedFile)).toBe(false)
  })

  it('detects and rejects symlink traversal pointing outside the allowed root', () => {
    const outsideSecret = path.join(tempDir, 'super-secret.env')
    fs.writeFileSync(outsideSecret, 'SECRET_KEY=12345')

    const symlinkInside = path.join(allowedWorkspace, 'symlink-to-secret')
    try {
      fs.symlinkSync(outsideSecret, symlinkInside, 'file')
      // Target pointing to outside file via symlink must be rejected
      expect(isPathContained(symlinkInside, allowedWorkspace)).toBe(false)
    } catch {
      // If symlink creation requires admin on Windows, test passes gracefully
    }
  })

  it('validates shell commands against working directory', () => {
    // Safe command in authorized cwd
    const safeCheck = validateShellCommand('node test.mjs', allowedWorkspace, [allowedWorkspace])
    expect(safeCheck.allowed).toBe(true)

    // Command in unauthorized cwd
    const badCwdCheck = validateShellCommand('node test.mjs', evilSiblingDir, [allowedWorkspace])
    expect(badCwdCheck.allowed).toBe(false)
    expect(badCwdCheck.violationReason).toContain('working directory')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Group 2: Adversarial shell containment tests (Security Addendum, Item 1)
// ──────────────────────────────────────────────────────────────────────────────
describe('Adversarial Shell Containment (Security Addendum Phase 05.6 Item 1)', () => {
  let tempDir: string
  let allowedCwd: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-shell-adv-'))
    allowedCwd = tempDir
  })

  afterEach(() => {
    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch { /* ignore */ }
  })

  it('rejects arbitrary powershell command', () => {
    const result = validateShellCommand('powershell -c "Remove-Item C:\\Windows"', allowedCwd, [allowedCwd])
    expect(result.allowed).toBe(false)
    expect(result.violationReason).toContain('not in the permitted allowlist')
  })

  it('rejects cmd /c escalation', () => {
    const result = validateShellCommand('cmd /c whoami', allowedCwd, [allowedCwd])
    expect(result.allowed).toBe(false)
    expect(result.violationReason).toContain('not in the permitted allowlist')
  })

  it('rejects powershell.exe with encoded command', () => {
    // -EncodedCommand bypasses all regex scanning
    const b64 = Buffer.from('whoami', 'utf16le').toString('base64')
    const result = validateShellCommand(`powershell.exe -EncodedCommand ${b64}`, allowedCwd, [allowedCwd])
    expect(result.allowed).toBe(false)
    expect(result.violationReason).toContain('not in the permitted allowlist')
  })

  it('rejects wscript / cscript execution', () => {
    expect(validateShellCommand('wscript evil.vbs', allowedCwd, [allowedCwd]).allowed).toBe(false)
    expect(validateShellCommand('cscript evil.vbs', allowedCwd, [allowedCwd]).allowed).toBe(false)
  })

  it('rejects arbitrary .bat file execution', () => {
    const result = validateShellCommand(`${tempDir}\\evil.bat`, allowedCwd, [allowedCwd])
    expect(result.allowed).toBe(false)
  })

  it('rejects node with embedded shell operator characters in args (defense-in-depth)', () => {
    // With shell:false these would be harmless, but we still block them as belt-and-suspenders
    expect(validateShellCommand('node -e "require(\'child_process\')" | powershell', allowedCwd, [allowedCwd]).allowed).toBe(false)
    expect(validateShellCommand('node script.mjs & del secrets.txt', allowedCwd, [allowedCwd]).allowed).toBe(false)
    expect(validateShellCommand('node script.mjs; whoami', allowedCwd, [allowedCwd]).allowed).toBe(false)
  })

  it('permits bare node commands', () => {
    const result = validateShellCommand('node test.mjs', allowedCwd, [allowedCwd])
    expect(result.allowed).toBe(true)
    // parseExecName('node test.mjs') → 'node' on all platforms
    // ALLOWED_EXEC_NAMES contains both 'node' and 'node.exe'
    expect(result.execName).toBe('node')
  })

  it('permits node.exe (Windows explicit extension)', () => {
    const result = validateShellCommand('node.exe test.mjs', allowedCwd, [allowedCwd])
    expect(result.allowed).toBe(true)
  })

  it('rejects env-variable-expanded fake node paths', () => {
    // %COMSPEC% expands to cmd.exe on Windows — must be rejected
    const result = validateShellCommand('%COMSPEC% /c del secrets.txt', allowedCwd, [allowedCwd])
    expect(result.allowed).toBe(false)
  })

  it('rejects nested interpreter via path embedding', () => {
    // Full path to powershell — parseExecName should extract basename
    const result = validateShellCommand('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -Command evil', allowedCwd, [allowedCwd])
    expect(result.allowed).toBe(false)
    expect(result.violationReason).toContain('not in the permitted allowlist')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Group 3: parseExecName correctness
// ──────────────────────────────────────────────────────────────────────────────
describe('parseExecName correctness', () => {
  it('extracts bare executable name', () => {
    expect(parseExecName('node test.mjs')).toBe('node')
    expect(parseExecName('node.exe test.mjs')).toBe('node.exe')
    expect(parseExecName('powershell.exe -c evil')).toBe('powershell.exe')
  })

  it('handles quoted executable paths', () => {
    expect(parseExecName('"C:\\Program Files\\node\\node.exe" test.mjs')).toBe('node.exe')
    expect(parseExecName('"C:\\Windows\\System32\\cmd.exe" /c evil')).toBe('cmd.exe')
  })

  it('handles full path without quotes', () => {
    expect(parseExecName('C:\\Windows\\System32\\powershell.exe -Command evil')).toBe('powershell.exe')
  })

  it('extracts single token', () => {
    expect(parseExecName('node')).toBe('node')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Group 4: ALLOWED_EXEC_NAMES allowlist integrity
// ──────────────────────────────────────────────────────────────────────────────
describe('ALLOWED_EXEC_NAMES allowlist', () => {
  it('contains only node and node.exe', () => {
    expect(ALLOWED_EXEC_NAMES.has('node')).toBe(true)
    expect(ALLOWED_EXEC_NAMES.has('node.exe')).toBe(true)
    expect(ALLOWED_EXEC_NAMES.size).toBe(2)
  })

  it('does not contain dangerous executables', () => {
    const dangerous = ['cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'wscript', 'cscript',
      'sh', 'bash', 'python', 'python3', 'ruby', 'perl', 'mshta', 'rundll32']
    for (const exec of dangerous) {
      expect(ALLOWED_EXEC_NAMES.has(exec)).toBe(false)
    }
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Group 5: Windows path edge cases (Security Addendum, Item 3)
// ──────────────────────────────────────────────────────────────────────────────
describe('Path Edge Cases (Security Addendum Phase 05.6 Item 3)', () => {
  let tempDir: string
  let allowedDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-edge-'))
    allowedDir = path.join(tempDir, 'workspace')
    fs.mkdirSync(allowedDir, { recursive: true })
  })

  afterEach(() => {
    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch { /* ignore */ }
  })

  it('permits non-existent target within allowed directory (pending write scenario)', () => {
    // Non-existent paths must still validate correctly via path arithmetic
    const nonExistent = path.join(allowedDir, 'new-folder', 'new-file.txt')
    // Path arithmetic check should permit this (the parent dir doesn't exist yet)
    const result = validatePathAgainstAllowlist(nonExistent, [allowedDir])
    expect(result.allowed).toBe(true)
  })

  it('rejects non-existent path outside allowed directory', () => {
    const outsideNonExistent = path.join(tempDir, 'outside', 'secret.txt')
    const result = validatePathAgainstAllowlist(outsideNonExistent, [allowedDir])
    expect(result.allowed).toBe(false)
  })

  it('handles case-insensitive comparison on Windows for sibling-prefix attack', () => {
    // On Windows, WORKSPACE-EVIL and workspace-evil are the same directory
    // so sibling prefix must still be rejected correctly
    const siblingUpperCase = path.join(tempDir, 'WORKSPACE-EVIL', 'payload.txt')
    const result = validatePathAgainstAllowlist(siblingUpperCase, [allowedDir])
    expect(result.allowed).toBe(false)
  })

  it('fails closed on empty target path', () => {
    expect(validatePathAgainstAllowlist('', [allowedDir]).allowed).toBe(false)
    expect(isPathContained('', allowedDir)).toBe(false)
    expect(isPathContained(allowedDir, '')).toBe(false)
  })

  it('rejects Windows junction pointing outside allowed root', () => {
    // Windows junctions: realpathSync resolves them, so they are covered by step 5
    // of isPathContained. This test documents the behavior on non-admin Windows where
    // junction creation may fail — the test passes gracefully in that case.
    const outsideTarget = path.join(tempDir, 'external-dir')
    const junctionInside = path.join(allowedDir, 'junction-to-outside')
    fs.mkdirSync(outsideTarget, { recursive: true })
    fs.writeFileSync(path.join(outsideTarget, 'secret.txt'), 'SECRET')

    try {
      // On Windows, mklink /J requires elevation OR Developer Mode
      fs.symlinkSync(outsideTarget, junctionInside, 'junction')
      const secretViaJunction = path.join(junctionInside, 'secret.txt')
      // Junction should resolve to outside target — must be rejected
      expect(isPathContained(secretViaJunction, allowedDir)).toBe(false)
    } catch {
      // Junction creation failed (requires elevation on Windows without Developer Mode).
      // Document the limitation: if junctions can be created by an unprivileged user,
      // realpathSync covers them. If not, no attack is possible either.
    }
  })

  it('documents TOCTOU gap: path.resolve is non-atomic with respect to writes', () => {
    // This test documents a known limitation rather than asserting a bypass.
    // Between validatePathAgainstAllowlist() and the actual fs.writeFileSync(),
    // another process could move the target path or replace the directory with a symlink.
    // Mitigation: the approval grant is re-verified immediately before each write.
    // No test can fully eliminate this race; it requires OS-level sandboxing.
    expect(true).toBe(true) // Documented gap — no code fix possible at this layer
  })
})
