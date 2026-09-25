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
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/12k')

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
    // STEP 4: DETERMINISTIC SCREENSHOT CAPTURES (Section 22)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Capturing deterministic evidence screenshots]...')

    // ── Floor 3: Verification Cleanroom (01 - 08) ──────────────────────────
    // 01-f3-day-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('VERIFICATION_LAB')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '01-f3-day-wide.png') })

    // 02-f3-eve-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('EVENING')
      dir.frameRoom('VERIFICATION_LAB')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '02-f3-eve-wide.png') })

    // 03-f3-night-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('NIGHT')
      dir.frameRoom('VERIFICATION_LAB')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '03-f3-night-wide.png') })

    // 04-f3-reviewer-medium.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_REVIEWER_MEDIUM',
          target: [0.0, 11.5, 0.5],
          position: [-2.5, 12.2, -1.8],
          description: 'Independent Reviewer Medium Framing',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '04-f3-reviewer-medium.png') })

    // 05-f3-reviewer-close.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameCharacter('CHAR_REVIEWER')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '05-f3-reviewer-close.png') })

    // 06-f3-verification-bench.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameWorkstation('WS_VERIFIER')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '06-f3-verification-bench.png') })

    // 07-f3-evidence-wall.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_EVIDENCE_WALL',
          target: [0.0, 12.0, 3.2],
          position: [-1.5, 12.8, -4.5],
          description: 'Verification Evidence Wall Detail',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '07-f3-evidence-wall.png') })

    // 08-f3-elevator-transition.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F3_ELEVATOR_PORTAL',
          target: [4.8, 12.0, 0.5],
          position: [1.0, 12.8, -5.0],
          description: 'Cleanroom East Arrival Portal & Circulation',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '08-f3-elevator-transition.png') })

    // ── Floor 4: Browser QA Lab (09 - 16) ──────────────────────────────────
    // 09-f4-day-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('BROWSER_QA_LAB')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '09-f4-day-wide.png') })

    // 10-f4-eve-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('EVENING')
      dir.frameRoom('BROWSER_QA_LAB')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '10-f4-eve-wide.png') })

    // 11-f4-night-wide.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('NIGHT')
      dir.frameRoom('BROWSER_QA_LAB')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '11-f4-night-wide.png') })

    // 12-f4-qa-role-medium.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F4_QA_ROLE_MEDIUM',
          target: [0.0, 15.1, 0.4],
          position: [-2.5, 15.8, -1.8],
          description: 'Browser QA Specialist Medium Framing',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '12-f4-qa-role-medium.png') })

    // 13-f4-qa-role-close.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameCharacter('CHAR_BROWSER_QA')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '13-f4-qa-role-close.png') })

    // 14-f4-device-bench.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameWorkstation('WS_DEVICE_BENCH')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '14-f4-device-bench.png') })

    // 15-f4-observation-wall.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F4_OBSERVATION_WALL',
          target: [0.0, 15.8, 3.2],
          position: [-1.5, 16.4, -4.5],
          description: 'Panoramic Viewport Observation Wall Detail',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '15-f4-observation-wall.png') })

    // 16-f4-interaction-zone.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'F4_INTERACTION_ZONE',
          target: [-3.8, 15.2, 0.8],
          position: [-0.8, 16.2, -5.0],
          description: 'DOM Interaction Test Console & Mobile Device Testing Rack',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '16-f4-interaction-zone.png') })

    // ── Tower Multi-Floor Overview (17 - 19) ──────────────────────────────
    // 17-tower-f1-f4-day.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'TOWER_F1_F4_DAY',
          target: [0.0, 9.2, 0.0],
          position: [0.0, 9.8, -28.0],
          description: 'Tower Perspective Cutaway Framing F1 Through F4',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '17-tower-f1-f4-day.png') })

    // 18-tower-f1-f4-eve.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('EVENING')
      dir.cameraRig.setFraming(
        {
          id: 'TOWER_F1_F4_EVE',
          target: [0.0, 9.2, 0.0],
          position: [0.0, 9.8, -28.0],
          description: 'Tower Perspective Cutaway Framing F1 Through F4 (Evening)',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '18-tower-f1-f4-eve.png') })

    // 19-tower-f1-f4-night.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('NIGHT')
      dir.cameraRig.setFraming(
        {
          id: 'TOWER_F1_F4_NIGHT',
          target: [0.0, 9.2, 0.0],
          position: [0.0, 9.8, -28.0],
          description: 'Tower Perspective Cutaway Framing F1 Through F4 (Night)',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '19-tower-f1-f4-night.png') })

    // ── Regression: F2 & F1 Intact (22 - 23) ──────────────────────────────
    // 22-f2-regression.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('AGENT_OPERATIONS')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '22-f2-regression.png') })

    // 23-f1-regression.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('MISSION_CONTROL')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '23-f1-regression.png') })

    // ── Controlled Authoritative Fixture Evidence (24 - 25) ───────────────
    // 24-f3-authoritative-verifying.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('VERIFICATION_LAB')
      dir.scene.furniture.setStationStatus('verifier-console', 'VERIFYING')
      // Update character state to VERIFYING
      const charController = dir.scene.characters.controllers?.get('role:quality:independent-reviewer')
      if (charController) {
        charController.characterState = 'VERIFYING'
        if (charController.statusMaterial) {
          charController.statusMaterial.opacity = 0.85
          charController.statusMaterial.color.setHex(0x3d7a68)
        }
      }
      dir.scene.renderTick?.(0.016)
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '24-f3-authoritative-verifying.png') })

    // 25-f4-authoritative-browser-qa.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('BROWSER_QA_LAB')
      dir.scene.furniture.setStationStatus('browser-qa-matrix', 'BROWSER_QA')
      dir.scene.furniture.setStationStatus('browser-qa-station', 'BROWSER_QA')
      const charController = dir.scene.characters.controllers?.get('role:quality:browser-qa')
      if (charController) {
        charController.characterState = 'FOCUSED'
        if (charController.statusMaterial) {
          charController.statusMaterial.opacity = 0.85
          charController.statusMaterial.color.setHex(0x0d9488)
        }
      }
      dir.scene.renderTick?.(0.016)
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '25-f4-authoritative-browser-qa.png') })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: COMPOSE COMPARISON COMPOSITES (20 & 21)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Stitching side-by-side comparison composites]...')

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

    const stitch2x2Grid = async (
      topLeft: string,
      topRight: string,
      bottomLeft: string,
      bottomRight: string,
      outputFile: string
    ) => {
      const tl = await sharp(join(evidenceDir, topLeft)).resize(1200, 675).toBuffer()
      const tr = await sharp(join(evidenceDir, topRight)).resize(1200, 675).toBuffer()
      const bl = await sharp(join(evidenceDir, bottomLeft)).resize(1200, 675).toBuffer()
      const br = await sharp(join(evidenceDir, bottomRight)).resize(1200, 675).toBuffer()

      await sharp({
        create: {
          width: 2400,
          height: 1350,
          channels: 4,
          background: { r: 14, g: 18, b: 25, alpha: 1 },
        },
      })
        .composite([
          { input: tl, left: 0, top: 0 },
          { input: tr, left: 1200, top: 0 },
          { input: bl, left: 0, top: 675 },
          { input: br, left: 1200, top: 675 },
        ])
        .png()
        .toFile(join(evidenceDir, outputFile))
    }

    // 20-f3-vs-f4.png: Side-by-side comparison of Cleanroom (left) and Browser QA Lab (right)
    await stitchSideBySide(
      '01-f3-day-wide.png',
      '09-f4-day-wide.png',
      '20-f3-vs-f4.png'
    )

    // 21-f1-f2-f3-f4-comparison.png: 4-floor comparison grid
    await stitch2x2Grid(
      '23-f1-regression.png',
      '22-f2-regression.png',
      '01-f3-day-wide.png',
      '09-f4-day-wide.png',
      '21-f1-f2-f3-f4-comparison.png'
    )

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
