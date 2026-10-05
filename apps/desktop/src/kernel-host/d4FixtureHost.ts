/**
 * GRAVITAS D4 — DOGFOOD-ONLY fixture Kernel host entry.
 *
 * Extends the D3 dogfood host to handle execution item fixtures for D4 role-bot verification
 * (role assignment, execution start/stop, harness fallback H1->H2, capability revocation).
 */

import { KernelHost } from './kernelHost.js'
import { D1_PROTOCOL_VERSION, type ExecutionItem } from '../types.js'

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
  | {
      type: 'D4_FIXTURE_COMMAND'
      op: 'EXECUTION'
      item: ExecutionItem
    }

if (process.parentPort) {
  const host = new KernelHost()

  process.parentPort.on('message', async (event: { data: unknown }) => {
    const data = event.data as { type?: string }
    if (data && (data.type === 'D3_FIXTURE_COMMAND' || data.type === 'D4_FIXTURE_COMMAND')) {
      const cmd = data as FixtureCommand
      try {
        if (cmd.op === 'KERNEL_COMMAND') {
          await host.getKernel().execute(cmd.command as never)
        } else if (cmd.op === 'VERIFICATION') {
          host.registerVerificationFixture(cmd.params)
        } else if (cmd.op === 'EXECUTION') {
          host.registerExecutionFixture(cmd.item)
        }
      } catch (err) {
        console.error('D4 fixture command failed:', (err as Error).message)
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
