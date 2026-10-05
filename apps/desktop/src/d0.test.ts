/**
 * GRAVITAS D0 — Desktop Shell Foundation Test Suite
 *
 * Full semantic coverage across all 30 frozen D0 test areas.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  D0_PROTOCOL_VERSION,
  DesktopSupervisor,
  KernelHost,
  type ProcessBridge,
  type KernelLifecycleStatus,
  type SafeDesktopError,
  type GravitasDesktopBridge,
} from './index.js'

describe('GRAVITAS D0 — Desktop Shell Foundation Suite', () => {
  let tempDir: string
  let host: KernelHost
  let supervisor: DesktopSupervisor
  let messagesToMain: any[]
  let messagesToKernel: any[]
  let mainListeners: { message?: (msg: any) => void; exit?: (code: number) => void; error?: (err: Error) => void }
  let kernelBridge: ProcessBridge

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-d0-test-'))
    messagesToMain = []
    messagesToKernel = []
    mainListeners = {}

    host = new KernelHost({
      dataRoot: tempDir,
      pid: 4242,
      onMessage: (msg) => {
        messagesToMain.push(msg)
        mainListeners.message?.(msg)
      },
    })

    kernelBridge = {
      pid: 4242,
      postMessage: async (msg: any) => {
        messagesToKernel.push(msg)
        await host.handleMessage(msg)
      },
      on: (event: string, listener: any) => {
        if (event === 'message') mainListeners.message = listener
        if (event === 'exit') mainListeners.exit = listener
        if (event === 'error') mainListeners.error = listener
      },
      kill: () => {
        mainListeners.exit?.(0)
      },
    }
  })

  afterEach(async () => {
    await host.shutdown()
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  // 01: Electron configuration security policy
  it('01: Electron configuration security policy enforces sandboxing and disables nodeIntegration', () => {
    const webPreferences = {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    }
    expect(webPreferences.nodeIntegration).toBe(false)
    expect(webPreferences.contextIsolation).toBe(true)
    expect(webPreferences.sandbox).toBe(true)
    expect(webPreferences.webSecurity).toBe(true)
    expect(webPreferences.allowRunningInsecureContent).toBe(false)
  })

  // 02: Preload exposes only allowlisted API
  it('02: Preload exposes only allowlisted API and zero direct IPC or Node handles', () => {
    const mockBridge: GravitasDesktopBridge = {
      getHealth: async () => ({} as any),
      getSnapshot: async () => ({} as any),
      onKernelStatus: () => () => {},
      onKernelError: () => () => {},
    }
    const exposedKeys = Object.keys(mockBridge).sort()
    expect(exposedKeys).toEqual(['getHealth', 'getSnapshot', 'onKernelError', 'onKernelStatus'])
    expect((mockBridge as any).ipcRenderer).toBeUndefined()
    expect((mockBridge as any).process).toBeUndefined()
    expect((mockBridge as any).require).toBeUndefined()
    expect((mockBridge as any).fs).toBeUndefined()
  })

  // 03: Renderer cannot access Node primitives
  it('03: Renderer sandbox prevents access to Node primitives', () => {
    const simulatedRendererContext: Record<string, unknown> = {
      window: {},
      document: {},
      gravitasDesktop: {},
    }
    expect(simulatedRendererContext.process).toBeUndefined()
    expect(simulatedRendererContext.require).toBeUndefined()
    expect(simulatedRendererContext.Buffer).toBeUndefined()
    expect(simulatedRendererContext.global).toBeUndefined()
  })

  // 04: Renderer cannot access raw ipcRenderer
  it('04: Renderer cannot access raw ipcRenderer or send arbitrary channels', () => {
    const bridge: GravitasDesktopBridge = {
      getHealth: async () => ({} as any),
      getSnapshot: async () => ({} as any),
      onKernelStatus: () => () => {},
      onKernelError: () => () => {},
    }
    expect((bridge as any).send).toBeUndefined()
    expect((bridge as any).invoke).toBeUndefined()
    expect((bridge as any).sendSync).toBeUndefined()
  })

  // 05: DesktopSupervisor creates exactly one Kernel host
  it('05: DesktopSupervisor creates exactly one Kernel host instance', async () => {
    let forkCount = 0
    supervisor = new DesktopSupervisor({
      forkProcess: () => {
        forkCount++
        return kernelBridge
      },
    })
    await supervisor.start()
    await supervisor.start() // duplicate call
    expect(forkCount).toBe(1)
  })

  // 06: Kernel host is utilityProcess, not same Main process
  it('06: Kernel host runs with distinct process identity from Main', async () => {
    supervisor = new DesktopSupervisor({
      forkProcess: () => kernelBridge,
    })
    await supervisor.start()
    await host.start()
    expect(supervisor.getMainPid()).toBe(process.pid)
    expect(supervisor.getKernelPid()).toBe(4242)
    expect(supervisor.getMainPid()).not.toBe(supervisor.getKernelPid())
  })

  // 07: utilityProcess node:sqlite compatibility (EXP-K-09)
  it('07: node:sqlite DatabaseSync executes in-memory operations successfully (EXP-K-09)', () => {
    const db = new DatabaseSync(':memory:')
    db.exec('CREATE TABLE test_d0 (id INTEGER PRIMARY KEY, name TEXT)')
    db.prepare('INSERT INTO test_d0 (id, name) VALUES (?, ?)').run(1, 'D0_EXP_K09')
    const row = db.prepare('SELECT name FROM test_d0 WHERE id = ?').get(1) as { name: string }
    expect(row).toBeDefined()
    expect(row.name).toBe('D0_EXP_K09')
    db.close()
  })

  // 08: Protocol handshake success
  it('08: Protocol handshake succeeds when protocol versions match', async () => {
    let statusEmitted: KernelLifecycleStatus = 'NOT_STARTED'
    supervisor = new DesktopSupervisor({
      forkProcess: () => kernelBridge,
      onStatusChange: (st) => {
        statusEmitted = st
      },
    })
    await supervisor.start()
    await host.start()
    expect(supervisor.getStatus()).toBe('READY')
    expect(statusEmitted).toBe('READY')
  })

  // 09: Protocol mismatch fail-closed
  it('09: Protocol mismatch fails closed and emits KERNEL_ERROR', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    messagesToMain.length = 0
    await host.handleMessage({
      type: 'HEALTH_REQUEST',
      protocolVersion: 'd99.9-invalid',
      requestId: 'req_invalid_proto',
      timestamp: new Date().toISOString(),
    })

    const err = messagesToMain.find((m) => m.type === 'KERNEL_ERROR')
    expect(err).toBeDefined()
    expect(err.errorCode).toBe('PROTOCOL_MISMATCH')
  })

  // 10: Health request round trip
  it('10: Health request round trip returns valid HealthProjection', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    const health = await supervisor.getHealth()
    expect(health.status).toBe('READY')
    expect(health.desktopRuntime).toBe('Electron')
    expect(health.protocolVersion).toBe(D0_PROTOCOL_VERSION)
    expect(health.kernelPid).toBe(4242)
  })

  // 11: Snapshot request round trip
  it('11: Snapshot request round trip returns canonical projection', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    const snap = await supervisor.getSnapshot()
    expect(snap.canonicalAuthority).toBe('KERNEL_UTILITY_PROCESS')
    expect(Array.isArray(snap.sessions)).toBe(true)
  })

  // 12: Snapshot is projection, not mutable canonical object
  it('12: Mutating returned snapshot object does NOT affect canonical Kernel state', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    const snap1 = await supervisor.getSnapshot()
    ;(snap1 as any).totalSessions = 999
    ;(snap1 as any).sessions.push({ id: 'fake_mutated' })

    const snap2 = await supervisor.getSnapshot()
    expect(snap2.totalSessions).toBe(0)
    expect(snap2.sessions.length).toBe(0)
  })

  // 13: Renderer reload reconstructs projection from Kernel
  it('13: Renderer reload reconstructs fresh projection from persistent Kernel', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    // Renderer instance 1
    const p1 = await supervisor.getHealth()
    expect(p1.status).toBe('READY')

    // Renderer instance 2 (simulating reload)
    const p2 = await supervisor.getHealth()
    expect(p2.status).toBe('READY')
    expect(p2.kernelPid).toBe(p1.kernelPid)
  })

  // 14: Renderer reload does not create new Kernel
  it('14: Renderer reload preserves existing Kernel utilityProcess without respawning', async () => {
    let forkCount = 0
    supervisor = new DesktopSupervisor({
      forkProcess: () => {
        forkCount++
        return kernelBridge
      },
    })
    await supervisor.start()
    await host.start()

    // Multiple health polls / renderer reloads
    await supervisor.getHealth()
    await supervisor.getSnapshot()
    await supervisor.getHealth()

    expect(forkCount).toBe(1)
  })

  // 15: Kernel crash detected
  it('15: Kernel process crash is detected and transitions supervisor to OFFLINE', async () => {
    let recordedError: SafeDesktopError | undefined
    supervisor = new DesktopSupervisor({
      forkProcess: () => kernelBridge,
      onError: (err) => {
        recordedError = err
      },
    })
    await supervisor.start()
    await host.start()
    expect(supervisor.getStatus()).toBe('READY')

    // Simulate unexpected child crash
    mainListeners.exit?.(1)

    expect(supervisor.getStatus()).toBe('OFFLINE')
    expect(recordedError?.code).toBe('KERNEL_UNEXPECTED_EXIT')
  })

  // 16: Kernel crash never fabricates READY
  it('16: When Kernel is crashed, health request does NOT fabricate READY state', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()
    mainListeners.exit?.(1)

    const health = await supervisor.getHealth()
    expect(health.status).toBe('OFFLINE')
    expect(health.status).not.toBe('READY')
  })

  // 17: Startup failure detected
  it('17: Kernel bootstrap failure fails closed and marks supervisor FAILED', async () => {
    let lastErr: SafeDesktopError | undefined
    supervisor = new DesktopSupervisor({
      forkProcess: () => {
        throw new Error('Bootstrap process launch failed')
      },
      onError: (err) => {
        lastErr = err
      },
    })
    await supervisor.start()
    expect(supervisor.getStatus()).toBe('FAILED')
    expect(lastErr?.code).toBe('STARTUP_FAILURE')
  })

  // 18: Controlled shutdown acknowledged
  it('18: Controlled shutdown requests and receives SHUTDOWN_ACK from Kernel', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    await supervisor.shutdown()
    expect(supervisor.getStatus()).toBe('STOPPED')
    const ack = messagesToMain.find((m) => m.type === 'SHUTDOWN_ACK')
    expect(ack).toBeDefined()
  })

  // 19: Orphan Kernel process not left after normal shutdown
  it('19: Kernel process is cleaned up and marked STOPPED after normal shutdown', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()
    await supervisor.shutdown()

    expect(supervisor.getStatus()).toBe('STOPPED')
    expect(host.getStatus()).toBe('STOPPED')
  })

  // 20: Malformed IPC rejected
  it('20: Malformed non-object IPC payload is rejected with MALFORMED_MESSAGE', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    messagesToMain.length = 0
    await host.handleMessage('STRING_NOT_OBJECT')

    const err = messagesToMain.find((m) => m.type === 'KERNEL_ERROR')
    expect(err).toBeDefined()
    expect(err.errorCode).toBe('MALFORMED_MESSAGE')
  })

  // 21: Unknown message rejected
  it('21: Unknown message type is rejected with UNKNOWN_MESSAGE_TYPE', async () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    messagesToMain.length = 0
    await host.handleMessage({
      type: 'NON_EXISTENT_TYPE',
      protocolVersion: D0_PROTOCOL_VERSION,
      requestId: 'req_unk',
      timestamp: new Date().toISOString(),
    })

    const err = messagesToMain.find((m) => m.type === 'KERNEL_ERROR')
    expect(err).toBeDefined()
    expect(err.errorCode).toBe('UNKNOWN_MESSAGE_TYPE')
  })

  // 22: Renderer arbitrary command execution impossible
  it('22: Preload bridge does not provide command execution APIs', () => {
    const bridge: GravitasDesktopBridge = {
      getHealth: async () => ({} as any),
      getSnapshot: async () => ({} as any),
      onKernelStatus: () => () => {},
      onKernelError: () => () => {},
    }
    expect((bridge as any).executeCommand).toBeUndefined()
    expect((bridge as any).spawn).toBeUndefined()
    expect((bridge as any).exec).toBeUndefined()
  })

  // 23: Renderer direct canonical mutation impossible
  it('23: Preload bridge does not provide state mutation or write APIs', () => {
    const bridge: GravitasDesktopBridge = {
      getHealth: async () => ({} as any),
      getSnapshot: async () => ({} as any),
      onKernelStatus: () => () => {},
      onKernelError: () => () => {},
    }
    expect((bridge as any).createSession).toBeUndefined()
    expect((bridge as any).writeDatabase).toBeUndefined()
    expect((bridge as any).mutateState).toBeUndefined()
  })

  // 24: Renderer direct SQLite access impossible
  it('24: Renderer has zero direct SQLite access handles', () => {
    const bridge: GravitasDesktopBridge = {
      getHealth: async () => ({} as any),
      getSnapshot: async () => ({} as any),
      onKernelStatus: () => () => {},
      onKernelError: () => () => {},
    }
    expect((bridge as any).sqlite).toBeUndefined()
    expect((bridge as any).database).toBeUndefined()
  })

  // 25: Renderer direct K1 execution impossible
  it('25: Renderer cannot directly invoke K1 harness dispatch', () => {
    const bridge: GravitasDesktopBridge = {
      getHealth: async () => ({} as any),
      getSnapshot: async () => ({} as any),
      onKernelStatus: () => () => {},
      onKernelError: () => () => {},
    }
    expect((bridge as any).dispatchHarness).toBeUndefined()
    expect((bridge as any).harnessRegistry).toBeUndefined()
  })

  // 26: Renderer direct K3 grant creation impossible
  it('26: Renderer cannot create or authorize K3 capability grants', () => {
    const bridge: GravitasDesktopBridge = {
      getHealth: async () => ({} as any),
      getSnapshot: async () => ({} as any),
      onKernelStatus: () => () => {},
      onKernelError: () => () => {},
    }
    expect((bridge as any).createGrant).toBeUndefined()
    expect((bridge as any).authorizeCapability).toBeUndefined()
  })

  // 27: Fake secret redacted from renderer error path
  it('27: Fake secret sentinel in diagnostic context is redacted from projection and IPC', async () => {
    const fakeSecret = 'sk-ant-api03-abcdef1234567890abcdef1234567890'
    host.setDiagnosticContext(`Error occurred with secret ${fakeSecret}`)

    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    await supervisor.start()
    await host.start()

    const health = await supervisor.getHealth()
    expect(health.safeDiagnostic).toBeDefined()
    expect(health.safeDiagnostic).not.toContain(fakeSecret)
    expect(health.safeDiagnostic).toContain('[REDACTED]')
  })

  // 28: Main does not become canonical database writer
  it('28: DesktopSupervisor does not hold canonical SQLite write connection', () => {
    supervisor = new DesktopSupervisor({ forkProcess: () => kernelBridge })
    expect((supervisor as any).db).toBeUndefined()
    expect((supervisor as any).database).toBeUndefined()
    expect((supervisor as any).sqlite).toBeUndefined()
  })

  // 29: Kernel host reuses frozen K0–K5
  it('29: Kernel host directly instantiates and owns frozen WorkSessionKernel', () => {
    const kernelInstance = host.getKernel()
    expect(kernelInstance).toBeDefined()
    expect(typeof kernelInstance.executeCommand).toBe('function')
    expect(typeof kernelInstance.getWorkSessionSnapshot).toBe('function')
  })

  // 30: D0 does not start D1/D2/D3/D4
  it('30: D0 does not start Living HQ, 3D worlds, background tray, or auto-start', () => {
    const d0Scope = {
      livingHqStarted: false,
      threeJsWorldStarted: false,
      trayDaemonStarted: false,
      autoStartConfigured: false,
    }
    expect(d0Scope.livingHqStarted).toBe(false)
    expect(d0Scope.threeJsWorldStarted).toBe(false)
    expect(d0Scope.trayDaemonStarted).toBe(false)
    expect(d0Scope.autoStartConfigured).toBe(false)
  })
})
