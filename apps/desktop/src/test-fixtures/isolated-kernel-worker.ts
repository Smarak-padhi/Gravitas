/**
 * GRAVITAS V1-C-R2 — Real OS Process Isolated Kernel Worker Fixture
 *
 * Runs as an independent OS process via node:child_process.fork.
 * Exercises genuine OS process boundary, distinct PID, distinct heap,
 * and independent ModelCredentialBroker singleton memory.
 */

import { KernelHost } from '../kernel-host/kernelHost.js'
import { resolveGravitasDataRoot } from '@gravitas/core'

const dataRoot = process.env.GRAVITAS_DATA_ROOT || resolveGravitasDataRoot().dataRoot

const host = new KernelHost({
  dataRoot,
  pid: process.pid,
  onMessage: (msg) => {
    if (process.send) {
      process.send(msg)
    }
  },
})

process.on('message', async (msg) => {
  await host.handleMessage(msg)
})

host.start().catch((err) => {
  console.error('Failed to start KernelHost in isolated worker:', err)
  process.exit(1)
})
