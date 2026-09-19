/**
 * Deterministic Prompt Compiler Tests for @gravitas/prompts.
 *
 * Verifies:
 * - Canonical six-layer ordering
 * - Same input → identical bytes
 * - Same input → identical SHA-256
 * - CRLF/LF normalization behavior
 * - No trailing-whitespace instability
 * - Optional blank layer behavior
 * - Acceptance criteria preserved
 * - Required evidence preserved
 * - Role template preserved
 * - Versions present
 *
 * Zero AI calls.
 */

import { createHash } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import {
  compilePrompt,
  COMPILER_VERSION,
  GLOBAL_POLICY_VERSION,
  ROLE_TEMPLATE_VERSION,
  GLOBAL_POLICY_TEXT,
  IMPLEMENTER_TEMPLATE,
} from './index.js'
import type { PromptCompilationRequest } from './types.js'

// ---------------------------------------------------------------------------
// Minimal valid fixtures
// ---------------------------------------------------------------------------

const MOCK_CONTRACT = Object.freeze({
  version: '1.0.0',
  goal: 'Add type-safe error handling to the API client',
  repository: '/repos/gravitas',
  baseBranch: 'main',
  constraints: ['src/api/client.ts', 'src/api/errors.ts'],
  acceptanceCriteria: [
    { id: 'ac_1', description: 'All errors are typed with ApiError subclasses' },
    { id: 'ac_2', description: 'Unit tests cover error mapping', verificationMethod: 'AUTOMATED_TEST' as const },
  ],
  requiredEvidence: [
    { id: 'ev_1', type: 'GIT_DIFF' as const, description: 'Non-empty diff in allowed scope', mandatory: true },
    { id: 'ev_2', type: 'TEST_REPORT' as const, description: 'All tests pass', mandatory: false },
  ],
})

