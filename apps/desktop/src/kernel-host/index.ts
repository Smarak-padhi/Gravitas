/**
 * GRAVITAS D0 — Kernel Host Entry Point
 *
 * Invoked by Electron utilityProcess.fork().
 */

import { KernelHost } from './kernelHost.js'

export * from './kernelHost.js'

// Automatically start if executed as a utilityProcess
if (process.parentPort) {
  const host = new KernelHost()

  process.parentPort.on('message', async (event: { data: unknown }) => {
    await host.handleMessage(event.data)
  })

  host.start().catch((err) => {
    console.error('Failed to start KernelHost in utilityProcess:', err)
  })
}
