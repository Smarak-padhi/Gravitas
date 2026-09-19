/**
 * Real HTTP Server-Sent Events (SSE) Integration Test.
 *
 * Section 25 Mandatory Acceptance Gate:
 * Proves:
 * 1. Real HTTP connection to /api/v1/events
 * 2. Event stream receives events in deterministic order
 * 3. Client disconnect cleans up subscribers and listeners
 * 4. Subscriber count returns to baseline (zero memory leaks)
 */

import http from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createApprovalRequiredEvent,
  createGravitasEvent,
  createRunCreatedEvent,
  createTaskApprovedEvent,
  type GravitasEvent,
  type Run,
} from '@gravitas/core'
import { ClaudeCodeHarness } from '@gravitas/harnesses'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

describe('Server-Sent Events Live Stream (sse.test.ts)', () => {
  let server: GravitasServer
  let serverPort: number
  let registry: InMemoryRegistry
  let eventHub: EventHub

  beforeEach(async () => {
    registry = new InMemoryRegistry()
    eventHub = new EventHub(registry)
    const harness = new ClaudeCodeHarness()
    const service = new RunService({
      registry,
      eventHub,
      harness,
    })

    server = new GravitasServer({
      service,
      eventHub,
    })

    const addr = await server.start({ host: '127.0.0.1', port: 0 })
    serverPort = addr.port
  })

  afterEach(async () => {
    await server.stop()
  })

  it('receives events over real HTTP connection, preserves ordering, and cleans up on disconnect', async () => {
    expect(eventHub.subscriberCount).toBe(0)

    const receivedEvents: { id: string; event: string; data: GravitasEvent }[] = []
    let connectionOpened = false

    // 1. Connect real HTTP client to /api/v1/events
    const clientReq = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: '/api/v1/events',
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
    })

    const clientClosedPromise = new Promise<void>((resolve) => {
      clientReq.on('response', (res) => {
        expect(res.statusCode).toBe(200)
        expect(res.headers['content-type']).toBe('text/event-stream')
        expect(res.headers['cache-control']).toContain('no-cache')

        let buffer = ''
        res.setEncoding('utf8')

        res.on('data', (chunk: string) => {
          buffer += chunk

          // Check for initial keep-alive comment
          if (buffer.includes(': connected\n\n')) {
            connectionOpened = true
          }

          // Parse SSE event frames delimited by double newline
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() ?? '' // Keep remainder

          for (const block of blocks) {
            if (block.startsWith(':')) {
              // Comment / keep-alive
              continue
            }
            const lines = block.split('\n')
            let id = ''
            let event = ''
            let dataStr = ''

            for (const line of lines) {
              if (line.startsWith('id: ')) id = line.slice(4)
              else if (line.startsWith('event: ')) event = line.slice(7)
              else if (line.startsWith('data: ')) dataStr = line.slice(6)
            }

            if (event && dataStr) {
              receivedEvents.push({
                id,
                event,
                data: JSON.parse(dataStr),
              })
            }
          }
        })

        res.on('close', () => {
          resolve()
        })
      })
    })

    clientReq.end()

    // Wait for connection to open and register
    for (let i = 0; i < 20; i++) {
      if (connectionOpened && eventHub.subscriberCount === 1) break
      await new Promise((r) => setTimeout(r, 25))
    }

    expect(connectionOpened).toBe(true)
    expect(eventHub.subscriberCount).toBe(1)

    // 2. Publish sequence of domain events
    const run: Run = {
      id: 'run_sse_01',
      goal: 'SSE test goal',
      status: 'PENDING',
      contractId: 'c1',
      taskIds: ['t1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const e1 = createRunCreatedEvent(run)
    const e2 = createApprovalRequiredEvent(run.id, 't1', { reason: 'Verification passed' })
    const e3 = createTaskApprovedEvent(run.id, 't1', { reviewer: 'operator_1' })

    eventHub.publish(e1)
    eventHub.publish(e2)
    eventHub.publish(e3)

    // Wait for client to receive events
    for (let i = 0; i < 30; i++) {
      if (receivedEvents.length >= 3) break
      await new Promise((r) => setTimeout(r, 25))
    }

    // 3. Verify received events and ordering
    expect(receivedEvents).toHaveLength(3)

    expect(receivedEvents[0]?.event).toBe('RUN_CREATED')
    expect(receivedEvents[0]?.id).toBe(e1.eventId)
    expect(receivedEvents[0]?.data.runId).toBe('run_sse_01')

    expect(receivedEvents[1]?.event).toBe('APPROVAL_REQUIRED')
    expect(receivedEvents[1]?.id).toBe(e2.eventId)
    expect(receivedEvents[1]?.data.taskId).toBe('t1')

    expect(receivedEvents[2]?.event).toBe('TASK_APPROVED')
    expect(receivedEvents[2]?.id).toBe(e3.eventId)
    expect(receivedEvents[2]?.data.taskId).toBe('t1')

    // 4. Close client connection
    clientReq.destroy()
    await clientClosedPromise

    // Wait for disconnect listener cleanup
    for (let i = 0; i < 20; i++) {
      if (eventHub.subscriberCount === 0) break
      await new Promise((r) => setTimeout(r, 25))
    }

    // 5. Verify subscriber count returns to baseline (zero leaks)
    expect(eventHub.subscriberCount).toBe(0)
  })
})
