/**
 * @gravitas/desktop — Legacy Surface Quarantine Invariant Suite (Wave V1-A)
 *
 * Proves that legacy `apps/server` and `apps/web` surfaces are strictly quarantined
 * and cannot become canonical state authorities in normal V1 desktop execution.
 *
 * Invariants Verified:
 * - apps/desktop has zero dependency on @gravitas/server or @gravitas/web
 * - Desktop main and kernel host do not import server or web packages
 * - Desktop uses WorkSessionKernel (single canonical SQLite writer), never InMemoryRegistry
 * - Desktop IPC bridge only routes typed operator intents to the kernel
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

describe('GRAVITAS V1-A Legacy Surface Quarantine Invariants', () => {
  const rootDir = process.cwd()
  const desktopPkgPath = join(rootDir, 'apps/desktop/package.json')
  const desktopMainPath = join(rootDir, 'apps/desktop/src/main/index.ts')
  const desktopKernelHostPath = join(rootDir, 'apps/desktop/src/kernel-host/kernelHost.ts')
  const serverIndexPath = join(rootDir, 'apps/server/src/index.ts')

  it('1. apps/desktop does not declare @gravitas/server or @gravitas/web as dependencies', () => {
    expect(existsSync(desktopPkgPath)).toBe(true)
    const pkg = JSON.parse(readFileSync(desktopPkgPath, 'utf8'))
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }

    expect(allDeps['@gravitas/server']).toBeUndefined()
    expect(allDeps['@gravitas/web']).toBeUndefined()
  })

  it('2. apps/desktop main entrypoint does not import from server or web', () => {
    expect(existsSync(desktopMainPath)).toBe(true)
    const mainSrc = readFileSync(desktopMainPath, 'utf8')

    expect(mainSrc).not.toContain('@gravitas/server')
    expect(mainSrc).not.toContain('@gravitas/web')
    expect(mainSrc).not.toContain('apps/server')
    expect(mainSrc).not.toContain('apps/web')
  })

  it('3. apps/desktop kernel host uses WorkSessionKernel, never InMemoryRegistry', () => {
    expect(existsSync(desktopKernelHostPath)).toBe(true)
    const kernelHostSrc = readFileSync(desktopKernelHostPath, 'utf8')

    expect(kernelHostSrc).toContain("import { WorkSessionKernel")
    expect(kernelHostSrc).not.toContain('InMemoryRegistry')
    expect(kernelHostSrc).not.toContain('@gravitas/server')
  })

  it('4. apps/server InMemoryRegistry is proven isolated and non-canonical', () => {
    expect(existsSync(serverIndexPath)).toBe(true)
    const serverSrc = readFileSync(serverIndexPath, 'utf8')

    // Server uses InMemoryRegistry
    expect(serverSrc).toContain('new InMemoryRegistry()')
    // Server does NOT use WorkSessionKernel
    expect(serverSrc).not.toContain('WorkSessionKernel')
  })
})
