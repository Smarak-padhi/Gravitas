/**
 * SHA-256 hashing tests for @gravitas/prompts.
 *
 * Verifies:
 * - sha256 === SHA256(exact bytes sent to worker)
 * - byteLength === Buffer.byteLength(text, 'utf8')
 * - hash changes when meaningful input changes
 *
 * Critical invariant: the prompt hash must represent exact UTF-8 bytes sent.
 * No mismatch between "what was hashed" and "what was transmitted" is permitted.
 *
 * Zero AI calls.
 */

import { createHash } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import { compilePrompt } from './index.js'
import type { PromptCompilationRequest } from './types.js'

const MOCK_CONTRACT = Object.freeze({
  version: '1.0.0',
  goal: 'Implement SHA-256 hashing test',
  repository: '/repos/test-hash',
  baseBranch: 'main',
  constraints: ['src/hash.ts'],
  acceptanceCriteria: [{ id: 'ac_hash', description: 'Hash must be exact' }],
  requiredEvidence: [
    { id: 'ev_hash', type: 'GIT_DIFF' as const, description: 'Diff shows hash module', mandatory: true },
  ],
})

const MOCK_TASK = Object.freeze({
  id: 'task_hash_001',
  runId: 'run_hash_001',
  title: 'Execute: Implement SHA-256 hashing test',
  objective: 'Write a SHA-256 hashing utility in src/hash.ts',
  state: 'READY' as const,
  dependencies: [],
  acceptanceCriteria: MOCK_CONTRACT.acceptanceCriteria,
  requiresApproval: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

const BASE_REQUEST: PromptCompilationRequest = {
  contract: MOCK_CONTRACT,
  task: MOCK_TASK,
  role: 'IMPLEMENTER',
  runtimeContext: {
    runId: 'run_hash_001',
    taskId: 'task_hash_001',
    worktreePath: '/tmp/worktrees/hash-test',
    taskBranch: 'gravitas/run_hash_001/task_hash_001',
    baseSha: 'deadbeef1234',
    allowedPaths: ['src/hash.ts'],
    harnessId: 'test-harness',
    compiledAt: '2024-01-01T00:00:00.000Z',
  },
}

// ---------------------------------------------------------------------------
// SHA-256 exact bytes proof
// ---------------------------------------------------------------------------

describe('Hashing: sha256 represents exact bytes sent to worker', () => {
  it('SHA256(text) === compiledPrompt.sha256', () => {
    const result = compilePrompt(BASE_REQUEST)
    const independentHash = createHash('sha256')
      .update(Buffer.from(result.text, 'utf8'))
      .digest('hex')
    expect(result.sha256).toBe(independentHash)
  })

  it('byteLength === Buffer.byteLength(text, "utf8")', () => {
    const result = compilePrompt(BASE_REQUEST)
    const independentByteLength = Buffer.byteLength(result.text, 'utf8')
    expect(result.byteLength).toBe(independentByteLength)
  })

  it('byteLength is positive', () => {
    const result = compilePrompt(BASE_REQUEST)
    expect(result.byteLength).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Hash changes on meaningful input change
// ---------------------------------------------------------------------------

describe('Hashing: sensitivity to meaningful input changes', () => {
  it('changes sha256 when goal changes', () => {
    const r1 = compilePrompt(BASE_REQUEST)
    const r2 = compilePrompt({
      ...BASE_REQUEST,
      contract: { ...MOCK_CONTRACT, goal: 'Completely different goal' },
      task: { ...MOCK_TASK, objective: 'Completely different goal' },
    })
    expect(r1.sha256).not.toBe(r2.sha256)
  })

  it('changes sha256 when acceptance criteria change', () => {
    const r1 = compilePrompt(BASE_REQUEST)
    const r2 = compilePrompt({
      ...BASE_REQUEST,
      contract: {
        ...MOCK_CONTRACT,
        acceptanceCriteria: [{ id: 'ac_new', description: 'A completely different criterion' }],
      },
      task: {
        ...MOCK_TASK,
        acceptanceCriteria: [{ id: 'ac_new', description: 'A completely different criterion' }],
      },
    })
    expect(r1.sha256).not.toBe(r2.sha256)
  })

  it('changes sha256 when project context is added', () => {
    const r1 = compilePrompt(BASE_REQUEST)
    const r2 = compilePrompt({
      ...BASE_REQUEST,
      projectContext: { projectName: 'ExtraProject' },
    })
    expect(r1.sha256).not.toBe(r2.sha256)
  })

  it('changes sha256 when runtime context is added', () => {
    const r1 = compilePrompt({ ...BASE_REQUEST, runtimeContext: undefined })
    const r2 = compilePrompt(BASE_REQUEST) // has runtimeContext
    expect(r1.sha256).not.toBe(r2.sha256)
  })

  it('changes sha256 when role changes', () => {
    const r1 = compilePrompt({ ...BASE_REQUEST, role: 'IMPLEMENTER' })
    const r2 = compilePrompt({ ...BASE_REQUEST, role: 'REVIEWER' })
    expect(r1.sha256).not.toBe(r2.sha256)
  })
})

// ---------------------------------------------------------------------------
// Hash consistency for same-text harness transmission
// ---------------------------------------------------------------------------

describe('Hashing: harness transmission consistency', () => {
  it('text is safe to transmit: no control characters except LF', () => {
    const result = compilePrompt(BASE_REQUEST)
    // Should only have LF (0x0A) as control character, no CRLF, no bare CR, no null bytes
    expect(result.text).not.toContain('\r')
    expect(result.text).not.toContain('\x00')
  })

  it('sha256 is a 64-character lowercase hex string', () => {
    const result = compilePrompt(BASE_REQUEST)
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/)
  })
})
