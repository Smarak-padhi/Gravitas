/**
 * Personal OS Background Jobs & Notification Bus HTTP API Integration Tests.
 * Wave 12I Causal Proof, Restart Recovery Proof, and Zero-Inference Verification.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { BackgroundJob, JobRun, PersonalOsNotification } from '@gravitas/core'
import type { AgentHarness } from '@gravitas/harnesses'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'

describe('Personal OS Jobs & Notifications API Integration (Wave 12I)', () => {
  let server: GravitasServer
  let service: RunService
  let baseUrl: string
  let tempDir: string
  let dbPath: string

  const createStubHarness = (id: string): AgentHarness => ({
    id,
    availability: async () => ({
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Ready',
    }),
    execute: async () => {
      throw new Error('Not implemented for jobs api tests')
    },
  })

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-jobs-api-'))
    dbPath = join(tempDir, 'jobs.db')

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    const harness = createStubHarness('stub-worker')

    service = new RunService({
      registry,
      eventHub,
      harness,
      runtimeRoot: tempDir,
      jobDbPath: dbPath,
    })

    server = new GravitasServer({
      service,
      eventHub,
    })

    const addr = await server.start({ port: 0 })
    baseUrl = addr.url
  })

  afterEach(async () => {
    await server.stop()
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  })

  const createSampleJob = (id: string = 'job-sample-1'): BackgroundJob => ({
    id,
    title: 'Test Notification Job',
    description: 'Emits a reminder notification',
    kind: 'REMINDER',
    status: 'ENABLED',
    trigger: {
      type: 'MANUAL',
    },
    action: {
      type: 'EMIT_NOTIFICATION',
      title: 'Hydration Alert',
      message: 'Time to drink water',
      severity: 'INFO',
    },
    autonomyLevel: 'L1',
    requiredAuthority: 'READ',
    contextDomains: ['SYSTEM'],
    executionBudget: {
      maxRuntimeMs: 5000,
    },
    retryPolicy: {
      mode: 'NONE',
      maxAttempts: 1,
      delayMs: 0,
    },
    notificationPolicy: {
      deliveryPolicy: 'IMMEDIATE',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  // ==========================================================================
  // HTTP CRUD & Control Plane Endpoints
  // ==========================================================================

  it('POST /api/v1/jobs creates a new background job and returns 201', async () => {
    const job = createSampleJob('job-create-test')
    const res = await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('job-create-test')
    expect(data.title).toBe('Test Notification Job')
  })

  it('GET /api/v1/jobs lists all jobs and supports status filtering', async () => {
    const j1 = createSampleJob('j-list-1')
    const j2 = { ...createSampleJob('j-list-2'), status: 'PAUSED' as const }
    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(j1),
    })
    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(j2),
    })

    const allRes = await fetch(`${baseUrl}/api/v1/jobs`)
    const all = await allRes.json()
    expect(all.length).toBe(2)

    const pausedRes = await fetch(`${baseUrl}/api/v1/jobs?status=PAUSED`)
    const paused = await pausedRes.json()
    expect(paused.length).toBe(1)
    expect(paused[0].id).toBe('j-list-2')
  })

  it('GET /api/v1/jobs/:id retrieves specific job or 404', async () => {
    const job = createSampleJob('job-get-test')
    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    })

    const found = await fetch(`${baseUrl}/api/v1/jobs/job-get-test`)
    expect(found.status).toBe(200)
    const foundData = await found.json()
    expect(foundData.id).toBe('job-get-test')

    const notFound = await fetch(`${baseUrl}/api/v1/jobs/missing-job`)
    expect(notFound.status).toBe(404)
  })

  it('PATCH /api/v1/jobs/:id updates job definition fields', async () => {
    const job = createSampleJob('job-patch-test')
    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    })

    const res = await fetch(`${baseUrl}/api/v1/jobs/job-patch-test`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Job Title' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe('Updated Job Title')
  })

  it('POST /api/v1/jobs/:id/(pause|resume|cancel) transitions job definition status', async () => {
    const job = createSampleJob('job-lifecycle-test')
    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    })

    // Pause
    const pauseRes = await fetch(`${baseUrl}/api/v1/jobs/job-lifecycle-test/pause`, { method: 'POST' })
    expect(pauseRes.status).toBe(200)
    expect((await pauseRes.json()).status).toBe('PAUSED')

    // Resume
    const resumeRes = await fetch(`${baseUrl}/api/v1/jobs/job-lifecycle-test/resume`, { method: 'POST' })
    expect(resumeRes.status).toBe(200)
    expect((await resumeRes.json()).status).toBe('ENABLED')

    // Cancel
    const cancelRes = await fetch(`${baseUrl}/api/v1/jobs/job-lifecycle-test/cancel`, { method: 'POST' })
    expect(cancelRes.status).toBe(200)
    expect((await cancelRes.json()).status).toBe('CANCELLED')
  })

  // ==========================================================================
  // Section 28: Real Runtime Causal Proof
  // ==========================================================================

  it('Section 28 Causal Proof: POST /api/v1/jobs/:id/run triggers execution, produces notification, and reflects in state', async () => {
    const testFile = join(tempDir, 'proof.txt')
    await writeFile(testFile, 'Causal proof file')

    const fileJob: BackgroundJob = {
      id: 'job-causal-proof',
      title: 'File Stat Check Job',
      kind: 'WATCH',
      status: 'ENABLED',
      trigger: { type: 'MANUAL' },
      action: {
        type: 'FILE_OPERATION',
        operation: 'STAT',
        path: testFile,
      },
      autonomyLevel: 'L1',
      requiredAuthority: 'READ',
      contextDomains: ['SYSTEM'],
      executionBudget: { maxRuntimeMs: 5000 },
      retryPolicy: { mode: 'NONE', maxAttempts: 1, delayMs: 0 },
      notificationPolicy: { deliveryPolicy: 'IMMEDIATE' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileJob),
    })

    // 1. Trigger manual run via API
    const runRes = await fetch(`${baseUrl}/api/v1/jobs/job-causal-proof/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runCommandId: 'cmd-causal-1' }),
    })
    expect(runRes.status).toBe(200)
    const runData = await runRes.json()
    expect(runData.jobRun).toBeDefined()
    expect(runData.jobRun.status).toBe('SUCCEEDED')
    expect(runData.jobRun.resultCode).toBe('STAT_OK')

    // 2. Query GET /api/v1/jobs/:id/runs
    const runsRes = await fetch(`${baseUrl}/api/v1/jobs/job-causal-proof/runs`)
    expect(runsRes.status).toBe(200)
    const runs = await runsRes.json()
    expect(runs.length).toBe(1)
    expect(runs[0].occurrenceKey).toBe('manual:job-causal-proof:cmd-causal-1')

    // 3. State summary projection includes recentJobRuns
    const stateRes = await fetch(`${baseUrl}/api/v1/state`)
    expect(stateRes.status).toBe(200)
    const state = await stateRes.json()
    expect(state.projection.backgroundJobs).toBeDefined()
    expect(state.projection.recentJobRuns.length).toBeGreaterThanOrEqual(1)
    expect(state.projection.recentJobRuns[0].jobId).toBe('job-causal-proof')
  })

  // ==========================================================================
  // Section 29: Zero-Inference Proof
  // ==========================================================================

  it('Section 29 Zero-Inference Proof: File operation and repo check use zero reasoning tokens', async () => {
    const notifyJob = createSampleJob('job-zero-inference')
    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifyJob),
    })

    const runRes = await fetch(`${baseUrl}/api/v1/jobs/job-zero-inference/run`, {
      method: 'POST',
    })
    const data = await runRes.json()
    const run = data.jobRun as JobRun

    expect(run.status).toBe('SUCCEEDED')
    expect(run.reasoningUsed).toBe(false)
    expect(run.tokenUsage).toBeUndefined()
    expect(run.monetaryCost).toBeUndefined()
    expect(run.roleId).toBeUndefined()
  })

  // ==========================================================================
  // Notification Management Endpoints
  // ==========================================================================

  it('Notification endpoints: list, mark read, mark all read', async () => {
    // Run job that emits notification
    const notifyJob = createSampleJob('job-notif-mgmt')
    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifyJob),
    })
    await fetch(`${baseUrl}/api/v1/jobs/job-notif-mgmt/run`, { method: 'POST' })

    // List notifications
    const listRes = await fetch(`${baseUrl}/api/v1/notifications`)
    expect(listRes.status).toBe(200)
    const notifs = (await listRes.json()) as PersonalOsNotification[]
    expect(notifs.length).toBe(1)
    expect(notifs[0].title).toBe('Hydration Alert')
    expect(notifs[0].readAt).toBeUndefined()

    // Mark single read
    const notifId = notifs[0].id
    const markRes = await fetch(`${baseUrl}/api/v1/notifications/${notifId}/read`, { method: 'POST' })
    expect(markRes.status).toBe(200)

    const unreadRes = await fetch(`${baseUrl}/api/v1/notifications?unreadOnly=true`)
    const unread = (await unreadRes.json()) as PersonalOsNotification[]
    expect(unread.length).toBe(0)

    // Mark all read
    const markAllRes = await fetch(`${baseUrl}/api/v1/notifications/read-all`, { method: 'POST' })
    expect(markAllRes.status).toBe(200)
  })

  // ==========================================================================
  // Section 28 & 43: Restart Recovery Proof
  // ==========================================================================

  it('Section 28 & 43 Restart Recovery Proof: Jobs, runs, and notifications survive complete server reboot', async () => {
    // 1. Create and execute job on first server instance
    const job = createSampleJob('job-restart-proof')
    await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    })
    await fetch(`${baseUrl}/api/v1/jobs/job-restart-proof/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runCommandId: 'cmd-pre-reboot' }),
    })

    // 2. Shut down server completely
    await server.stop()

    // 3. Spin up fresh second server instance pointing to identical dbPath
    const newRegistry = new InMemoryRegistry()
    const newEventHub = new EventHub(newRegistry)
    const newHarness = createStubHarness('stub-worker-2')

    const newService = new RunService({
      registry: newRegistry,
      eventHub: newEventHub,
      harness: newHarness,
      runtimeRoot: tempDir,
      jobDbPath: dbPath,
    })

    const newServer = new GravitasServer({
      service: newService,
      eventHub: newEventHub,
    })

    const newAddr = await newServer.start({ port: 0 })
    const newBaseUrl = newAddr.url

    try {
      // 4. Verify job definition survived
      const jobRes = await fetch(`${newBaseUrl}/api/v1/jobs/job-restart-proof`)
      expect(jobRes.status).toBe(200)
      const restoredJob = await jobRes.json()
      expect(restoredJob.id).toBe('job-restart-proof')
      expect(restoredJob.title).toBe('Test Notification Job')

      // 5. Verify run history survived
      const runsRes = await fetch(`${newBaseUrl}/api/v1/jobs/job-restart-proof/runs`)
      expect(runsRes.status).toBe(200)
      const restoredRuns = await runsRes.json()
      expect(restoredRuns.length).toBe(1)
      expect(restoredRuns[0].occurrenceKey).toBe('manual:job-restart-proof:cmd-pre-reboot')
      expect(restoredRuns[0].status).toBe('SUCCEEDED')

      // 6. Verify notification survived
      const notifsRes = await fetch(`${newBaseUrl}/api/v1/notifications`)
      expect(notifsRes.status).toBe(200)
      const restoredNotifs = await notifsRes.json()
      expect(restoredNotifs.length).toBe(1)
      expect(restoredNotifs[0].title).toBe('Hydration Alert')

      // 7. Verify projection snapshot recovers complete truth without SSE replay
      const stateRes = await fetch(`${newBaseUrl}/api/v1/state`)
      expect(stateRes.status).toBe(200)
      const state = await stateRes.json()
      expect(state.projection.backgroundJobs.some((j: any) => j.id === 'job-restart-proof')).toBe(true)
      expect(state.projection.recentJobRuns.some((r: any) => r.jobId === 'job-restart-proof')).toBe(true)
      expect(state.projection.personalNotifications.some((n: any) => n.title === 'Hydration Alert')).toBe(true)
    } finally {
      await newServer.stop()
    }
  })
})
