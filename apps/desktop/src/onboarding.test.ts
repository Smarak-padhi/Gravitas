import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { DesktopSupervisor } from './main/supervisor.js'
import { KernelHost } from './kernel-host/kernelHost.js'
import { ModelCredentialBroker } from '@gravitas/gateways'
import { readGravitasConfig } from '@gravitas/core'

describe('GRAVITAS Desktop Onboarding & Doctor Subsystem (Wave V1-C)', () => {
  let tempDir: string
  let supervisor: DesktopSupervisor

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-desktop-onboarding-test-'))
    supervisor = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => ({
        postMessage: () => {},
        on: () => {},
        kill: () => {},
      }),
    })
  })

  afterEach(() => {
    ModelCredentialBroker.getInstance().clearSecret('nvidia-nim')
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch {
      // Ignore cleanup error
    }
  })

  it('provides default onboarding state for fresh environment', async () => {
    const ob = await supervisor.getOnboarding()
    expect(ob.completed).toBe(false)
    expect(ob.operatingMode).toBe('DETERMINISTIC_ONLY')
    expect(ob.providerConfigured).toBe(false)
    expect(ob.dataRoot).toBe(tempDir)
  })

  it('saves onboarding choices cleanly to disk', async () => {
    const saved = await supervisor.saveOnboarding({
      completed: true,
      operatingMode: 'ASSISTED',
      selectedHarnesses: ['harness:antigravity:host', 'harness:powershell'],
    })
    expect(saved).toBe(true)

    const ob = await supervisor.getOnboarding()
    expect(ob.completed).toBe(true)
    expect(ob.operatingMode).toBe('ASSISTED')
    expect(ob.selectedHarnesses).toContain('harness:powershell')

    const fileConfig = readGravitasConfig(tempDir)
    expect(fileConfig.onboarding.completed).toBe(true)
    expect(fileConfig.onboarding.operatingMode).toBe('ASSISTED')
  })

  it('runs Doctor diagnostics through DesktopSupervisor without throwing', async () => {
    const report = await supervisor.runDoctor()
    expect(report).toBeDefined()
    expect(report.checks.length).toBe(13)
    expect(report.exitCode).toBe(0)
  })

  it('configures provider secret strictly in volatile memory and updates onboarding flag', async () => {
    const testSecret = 'nvapi-test-secret-12345'
    const res = await supervisor.configureProvider({
      providerId: 'nvidia-nim',
      apiKey: testSecret,
    })

    expect(res.success).toBe(true)
    expect(res.status).toBe('METADATA_VALIDATED')
    expect(res.maskedHandle).toContain('CREDENTIAL_PRESENT:nvidia-nim')

    // In-memory broker can resolve it
    const handle = ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim')
    expect(handle.isAvailable).toBe(true)
    const resolved = ModelCredentialBroker.getInstance().resolveSecret(handle.credentialRef)
    expect(resolved).toBe(testSecret)

    // Invariant: disk config never contains secret
    const diskConfig = readGravitasConfig(tempDir)
    expect(diskConfig.onboarding.providerConfigured).toBe(true)
    const rawDisk = fs.readFileSync(path.join(tempDir, 'config.json'), 'utf8')
    expect(rawDisk).not.toContain(testSecret)

    // Clear secret
    const clearRes = await supervisor.configureProvider({
      providerId: 'nvidia-nim',
      apiKey: '',
    })
    expect(clearRes.success).toBe(true)
    expect(clearRes.status).toBe('AUTH_REQUIRED')
    expect(ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim').isAvailable).toBe(false)
  })

  it('KernelHost system projection includes onboardingSummary with portability status', () => {
    const host = new KernelHost({
      dataRoot: tempDir,
      onMessage: () => {},
    })

    const sys = host.generateSystemProjection()
    expect(sys.onboardingSummary).toBeDefined()
    expect(sys.onboardingSummary?.completed).toBe(false)
    expect(sys.onboardingSummary?.operatingMode).toBe('DETERMINISTIC_ONLY')
    expect(typeof sys.onboardingSummary?.isPortableDataRoot).toBe('boolean')
  })
})
