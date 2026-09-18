/**
 * Disposable Git fixture infrastructure for @gravitas/git tests.
 *
 * Guarantees:
 * - Never touches user repositories or Gravitas itself.
 * - Always creates temporary repositories in isolated OS temp directories.
 * - Configures local-only author identity (no global git config mutation).
 * - Creates authentic baseline commits with realistic files.
 */

import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runGit } from './process.js'

export interface DisposableRepo {
  readonly dir: string
  readonly baseSha: string
  readonly defaultBranch: string
  readonly cleanup: () => Promise<void>
}

/**
 * Creates a real, disposable Git repository for integration testing.
 */
export async function createDisposableRepo(options?: {
  readonly dirNamePrefix?: string | undefined
  readonly customDir?: string | undefined
  readonly defaultBranch?: string | undefined
}): Promise<DisposableRepo> {
  const branchName = options?.defaultBranch ?? 'main'
  let targetDir: string

  if (options?.customDir) {
    targetDir = options.customDir
    await mkdir(targetDir, { recursive: true })
  } else {
    const prefix = join(tmpdir(), options?.dirNamePrefix ?? 'gravitas-test-repo-')
    targetDir = await mkdtemp(prefix)
  }

  // 1. git init -b <branchName>
  await runGit({
    cwd: targetDir,
    args: ['init', '-b', branchName],
  })

  // 2. Configure local-only identity & safe settings
  await runGit({
    cwd: targetDir,
    args: ['config', 'user.name', 'Gravitas Test'],
  })
  await runGit({
    cwd: targetDir,
    args: ['config', 'user.email', 'gravitas-test@invalid.local'],
  })
  await runGit({
    cwd: targetDir,
    args: ['config', 'commit.gpgsign', 'false'],
  })
  await runGit({
    cwd: targetDir,
    args: ['config', 'core.autocrlf', 'false'],
  })

  // 3. Populate realistic initial files
  await writeFile(join(targetDir, 'README.md'), '# Fixture Repository\nInitial content.\n', 'utf8')
  await writeFile(
    join(targetDir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0' }, null, 2),
    'utf8'
  )
  await mkdir(join(targetDir, 'src'), { recursive: true })
  await writeFile(join(targetDir, 'src', 'index.js'), '// Primary source file\n', 'utf8')

  // 4. Commit baseline
  await runGit({
    cwd: targetDir,
    args: ['add', '.'],
  })
  await runGit({
    cwd: targetDir,
    args: ['commit', '-m', 'initial fixture baseline commit'],
  })

  // 5. Query HEAD SHA
  const headResult = await runGit({
    cwd: targetDir,
    args: ['rev-parse', 'HEAD'],
  })
  const baseSha = headResult.stdout.trim()

  const cleanup = async () => {
    try {
      await rm(targetDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch {
      // Ignore cleanup errors on OS temp dirs
    }
  }

  return {
    dir: targetDir,
    baseSha,
    defaultBranch: branchName,
    cleanup,
  }
}
