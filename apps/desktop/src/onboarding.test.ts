import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fork, type ChildProcess } from 'node:child_process'
import { DesktopSupervisor } from './main/supervisor.js'
import { isAuthorizedRestartCaller } from './main/index.js'
import { KernelHost } from './kernel-host/kernelHost.js'
import { ModelCredentialBroker } from '@gravitas/gateways'
import { readGravitasConfig } from '@gravitas/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('GRAVITAS Desktop Onboarding & Doctor Subsystem (Wave V1-C-R2)', () => {
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
    let mockListener: ((msg: unknown) => void) | undefined
    const mockBridge = {
      pid: 6100,
      postMessage: (msg: any) => {
        if (msg.type === 'CONFIGURE_PROVIDER_REQUEST') {
          queueMicrotask(() => {
            mockListener?.({
              type: 'CONFIGURE_PROVIDER_RESPONSE',
              protocolVersion: 'd1.0',
              requestId: msg.requestId,
              kernelPid: 6100,
              kernelInstanceId: 'inst_test_01',
              op: msg.op ?? 'CONFIGURE',
              generation: msg.generation ?? 1,
              success: true,
              providerId: 'nvidia-nim',
              maskedHandle: 'CREDENTIAL_PRESENT:nvidia-nim',
              status: 'METADATA_VALIDATED',
              timestamp: new Date().toISOString(),
            })
          })
        }
      },
      on: (event: string, l: any) => {
        if (event === 'message') {
          mockListener = l
          queueMicrotask(() => {
            l({
              type: 'HELLO',
              protocolVersion: 'd1.0',
              kernelPid: 6100,
              kernelInstanceId: 'inst_test_01',
              nodeVersion: process.version,
              timestamp: new Date().toISOString(),
            })
          })
        }
      },
      kill: () => {},
    }

    const testSup = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => mockBridge,
    })
    await testSup.start()

    // 1. Configure secret
    await testSup.configureProvider({
      providerId: 'nvidia-nim',
      apiKey: 'nvapi-secret-to-be-lost-on-restart',
    })
    const obActive = await testSup.getOnboarding()
    expect(obActive.providerConfigured).toBe(true)

    // 2. Simulate process exit / restart: in-memory broker is wiped, disk config remains
    ModelCredentialBroker.getInstance().clearSecret('nvidia-nim')

    // 3. Truthful reporting: disk says true, but broker is empty -> returns false
    const obRestart = await testSup.getOnboarding()
    expect(obRestart.providerConfigured).toBe(false)
  })

  it('crosses real OS process boundary with distinct PIDs, independent broker memory, handoff, and revocation', async () => {
    const workerPath = path.resolve(__dirname, 'test-fixtures/isolated-kernel-worker.ts')
    let childProc: ChildProcess | undefined

    const forkProcess = () => {
      childProc = fork(workerPath, [], {
        execArgv: ['--import', 'tsx'],
        env: {
          ...process.env,
          GRAVITAS_DATA_ROOT: tempDir,
        },
      })

      return {
        postMessage: (msg: unknown) => childProc!.send(msg),
        on: (event: string, listener: any) => childProc!.on(event as any, listener),
        kill: () => childProc!.kill(),
        pid: childProc.pid,
      }
    }

    const procSupervisor = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess,
    })

    try {
      await procSupervisor.start()

      // Wait until supervisor status is READY
      for (let i = 0; i < 50; i++) {
        if (procSupervisor.getStatus() === 'READY') break
        await new Promise((r) => setTimeout(r, 100))
      }
      expect(procSupervisor.getStatus()).toBe('READY')

      const parentPid = process.pid
      const hostPid = procSupervisor.getKernelPid()
      const hostInstanceId = procSupervisor.getKernelInstanceId()

      // 1. PROVE REAL PROCESS BOUNDARY
      expect(hostPid).toBeGreaterThan(0)
      expect(parentPid).not.toBe(hostPid)
      expect(hostInstanceId).toBeDefined()

      // 2. Host starts without credential (AUTH_REQUIRED)
      const sysInitial = await procSupervisor.getSystem()
      expect(sysInitial.modelIntelligenceSummary.providerStatus).toBe('AUTH_REQUIRED')
      expect(procSupervisor.isExecutionCredentialReady('nvidia-nim')).toBe(false)

      // 3. Configure provider via Main supervisor
      const testSecret = 'nvapi-real-process-boundary-key-999'
      const confRes = await procSupervisor.configureProvider({
        providerId: 'nvidia-nim',
        apiKey: testSecret,
      })
      expect(confRes.success).toBe(true)
      expect(confRes.status).toBe('METADATA_VALIDATED')
      expect(procSupervisor.isExecutionCredentialReady('nvidia-nim')).toBe(true)

      // 4. Host confirms credential availability
      const sysConfigured = await procSupervisor.getSystem()
      expect(sysConfigured.modelIntelligenceSummary.providerStatus).toBe('AVAILABLE')
      expect(sysConfigured.onboardingSummary?.providerConfigured).toBe(true)

      // 5. Revocation clears credential from host
      const revokeRes = await procSupervisor.configureProvider({
        providerId: 'nvidia-nim',
        apiKey: '',
      })
      expect(revokeRes.success).toBe(true)
      expect(revokeRes.status).toBe('AUTH_REQUIRED')
      expect(procSupervisor.isExecutionCredentialReady('nvidia-nim')).toBe(false)

      const sysRevoked = await procSupervisor.getSystem()
      expect(sysRevoked.modelIntelligenceSummary.providerStatus).toBe('AUTH_REQUIRED')
      expect(sysRevoked.onboardingSummary?.providerConfigured).toBe(false)
    } finally {
      await procSupervisor.shutdown()
      if (childProc && !childProc.killed) {
        childProc.kill()
      }
    }
  }, 15000)

  it('immediately rejects pending requests and clears readiness when kernel process exits unexpectedly', async () => {
    let exitListener: ((code: number) => void) | undefined
    const mockBridge = {
      pid: 8888,
      postMessage: (_msg: unknown) => {
        // Intentionally do not respond; simulate hanging or in-flight request
      },
      on: (event: string, l: any) => {
        if (event === 'exit') exitListener = l
        if (event === 'message') {
          queueMicrotask(() => {
            l({
              type: 'HELLO',
              protocolVersion: 'd1.0',
              kernelPid: 8888,
              kernelInstanceId: 'inst_exit_test',
              nodeVersion: process.version,
              timestamp: new Date().toISOString(),
            })
          })
        }
      },
      kill: () => {},
    }

    const testSup = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => mockBridge,
    })

    await testSup.start()
    expect(testSup.getStatus()).toBe('READY')

    // Start an in-flight request
    const pendingPromise = testSup.getHealth()

    // Simulate unexpected crash/exit of kernel process before response
    exitListener?.(1)

    // Pending request must immediately reject with explicit error
    await expect(pendingPromise).rejects.toThrow('Kernel host terminated before responding')
    expect(testSup.getStatus()).toBe('OFFLINE')
    expect(testSup.isExecutionCredentialReady('nvidia-nim')).toBe(false)
  })

  it('safely handles concurrent configure and revoke so stale ACKs cannot mark provider ready', async () => {
    let replyCallback: ((msg: any) => void) | undefined
    const interceptedRequests: any[] = []

    const mockBridge = {
      pid: 5555,
      postMessage: (msg: any) => {
        interceptedRequests.push(msg)
      },
      on: (event: string, l: any) => {
        if (event === 'message') {
          replyCallback = l
          queueMicrotask(() => {
            l({
              type: 'HELLO',
              protocolVersion: 'd1.0',
              kernelPid: 5555,
              kernelInstanceId: 'inst_race_test',
              nodeVersion: process.version,
              timestamp: new Date().toISOString(),
            })
          })
        }
      },
      kill: () => {},
    }

    const testSup = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => mockBridge,
    })
    await testSup.start()

    // Trigger configure
    const p1 = testSup.configureProvider({ providerId: 'nvidia-nim', apiKey: 'nvapi-race-1' })

    // Immediately trigger revoke before p1 is acknowledged
    const p2 = testSup.configureProvider({ providerId: 'nvidia-nim', apiKey: '' })

    // Simulate delayed response for p1 arriving AFTER p2 was initiated
    const req1 = interceptedRequests.find((r) => r.op === 'CONFIGURE')
    if (req1 && replyCallback) {
      replyCallback({
        type: 'CONFIGURE_PROVIDER_RESPONSE',
        protocolVersion: 'd1.0',
        requestId: req1.requestId,
        kernelPid: 5555,
        kernelInstanceId: 'inst_race_test',
        op: 'CONFIGURE',
        generation: 1,
        success: true,
        providerId: 'nvidia-nim',
        maskedHandle: 'CREDENTIAL_PRESENT:nvidia-nim',
        status: 'METADATA_VALIDATED',
        timestamp: new Date().toISOString(),
      })
    }

    // Acknowledge revoke p2
    const req2 = interceptedRequests.find((r) => r.op === 'REVOKE')
    if (req2 && replyCallback) {
      replyCallback({
        type: 'CONFIGURE_PROVIDER_RESPONSE',
        protocolVersion: 'd1.0',
        requestId: req2.requestId,
        kernelPid: 5555,
        kernelInstanceId: 'inst_race_test',
        op: 'REVOKE',
        generation: 1,
        success: true,
        providerId: 'nvidia-nim',
        maskedHandle: '[NO_CREDENTIAL]',
        status: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
      })
    }

    await Promise.all([p1, p2])

    // Invariant: stale p1 configure ACK did NOT overwrite revoke; execution credential is NOT ready
    expect(testSup.isExecutionCredentialReady('nvidia-nim')).toBe(false)
    const ob = await testSup.getOnboarding()
    expect(ob.providerConfigured).toBe(false)
  })

  it('fails closed when HELLO credential resynchronization is rejected by host', async () => {
    ModelCredentialBroker.getInstance().registerSecret('nvidia-nim', 'nvapi-resync-fail-test')

    let replyCallback: ((msg: any) => void) | undefined
    const mockBridge = {
      pid: 7777,
      postMessage: (msg: any) => {
        if (msg.type === 'CONFIGURE_PROVIDER_REQUEST') {
          // Reject resync
          queueMicrotask(() => {
            replyCallback?.({
              type: 'CONFIGURE_PROVIDER_RESPONSE',
              protocolVersion: 'd1.0',
              requestId: msg.requestId,
              kernelPid: 7777,
              kernelInstanceId: 'inst_resync_fail',
              op: 'CONFIGURE',
              generation: 1,
              success: false,
              providerId: 'nvidia-nim',
              maskedHandle: '[ERROR]',
              status: 'AUTH_REQUIRED',
              error: 'Host rejected resync test',
              timestamp: new Date().toISOString(),
            })
          })
        }
      },
      on: (event: string, l: any) => {
        if (event === 'message') {
          replyCallback = l
          queueMicrotask(() => {
            l({
              type: 'HELLO',
              protocolVersion: 'd1.0',
              kernelPid: 7777,
              kernelInstanceId: 'inst_resync_fail',
              nodeVersion: process.version,
              timestamp: new Date().toISOString(),
            })
          })
        }
      },
      kill: () => {},
    }

    let reportedError: any = null
    const testSup = new DesktopSupervisor({
      dataRoot: tempDir,
      forkProcess: () => mockBridge,
      onError: (err) => {
        reportedError = err
      },
    })

    await testSup.start()

    // Wait for resync attempt to complete
    await new Promise((r) => setTimeout(r, 200))

    expect(testSup.isExecutionCredentialReady('nvidia-nim')).toBe(false)
    const ob = await testSup.getOnboarding()
    expect(ob.providerConfigured).toBe(false)
    expect(reportedError).toBeDefined()
    expect(reportedError.code).toBe('CREDENTIAL_SYNC_REJECTED')
  })

  it('KernelHost rejects CONFIGURE_PROVIDER_REQUEST when expectedKernelInstanceId mismatches', async () => {
    let receivedReply: any = null
    const kernelHost = new KernelHost({
      dataRoot: tempDir,
      pid: 4001,
      kernelInstanceId: 'real_instance_uuid_123',
      onMessage: (msg) => {
        receivedReply = msg
      },
    })

    await kernelHost.handleMessage({
      type: 'CONFIGURE_PROVIDER_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_inst_mismatch_test',
      expectedKernelInstanceId: 'fake_instance_uuid_999',
      expectedKernelPid: 4001,
      op: 'CONFIGURE',
      generation: 1,
      providerId: 'nvidia-nim',
      apiKey: 'nvapi-should-be-rejected',
      timestamp: new Date().toISOString(),
    })

    expect(receivedReply).toBeDefined()
    expect(receivedReply.type).toBe('CONFIGURE_PROVIDER_RESPONSE')
    expect(receivedReply.success).toBe(false)
    expect(receivedReply.status).toBe('AUTH_REQUIRED')
    expect(receivedReply.maskedHandle).toBe('[INSTANCE_MISMATCH]')
    expect(ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim').isAvailable).toBe(false)
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
      op: 'CONFIGURE',
      generation: 1,
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

  it('supervisor rejects unsupported provider ID with AUTH_REQUIRED', async () => {
    const res = await supervisor.configureProvider({
      providerId: 'unsupported-provider' as any,
      apiKey: 'secret',
    })
    expect(res.success).toBe(false)
    expect(res.maskedHandle).toBe('[UNSUPPORTED_PROVIDER]')
    expect(res.status).toBe('AUTH_REQUIRED')
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

  describe('V1-C-R3 Lifecycle and Host Restart Falsification Tests', () => {
    it('clears kernelProcess on unexpected exit and allows explicit start() to launch replacement', async () => {
      let activeBridge: any = null
      let exitHandler: ((code: number) => void) | null = null
      let messageHandler: ((msg: any) => void) | null = null
      let forkCount = 0

      const sup = new DesktopSupervisor({
        dataRoot: tempDir,
        forkProcess: () => {
          forkCount++
          const currentPid = 6000 + forkCount
          const bridge = {
            pid: currentPid,
            postMessage: (msg: any) => {
              if (msg.type === 'HELLO') {
                // not expected from main to kernel
              }
            },
            on: (event: string, handler: any) => {
              if (event === 'exit') exitHandler = handler
              if (event === 'message') messageHandler = handler
            },
            kill: () => {},
          }
          activeBridge = bridge
          return bridge
        },
      })

      // 1. Initial start
      await sup.start()
      expect(sup.getStatus()).toBe('STARTING')
      expect(sup.getGeneration()).toBe(1)
      expect(sup.getKernelPid()).toBe(6001)

      // Simulate HELLO from host 1
      messageHandler!({
        type: 'HELLO',
        kernelPid: 6001,
        nodeVersion: 'v20.0.0',
        kernelInstanceId: 'inst_uuid_1',
      })
      expect(sup.getStatus()).toBe('READY')
      expect(sup.getKernelInstanceId()).toBe('inst_uuid_1')

      // 2. Simulate unexpected exit of host 1
      exitHandler!(1)
      expect(sup.getStatus()).toBe('OFFLINE')
      expect(sup.getKernelPid()).toBe(0)
      expect(sup.getKernelInstanceId()).toBeUndefined()

      // 3. Restart supervisor -> MUST succeed and not exit early
      await sup.start()
      expect(sup.getStatus()).toBe('STARTING')
      expect(sup.getGeneration()).toBe(2)
      expect(sup.getKernelPid()).toBe(6002)

      // Simulate HELLO from host 2
      messageHandler!({
        type: 'HELLO',
        kernelPid: 6002,
        nodeVersion: 'v20.0.0',
        kernelInstanceId: 'inst_uuid_2',
      })
      expect(sup.getStatus()).toBe('READY')
      expect(sup.getKernelInstanceId()).toBe('inst_uuid_2')
    })

    it('handles process error followed by exit idempotently without corrupting state', async () => {
      let errorHandler: ((err: Error) => void) | null = null
      let exitHandler: ((code: number) => void) | null = null
      let errorsReported: any[] = []

      const sup = new DesktopSupervisor({
        dataRoot: tempDir,
        forkProcess: () => ({
          pid: 7001,
          postMessage: () => {},
          on: (event: string, handler: any) => {
            if (event === 'error') errorHandler = handler
            if (event === 'exit') exitHandler = handler
          },
          kill: () => {},
        }),
        onError: (err) => errorsReported.push(err),
      })

      await sup.start()
      expect(sup.getStatus()).toBe('STARTING')

      // 1. Error event occurs
      errorHandler!(new Error('Process spawned error'))
      expect(sup.getStatus()).toBe('FAILED')
      expect(sup.getKernelPid()).toBe(0)
      expect(errorsReported.length).toBe(1)
      expect(errorsReported[0].code).toBe('KERNEL_PROCESS_ERROR')

      // 2. Follow-on exit event occurs for the SAME process -> must be a no-op
      exitHandler!(1)
      expect(sup.getStatus()).toBe('FAILED')
      expect(sup.getKernelPid()).toBe(0)
      // No duplicate error pushed for the already-terminated process
      expect(errorsReported.length).toBe(1)

      // 3. Restart works after error
      await sup.start()
      expect(sup.getStatus()).toBe('STARTING')
      expect(sup.getGeneration()).toBe(2)
    })

    it('ignores late termination events from a retired previous host', async () => {
      let host1Exit: ((code: number) => void) | null = null
      let host2Message: ((msg: any) => void) | null = null
      let launchCount = 0

      const sup = new DesktopSupervisor({
        dataRoot: tempDir,
        forkProcess: () => {
          launchCount++
          const pid = 8000 + launchCount
          return {
            pid,
            postMessage: () => {},
            on: (event: string, handler: any) => {
              if (launchCount === 1 && event === 'exit') host1Exit = handler
              if (launchCount === 2 && event === 'message') host2Message = handler
            },
            kill: () => {},
          }
        },
      })

      await sup.start()
      expect(sup.getKernelPid()).toBe(8001)

      // Force host 1 termination so supervisor clears reference
      host1Exit!(1)
      expect(sup.getStatus()).toBe('OFFLINE')

      // Launch host 2
      await sup.start()
      expect(sup.getKernelPid()).toBe(8002)
      host2Message!({
        type: 'HELLO',
        kernelPid: 8002,
        nodeVersion: 'v20.0.0',
        kernelInstanceId: 'inst_uuid_host2',
      })
      expect(sup.getStatus()).toBe('READY')

      // Now host 1 fires a late exit or error event
      host1Exit!(0)
      // Host 2 must remain untouched
      expect(sup.getStatus()).toBe('READY')
      expect(sup.getKernelPid()).toBe(8002)
      expect(sup.getKernelInstanceId()).toBe('inst_uuid_host2')
    })

    it('rejects in-flight pending requests synchronously when host terminates', async () => {
      let exitHandler: ((code: number) => void) | null = null
      let messageHandler: ((msg: any) => void) | null = null

      const sup = new DesktopSupervisor({
        dataRoot: tempDir,
        forkProcess: () => ({
          pid: 9001,
          postMessage: () => {},
          on: (event: string, handler: any) => {
            if (event === 'exit') exitHandler = handler
            if (event === 'message') messageHandler = handler
          },
          kill: () => {},
        }),
      })

      await sup.start()
      messageHandler!({
        type: 'HELLO',
        kernelPid: 9001,
        nodeVersion: 'v20.0.0',
        kernelInstanceId: 'inst_uuid_9001',
      })

      // Initiate in-flight request
      const healthPromise = sup.getHealth()

      // Host terminates unexpectedly
      exitHandler!(1)

      // Pending request MUST reject with kernel termination error
      await expect(healthPromise).rejects.toThrow('Kernel host terminated before responding')
    })

    it('resynchronizes retained Main credentials to new host upon restart', async () => {
      let messageHandler: ((msg: any) => void) | null = null
      let exitHandler: ((code: number) => void) | null = null
      let lastPostedMessage: any = null
      let forkCount = 0

      const sup = new DesktopSupervisor({
        dataRoot: tempDir,
        forkProcess: () => {
          forkCount++
          const pid = 9500 + forkCount
          return {
            pid,
            postMessage: (msg: any) => {
              lastPostedMessage = msg
            },
            on: (event: string, handler: any) => {
              if (event === 'message') messageHandler = handler
              if (event === 'exit') exitHandler = handler
            },
            kill: () => {},
          }
        },
      })

      // 1. Initial start & configure provider
      await sup.start()
      messageHandler!({
        type: 'HELLO',
        kernelPid: 9501,
        nodeVersion: 'v20.0.0',
        kernelInstanceId: 'inst_uuid_9501',
      })

      // Supervisor configures provider in Main and tells host
      const confPromise = sup.configureProvider({
        providerId: 'nvidia-nim',
        apiKey: 'nvapi-synthetic-key-test',
      })

      expect(lastPostedMessage.type).toBe('CONFIGURE_PROVIDER_REQUEST')
      expect(lastPostedMessage.op).toBe('CONFIGURE')
      expect(lastPostedMessage.expectedKernelInstanceId).toBe('inst_uuid_9501')

      // ACK from host 1
      messageHandler!({
        type: 'CONFIGURE_PROVIDER_RESPONSE',
        protocolVersion: 'd1.0',
        requestId: lastPostedMessage.requestId,
        kernelInstanceId: 'inst_uuid_9501',
        kernelPid: 9501,
        generation: 1,
        op: 'CONFIGURE',
        providerId: 'nvidia-nim',
        success: true,
        maskedHandle: 'nvapi-synt...',
        status: 'METADATA_VALIDATED',
        timestamp: new Date().toISOString(),
      })

      await confPromise
      expect(sup.isExecutionCredentialReady('nvidia-nim')).toBe(true)

      // 2. Host 1 crashes
      exitHandler!(1)
      expect(sup.isExecutionCredentialReady('nvidia-nim')).toBe(false)

      // 3. Supervisor restarts (host 2 spawned)
      await sup.start()
      expect(sup.isExecutionCredentialReady('nvidia-nim')).toBe(false)

      // Host 2 sends HELLO
      lastPostedMessage = null
      messageHandler!({
        type: 'HELLO',
        kernelPid: 9502,
        nodeVersion: 'v20.0.0',
        kernelInstanceId: 'inst_uuid_9502',
      })

      // Supervisor MUST automatically initiate credential sync to host 2
      expect(lastPostedMessage).toBeDefined()
      expect(lastPostedMessage.type).toBe('CONFIGURE_PROVIDER_REQUEST')
      expect(lastPostedMessage.expectedKernelInstanceId).toBe('inst_uuid_9502')
      expect(lastPostedMessage.expectedKernelPid).toBe(9502)

      // Host 2 ACKs
      messageHandler!({
        type: 'CONFIGURE_PROVIDER_RESPONSE',
        protocolVersion: 'd1.0',
        requestId: lastPostedMessage.requestId,
        kernelInstanceId: 'inst_uuid_9502',
        kernelPid: 9502,
        generation: 2,
        op: 'CONFIGURE',
        providerId: 'nvidia-nim',
        success: true,
        maskedHandle: 'nvapi-synt...',
        status: 'METADATA_VALIDATED',
        timestamp: new Date().toISOString(),
      })

      // Allow async tick for sync resolution
      await new Promise((r) => setTimeout(r, 10))
      expect(sup.isExecutionCredentialReady('nvidia-nim')).toBe(true)
    })
  })

  describe('V1-C-R4 Restart IPC Caller Authorization Tests', () => {
    it('authorizes invocation from active authorized main window loading canonical renderer HTML', () => {
      const mockWebContents = {}
      const mockWindow = {
        isDestroyed: () => false,
        webContents: mockWebContents,
      } as any

      const mockEvent = {
        sender: mockWebContents,
        senderFrame: {
          parent: null,
          url: pathToFileURL(path.resolve(__dirname, 'renderer/index.html')).href,
        },
      } as any

      mockEvent.sender.mainFrame = mockEvent.senderFrame
      expect(isAuthorizedRestartCaller(mockEvent, mockWindow)).toBe(true)
    })

    it('rejects invocation when active window is null or destroyed', () => {
      const mockWebContents = {}
      const mockEvent = {
        sender: mockWebContents,
        senderFrame: {
          parent: null,
          url: pathToFileURL(path.resolve(__dirname, 'renderer/index.html')).href,
        },
      } as any

      expect(isAuthorizedRestartCaller(mockEvent, null)).toBe(false)

      const destroyedWindow = {
        isDestroyed: () => true,
        webContents: mockWebContents,
      } as any
      expect(isAuthorizedRestartCaller(mockEvent, destroyedWindow)).toBe(false)
    })

    it('rejects invocation when event.sender does not match authorized window webContents', () => {
      const authorizedWebContents = { id: 'win1' }
      const unauthorizedWebContents = { id: 'other' }

      const mockWindow = {
        isDestroyed: () => false,
        webContents: authorizedWebContents,
      } as any

      const mockEvent = {
        sender: unauthorizedWebContents,
        senderFrame: {
          parent: null,
          url: pathToFileURL(path.resolve(__dirname, 'renderer/index.html')).href,
        },
      } as any

      expect(isAuthorizedRestartCaller(mockEvent, mockWindow)).toBe(false)
    })

    it('rejects invocation originating from a subframe or iframe', () => {
      const mockWebContents = {}
      const mockWindow = {
        isDestroyed: () => false,
        webContents: mockWebContents,
      } as any

      const mockEvent = {
        sender: mockWebContents,
        senderFrame: {
          parent: { parent: null }, // nested frame / iframe
          url: pathToFileURL(path.resolve(__dirname, 'renderer/index.html')).href,
        },
      } as any

      expect(isAuthorizedRestartCaller(mockEvent, mockWindow)).toBe(false)
    })

    it('rejects invocation from an unexpected document URL or scheme', () => {
      const mockWebContents = {}
      const mockWindow = {
        isDestroyed: () => false,
        webContents: mockWebContents,
      } as any

      const mockEvent = {
        sender: mockWebContents,
        senderFrame: {
          parent: null,
          url: 'file:///C:/Users/smara/AppData/Local/Temp/evil.html',
        },
      } as any

      expect(isAuthorizedRestartCaller(mockEvent, mockWindow)).toBe(false)
    })
  })
})

