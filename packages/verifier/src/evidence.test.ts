import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { MutationCapture, WorktreeSnapshot } from '@gravitas/harnesses'
import { writeEvidenceBundle } from './evidence.js'
import type { VerificationResult } from './types.js'

describe('Evidence Bundle Writer (evidence.ts)', () => {
  let runtimeRoot: string

  beforeEach(async () => {
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-evidence-test-'))
  })

  afterEach(async () => {
    try {
      await rm(runtimeRoot, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup
    }
  })

  const dummySnapshot: WorktreeSnapshot = {
    headSha: 'abc1234567890',
    branch: 'gravitas/run-01/task-01',
    isClean: true,
    fileList: ['src/math.js'],
    stagedCount: 0,
    unstagedCount: 0,
    untrackedCount: 0,
  }

  const dummyMutation: MutationCapture = {
    beforeSnapshot: dummySnapshot,
    afterSnapshot: dummySnapshot,
    headMutated: false,
    changedFiles: ['src/math.js'],
    diff: 'diff --git a/src/math.js b/src/math.js\n+export function add(a,b){return a+b;}',
    diffSha256: createHash('sha256')
      .update('diff --git a/src/math.js b/src/math.js\n+export function add(a,b){return a+b;}')
      .digest('hex'),
    allowedChanges: ['src/math.js'],
    unexpectedChanges: [],
  }

  const dummyVerification: VerificationResult = {
    planId: 'plan-test-01',
    status: 'PASSED',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 150,
    commands: [
      {
        id: 'cmd-unit',
        executable: process.execPath,
        args: ['--version'],
        cwd: 'C:\\fake\\worktree',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 150,
        exitCode: 0,
        terminationReason: 'COMPLETED',
        mandatory: true,
        stdout: 'v22.0.0\n',
        stderr: '',
        stdoutSha256: createHash('sha256').update('v22.0.0\n').digest('hex'),
        stderrSha256: createHash('sha256').update('').digest('hex'),
        stdoutTruncated: false,
        stderrTruncated: false,
      },
    ],
    verifierGeneratedChanges: [],
  }

  it('writes all required artifacts under the runtime root with verifiable SHA-256 hashes', async () => {
    const result = await writeEvidenceBundle({
      runtimeRoot,
      runId: 'run-alpha',
      taskId: 'task-beta',
      goal: 'Implement addition',
      repositoryPath: 'C:\\fake\\primary\\repo',
      baseBranch: 'main',
      baseSha: 'abc1234567890',
      taskBranch: 'gravitas/run-alpha/task-beta',
      worktreePath: 'C:\\fake\\runtime\\worktrees\\run-alpha\\task-beta',
      worker: {
        harnessId: 'free-claude-code',
        executionId: 'exec-001',
        exitCode: 0,
        terminationReason: 'COMPLETED',
        durationMs: 12000,
        promptSha256: '9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff',
      },
      mutation: dummyMutation,
      verification: dummyVerification,
      finalTaskState: 'WAITING_APPROVAL',
    })

    // 1. Verify bundle directory is strictly under runtimeRoot/runs/runId/tasks/taskId
    const expectedDir = join(runtimeRoot, 'runs', 'run-alpha', 'tasks', 'task-beta')
    expect(result.bundleDir).toBe(expectedDir)

    // 2. Verify all 7 required artifacts are present
    const expectedFiles = [
      'task.json',
      'worker.json',
      'mutation.json',
      'diff.patch',
      'verification.json',
      'evidence-manifest.json',
      'evidence-manifest.sha256',
    ]

    for (const filename of expectedFiles) {
      expect(result.artifactPaths[filename]).toBeDefined()
      const content = await readFile(result.artifactPaths[filename]!, 'utf8')
      expect(content.length).toBeGreaterThan(0)
    }

    // 3. Verify artifact hashes in manifest match actual written file bytes on disk
    for (const [artifactName, expectedHash] of Object.entries(result.manifest.artifactHashes)) {
      const artifactPath = result.artifactPaths[artifactName]!
      const content = await readFile(artifactPath)
      const actualHash = createHash('sha256').update(content).digest('hex')
      expect(actualHash).toBe(expectedHash)
    }

    // 4. Verify Approach B for manifest self-hash (separate evidence-manifest.sha256 file)
    const manifestPath = result.artifactPaths['evidence-manifest.json']!
    const manifestBytes = await readFile(manifestPath)
    const actualManifestHash = createHash('sha256').update(manifestBytes).digest('hex')
    expect(actualManifestHash).toBe(result.manifestSha256)

    const sha256FileContent = await readFile(
      result.artifactPaths['evidence-manifest.sha256']!,
      'utf8'
    )
    expect(sha256FileContent).toContain(actualManifestHash)
    expect(sha256FileContent).toContain('evidence-manifest.json')

    // 5. Verify JSON parsing of all written JSON files
    for (const filename of [
      'task.json',
      'worker.json',
      'mutation.json',
      'verification.json',
      'evidence-manifest.json',
    ]) {
      const text = await readFile(result.artifactPaths[filename]!, 'utf8')
      expect(() => JSON.parse(text)).not.toThrow()
    }
  })
})
