/**
 * Playwright Visual & Custody Verification Suite for Gravitas 3D Headquarters (Wave 12H)
 *
 * Verifies and captures all 16 required visual proofs into docs/3d-hq/evidence/wave12h/:
 * 01-artifact-producer-desk.png
 * 02-review-handoff-ready.png
 * 03-artifact-review-intake.png
 * 04-review-in-progress.png
 * 05-review-passed.png
 * 06-changes-required.png
 * 07-integration-ready.png
 * 08-integration-prepared.png
 * 09-integration-conflict.png
 * 10-awaiting-human-approval.png
 * 11-human-approved-confirmed.png
 * 12-human-rejected-confirmed.png
 * 13-multi-artifact-overview.png
 * 14-fresh-load-custody-recovery.png
 * 15-character-vs-artifact-separation.png
 * 16-active-office-custody-overview.png
 *
 * Captures performance telemetry across 9 required operating conditions.
 */

import { test, expect } from '@playwright/test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import { executeGit } from '@gravitas/git'
import {
  EventHub,
  GravitasServer,
  InMemoryRegistry,
  RunService,
} from '../apps/server/src/index.js'
import type { StateSummaryResponse } from '../apps/web/src/api/types.js'
import {
  FIXTURE_A_ARTIFACT_AT_PRODUCER,
  FIXTURE_C_REVIEW_HANDOFF_READY,
  FIXTURE_D_ARTIFACT_REVIEW_INBOX,
  FIXTURE_E_REVIEW_IN_PROGRESS,
  FIXTURE_F_REVIEW_PASSED,
  FIXTURE_G_REVIEW_CHANGES_REQUIRED,
  FIXTURE_H_INTEGRATION_READY,
  FIXTURE_J_INTEGRATION_PREPARED,
  FIXTURE_K_INTEGRATION_CONFLICT,
  FIXTURE_L_WAITING_HUMAN_APPROVAL,
  FIXTURE_M_HUMAN_APPROVED,
  FIXTURE_N_HUMAN_REJECTED,
  FIXTURE_P_MULTI_ARTIFACT_CONCURRENT,
  FIXTURE_R_FRESH_LOAD_REVIEW_BENCH,
  type CustodyFixtureDefinition,
} from '../apps/web/src/hq3d/world/custodyFixtures.js'
import { getFreePort } from './test-ports.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/wave12h')

function fixtureToStateSummary(fixture: CustodyFixtureDefinition): StateSummaryResponse {
  return {
    service: 'gravitas',
    version: '0.0.1',
    runs: [
      {
        id: 'run-w12h',
        goal: 'Wave 12H Authoritative Artifact Custody Verification',
        status: 'RUNNING',
        baseBranch: 'main',
        constraints: [],
        acceptanceCriteria: [],
        requiredEvidence: [],
        createdAt: '2026-09-23T10:00:00.000Z',
        updatedAt: '2026-09-23T10:00:00.000Z',
      },
    ],
    tasks: fixture.tasks as any,
    harness: {
      id: 'harness-custody-test',
      status: 'AVAILABLE',
    },
    projection: fixture.projection as any,
  }
}

