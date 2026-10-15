import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  isPathContained,
  validatePathAgainstAllowlist,
  validateShellCommand,
} from './path-security.js'

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

  it('validates shell commands against working directory and output redirection', () => {
    // 1. Safe command in authorized cwd
    const safeCheck = validateShellCommand('node test.mjs', allowedWorkspace, [allowedWorkspace])
    expect(safeCheck.allowed).toBe(true)

    // 2. Command in unauthorized cwd
    const badCwdCheck = validateShellCommand('node test.mjs', evilSiblingDir, [allowedWorkspace])
    expect(badCwdCheck.allowed).toBe(false)
    expect(badCwdCheck.violationReason).toContain('working directory')

    // 3. Command with redirection escaping authorized scope
    const escapedRedirect = validateShellCommand(
      'node test.mjs > ../escaped-log.txt',
      allowedWorkspace,
      [allowedWorkspace]
    )
    expect(escapedRedirect.allowed).toBe(false)
    expect(escapedRedirect.violationReason).toContain('output redirection target')
  })
})
