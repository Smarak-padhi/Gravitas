/**
 * Server Baseline and Security Boundary Tests.
 *
 * Covers:
 * - Loopback binding default (127.0.0.1) & ephemeral port isolation (port 0)
 * - Health endpoint structure
 * - State snapshot endpoint structure
 * - Request ID tracking (X-Gravitas-Request-Id header)
 * - Bounded request payload enforcement (413 on >256 KiB)
 * - Malformed JSON rejection (400)
 * - Unknown route rejection (404)
 * - Graceful shutdown and socket teardown
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ClaudeCodeHarness } from '@gravitas/harnesses'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

describe('GravitasServer HTTP Boundary (server.test.ts)', () => {
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

    // Bind to ephemeral port 0 on loopback for complete test isolation
    const addr = await server.start({ host: '127.0.0.1', port: 0 })
    serverUrl = addr.url
  })

  afterEach(async () => {
    await server.stop()
  })

  it('binds strictly to loopback (127.0.0.1) with an assigned ephemeral port', () => {
    const addr = server.address
    expect(addr).toBeDefined()
    expect(addr?.host).toBe('127.0.0.1')
    expect(addr?.port).toBeGreaterThan(0)
    expect(serverUrl).toBe(`http://127.0.0.1:${addr?.port}`)
  })

  it('GET /api/v1/health returns ok status and service version without leaking host paths', async () => {
    const res = await fetch(`${serverUrl}/api/v1/health`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('x-gravitas-request-id')).toMatch(/^req_\d+_[a-z0-9]+$/)

    const data = await res.json()
    expect(data).toEqual({
      status: 'ok',
      service: 'gravitas',
      version: '0.0.1',
      timestamp: expect.any(String),
    })
  })

  it('GET /api/v1/state returns lightweight summary without running expensive probes or leaking credentials', async () => {
    const res = await fetch(`${serverUrl}/api/v1/state`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.service).toBe('gravitas')
    expect(data.version).toBe('0.0.1')
    expect(Array.isArray(data.runs)).toBe(true)
    expect(Array.isArray(data.tasks)).toBe(true)
    expect(data.harness).toEqual({
      id: 'claude-code',
      status: 'AVAILABLE',
    })
  })

  it('attaches X-Gravitas-Request-Id to every response and error envelope', async () => {
    const res = await fetch(`${serverUrl}/api/v1/nonexistent-route`)
    expect(res.status).toBe(404)

    const reqId = res.headers.get('x-gravitas-request-id')
    expect(reqId).toBeDefined()
    expect(reqId).toMatch(/^req_/)

    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.requestId).toBe(reqId)
  })

  it('rejects oversized request bodies exceeding 256 KiB with 413 Payload Too Large', async () => {
    // 256 KiB + 1024 bytes payload
    const oversized = 'x'.repeat(257 * 1024)

    const res = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: oversized }),
    })

    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.error.code).toBe('PAYLOAD_TOO_LARGE')
    expect(data.error.message).toContain('limit')
  })

  it('rejects malformed JSON with 400 Bad Request', async () => {
    const res = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ "invalidJson": true, ',
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('MALFORMED_JSON')
    expect(data.error.message).toContain('valid JSON')
  })

  it('rejects unsupported HTTP methods on known resources with 405 Method Not Allowed', async () => {
    const res = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(405)
    const data = await res.json()
    expect(data.error.code).toBe('METHOD_NOT_ALLOWED')
  })

  it('shuts down gracefully and releases connections', async () => {
    await server.stop()
    expect(server.address).toBeUndefined()

    // Subsequent requests fail because port is closed
    await expect(fetch(`${serverUrl}/api/v1/health`)).rejects.toThrow()
  })
})
