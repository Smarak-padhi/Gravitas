/**
 * ExecutionContract End-to-End API Proof & Contract Boundary Test.
 *
 * Verifies:
 * 1. POST /api/v1/runs preserves submitted constraints, acceptance criteria, and required evidence
 * 2. GET /api/v1/runs/:runId returns the exact submitted ExecutionContract
 * 3. Malformed contract input triggers structured HTTP 400 INVALID_CONTRACT, never unhandled 500
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeGit } from '@gravitas/git'
import type { AgentHarness } from '@gravitas/harnesses'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

describe('ExecutionContract API Preservation & Validation Proof (contract-api.test.ts)', () => {
  let fixtureRepoPath: string
  let server: GravitasServer
  let serverUrl: string
  let registry: InMemoryRegistry
  let eventHub: EventHub

  beforeEach(async () => {
    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-contract-fixture-'))
    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'tester@local'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '--allow-empty', '-m', 'Initial'] })

    registry = new InMemoryRegistry()
    eventHub = new EventHub(registry)
    const harness: AgentHarness = {
      id: 'stub-harness',
      availability: async () => ({
        status: 'AVAILABLE',
        installed: true,
        usableNoninteractive: true,
      }),
      execute: async () => {
        throw new Error('Not implemented for contract tests')
      },
    }

    const service = new RunService({
      registry,
      eventHub,
      harness,
      defaultRepository: fixtureRepoPath,
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
    await rm(fixtureRepoPath, { recursive: true, force: true }).catch(() => {})
  })

  it('preserves goal, repository, baseBranch, constraints, 2 criteria, and 2 evidence items end-to-end', async () => {
    const inputPayload = {
      goal: 'Deliver multi-criteria feature',
      repository: fixtureRepoPath,
      baseBranch: 'main',
      constraints: ['src/feature.ts', 'src/types.ts'],
      acceptanceCriteria: [
        {
          id: 'ac_custom_1',
          description: 'Criterion 1: Unit tests pass for feature.ts',
          verificationMethod: 'AUTOMATED_TEST',
        },
        {
          id: 'ac_custom_2',
          description: 'Criterion 2: Zero typecheck errors in types.ts',
          verificationMethod: 'TYPECHECK',
        },
      ],
      requiredEvidence: [
        {
          id: 'ev_custom_diff',
          type: 'GIT_DIFF',
          description: 'Clean git diff in feature scope',
          mandatory: true,
        },
        {
          id: 'ev_custom_report',
          type: 'TEST_REPORT',
          description: 'Vitest JSON report',
          mandatory: false,
        },
      ],
      requiresApproval: true,
    }

    // 1. POST /api/v1/runs
    const createRes = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputPayload),
    })

    expect(createRes.status).toBe(201)
    const createData = await createRes.json()
    expect(createData.runId).toBeDefined()
    expect(createData.contractId).toBeDefined()

    const runId = createData.runId

    // 2. GET /api/v1/runs/:runId
    const getRes = await fetch(`${serverUrl}/api/v1/runs/${runId}`)
    expect(getRes.status).toBe(200)
    const runDetail = await getRes.json()

    const contract = runDetail.contract
    expect(contract).toBeDefined()
    expect(contract.goal).toBe(inputPayload.goal)
    expect(contract.repository).toBe(fixtureRepoPath)
    expect(contract.baseBranch).toBe('main')
    expect(contract.constraints).toEqual(['src/feature.ts', 'src/types.ts'])

    // Assert exact criteria survived
    expect(contract.acceptanceCriteria).toHaveLength(2)
    expect(contract.acceptanceCriteria[0]).toEqual({
      id: 'ac_custom_1',
      description: 'Criterion 1: Unit tests pass for feature.ts',
      verificationMethod: 'AUTOMATED_TEST',
    })
    expect(contract.acceptanceCriteria[1]).toEqual({
      id: 'ac_custom_2',
      description: 'Criterion 2: Zero typecheck errors in types.ts',
      verificationMethod: 'TYPECHECK',
    })

    // Assert exact required evidence survived
    expect(contract.requiredEvidence).toHaveLength(2)
    expect(contract.requiredEvidence[0]).toEqual({
      id: 'ev_custom_diff',
      type: 'GIT_DIFF',
      description: 'Clean git diff in feature scope',
      mandatory: true,
    })
    expect(contract.requiredEvidence[1]).toEqual({
      id: 'ev_custom_report',
      type: 'TEST_REPORT',
      description: 'Vitest JSON report',
      mandatory: false,
    })
  })

  it('rejects malformed contract with structured HTTP 400 INVALID_CONTRACT error boundary', async () => {
    // Empty acceptance criteria array violates core contract invariant
    const invalidPayload = {
      goal: 'Goal with invalid empty criteria',
      repository: fixtureRepoPath,
      acceptanceCriteria: [],
    }

    const res = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    })

    expect(res.status).toBe(400)
    const errorData = await res.json()
    expect(errorData.error.code).toBe('INVALID_CONTRACT')
    expect(errorData.error.message).toContain('at least one acceptance criterion')
  })

  it('rejects empty criterion description with structured HTTP 400 INVALID_CONTRACT error boundary', async () => {
    const invalidPayload = {
      goal: 'Goal with blank criterion',
      repository: fixtureRepoPath,
      acceptanceCriteria: [{ id: 'ac_1', description: '   ' }],
    }

    const res = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    })

    expect(res.status).toBe(400)
    const errorData = await res.json()
    expect(errorData.error.code).toBe('INVALID_CONTRACT')
    expect(errorData.error.message).toContain('non-empty "description"')
  })
})
