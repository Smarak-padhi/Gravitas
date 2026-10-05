/**
 * GRAVITAS D0 — Negative Real Electron Dogfood Verification Harness
 *
 * Proves that an incompatible protocol, startup failure, or renderer privilege attempt
 * fails closed without inventing canonical state or exposing host privileges.
 */

import { app, BrowserWindow, utilityProcess, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DesktopSupervisor } from '../dist/main/supervisor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '../dist')
const PRELOAD_PATH = join(DIST_DIR, 'preload/index.cjs')
const RENDERER_HTML_PATH = join(__dirname, 'renderer/index.html')

app.on('window-all-closed', (e) => {
  // Prevent premature exit before async dogfood completes
})

app.whenReady().then(async () => {
  const results = []

  try {
    console.log('[NEGATIVE_D0_DOGFOOD] Starting comprehensive negative fixtures in live Electron...')

    // 1. PROTOCOL_MISMATCH_FAILS_CLOSED
    {
      const supervisor = new DesktopSupervisor({
        forkProcess: () => {
          let msgHandler = null
          return {
            pid: 9991,
            postMessage: (m) => {
              if (m.type === 'HEALTH_REQUEST') {
                msgHandler?.({
                  type: 'KERNEL_ERROR',
                  protocolVersion: 'd99.9-invalid',
                  errorCode: 'PROTOCOL_MISMATCH',
                  safeMessage: 'Protocol mismatch: expected d0.1, got d99.9',
                  correlationId: m.requestId,
                  timestamp: new Date().toISOString(),
                })
              } else if (m.type === 'SHUTDOWN_REQUEST') {
                msgHandler?.({
                  type: 'SHUTDOWN_ACK',
                  protocolVersion: 'd0.1',
                  requestId: m.requestId,
                  timestamp: new Date().toISOString(),
                })
              }
            },
            on: (ev, cb) => {
              if (ev === 'message') msgHandler = cb
            },
            kill: () => {},
          }
        },
      })
      await supervisor.start()
      const health = await supervisor.getHealth()
      const passed = health.status !== 'READY'
      results.push({
        fixture: 'PROTOCOL_MISMATCH_FAILS_CLOSED',
        passed,
        details: `Supervisor status is ${health.status} (READY not fabricated)`,
      })
      await supervisor.shutdown()
    }

    // 2. STARTUP_BEFORE_READY_FAILURE
    {
      const supervisor = new DesktopSupervisor({
        forkProcess: () => {
          throw new Error('Simulated process spawn failure')
        },
      })
      await supervisor.start()
      const passed = supervisor.getStatus() === 'FAILED'
      results.push({
        fixture: 'STARTUP_BEFORE_READY_FAILURE',
        passed,
        details: `Supervisor transitioned to ${supervisor.getStatus()} on launch failure`,
      })
    }

    // 3. RENDERER_NODE_GLOBALS_BLOCKED & 4. PRELOAD_BRIDGE_ENUMERATION
    {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
          preload: PRELOAD_PATH,
        },
      })
      await win.loadFile(RENDERER_HTML_PATH)

      const evalResult = await win.webContents.executeJavaScript(`
        ({
          hasProcess: typeof process !== 'undefined',
          hasRequire: typeof require !== 'undefined',
          hasBuffer: typeof Buffer !== 'undefined',
          hasGlobal: typeof global !== 'undefined',
          bridgeKeys: window.gravitasDesktop ? Object.keys(window.gravitasDesktop).sort() : [],
          hasRawIpc: !!(window.gravitasDesktop && (window.gravitasDesktop.send || window.gravitasDesktop.invoke || window.gravitasDesktop.ipcRenderer)),
          hasDispatch: !!(window.gravitasDesktop && (window.gravitasDesktop.dispatch || window.gravitasDesktop.execute || window.gravitasDesktop.dispatchPrompt))
        })
      `)

      const nodeBlocked = !evalResult.hasProcess && !evalResult.hasRequire && !evalResult.hasBuffer
      results.push({
        fixture: 'RENDERER_NODE_GLOBALS_BLOCKED',
        passed: nodeBlocked,
        details: `process=${evalResult.hasProcess}, require=${evalResult.hasRequire}, Buffer=${evalResult.hasBuffer}`,
      })

      const expectedBridgeKeys = ['getHealth', 'getSnapshot', 'onKernelError', 'onKernelStatus']
      const bridgeExactMatch = JSON.stringify(evalResult.bridgeKeys) === JSON.stringify(expectedBridgeKeys)
      const noDangerousBridge = !evalResult.hasRawIpc && !evalResult.hasDispatch
      results.push({
        fixture: 'PRELOAD_BRIDGE_ENUMERATION',
        passed: bridgeExactMatch && noDangerousBridge,
        details: `Exposed keys: [${evalResult.bridgeKeys.join(', ')}]; rawIpc=${evalResult.hasRawIpc}; dispatch=${evalResult.hasDispatch}`,
      })

      win.destroy()
    }

    // 5. CONTROLLED_SHUTDOWN_AND_NO_ORPHAN
    {
      const KERNEL_HOST_PATH = join(DIST_DIR, 'kernel-host/index.mjs')
      let child = utilityProcess.fork(KERNEL_HOST_PATH)
      for (let i = 0; i < 20 && !child.pid; i++) {
        await new Promise((r) => setTimeout(r, 50))
      }
      let receivedPid = child.pid
      child.kill()
      // Wait for exit
      await new Promise((r) => setTimeout(r, 200))
      let processExists = true
      try {
        if (receivedPid) {
          process.kill(receivedPid, 0)
        } else {
          processExists = false
        }
      } catch {
        processExists = false
      }
      results.push({
        fixture: 'CONTROLLED_SHUTDOWN_AND_NO_ORPHAN',
        passed: !processExists,
        details: `Kernel PID ${receivedPid} existence check after termination: processExists=${processExists}`,
      })
    }

    const allPassed = results.every((r) => r.passed)
    console.log('\n=== NEGATIVE_D0_DOGFOOD_COMPLETE ===')
    console.log(JSON.stringify({ success: allPassed, fixturesCount: results.length, results }, null, 2))

    app.exit(allPassed ? 0 : 1)
  } catch (err) {
    console.error('NEGATIVE_D0_DOGFOOD_FAILED:', err)
    app.exit(1)
  }
})
