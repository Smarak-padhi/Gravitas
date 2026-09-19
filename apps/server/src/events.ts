/**
 * Live Event Hub & SSE Manager for @gravitas/server.
 *
 * Dispatches Gravitas domain events to connected Server-Sent Events (SSE) clients
 * over native HTTP with zero external dependencies.
 *
 * Guarantees:
 * - Deterministic SSE wire format: id, event, data.
 * - Automatic subscriber cleanup on socket disconnect (zero memory leaks).
 * - Centralized publication linked to registry event buffer.
 */

import type { ServerResponse } from 'node:http'
import type { GravitasEvent } from '@gravitas/core'
import type { InMemoryRegistry } from './registry.js'

export class EventHub {
  private readonly subscribers = new Set<ServerResponse>()
  private readonly registry: InMemoryRegistry

  public constructor(registry: InMemoryRegistry) {
    this.registry = registry
  }

  /**
   * Registers an active HTTP response as an SSE client.
   * Sets proper headers and wires disconnect listeners.
   */
  public registerSubscriber(res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    // Initial keep-alive comment
    res.write(': connected\n\n')

    this.subscribers.add(res)

    const cleanup = (): void => {
      this.subscribers.delete(res)
    }

    res.on('close', cleanup)
    res.on('finish', cleanup)
    res.on('error', cleanup)
  }

  /**
   * Current number of connected SSE clients.
   */
  public get subscriberCount(): number {
    return this.subscribers.size
  }

  /**
   * Publishes an event:
   * 1. Records in the registry bounded buffer.
   * 2. Broadcasts to all active SSE clients.
   */
  public publish(event: GravitasEvent): void {
    this.registry.recordEvent(event)

    const payload = JSON.stringify(event)
    const sseChunk = `id: ${event.eventId}\nevent: ${event.type}\ndata: ${payload}\n\n`

    for (const client of this.subscribers) {
      try {
        if (!client.writableEnded && client.writable) {
          client.write(sseChunk)
        } else {
          this.subscribers.delete(client)
        }
      } catch {
        this.subscribers.delete(client)
      }
    }
  }

  /**
   * Closes all active SSE connections cleanly.
   */
  public close(): void {
    for (const client of this.subscribers) {
      try {
        if (!client.writableEnded) {
          client.end()
        }
      } catch {
        // Best effort
      }
    }
    this.subscribers.clear()
  }
}
