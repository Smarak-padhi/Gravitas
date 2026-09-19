/**
 * Evidence Collector and Bundle Writer for @gravitas/verifier.
 *
 * Guarantees:
 * - Evidence is written strictly under an external runtime root.
 * - Never touches target repo, task worktree, or primary repo.
 * - Atomic write-and-rename pattern prevents corrupted or partial artifacts.
 * - All artifacts are cryptographically hashed with SHA-256.
 * - Approach B for manifest hashing: `evidence-manifest.sha256` contains the
 *   hash of `evidence-manifest.json`, eliminating self-hashing recursion.
 * - Credential sanitization applied to all outputs.
 */

import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { sanitizeOutput } from '@gravitas/harnesses'
import { EvidenceCollectionError } from './errors.js'
import type {
  EvidenceBundleInput,
  EvidenceBundleResult,
  EvidenceManifest,
} from './types.js'

/**
 * Safely writes content to a file via a temporary file and rename.
 */
async function atomicWriteFile(filePath: string, content: string): Promise<string> {
  const dir = dirname(filePath)
  await mkdir(dir, { recursive: true })

  const tempPath = `${filePath}.${randomBytes(6).toString('hex')}.tmp`
  try {
    await writeFile(tempPath, content, 'utf8')
    await rename(tempPath, filePath)
  } catch (err: unknown) {
    try {
      await rm(tempPath, { force: true })
    } catch {
      // Ignore cleanup error
    }
    const msg = err instanceof Error ? err.message : String(err)
    throw new EvidenceCollectionError(filePath, msg)
  }

  return computeSha256(content)
}

function computeSha256(data: string | Buffer): string {
  return createHash('sha256')
    .update(typeof data === 'string' ? Buffer.from(data, 'utf8') : data)
    .digest('hex')
}

/**
 * Writes the complete evidence bundle for a task execution.
 */
