/**
 * GRAVITAS D3 — DOGFOOD-ONLY fixture Kernel host entry.
 *
 * NOT part of the production kernel-host (`index.ts` is unchanged). This entry is forked ONLY by
 * D3 dogfood harnesses. It instantiates the REAL KernelHost / WorkSessionKernel / SQLite in a real
 * Electron utilityProcess, then accepts extra fixture commands from the harness so that deterministic
 * canonical state (sessions/runs/tasks/verification/approval) can be created and mutated through the
 * REAL kernel command path (`kernel.execute`) and the REAL fixture-registration helper.
 *
 * It never emits non-protocol messages to Main (Main would flag UNKNOWN_MESSAGE); it only emits the
 * standard PROJECTION_UPDATED notification after a fixture mutation.
 */

import { KernelHost } from './kernelHost.js'
import { D1_PROTOCOL_VERSION } from '../types.js'

type FixtureCommand =
  | { type: 'D3_FIXTURE_COMMAND'; op: 'KERNEL_COMMAND'; command: Record<string, unknown> }
  | {
      type: 'D3_FIXTURE_COMMAND'
      op: 'VERIFICATION'
      params: {
        planId: string
        taskId: string
        workSessionId: string
        runId: string
        verdict: 'VERIFIED_PASS' | 'INCONCLUSIVE' | 'FAIL'
        humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL' | 'HUMAN_APPROVED' | 'HUMAN_REJECTED' | 'NOT_REQUIRED'
      }
    }

if (process.parentPort) {
  const host = new KernelHost()

  process.parentPort.on('message', async (event: { data: unknown }) => {
    const data = event.data as { type?: string }
    if (data && data.type === 'D3_FIXTURE_COMMAND') {
      const cmd = data as FixtureCommand
      try {
        if (cmd.op === 'KERNEL_COMMAND') {
          await host.getKernel().execute(cmd.command as never)
        } else if (cmd.op === 'VERIFICATION') {
          host.registerVerificationFixture(cmd.params)
        }
      } catch (err) {
        console.error('D3 fixture command failed:', (err as Error).message)
      }
      process.parentPort.postMessage({
        type: 'PROJECTION_UPDATED',
        protocolVersion: D1_PROTOCOL_VERSION,
        projectionType: 'OVERVIEW',
        timestamp: new Date().toISOString(),
      })
      return
    }
    await host.handleMessage(event.data)
  })

  host.start().catch((err) => {
    console.error('Failed to start fixture KernelHost in utilityProcess:', err)
  })
}
