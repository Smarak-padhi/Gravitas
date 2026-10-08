import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { GravitasDoctor, runGravitasDoctor } from './doctor.js'

describe('GRAVITAS Doctor System & Environment Diagnostics (Wave V1-C)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-doctor-test-'))
  })

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch {
      // Ignore cleanup error
    }
  })

  it('runs all 13 canonical diagnostic checks and produces structured report', async () => {
    const report = await runGravitasDoctor({ customDataRoot: tempDir })

    expect(report.timestamp).toBeDefined()
    expect(['PASS', 'WARN', 'FAIL']).toContain(report.overallStatus)
    expect(report.exitCode).toBe(0) // Safe test dir should not trigger required failure
    expect(report.checks.length).toBe(13)

    const expectedCodes = [
      'PLATFORM_WINDOWS_CHECK',
      'NODE_RUNTIME_CHECK',
      'DATA_ROOT_WRITABLE_CHECK',
      'SQLITE_KERNEL_DB_CHECK',
      'SCHEMA_MIGRATION_CHECK',
      'ELECTRON_ASSETS_CHECK',
      'HARNESS_POWERSHELL_CHECK',
      'HARNESS_CLAUDE_CODE_CHECK',
      'HARNESS_CODEX_CHECK',
      'HARNESS_AGY_CHECK',
      'CREDENTIAL_NVIDIA_CHECK',
      'NETWORK_SPEND_POLICY_CHECK',
      'RECOVERY_LOCK_CHECK',
    ]

    const actualCodes = report.checks.map((c) => c.code)
    for (const code of expectedCodes) {
      expect(actualCodes).toContain(code)
    }

    expect(report.summary.total).toBe(13)
    expect(report.summary.ok + report.summary.warning + report.summary.blocked + report.summary.unavailable).toBe(13)
  })

  it('reports exitCode 0 for clean environment or optional harness warnings', async () => {
    const report = await runGravitasDoctor({ customDataRoot: tempDir })
    expect(report.exitCode).toBe(0)
  })

  it('maintains zero credential leakage: never exposes API keys in check messages or details', async () => {
    const oldKey = process.env.NVIDIA_API_KEY
    process.env.NVIDIA_API_KEY = 'nvapi-dummy-secret-key-1234567890abcdef'

    try {
      const report = await runGravitasDoctor({ customDataRoot: tempDir })
      const serialized = JSON.stringify(report)

      expect(serialized).not.toContain('nvapi-dummy-secret-key')
      expect(serialized).not.toContain('1234567890abcdef')

      const credCheck = report.checks.find((c) => c.code === 'CREDENTIAL_NVIDIA_CHECK')
      expect(credCheck).toBeDefined()
      expect(credCheck?.message).toContain('detected')
    } finally {
      if (oldKey !== undefined) {
        process.env.NVIDIA_API_KEY = oldKey
      } else {
        delete process.env.NVIDIA_API_KEY
      }
    }
  })

  it('enforces zero financial spend invariant in security check', async () => {
    const report = await runGravitasDoctor({ customDataRoot: tempDir })
    const secCheck = report.checks.find((c) => c.code === 'NETWORK_SPEND_POLICY_CHECK')

    expect(secCheck).toBeDefined()
    expect(secCheck?.status).toBe('OK')
    expect(secCheck?.details?.defaultTier).toBe('FREE_OPEN_SOURCE_LOCAL')
    expect(secCheck?.details?.outOfPocketSpendUsd).toBe(0.0)
    expect(secCheck?.details?.paidFallbackPermitted).toBe(false)
    expect(secCheck?.details?.autonomousPaymentAuthority).toBe(false)
  })
})
