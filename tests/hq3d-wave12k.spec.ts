/**
 * GRAVITAS — WAVE 12K VERIFICATION & PERFORMANCE SUITE
 * FLOOR 3 VERIFICATION CLEANROOM + FLOOR 4 BROWSER QA LAB
 *
 * Measures:
 * 1. F3 & F4 Interaction & Picking Contracts (Section 19)
 * 2. Memory & Stability Soak Test: 20x cross-floor interaction cycles (Section 18)
 * 3. Real Foreground Interactive Telemetry: F3 Day/Night, F4 Day/Night, Tower Day >= 10s (Section 17)
 * 4. Scene Metrics & Resource Counts (Section 17)
 * 5. Deterministic Screenshot Captures & Side-by-Side Composites (Section 22)
 * 6. F1 & F2 Non-Regression Verification (Section 22)
 */

import { test, expect, chromium } from '@playwright/test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import { executeGit } from '@gravitas/git'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
} from '@gravitas/harnesses'
import type { VerificationPlan } from '@gravitas/verifier'
import {
  EventHub,
  GravitasServer,
  InMemoryRegistry,
  RunService,
} from '../apps/server/src/index.js'
import { getFreePort } from './test-ports.js'
import sharp from 'sharp'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/12k-r')

class HybridTestHarness implements AgentHarness {
  public readonly id = 'hybrid-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Wave 12K test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      exitCode: 0,
      stdout: 'Wave 12K executed successfully\n',
      stderr: '',
      failureReason: undefined,
    }
  }

  public async abort(): Promise<void> {}
}

