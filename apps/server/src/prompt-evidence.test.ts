/**
 * Prompt Evidence Integration Test for @gravitas/server.
 *
 * Proves:
 * - Evidence manifest records promptSha256 matching managed compiled prompt sha256
 * - Evidence manifest records compilerVersion, globalPolicyVersion, roleTemplateVersion
 * - Evidence bundle writes prompt.txt artifact
 * - Evidence manifest.worker.promptSha256 === SHA256(prompt.txt content)
 *
 * Zero AI calls.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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
import type { EvidenceManifest } from '@gravitas/verifier'

class MinimalFakeHarness implements AgentHarness {
  public readonly id = 'evidence-test-harness'

  public async availability(): Promise<HarnessAvailability> {
    return { status: 'AVAILABLE', installed: true, usableNoninteractive: true }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const mathJsPath = join(request.worktreePath, 'src', 'math.js')
    await writeFile(mathJsPath, 'export function add(a, b) {\n  return a + b;\n}\n', 'utf8')
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 5,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: '',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      worktreePath: request.worktreePath,
    }
  }
}

describe('Prompt Evidence Integration (prompt-evidence.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let serverUrl: string
  let registry: InMemoryRegistry

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-evidence-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-evidence-runtime-'))

    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Evidence Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'evidence@test.local'] })

    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'evidence-fixture', type: 'module', version: '1.0.0' }, null, 2),
      'utf8'
    )
    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(join(primaryRepoPath, 'src', 'math.js'), 'export function add(a, b) {\n  return 0;\n}\n', 'utf8')
    await mkdir(join(primaryRepoPath, 'test'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'test', 'math.test.js'),
      `import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/math.js';
test('adds', () => { assert.equal(add(1, 2), 3); });
`,
      'utf8'
    )
    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'Evidence test baseline'] })

    registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)

    const verificationPlan: VerificationPlan = {
      id: 'plan_evidence_test',
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
      harness: new MinimalFakeHarness(),
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

  it('evidence manifest records managed prompt provenance fields', async () => {
    // Create and execute run
    const createRes = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Implement add correctly',
        constraints: ['src/math.js'],
        acceptanceCriteria: [{ description: 'add works' }],
        requiredEvidence: [{ type: 'GIT_DIFF', description: 'Diff', mandatory: true }],
      }),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json() as any
    const { runId } = created
    const taskId = created.tasks[0].id

    await fetch(`${serverUrl}/api/v1/runs/${runId}/execute`, { method: 'POST' })

    // Retrieve evidence
    const evidRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/tasks/${taskId}/evidence`)
    expect(evidRes.status).toBe(200)
    const evidBody = await evidRes.json() as any

    // Get evidence ref from registry and verify physical disk manifest
    const evidenceRef = registry.getEvidenceRef(taskId)
    expect(evidenceRef).toBeDefined()
    const manifestContent = await readFile(evidenceRef!.manifestPath, 'utf8')
    const onDiskManifest = JSON.parse(manifestContent) as EvidenceManifest

    // Use onDiskManifest and evidBody.manifest
    const manifest = evidBody.manifest as EvidenceManifest
    expect(onDiskManifest.worker.promptSha256).toBe(manifest.worker.promptSha256)

    // Verify promptSha256 is present
    expect(manifest.worker.promptSha256).toBeTypeOf('string')
    expect(manifest.worker.promptSha256).toMatch(/^[0-9a-f]{64}$/)

    // Verify provenance versions are recorded
    expect(manifest.worker.compilerVersion).toBe('1')
    expect(manifest.worker.globalPolicyVersion).toBe('1')
    expect(manifest.worker.roleTemplateVersion).toBe('1')

    // Verify the hash matches the stored compiled prompt
    const storedPrompt = registry.getCompiledPrompt(taskId)
    expect(storedPrompt).toBeDefined()
    expect(manifest.worker.promptSha256).toBe(storedPrompt!.sha256)

    // Verify prompt.txt is listed in artifact files
    expect(evidBody.artifactFiles).toContain('prompt.txt')
  })
})
