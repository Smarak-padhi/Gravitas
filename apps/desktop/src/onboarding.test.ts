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

  it('truthfully reports AUTH_REQUIRED on restart when disk config indicates configured but in-memory secret is gone', async () => {
    // 1. Configure secret
    await supervisor.configureProvider({
      providerId: 'nvidia-nim',
      apiKey: 'nvapi-secret-to-be-lost-on-restart',
    })
    const obActive = await supervisor.getOnboarding()
    expect(obActive.providerConfigured).toBe(true)

    // 2. Simulate process exit / restart: in-memory broker is wiped, disk config remains
    ModelCredentialBroker.getInstance().clearSecret('nvidia-nim')

    // 3. Truthful reporting: disk says true, but broker is empty -> returns false
    const obRestart = await supervisor.getOnboarding()
    expect(obRestart.providerConfigured).toBe(false)
  })

  it('bridges provider credential across process boundary to KernelHost with host PID binding', async () => {
    const KERNEL_PID = 7711
    let hostMessageCallback: ((msg: any) => void) | undefined

    const mockBridge = {
      pid: KERNEL_PID,
      postMessage: (msg: unknown) => {
        // Asynchronously deliver to KernelHost
        queueMicrotask(() => {
          kernelHost.handleMessage(msg)
        })
      },
      on: (event: string, listener: any) => {
        if (event === 'message') {
          hostMessageCallback = listener
        }
      },
      kill: () => {},
    }

    const kernelHost = new KernelHost({
      dataRoot: tempDir,
      pid: KERNEL_PID,
      onMessage: (msg) => {
        // Forward from KernelHost back to DesktopSupervisor
        hostMessageCallback?.(msg)
      },
    })

    const connectedSupervisor = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => mockBridge,
    })

    await connectedSupervisor.start()
    await kernelHost.start()

    // 1. Initial state: KernelHost broker has no credentials
    expect(ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim').isAvailable).toBe(false)

    // 2. Configure provider through Main supervisor
    const testSecret = 'nvapi-live-bridged-secret-888'
    const confResult = await connectedSupervisor.configureProvider({
      providerId: 'nvidia-nim',
      apiKey: testSecret,
    })

    expect(confResult.success).toBe(true)
    expect(confResult.status).toBe('METADATA_VALIDATED')

    // Verify KernelHost broker received and registered secret
    const kernelHandle = ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim')
    expect(kernelHandle.isAvailable).toBe(true)
    expect(ModelCredentialBroker.getInstance().resolveSecret(kernelHandle.credentialRef)).toBe(testSecret)

    // System projection in KernelHost reflects AVAILABLE providerStatus
    const sysProj = kernelHost.generateSystemProjection()
    expect(sysProj.modelIntelligenceSummary.providerStatus).toBe('AVAILABLE')
    expect(sysProj.onboardingSummary?.providerConfigured).toBe(true)

    // 3. Revoke provider through Main supervisor
    const revokeResult = await connectedSupervisor.configureProvider({
      providerId: 'nvidia-nim',
      apiKey: '',
    })

    expect(revokeResult.success).toBe(true)
    expect(revokeResult.status).toBe('AUTH_REQUIRED')

    // Verify KernelHost broker cleared secret
    expect(ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim').isAvailable).toBe(false)
    const sysProjRevoked = kernelHost.generateSystemProjection()
    expect(sysProjRevoked.modelIntelligenceSummary.providerStatus).toBe('AUTH_REQUIRED')
    expect(sysProjRevoked.onboardingSummary?.providerConfigured).toBe(false)

    await connectedSupervisor.shutdown()
  })

  it('KernelHost rejects CONFIGURE_PROVIDER_REQUEST when expectedKernelPid mismatches host instance', async () => {
    let receivedReply: any = null
    const kernelHost = new KernelHost({
      dataRoot: tempDir,
      pid: 4000,
      onMessage: (msg) => {
        receivedReply = msg
      },
    })

    await kernelHost.handleMessage({
      type: 'CONFIGURE_PROVIDER_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_mismatch_test',
      expectedKernelPid: 9999, // Mismatched PID
      providerId: 'nvidia-nim',
      apiKey: 'nvapi-should-be-rejected',
      timestamp: new Date().toISOString(),
    })

    expect(receivedReply).toBeDefined()
    expect(receivedReply.type).toBe('CONFIGURE_PROVIDER_RESPONSE')
    expect(receivedReply.success).toBe(false)
    expect(receivedReply.status).toBe('AUTH_REQUIRED')
    expect(receivedReply.maskedHandle).toBe('[HOST_MISMATCH]')
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