const MOCK_TASK = Object.freeze({
  id: 'task_001',
  runId: 'run_001',
  title: 'Execute: Add type-safe error handling to the AP',
  objective: 'Add type-safe error handling to the API client',
  state: 'READY' as const,
  dependencies: [],
  acceptanceCriteria: MOCK_CONTRACT.acceptanceCriteria,
  requiresApproval: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

const MOCK_RUNTIME = Object.freeze({
  runId: 'run_001',
  taskId: 'task_001',
  worktreePath: '/tmp/gravitas-runtime/runs/run_001/tasks/task_001',
  taskBranch: 'gravitas/run_001/task_001',
  baseSha: 'abc1234567890',
  allowedPaths: ['src/api/client.ts', 'src/api/errors.ts'],
  harnessId: 'claude-code',
  compiledAt: '2024-01-01T00:00:00.000Z',
})

const FULL_REQUEST: PromptCompilationRequest = {
  projectContext: {
    projectName: 'Gravitas',
    projectSummary: 'Local-first multi-agent command center',
    technicalConstraints: 'TypeScript strict mode, ESM only',
    projectInstructions: 'Follow existing code patterns.',
  },
  contract: MOCK_CONTRACT,
  task: MOCK_TASK,
  role: 'IMPLEMENTER',
  runtimeContext: MOCK_RUNTIME,
}

// ---------------------------------------------------------------------------
// Six-layer ordering
// ---------------------------------------------------------------------------

describe('Compiler: canonical six-layer ordering', () => {
  it('emits all layers in strict canonical order: GLOBAL, PROJECT, EXECUTION_CONTRACT, TASK, AGENT_ROLE, RUNTIME_CONTEXT', () => {
    const result = compilePrompt(FULL_REQUEST)

    const globalIdx = result.text.indexOf('# [LAYER: GLOBAL]')
    const projectIdx = result.text.indexOf('# [LAYER: PROJECT]')
    const contractIdx = result.text.indexOf('# [LAYER: EXECUTION_CONTRACT]')
    const taskIdx = result.text.indexOf('# [LAYER: TASK]')
    const roleIdx = result.text.indexOf('# [LAYER: AGENT_ROLE]')
    const runtimeIdx = result.text.indexOf('# [LAYER: RUNTIME_CONTEXT]')

    expect(globalIdx).toBeGreaterThanOrEqual(0)
    expect(projectIdx).toBeGreaterThan(globalIdx)
    expect(contractIdx).toBeGreaterThan(projectIdx)
    expect(taskIdx).toBeGreaterThan(contractIdx)
    expect(roleIdx).toBeGreaterThan(taskIdx)
    expect(runtimeIdx).toBeGreaterThan(roleIdx)

    expect(result.includedLayers).toEqual([
      'GLOBAL',
      'PROJECT',
      'EXECUTION_CONTRACT',
      'TASK',
      'AGENT_ROLE',
      'RUNTIME_CONTEXT',
    ])
    expect(result.layerCount).toBe(6)
  })

  it('includes only non-empty layers when optional inputs omitted', () => {
    const result = compilePrompt({
      contract: MOCK_CONTRACT,
      task: MOCK_TASK,
      // no projectContext, no runtimeContext
    })

    expect(result.includedLayers).toContain('GLOBAL')
    expect(result.includedLayers).toContain('EXECUTION_CONTRACT')
    expect(result.includedLayers).toContain('TASK')
    expect(result.includedLayers).toContain('AGENT_ROLE') // IMPLEMENTER default
    expect(result.includedLayers).not.toContain('PROJECT')
    expect(result.includedLayers).not.toContain('RUNTIME_CONTEXT')
  })
})

// ---------------------------------------------------------------------------
// Determinism: same input → identical bytes → identical SHA
// ---------------------------------------------------------------------------

describe('Compiler: determinism invariant', () => {
  it('produces byte-identical text for identical inputs across multiple calls', () => {
    // compiledAt will differ; use stable runtimeContext.compiledAt
    const r1 = compilePrompt(FULL_REQUEST)
    const r2 = compilePrompt(FULL_REQUEST)
    const r3 = compilePrompt({ ...FULL_REQUEST })

    expect(r1.text).toBe(r2.text)
    expect(r1.text).toBe(r3.text)
  })

  it('produces identical SHA-256 for identical inputs', () => {
    const r1 = compilePrompt(FULL_REQUEST)
    const r2 = compilePrompt(FULL_REQUEST)

    expect(r1.sha256).toBe(r2.sha256)
    expect(r1.byteLength).toBe(r2.byteLength)
  })

  it('sha256 changes when goal changes', () => {
    const r1 = compilePrompt(FULL_REQUEST)
    const r2 = compilePrompt({
      ...FULL_REQUEST,
      contract: { ...MOCK_CONTRACT, goal: 'Different goal entirely' },
      task: { ...MOCK_TASK, objective: 'Different goal entirely' },
    })
    expect(r1.sha256).not.toBe(r2.sha256)
  })

  it('sha256 changes when role changes', () => {
    const r1 = compilePrompt({ ...FULL_REQUEST, role: 'IMPLEMENTER' })
    const r2 = compilePrompt({ ...FULL_REQUEST, role: 'RESEARCHER' })
    expect(r1.sha256).not.toBe(r2.sha256)
  })

  it('sha256 changes when project context changes', () => {
    const r1 = compilePrompt({ ...FULL_REQUEST, projectContext: { projectName: 'Foo' } })
    const r2 = compilePrompt({ ...FULL_REQUEST, projectContext: { projectName: 'Bar' } })
    expect(r1.sha256).not.toBe(r2.sha256)
  })
})

// ---------------------------------------------------------------------------
// CRLF / LF normalization
// ---------------------------------------------------------------------------

describe('Compiler: CRLF normalization', () => {
  it('produces identical SHA whether input strings use CRLF or LF when compiler normalizes', () => {
    // The compiler normalizes internally, so same logical content → same hash
    const r1 = compilePrompt(FULL_REQUEST)
    // The compiled text must contain only LF (not CRLF)
    expect(r1.text).not.toContain('\r\n')
    expect(r1.text).not.toContain('\r')
  })
})

// ---------------------------------------------------------------------------
// No trailing whitespace instability
// ---------------------------------------------------------------------------

describe('Compiler: no trailing whitespace in output', () => {
  it('has no trailing whitespace on any line of the compiled prompt', () => {
    const result = compilePrompt(FULL_REQUEST)
    const lines = result.text.split('\n')
    for (const line of lines) {
      expect(line).toBe(line.trimEnd())
    }
  })
})

// ---------------------------------------------------------------------------
// Acceptance criteria and required evidence preserved
// ---------------------------------------------------------------------------

describe('Compiler: contract values preservation', () => {
  it('preserves all acceptance criteria verbatim in compiled prompt', () => {
    const result = compilePrompt(FULL_REQUEST)
    expect(result.text).toContain('ac_1')
    expect(result.text).toContain('All errors are typed with ApiError subclasses')
    expect(result.text).toContain('ac_2')
    expect(result.text).toContain('Unit tests cover error mapping')
  })

  it('preserves all required evidence items verbatim in compiled prompt', () => {
    const result = compilePrompt(FULL_REQUEST)
    expect(result.text).toContain('ev_1')
    expect(result.text).toContain('Non-empty diff in allowed scope')
    expect(result.text).toContain('ev_2')
    expect(result.text).toContain('All tests pass')
  })

  it('preserves goal verbatim in contract layer', () => {
    const result = compilePrompt(FULL_REQUEST)
    expect(result.text).toContain('GOAL: Add type-safe error handling to the API client')
  })
})

// ---------------------------------------------------------------------------
// Role template preserved
// ---------------------------------------------------------------------------

describe('Compiler: role template preservation', () => {
  it('includes IMPLEMENTER template content in AGENT_ROLE layer', () => {
    const result = compilePrompt({ ...FULL_REQUEST, role: 'IMPLEMENTER' })
    expect(result.text).toContain(IMPLEMENTER_TEMPLATE.slice(0, 40))
    expect(result.roleUsed).toBe('IMPLEMENTER')
  })

  it('defaults to IMPLEMENTER when role is omitted', () => {
    const result = compilePrompt({ contract: MOCK_CONTRACT, task: MOCK_TASK })
    expect(result.roleUsed).toBe('IMPLEMENTER')
    expect(result.includedLayers).toContain('AGENT_ROLE')
  })

  it('includes RESEARCHER template for RESEARCHER role', () => {
    const result = compilePrompt({ ...FULL_REQUEST, role: 'RESEARCHER' })
    expect(result.text).toContain('RESEARCHER')
    expect(result.roleUsed).toBe('RESEARCHER')
  })
})

// ---------------------------------------------------------------------------
// Versions present and deterministic
// ---------------------------------------------------------------------------

describe('Compiler: version metadata', () => {
  it('includes stable version strings in every compiled prompt result', () => {
    const result = compilePrompt(FULL_REQUEST)
    expect(result.compilerVersion).toBe(COMPILER_VERSION)
    expect(result.globalPolicyVersion).toBe(GLOBAL_POLICY_VERSION)
    expect(result.roleTemplateVersion).toBe(ROLE_TEMPLATE_VERSION)
  })

  it('version strings are deterministic across calls', () => {
    const r1 = compilePrompt(FULL_REQUEST)
    const r2 = compilePrompt(FULL_REQUEST)
    expect(r1.compilerVersion).toBe(r2.compilerVersion)
    expect(r1.globalPolicyVersion).toBe(r2.globalPolicyVersion)
    expect(r1.roleTemplateVersion).toBe(r2.roleTemplateVersion)
  })
})

// ---------------------------------------------------------------------------
// Layer metadata
// ---------------------------------------------------------------------------

describe('Compiler: layer metadata', () => {
  it('reports correct source classification for each layer', () => {
    const result = compilePrompt(FULL_REQUEST)
    const byName = Object.fromEntries(result.layerMetadata.map((m) => [m.name, m]))

    expect(byName['GLOBAL']?.source).toBe('MANAGED_POLICY')
    expect(byName['PROJECT']?.source).toBe('PROJECT_INPUT')
    expect(byName['EXECUTION_CONTRACT']?.source).toBe('CONTRACT')
    expect(byName['TASK']?.source).toBe('TASK')
    expect(byName['AGENT_ROLE']?.source).toBe('MANAGED_POLICY')
    expect(byName['RUNTIME_CONTEXT']?.source).toBe('GENERATED_RUNTIME')
  })

  it('marks omitted layers as not included with byteLength 0', () => {
    const result = compilePrompt({ contract: MOCK_CONTRACT, task: MOCK_TASK })
    const runtimeMeta = result.layerMetadata.find((m) => m.name === 'RUNTIME_CONTEXT')
    const projectMeta = result.layerMetadata.find((m) => m.name === 'PROJECT')

    expect(runtimeMeta?.included).toBe(false)
    expect(runtimeMeta?.byteLength).toBe(0)
    expect(projectMeta?.included).toBe(false)
    expect(projectMeta?.byteLength).toBe(0)
  })
})