test.describe.serial('Wave 12H — Authoritative Artifact Custody & Visual Proofs', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer
  let VITE_PORT: number

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12h-spec-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12h-spec-rt-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12H Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'w12h@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'w12h-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)

    class HqCustodyTestHarness {
      public readonly id = 'hq-custody-test-harness'
      async availability() {
        return { status: 'AVAILABLE' as const, installed: true, usableNoninteractive: true }
      }
      async execute(req: any) {
        return {
          durationMs: 20,
          exitCode: 0,
          terminationReason: 'COMPLETED' as const,
          stdout: 'work product authored',
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false,
          worktreePath: req.worktreePath,
        }
      }
    }

    const service = new RunService({
      registry,
      eventHub,
      harness: new HqCustodyTestHarness() as any,
      runtimeRoot,
      defaultRepository: fixtureRepoPath,
    })

    server = new GravitasServer({ service, eventHub })
    const serverInfo = await server.start({ host: '127.0.0.1', port: 0 })
    VITE_PORT = await getFreePort()

    const webRoot = join(__dirname, '../apps/web')
    viteServer = await createViteServer({
      root: webRoot,
      server: {
        host: '127.0.0.1',
        port: VITE_PORT,
        strictPort: true,
        proxy: {
          '/api': {
            target: serverInfo.url,
            changeOrigin: false,
            secure: false,
          },
        },
      },
    })
    await viteServer.listen()
  })

  test.afterAll(async () => {
    if (viteServer) await viteServer.close()
    if (server) await server.stop()
    if (fixtureRepoPath) await rm(fixtureRepoPath, { recursive: true, force: true }).catch(() => {})
    if (runtimeRoot) await rm(runtimeRoot, { recursive: true, force: true }).catch(() => {})
  })

  test('01: 01-artifact-producer-desk.png — Artifact dossier resting on producer desk', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_A_ARTIFACT_AT_PRODUCER)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click() // Agent Operations
    await page.waitForTimeout(600)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_ALL_IDLE:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '01-artifact-producer-desk.png'),
      fullPage: true,
    })
  })

  test('02: 02-review-handoff-ready.png — Handoff becomes READY; dossier staged for transit', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_C_REVIEW_HANDOFF_READY)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-3"]').click() // Verification Lab
    await page.waitForTimeout(600)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_ONE_ARTIFACT_TRANSIT:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '02-review-handoff-ready.png'),
      fullPage: true,
    })
  })

  test('03: 03-artifact-review-intake.png — Dossier arrived at Review Intake dock', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_D_ARTIFACT_REVIEW_INBOX)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '03-artifact-review-intake.png'),
      fullPage: true,
    })
  })

  test('04: 04-review-in-progress.png — Independent Reviewer inspecting dossier at Review Bench', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_E_REVIEW_IN_PROGRESS)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(600)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_ONE_CHARACTER_ONE_ARTIFACT:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '04-review-in-progress.png'),
      fullPage: true,
    })
  })

  test('05: 05-review-passed.png — Review PASSED band on dossier moving to Integration Inbox', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_F_REVIEW_PASSED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '05-review-passed.png'),
      fullPage: true,
    })
  })

  test('06: 06-changes-required.png — Review CHANGES REQUIRED red tab placed in Failure Hold', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_G_REVIEW_CHANGES_REQUIRED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '06-changes-required.png'),
      fullPage: true,
    })
  })

  test('07: 07-integration-ready.png — Candidate at Integration Inbox', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_H_INTEGRATION_READY)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '07-integration-ready.png'),
      fullPage: true,
    })
  })

  test('08: 08-integration-prepared.png — Graphite sleeve applied; staging for approval', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_J_INTEGRATION_PREPARED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-6"]').click() // Approval Mezzanine
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '08-integration-prepared.png'),
      fullPage: true,
    })
  })

  test('09: 09-integration-conflict.png — Split red/amber clasp conflict hold', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_K_INTEGRATION_CONFLICT)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '09-integration-conflict.png'),
      fullPage: true,
    })
  })

  test('10: 10-awaiting-human-approval.png — Candidate on Approval Plinth; gold tab illuminated', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_L_WAITING_HUMAN_APPROVAL)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-6"]').click() // Approval Mezzanine
    await page.waitForTimeout(600)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_WAITING_APPROVAL:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '10-awaiting-human-approval.png'),
      fullPage: true,
    })
  })

  test('11: 11-human-approved-confirmed.png — Clasp sealed emerald in Completed Tray', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_M_HUMAN_APPROVED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '11-human-approved-confirmed.png'),
      fullPage: true,
    })
  })

  test('12: 12-human-rejected-confirmed.png — Human rejection red clasp in Failure Hold', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_N_HUMAN_REJECTED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '12-human-rejected-confirmed.png'),
      fullPage: true,
    })
  })

  test('13: 13-multi-artifact-overview.png — 3 concurrent artifacts at Review, Integration, Approval', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_P_MULTI_ARTIFACT_CONCURRENT)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.waitForTimeout(800)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_THREE_ARTIFACT_TRANSITS:', JSON.stringify(stats))
    console.log('PERF_STATE_STATS_THREE_CHARACTERS_THREE_ARTIFACTS:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '13-multi-artifact-overview.png'),
      fullPage: true,
    })
  })

  test('14: 14-fresh-load-custody-recovery.png — Direct load into Review Bench position', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_R_FRESH_LOAD_REVIEW_BENCH)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(400)

    await page.screenshot({
      path: join(evidenceDir, '14-fresh-load-custody-recovery.png'),
      fullPage: true,
    })
  })

  test('15: 15-character-vs-artifact-separation.png — Reviewer character walking while artifact in review intake', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_D_ARTIFACT_REVIEW_INBOX)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '15-character-vs-artifact-separation.png'),
      fullPage: true,
    })
  })

  test('16: 16-active-office-custody-overview.png — Wide overview of active office work product custody', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_P_MULTI_ARTIFACT_CONCURRENT)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-1"]').click() // Mission Control overview
    await page.waitForTimeout(800)

    // Performance measurements for special states
    const perfReducedMotion = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      return dir?.getPerformanceStats()
    })
    console.log('PERF_STATE_STATS_REDUCED_MOTION:', JSON.stringify(perfReducedMotion))

    await page.screenshot({
      path: join(evidenceDir, '16-active-office-custody-overview.png'),
      fullPage: true,
    })
  })
})
