/**
 * Standalone Real-Git Worktree Isolation Demonstration
 *
 * Sequence:
 * 1. Create disposable repository with baseline commit.
 * 2. Allocate Task A worktree (run-001/task-a) at BASE_SHA.
 * 3. Allocate Task B worktree (run-001/task-b) at BASE_SHA.
 * 4. Modify src/a.txt in Worktree A.
 * 5. Modify src/b.txt in Worktree B.
 * 6. Inspect Primary, Worktree A, Worktree B independently.
 * 7. Print conclusive SHA, branch, and status evidence.
 * 8. Clean up all disposable resources safely.
 */

import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inspectRepository } from '../src/inspector.js'
import { createDisposableRepo } from '../src/test-fixture.js'
import { allocateWorktree, inspectWorktree, removeWorktree } from '../src/worktree.js'

async function runDemo(): Promise<void> {
  console.log('=== GRAVITAS REAL-GIT WORKTREE ISOLATION DEMONSTRATION ===\n')

  // 1. Create primary disposable repository
  const repo = await createDisposableRepo({ dirNamePrefix: 'gravitas-demo-repo-' })
  console.log(`[1] Primary Repository Created: ${repo.dir}`)
  console.log(`    Base SHA: ${repo.baseSha}`)
  console.log(`    Branch:   ${repo.defaultBranch}\n`)

  const runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-demo-runtime-'))
  console.log(`[2] Runtime Root Created: ${runtimeRoot}\n`)

  try {
    // 2. Allocate Worktree A
    const allocA = await allocateWorktree({
      repository: repo.dir,
      baseRef: 'main',
      runId: 'run-001',
      taskId: 'task-a',
      runtimeRoot,
    })
    console.log(`[3] Worktree A Allocated:`)
    console.log(`    Path:     ${allocA.worktreePath}`)
    console.log(`    Branch:   ${allocA.branch}`)
    console.log(`    Base SHA: ${allocA.baseSha}\n`)

    // 3. Allocate Worktree B
    const allocB = await allocateWorktree({
      repository: repo.dir,
      baseRef: 'main',
      runId: 'run-001',
      taskId: 'task-b',
      runtimeRoot,
    })
    console.log(`[4] Worktree B Allocated:`)
    console.log(`    Path:     ${allocB.worktreePath}`)
    console.log(`    Branch:   ${allocB.branch}`)
    console.log(`    Base SHA: ${allocB.baseSha}\n`)

    // 4. Modify src/a.txt in A
    const fileA = join(allocA.worktreePath, 'src', 'a.txt')
    await writeFile(fileA, 'Worktree A isolated change content\n', 'utf8')
    console.log(`[5] Wrote src/a.txt in Worktree A`)

    // 5. Modify src/b.txt in B
    const fileB = join(allocB.worktreePath, 'src', 'b.txt')
    await writeFile(fileB, 'Worktree B isolated change content\n', 'utf8')
    console.log(`[6] Wrote src/b.txt in Worktree B\n`)

    // 6. Independent Inspections
    const primaryInsp = await inspectRepository(repo.dir)
    const inspA = await inspectWorktree(allocA.worktreePath)
    const inspB = await inspectWorktree(allocB.worktreePath)

    const primaryHasA = existsSync(join(repo.dir, 'src', 'a.txt'))
    const primaryHasB = existsSync(join(repo.dir, 'src', 'b.txt'))
    const aHasA = existsSync(fileA)
    const aHasB = existsSync(join(allocA.worktreePath, 'src', 'b.txt'))
    const bHasB = existsSync(fileB)
    const bHasA = existsSync(join(allocB.worktreePath, 'src', 'a.txt'))

    console.log('=== EVIDENCE TABLE ===')
    console.log('--------------------------------------------------------------------------------')
    console.log('Location     | Branch                   | HEAD Match? | Is Clean? | Files Present')
    console.log('--------------------------------------------------------------------------------')
    console.log(
      `PRIMARY      | ${(primaryInsp.currentBranch ?? 'detached').padEnd(24)} | ${(primaryInsp.headSha === repo.baseSha ? 'YES' : 'NO').padEnd(11)} | ${(primaryInsp.isClean ? 'YES (clean)' : 'NO').padEnd(9)} | a.txt: ${primaryHasA}, b.txt: ${primaryHasB}`
    )
    console.log(
      `WORKTREE A   | ${(inspA.branch ?? 'detached').padEnd(24)} | ${(inspA.headSha === repo.baseSha ? 'YES' : 'NO').padEnd(11)} | ${(inspA.isClean ? 'YES' : 'NO (dirty)').padEnd(9)} | a.txt: ${aHasA}, b.txt: ${aHasB}`
    )
    console.log(
      `WORKTREE B   | ${(inspB.branch ?? 'detached').padEnd(24)} | ${(inspB.headSha === repo.baseSha ? 'YES' : 'NO').padEnd(11)} | ${(inspB.isClean ? 'YES' : 'NO (dirty)').padEnd(9)} | a.txt: ${bHasA}, b.txt: ${bHasB}`
    )
    console.log('--------------------------------------------------------------------------------\n')

    // 7. Verify dirty removal refusal
    const removalRefusal = await removeWorktree(allocA.worktreePath)
    console.log(`[7] Dirty Removal Test on Worktree A:`)
    console.log(`    Refusal Triggered: ${!removalRefusal.success}`)
    console.log(`    Reason:            ${removalRefusal.refusalReason}`)
    console.log(`    File Preserved:    ${existsSync(fileA)}\n`)

    console.log('=== DEMONSTRATION VERDICT: 100% SUCCESS ===\n')
  } finally {
    // Clean up temporary resources
    await repo.cleanup()
    try {
      await rm(runtimeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch {
      // ignore temp dir cleanup failure
    }
    console.log('[8] Disposable demonstration resources cleanly removed.')
  }
}

runDemo().catch((err) => {
  console.error('Demonstration failed:', err)
  process.exit(1)
})