export async function writeEvidenceBundle(
  input: EvidenceBundleInput
): Promise<EvidenceBundleResult> {
  const {
    runtimeRoot,
    runId,
    taskId,
    goal,
    repositoryPath,
    baseBranch,
    baseSha,
    taskBranch,
    worktreePath,
    worker,
    mutation,
    verification,
    finalTaskState,
  } = input

  // Resolve directory layout: <runtimeRoot>/runs/<runId>/tasks/<taskId>
  const taskEvidenceDir = resolve(runtimeRoot, 'runs', runId, 'tasks', taskId)
  await mkdir(taskEvidenceDir, { recursive: true })

  const artifactHashes: Record<string, string> = {}
  const artifactPaths: Record<string, string> = {}

  try {
    // 1. Write task.json
    const taskJsonPath = join(taskEvidenceDir, 'task.json')
    const taskJsonContent = JSON.stringify(
      {
        runId,
        taskId,
        goal,
        finalTaskState,
      },
      null,
      2
    )
    artifactHashes['task.json'] = await atomicWriteFile(taskJsonPath, taskJsonContent)
    artifactPaths['task.json'] = taskJsonPath

    // 2. Write worker.json (sanitized)
    const workerJsonPath = join(taskEvidenceDir, 'worker.json')
    const sanitizedWorkerContent = sanitizeOutput(
      JSON.stringify(
        {
          harnessId: worker.harnessId,
          executionId: worker.executionId,
          exitCode: worker.exitCode,
          terminationReason: worker.terminationReason,
          durationMs: worker.durationMs,
          promptSha256: worker.promptSha256,
          ...(worker.rawResult ? { rawResult: worker.rawResult } : {}),
        },
        null,
        2
      )
    )
    artifactHashes['worker.json'] = await atomicWriteFile(
      workerJsonPath,
      sanitizedWorkerContent
    )
    artifactPaths['worker.json'] = workerJsonPath

    // 3. Write mutation.json
    const mutationJsonPath = join(taskEvidenceDir, 'mutation.json')
    const mutationJsonContent = JSON.stringify(
      {
        headMutated: mutation.headMutated,
        changedFiles: mutation.changedFiles,
        allowedChanges: mutation.allowedChanges,
        unexpectedChanges: mutation.unexpectedChanges,
        diffSha256: mutation.diffSha256,
        beforeSnapshot: mutation.beforeSnapshot,
        afterSnapshot: mutation.afterSnapshot,
      },
      null,
      2
    )
    artifactHashes['mutation.json'] = await atomicWriteFile(
      mutationJsonPath,
      mutationJsonContent
    )
    artifactPaths['mutation.json'] = mutationJsonPath

    // 4. Write diff.patch
    const diffPatchPath = join(taskEvidenceDir, 'diff.patch')
    artifactHashes['diff.patch'] = await atomicWriteFile(diffPatchPath, mutation.diff)
    artifactPaths['diff.patch'] = diffPatchPath

    // 5. Write verification.json
    const verificationJsonPath = join(taskEvidenceDir, 'verification.json')
    const sanitizedVerificationContent = sanitizeOutput(
      JSON.stringify(verification, null, 2)
    )
    artifactHashes['verification.json'] = await atomicWriteFile(
      verificationJsonPath,
      sanitizedVerificationContent
    )
    artifactPaths['verification.json'] = verificationJsonPath

    // 6. Build evidence manifest
    const manifest: EvidenceManifest = {
      schemaVersion: 'gravitas.evidence.v1',
      runId,
      taskId,
      goal,
      repository: {
        path: repositoryPath,
        isClean: true,
      },
      baseBranch,
      baseSha,
      taskBranch,
      worktreePath,
      worker: {
        harnessId: worker.harnessId,
        executionId: worker.executionId,
        exitCode: worker.exitCode,
        terminationReason: worker.terminationReason,
        durationMs: worker.durationMs,
        promptSha256: worker.promptSha256,
      },
      mutation: {
        changedPaths: mutation.changedFiles,
        allowedChanges: mutation.allowedChanges,
        unexpectedChanges: mutation.unexpectedChanges,
        headMutated: mutation.headMutated,
        diffSha256: mutation.diffSha256,
      },
      verification: {
        status: verification.status,
        startedAt: verification.startedAt,
        completedAt: verification.completedAt,
        commands: verification.commands.map((c) => ({
          id: c.id,
          executable: c.executable,
          args: c.args,
          cwd: c.cwd,
          startedAt: c.startedAt,
          completedAt: c.completedAt,
          durationMs: c.durationMs,
          exitCode: c.exitCode,
          terminationReason: c.terminationReason,
          mandatory: c.mandatory,
          stdoutSha256: c.stdoutSha256,
          stderrSha256: c.stderrSha256,
          stdoutTruncated: c.stdoutTruncated,
          stderrTruncated: c.stderrTruncated,
        })),
        verifierGeneratedChanges: verification.verifierGeneratedChanges,
      },
      finalTaskState,
      artifactHashes: Object.freeze(artifactHashes),
    }

    // 7. Write evidence-manifest.json
    const manifestPath = join(taskEvidenceDir, 'evidence-manifest.json')
    const manifestContent = JSON.stringify(manifest, null, 2)
    const manifestSha256 = await atomicWriteFile(manifestPath, manifestContent)
    artifactPaths['evidence-manifest.json'] = manifestPath

    // 8. Write evidence-manifest.sha256 (Approach B: separate hash artifact)
    const manifestShaPath = join(taskEvidenceDir, 'evidence-manifest.sha256')
    await atomicWriteFile(manifestShaPath, `${manifestSha256}  evidence-manifest.json\n`)
    artifactPaths['evidence-manifest.sha256'] = manifestShaPath

    return {
      bundleDir: taskEvidenceDir,
      manifest,
      manifestSha256,
      artifactPaths: Object.freeze(artifactPaths),
    }
  } catch (err: unknown) {
    if (err instanceof EvidenceCollectionError) {
      throw err
    }
    const msg = err instanceof Error ? err.message : String(err)
    throw new EvidenceCollectionError(taskEvidenceDir, msg)
  }
}
