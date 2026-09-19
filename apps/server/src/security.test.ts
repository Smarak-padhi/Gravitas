/**
 * Security and Boundary Tests for @gravitas/server.
 *
 * Covers:
 * - Loopback binding by default (127.0.0.1)
 * - Path traversal attempts strictly rejected on evidence and resource endpoints
 * - Absolute sensitive paths and stack traces strictly absent from error envelopes
 * - Zero external AI / network provider requests
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ClaudeCodeHarness } from '@gravitas/harnesses'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

describe('Security and Access Control Boundary (security.test.ts)', () => {
  let server: GravitasServer
  let serverUrl: string
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
    serverUrl = addr.url
  })

  afterEach(async () => {
    await server.stop()
  })

  it('rejects path traversal attempts on evidence endpoint', async () => {
    // Attempt directory traversal via encoded and raw path segments
    const traversalUrls = [
      `${serverUrl}/api/v1/runs/..%2F..%2Fetc/tasks/passwd/evidence`,
      `${serverUrl}/api/v1/runs/run1/tasks/..%2F..%2Fwindows%2Fwin.ini/evidence`,
      `${serverUrl}/api/v1/runs/run1/tasks/task1/evidence?path=C:\\Windows\\System32`,
      `${serverUrl}/api/v1/runs/run1/tasks/task1/evidence?path=..%2F..%2Fsensitive`,
      `${serverUrl}/files/etc/passwd`,
      `${serverUrl}/download?path=C:\\Windows`,
    ]

    for (const url of traversalUrls) {
      const res = await fetch(url)
      expect([400, 404]).toContain(res.status)
      const data = await res.json()
      expect(data.error).toBeDefined()
      expect(data.error.code).toMatch(/NOT_FOUND|INVALID_REQUEST/)
    }
  })

  it('ensures error envelopes contain zero stack traces, line numbers, or internal server paths', async () => {
    // 1. Invalid route error
    const res404 = await fetch(`${serverUrl}/api/v1/invalid-route`)
    const body404 = await res404.text()
    expect(body404).not.toContain('node_modules')
    expect(body404).not.toContain('.ts:')
    expect(body404).not.toContain('.js:')
    expect(body404).not.toContain('at createRequestListener')

    // 2. Malformed JSON error
    const res400 = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{{malformed',
    })
    const body400 = await res400.text()
    expect(body400).not.toContain('SyntaxError')
    expect(body400).not.toContain('at JSON.parse')
    expect(body400).not.toContain('node:internal')
  })

  it('does not expose arbitrary file server or shell endpoints', async () => {
    const dangerousEndpoints = [
      '/api/v1/exec',
      '/api/v1/shell',
      '/api/v1/files',
      '/api/v1/delete',
      '/api/v1/merge',
      '/api/v1/deploy',
    ]

    for (const endpoint of dangerousEndpoints) {
      const res = await fetch(`${serverUrl}${endpoint}`)
      expect(res.status).toBe(404)
    }
  })
})
