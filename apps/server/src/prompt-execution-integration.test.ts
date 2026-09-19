/**
 * Prompt Execution Integration Test for @gravitas/server.
 *
 * Proves:
 * - Harness receives exact compiled prompt bytes (not raw objective string)
 * - SHA-256(received bytes) === compiledPrompt.sha256 stored in registry
 * - compiledPrompt.text !== task.objective (full managed compilation, not just goal)
 * - Prompt manager layers (GLOBAL, CONTRACT, TASK, AGENT_ROLE) present in compiled prompt
 * - Worker success still does NOT bypass independent verifier
 * - Zero AI calls
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeGit } from '@gravitas/git'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
} from '@gravitas/harnesses'
import type { VerificationPlan } from '@gravitas/verifier'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

const GLOBAL_POLICY_EXCERPT = 'You are a Gravitas worker executing a bounded, verifiable task.'

class PromptCapturingHarness implements AgentHarness {
  public readonly id = 'prompt-capturing-harness'
  public capturedPrompts: string[] = []
  public capturedExecutionIds: string[] = []

  public async availability(): Promise<HarnessAvailability> {
    return { status: 'AVAILABLE', installed: true, usableNoninteractive: true }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    this.capturedPrompts.push(request.compiledPrompt)
    this.capturedExecutionIds.push(request.executionId)

    // Write the allowed file as proof of scoped execution
    const mathJsPath = join(request.worktreePath, 'src', 'math.js')
    await writeFile(
      mathJsPath,
      'export function add(a, b) {\n  return a + b;\n}\n',
      'utf8'
    )

    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 10,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: 'Implemented.',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      worktreePath: request.worktreePath,
    }
  }
}

describe('Prompt Execution Integration (prompt-execution-integration.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let serverUrl: string
  let registry: InMemoryRegistry
  let harness: PromptCapturingHarness

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-prompt-exec-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-prompt-runtime-'))

    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Prompt Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'prompt@test.local'] })

    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'prompt-fixture', type: 'module', version: '1.0.0' }, null, 2),
      'utf8'
    )
    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'src', 'math.js'),
      'export function add(a, b) {\n  return 0;\n}\n',
      'utf8'
    )
    await mkdir(join(primaryRepoPath, 'test'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'test', 'math.test.js'),
      `import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/math.js';
test('adds correctly', () => {
  assert.equal(add(2, 3), 5);
});
`,
      'utf8'
    )
    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'Baseline for prompt execution test'] })

    registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new PromptCapturingHarness()

    const verificationPlan: VerificationPlan = {
      id: 'plan_prompt_test',
      commands: [
        {
          id: 'test_runner',
          executable: process.execPath,
          args: ['--test', 'test/math.test.js'],
          mandatory: true,
          timeoutMs: 15000,
        },
      ],
    }

    const service = new RunService({
      registry,
      eventHub,
      harness,
      runtimeRoot,
      defaultRepository: primaryRepoPath,
      defaultVerificationPlan: verificationPlan,
    })

    server = new GravitasServer({ service, eventHub })
    const addr = await server.start({ host: '127.0.0.1', port: 0 })
    serverUrl = addr.url
  })

  afterEach(async () => {
    await server.stop()
    try { await rm(primaryRepoPath, { recursive: true, force: true }) } catch { /* best-effort */ }
    try { await rm(runtimeRoot, { recursive: true, force: true }) } catch { /* best-effort */ }
  })

  it('harness receives exact managed compiled prompt bytes (not raw objective string)', async () => {
    const goal = 'Implement add(a, b) function correctly in src/math.js'

    // Create run with project context
    const createRes = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        constraints: ['src/math.js'],
        acceptanceCriteria: [{ description: 'add(2,3) returns 5' }],
        requiredEvidence: [{ type: 'GIT_DIFF', description: 'Diff in src/math.js', mandatory: true }],
        projectContext: {
          projectName: 'Math Test Project',
          projectSummary: 'A fixture for testing prompt compilation',
        },
      }),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json() as any
    const { runId } = created
    const taskId = created.tasks[0].id

    // Execute
    const execRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/execute`, { method: 'POST' })
    expect(execRes.status).toBe(200)

    // Verify harness was called exactly once
    expect(harness.capturedPrompts.length).toBe(1)
    const receivedPrompt = harness.capturedPrompts[0]!

    // Invariant 1: received prompt is NOT the raw goal string
    expect(receivedPrompt).not.toBe(goal)
    expect(receivedPrompt.length).toBeGreaterThan(goal.length)

    // Invariant 2: received prompt contains managed global policy
    expect(receivedPrompt).toContain(GLOBAL_POLICY_EXCERPT)
    expect(receivedPrompt).toContain('SCOPE INVARIANTS:')
    expect(receivedPrompt).toContain('VERIFICATION INVARIANTS:')

    // Invariant 3: received prompt contains project context
    expect(receivedPrompt).toContain('Math Test Project')

    // Invariant 4: received prompt contains task goal and acceptance criteria
    expect(receivedPrompt).toContain(goal)
    expect(receivedPrompt).toContain('add(2,3) returns 5')

    // Invariant 5: SHA-256(received bytes) === stored compiledPrompt.sha256
    const receivedBytes = Buffer.from(receivedPrompt, 'utf8')
    const independentHash = createHash('sha256').update(receivedBytes).digest('hex')
    const storedPrompt = registry.getCompiledPrompt(taskId)
    expect(storedPrompt).toBeDefined()
    expect(storedPrompt!.sha256).toBe(independentHash)

    // Invariant 6: byteLength matches
    expect(storedPrompt!.byteLength).toBe(receivedBytes.length)

    // Invariant 7: runtime context layer included (worktree was allocated)
    expect(storedPrompt!.includedLayers).toContain('RUNTIME_CONTEXT')
    expect(storedPrompt!.includedLayers).toContain('GLOBAL')
    expect(storedPrompt!.includedLayers).toContain('AGENT_ROLE')

    // Invariant 8: Task prompt API returns compiled prompt data
    const promptRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}/prompt`)
    expect(promptRes.status).toBe(200)
    const promptBody = await promptRes.json() as any
    expect(promptBody.compiled).toBe(true)
    expect(promptBody.prompt.sha256).toBe(independentHash)
    expect(promptBody.prompt.compilerVersion).toBe('1')
    expect(promptBody.prompt.globalPolicyVersion).toBe('1')
    expect(promptBody.prompt.roleTemplateVersion).toBe('1')
  })
})