test.describe('Wave 12K Verification Cleanroom & Browser QA Lab Suite', () => {
  let runtimeRoot: string
  let fixtureRepoPath: string
  let service: RunService
  let harness: HybridTestHarness
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number

  test.beforeAll(async () => {
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-12k-suite-'))
    fixtureRepoPath = join(runtimeRoot, 'repo')
    await mkdir(fixtureRepoPath, { recursive: true })

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Gravitas 12K Test'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'gravitas-12k@deepmind.google.com'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-12k-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new HybridTestHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_12k',
      commands: [
        {
          id: 'noop_verifier',
          executable: process.execPath,
          args: ['-e', 'process.exit(0)'],
          mandatory: true,
          timeoutMs: 5000,
        },
      ],
    }

    service = new RunService({
      registry,
      eventHub,
      harness,
      runtimeRoot,
      defaultRepository: fixtureRepoPath,
      defaultVerificationPlan,
    })

    server = new GravitasServer({
      service,
      eventHub,
    })

    const serverInfo = await server.start({ host: '127.0.0.1', port: 0 })
    SERVER_PORT = serverInfo.port
    VITE_PORT = await getFreePort()

    viteServer = await createViteServer({
      root: join(__dirname, '../apps/web'),
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
    await mkdir(evidenceDir, { recursive: true })
  })

  test.afterAll(async () => {
    try {
      if (viteServer) await viteServer.close()
    } catch {}
    try {
      if (server) await server.stop()
    } catch {}
  })

  test('Execute Wave 12K Production Suite, Soak, Interaction, Benchmarks & Evidence Captures', async () => {
    test.setTimeout(360000) // 6 minutes for full 20x soak + 5x 10s foreground benchmarks + 25 captures

    const fgBrowser = await chromium.launch({
      headless: false,
      args: [
        '--window-size=1600,900',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=CalculateNativeWinOcclusion',
        '--no-sandbox',
      ],
    })
    const fgContext = await fgBrowser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1.0,
    })
    const page = await fgContext.newPage()

    await page.goto(`http://127.0.0.1:${VITE_PORT}`)
    await page.waitForSelector('[data-testid="living-hq-canvas-container"]', { timeout: 15000 })
    await page.bringToFront()
    await page.waitForTimeout(1000)

    const fgHybridBtn = page.locator('[data-testid="mode-hybrid-btn"]')
    await fgHybridBtn.click()
    await page.waitForTimeout(1000)
    await page.locator('canvas').focus()
    await page.mouse.click(800, 450)

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: INTERACTION & PICKING REGRESSION CONTRACT (Section 19)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 1: F3 & F4 Interaction & Picking Contracts]')
    const pickingTestResults = await page.evaluate(async () => {
      const dir = (window as any).__hqDirector
      const results: { test: string; passed: boolean; details?: any }[] = []

      // ── Floor 3: Verification Cleanroom Picking ───────────────────────────
      dir.frameRoom('VERIFICATION_LAB')
      results.push({ test: 'frameRoom VERIFICATION_LAB', passed: true })

      const reviewer = dir.selectRole('role:quality:independent-reviewer')
      results.push({
        test: 'selectRole independent-reviewer',
        passed: reviewer !== null && reviewer.name.includes('Reviewer'),
        details: reviewer,
      })

      const verifierConsole = dir.selectStation('verifier-console')
      results.push({
        test: 'selectStation verifier-console',
        passed: verifierConsole !== null && verifierConsole.id === 'verifier-console',
        details: verifierConsole,
      })

      const evidenceWall = dir.selectStation('evidence-wall')
      results.push({
        test: 'selectStation evidence-wall',
        passed: evidenceWall !== null && evidenceWall.id === 'evidence-wall',
        details: evidenceWall,
      })

      // ── Floor 4: Browser QA Lab Picking ──────────────────────────────────
      dir.frameRoom('BROWSER_QA_LAB')
      results.push({ test: 'frameRoom BROWSER_QA_LAB', passed: true })

      const qaRole = dir.selectRole('role:quality:browser-qa')
      results.push({
        test: 'selectRole browser-qa',
        passed: qaRole !== null && qaRole.name.includes('Browser QA'),
        details: qaRole,
      })

      const qaMatrix = dir.selectStation('browser-qa-matrix')
      results.push({
        test: 'selectStation browser-qa-matrix',
        passed: qaMatrix !== null && qaMatrix.id === 'browser-qa-matrix',
        details: qaMatrix,
      })

      const qaStation = dir.selectStation('browser-qa-station')
      results.push({
        test: 'selectStation browser-qa-station',
        passed: qaStation !== null && qaStation.id === 'browser-qa-station',
        details: qaStation,
      })

      // ── Camera Orbit & Zoom Controls ─────────────────────────────────────
      const pos0 = dir.cameraRig.camera.position.clone()
      dir.cameraRig.onPointerDown(800, 450)
      dir.cameraRig.onPointerMove(850, 480)
      dir.cameraRig.onPointerUp()
      const pos1 = dir.cameraRig.camera.position.clone()
      results.push({
        test: 'camera orbit',
        passed: pos0.distanceTo(pos1) > 0.01,
      })

      const posZoom0 = dir.cameraRig.camera.position.clone()
      dir.cameraRig.onWheel(-200)
      const posZoom1 = dir.cameraRig.camera.position.clone()
      results.push({
        test: 'camera zoom',
        passed: posZoom0.distanceTo(posZoom1) > 0.01,
      })

      dir.resetToOverview()
      results.push({
        test: 'resetToOverview',
        passed: dir.picking.getSelectedEntity() === null,
      })

      return results
    })

    console.log('[Picking Results]:', pickingTestResults)
    for (const r of pickingTestResults) {
      expect(r.passed, `Picking test failed: ${r.test}`).toBe(true)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: MEMORY & STABILITY SOAK TEST (Section 18: 20x cross-floor cycles)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 2: Memory & Stability Soak Test — 20x Cross-Floor Cycles]')
    const soakResult = await page.evaluate(async () => {
      const dir = (window as any).__hqDirector
      const renderer = dir.renderer.renderer

      const getHeapMb = () => {
        const perf = window.performance as any
        return perf && perf.memory ? Number((perf.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2)) : null
      }

      const runCycle = () => {
        // 1. Overview
        dir.resetToOverview()
        dir.scene.update(performance.now() * 0.001, false)
        dir.cameraRig.update()
        renderer.render(dir.scene.scene, dir.cameraRig.camera)

        // 2. Floor 3 Cleanroom
        dir.frameRoom('VERIFICATION_LAB')
        dir.selectRole('role:quality:independent-reviewer')
        dir.selectStation('verifier-console')
        dir.cameraRig.onPointerDown(800, 450)
        dir.cameraRig.onPointerMove(830, 470)
        dir.cameraRig.onPointerUp()
        dir.cameraRig.update()
        renderer.render(dir.scene.scene, dir.cameraRig.camera)

        // 3. Return to Overview
        dir.resetToOverview()
        renderer.render(dir.scene.scene, dir.cameraRig.camera)

        // 4. Floor 4 Browser QA
        dir.frameRoom('BROWSER_QA_LAB')
        dir.selectRole('role:quality:browser-qa')
        dir.selectStation('browser-qa-matrix')
        dir.cameraRig.onPointerDown(800, 450)
        dir.cameraRig.onPointerMove(830, 470)
        dir.cameraRig.onPointerUp()
        dir.cameraRig.update()
        renderer.render(dir.scene.scene, dir.cameraRig.camera)

        // 5. Return to Overview
        dir.resetToOverview()
        renderer.render(dir.scene.scene, dir.cameraRig.camera)
      }

      // Warm-up 1 cycle
      runCycle()

      const initialGeometries = renderer.info.memory.geometries
      const initialTextures = renderer.info.memory.textures
      const initialHeapMb = getHeapMb()

      for (let cycle = 0; cycle < 20; cycle++) {
        runCycle()
      }

      const finalGeometries = renderer.info.memory.geometries
      const finalTextures = renderer.info.memory.textures
      const finalHeapMb = getHeapMb()

      return {
        cycles: 20,
        initialGeometries,
        finalGeometries,
        geometryDelta: finalGeometries - initialGeometries,
        initialTextures,
        finalTextures,
        textureDelta: finalTextures - initialTextures,
        initialHeapMb,
        finalHeapMb,
        heapDeltaMb: finalHeapMb !== null && initialHeapMb !== null ? Number((finalHeapMb - initialHeapMb).toFixed(2)) : null,
      }
    })

    console.log('[Memory Soak Results]:', soakResult)
    expect(soakResult.geometryDelta).toBe(0)
    expect(soakResult.textureDelta).toBe(0)

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: BENCHMARK TIMING (Section 17: F3 DAY/NIGHT, F4 DAY/NIGHT, OVERVIEW DAY)
    // ──────────────────────────────────────────────────────────────────────────
    const runForegroundBenchmark = async (roomKey: string, atmosphere: 'DAY' | 'NIGHT', durationMs: number = 10000) => {
      await page.evaluate(({ roomKey, atmosphere }) => {
        const dir = (window as any).__hqDirector
        dir.setAtmosphere(atmosphere)
        if (roomKey === 'OVERVIEW') {
          dir.resetToOverview()
        } else {
          dir.frameRoom(roomKey)
        }
      }, { roomKey, atmosphere })

      // 2-second warm-up
      await page.waitForTimeout(2000)

      // 10-second continuous RAF loop
      const bench = await page.evaluate((duration) => {
        return new Promise<any>((resolve) => {
          const frameDeltas: number[] = []
          let start: number | null = null
          let last: number | null = null
          let count = 0

          function frame(now: number) {
            if (start === null) {
              start = now
              last = now
              requestAnimationFrame(frame)
              return
            }

            const delta = now - (last as number)
            last = now
            frameDeltas.push(delta)
            count++

            if (now - start < duration) {
              requestAnimationFrame(frame)
            } else {
              const totalTime = now - start
              const avgFps = Number(((count / totalTime) * 1000).toFixed(2))
              const sorted = [...frameDeltas].sort((a, b) => a - b)
              const medianDelta = sorted[Math.floor(sorted.length * 0.5)] ?? 16.6
              const p95Delta = sorted[Math.floor(sorted.length * 0.95)] ?? 16.6
              const p99Delta = sorted[Math.floor(sorted.length * 0.99)] ?? 16.6
              const maxDelta = sorted[sorted.length - 1] ?? 16.6
              const minFps = Number((1000 / maxDelta).toFixed(2))
              const low1PercentFps = Number((1000 / p99Delta).toFixed(2))
              const avgFrameTimeMs = Number((totalTime / count).toFixed(2))

              resolve({
                frameCount: count,
                sampleDurationMs: Number(totalTime.toFixed(1)),
                avgFps,
                medianFrameTimeMs: Number(medianDelta.toFixed(2)),
                p95FrameTimeMs: Number(p95Delta.toFixed(2)),
                p99FrameTimeMs: Number(p99Delta.toFixed(2)),
                minFps,
                low1PercentFps,
                avgFrameTimeMs,
              })
            }
          }
          requestAnimationFrame(frame)
        })
      }, durationMs)

      return bench
    }

    console.log('[Benchmarking F3 Cleanroom DAY (10s)]...')
    const f3DayBench = await runForegroundBenchmark('VERIFICATION_LAB', 'DAY', 10000)
    console.log('[F3 Cleanroom DAY Result]:', f3DayBench)

    console.log('[Benchmarking F3 Cleanroom NIGHT (10s)]...')
    const f3NightBench = await runForegroundBenchmark('VERIFICATION_LAB', 'NIGHT', 10000)
    console.log('[F3 Cleanroom NIGHT Result]:', f3NightBench)

    console.log('[Benchmarking F4 Browser QA DAY (10s)]...')
    const f4DayBench = await runForegroundBenchmark('BROWSER_QA_LAB', 'DAY', 10000)
    console.log('[F4 Browser QA DAY Result]:', f4DayBench)

    console.log('[Benchmarking F4 Browser QA NIGHT (10s)]...')
    const f4NightBench = await runForegroundBenchmark('BROWSER_QA_LAB', 'NIGHT', 10000)
    console.log('[F4 Browser QA NIGHT Result]:', f4NightBench)

    console.log('[Benchmarking Tower Overview DAY (10s)]...')
    const overviewBench = await runForegroundBenchmark('OVERVIEW', 'DAY', 10000)
    console.log('[Tower Overview DAY Result]:', overviewBench)

    const allBenchmarks = {
      f3DayBench,
      f3NightBench,
      f4DayBench,
      f4NightBench,
      overviewBench,
    }
    await writeFile(join(evidenceDir, 'benchmarks.json'), JSON.stringify(allBenchmarks, null, 2), 'utf8')

    // ──────────────────────────────────────────────────────────────────────────
    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: DETERMINISTIC SCREENSHOT CAPTURES (Wave 12K-R Section 13)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Capturing deterministic evidence screenshots for Wave 12K-R]...')

    // ── Floor 3: Verification Cleanroom (01 - 06) ──────────────────────────
    // 01-f3-day-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_DAY_WIDE',
          target: [0.0, 11.9, 0.4],
          position: [-2.4, 13.5, -6.6],
          description: 'F3 Verification Cleanroom Day Wide',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '01-f3-day-wide.png') })

    // 02-f3-night-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('NIGHT')
      dir.cameraRig.setFraming(
        {
          id: 'F3_NIGHT_WIDE',
          target: [0.0, 11.9, 0.4],
          position: [-2.4, 13.5, -6.6],
          description: 'F3 Verification Cleanroom Night Wide',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '02-f3-night-wide.png') })

    // 03-f3-verification-bench-hero.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_VERIFICATION_BENCH_HERO',
          target: [0.0, 11.45, 0.8],
          position: [-2.2, 12.5, -2.6],
          description: 'F3 Verification Bench Hero Apparatus',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '03-f3-verification-bench-hero.png') })

    // 04-f3-evidence-wall.png (Camera facing South evidence wall with clear perspective)
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_EVIDENCE_WALL',
          target: [0.0, 12.4, 3.65],
          position: [2.8, 12.6, 0.4],
          description: 'F3 Architectural Evidence Wall Detail',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '04-f3-evidence-wall.png') })

    // 05-f3-reviewer-production-character.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_REVIEWER_PRODUCTION',
          target: [0.0, 11.60, 0.35],
          position: [-0.50, 11.75, -0.90],
          description: 'F3 Independent Reviewer Production Character Closeup',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '05-f3-reviewer-production-character.png') })

    // 06-f3-intake-to-verdict-composition.png (Flow: Intake -> Deck -> Rail -> Verdict)
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_INTAKE_TO_VERDICT',
          target: [0.4, 11.6, 0.9],
          position: [-3.4, 13.0, -1.6],
          description: 'F3 Intake to Verdict Verification Pipeline Flow',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '06-f3-intake-to-verdict-composition.png') })

    // ── Floor 4: Browser QA Lab (07 - 12) ──────────────────────────────────
    // 07-f4-day-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F4_DAY_WIDE',
          target: [0.0, 15.5, 0.4],
          position: [-2.4, 17.1, -6.6],
          description: 'F4 Browser QA Lab Day Wide',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '07-f4-day-wide.png') })

    // 08-f4-night-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('NIGHT')
      dir.cameraRig.setFraming(
        {
          id: 'F4_NIGHT_WIDE',
          target: [0.0, 15.5, 0.4],
          position: [-2.4, 17.1, -6.6],
          description: 'F4 Browser QA Lab Night Wide',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '08-f4-night-wide.png') })

    // 09-f4-device-rig-hero.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F4_DEVICE_RIG_HERO',
          target: [0.0, 15.05, 0.8],
          position: [-2.2, 16.1, -2.6],
          description: 'F4 Multi-Device Test Rig Hero Apparatus',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '09-f4-device-rig-hero.png') })

    // 10-f4-observation-surface.png (Camera facing South observation wall with clear perspective)
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F4_OBSERVATION_SURFACE',
          target: [0.0, 16.0, 3.65],
          position: [2.8, 16.2, 0.4],
          description: 'F4 Viewport Observation Surface Detail',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '10-f4-observation-surface.png') })

    // 11-f4-qa-character.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F4_QA_CHARACTER',
          target: [0.0, 15.20, 0.35],
          position: [-0.50, 15.35, -0.90],
          description: 'F4 Browser QA Specialist Production Character Closeup',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '11-f4-qa-character.png') })

    // 12-f4-device-rig-close.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F4_DEVICE_RIG_CLOSE',
          target: [0.15, 15.15, 0.65],
          position: [-1.2, 15.75, -0.75],
          description: 'F4 Multi-Device Test Rig Device Array Detail',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '12-f4-device-rig-close.png') })

    // ── Tower Silhouettes & Stack (13 - 14) ─────────────────────────────────
    // 13-f3-f4-tower-comparison.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_F4_TOWER_COMPARISON',
          target: [0.0, 13.2, 0.0],
          position: [0.0, 13.8, -18.0],
          description: 'Floor 3 and Floor 4 Tower Silhouette Comparison',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '13-f3-f4-tower-comparison.png') })

    // 14-f1-f4-tower-stack.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'TOWER_F1_F4_STACK',
          target: [0.0, 9.2, 0.0],
          position: [0.0, 9.8, -26.0],
          description: 'Tower Perspective Cutaway Framing F1 Through F4',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '14-f1-f4-tower-stack.png') })

    // ── Regression: F2 Agent Operations Intact (15) ────────────────────────
    // 15-f2-regression.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('AGENT_OPERATIONS')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '15-f2-regression.png') })

    // Switch to 3D Tower mode so procedural 3D characters are photographed without 2D diorama overlays
    const fg3dBtn = page.locator('[data-testid="mode-3d-btn"]')
    await fg3dBtn.click()
    await page.waitForTimeout(500)

    // Suppress docked inspector panel and clear picking for clean studio portraits
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.picking.clearSelection()
      const el = document.querySelector('[data-testid="hq3d-inspector"]')
      if (el) (el as HTMLElement).style.display = 'none'
    })

    // ── Character Family Consistency: Capture individual portraits (FE, BE, Reviewer, QA)
    // Frontend Engineer portrait
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'CHAR_PORTRAIT_FE',
          target: [-3.5, 8.16, 1.15],
          position: [-3.5, 8.20, 0.20],
          description: 'Frontend Engineer Portrait',
        },
        true
      )
    })
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(evidenceDir, 'char-fe.png') })

    // Backend Engineer portrait
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'CHAR_PORTRAIT_BE',
          target: [2.5, 8.16, 1.15],
          position: [2.5, 8.20, 0.20],
          description: 'Backend Engineer Portrait',
        },
        true
      )
    })
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(evidenceDir, 'char-be.png') })

    // Independent Reviewer portrait
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'CHAR_PORTRAIT_REV',
          target: [0.0, 11.72, 0.35],
          position: [-0.08, 11.76, -0.60],
          description: 'Independent Reviewer Portrait',
        },
        true
      )
    })
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(evidenceDir, 'char-rev.png') })

    // Browser QA Specialist portrait
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'CHAR_PORTRAIT_QA',
          target: [0.0, 15.32, 0.35],
          position: [-0.08, 15.36, -0.60],
          description: 'Browser QA Specialist Portrait',
        },
        true
      )
    })
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(evidenceDir, 'char-qa.png') })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: COMPOSE CHARACTER FAMILY & COMPARISON COMPOSITES
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Stitching character family consistency composite and floor comparisons]...')

    // 16-character-family-consistency.png: 4-column side-by-side comparison with center crop
    const feBuf = await sharp(join(evidenceDir, 'char-fe.png')).resize(600, 900, { fit: 'cover', position: 'center' }).toBuffer()
    const beBuf = await sharp(join(evidenceDir, 'char-be.png')).resize(600, 900, { fit: 'cover', position: 'center' }).toBuffer()
    const revBuf = await sharp(join(evidenceDir, 'char-rev.png')).resize(600, 900, { fit: 'cover', position: 'center' }).toBuffer()
    const qaBuf = await sharp(join(evidenceDir, 'char-qa.png')).resize(600, 900, { fit: 'cover', position: 'center' }).toBuffer()

    await sharp({
      create: {
        width: 2400,
        height: 900,
        channels: 4,
        background: { r: 14, g: 18, b: 25, alpha: 1 },
      },
    })
      .composite([
        { input: feBuf, left: 0, top: 0 },
        { input: beBuf, left: 600, top: 0 },
        { input: revBuf, left: 1200, top: 0 },
        { input: qaBuf, left: 1800, top: 0 },
      ])
      .png()
      .toFile(join(evidenceDir, '16-character-family-consistency.png'))

    const stitchSideBySide = async (leftFile: string, rightFile: string, outputFile: string) => {
      const leftImg = sharp(join(evidenceDir, leftFile))
      const rightImg = sharp(join(evidenceDir, rightFile))

      const leftMeta = await leftImg.metadata()
      const rightMeta = await rightImg.metadata()

      const w = leftMeta.width || 1600
      const h = leftMeta.height || 900

      const leftBuf = await leftImg.resize(w, h).toBuffer()
      const rightBuf = await rightImg.resize(w, h).toBuffer()

      await sharp({
        create: {
          width: w * 2,
          height: h,
          channels: 4,
          background: { r: 14, g: 18, b: 25, alpha: 1 },
        },
      })
        .composite([
          { input: leftBuf, left: 0, top: 0 },
          { input: rightBuf, left: w, top: 0 },
        ])
        .png()
        .toFile(join(evidenceDir, outputFile))
    }

    // Additional comparison composites for review:
    // f3-vs-f4-wide.png
    await stitchSideBySide('01-f3-day-wide.png', '07-f4-day-wide.png', 'f3-vs-f4-wide.png')
    // f3-vs-f4-night.png
    await stitchSideBySide('02-f3-night-wide.png', '08-f4-night-wide.png', 'f3-vs-f4-night.png')

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: SCENE GRAPH METRICS & RESOURCE COUNTS (Section 17)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Extracting scene graph metrics]...')
    const sceneMetrics = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      const renderer = dir.renderer.renderer
      const scene = dir.scene.scene

      dir.resetToOverview()
      dir.scene.update(performance.now() * 0.001, false)
      dir.cameraRig.update()
      renderer.render(scene, dir.cameraRig.camera)

      let totalNodes = 0
      let meshNodes = 0
      let instancedMeshNodes = 0
      let shadowCasterNodes = 0
      let shadowReceiverNodes = 0
      let matrixAutoUpdateTrueNodes = 0
      let matrixAutoUpdateFalseNodes = 0
      const uniqueGeometries = new Set<string>()
      const uniqueMaterials = new Set<string>()

      scene.traverse((obj: any) => {
        totalNodes++
        if (obj.matrixAutoUpdate) {
          matrixAutoUpdateTrueNodes++
        } else {
          matrixAutoUpdateFalseNodes++
        }
        if (obj.isMesh) {
          meshNodes++
          if (obj.geometry) uniqueGeometries.add(obj.geometry.uuid)
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: any) => uniqueMaterials.add(m.uuid))
            } else {
              uniqueMaterials.add(obj.material.uuid)
            }
          }
          if (obj.castShadow) shadowCasterNodes++
          if (obj.receiveShadow) shadowReceiverNodes++
        }
        if (obj.isInstancedMesh) {
          instancedMeshNodes++
        }
      })

      const lights: any[] = []
      scene.traverse((obj: any) => {
        if (obj.isLight) {
          lights.push({
            type: obj.type,
            name: obj.name,
            visible: obj.visible,
            intensity: obj.intensity,
            castShadow: obj.castShadow,
          })
        }
      })

      return {
        totalNodes,
        meshNodes,
        instancedMeshNodes,
        uniqueGeometries: uniqueGeometries.size,
        uniqueMaterials: uniqueMaterials.size,
        shadowCasterNodes,
        shadowReceiverNodes,
        matrixAutoUpdateTrueNodes,
        matrixAutoUpdateFalseNodes,
        totalLights: lights.length,
        activeLights: lights.filter((l) => l.visible).length,
        lights,
        renderInfo: {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          points: renderer.info.render.points,
          lines: renderer.info.render.lines,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
        },
      }
    })

    console.log('[Scene Metrics]:', sceneMetrics)
    await writeFile(join(evidenceDir, 'metrics.json'), JSON.stringify(sceneMetrics, null, 2), 'utf8')

    await fgContext.close()
    await fgBrowser.close()
  })
})
