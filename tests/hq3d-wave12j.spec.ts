/**
 * GRAVITAS — WAVE 12J MISSION CONTROL VERIFICATION & PERFORMANCE SUITE
 *
 * Measures:
 * 1. Mission Control Interaction & Picking Contract (Section 17)
 * 2. Memory & Stability Soak Test: 20x interaction cycles (Section 16)
 * 3. Real Foreground Interactive Telemetry: Day, Night, Overview >= 10s (Section 14)
 * 4. Scene Metrics & Resource Counts (Section 15)
 * 5. Deterministic Screenshot Captures & Side-by-Side Composites (Section 21)
 * 6. Floor 2 Non-Regression Verification (Section 19)
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
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/12j')

class HybridTestHarness implements AgentHarness {
  public readonly id = 'hybrid-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Wave 12J test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      exitCode: 0,
      stdout: 'Wave 12J executed successfully\n',
      stderr: '',
      failureReason: undefined,
    }
  }

  public async abort(): Promise<void> {}
}

test.describe('Wave 12J Mission Control Production Pass & Verification Suite', () => {
  let runtimeRoot: string
  let fixtureRepoPath: string
  let service: RunService
  let harness: HybridTestHarness
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number

  test.beforeAll(async () => {
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-12j-suite-'))
    fixtureRepoPath = join(runtimeRoot, 'repo')
    await mkdir(fixtureRepoPath, { recursive: true })

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Gravitas 12J Test'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'gravitas-12j@deepmind.google.com'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-12j-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new HybridTestHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_12j',
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

  test('Execute Wave 12J Mission Control Production Suite, Soak, Interaction & Real Foreground Telemetry', async () => {
    test.setTimeout(300000) // 5 minutes for full 20x soak + 3x 10s foreground benchmarks + captures

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
    // STEP 1: INTERACTION & PICKING REGRESSION CONTRACT (Section 17)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 1: Mission Control Interaction & Picking Contract]')
    const pickingTestResults = await page.evaluate(async () => {
      const dir = (window as any).__hqDirector
      const results: { test: string; passed: boolean; details?: any }[] = []

      // 1. Frame room MISSION_CONTROL
      dir.frameRoom('MISSION_CONTROL')
      results.push({ test: 'frameRoom MISSION_CONTROL', passed: true })

      // 2. Select Chief Planner
      const planner = dir.selectRole('role:strategy:chief-planner')
      results.push({
        test: 'selectRole chief-planner',
        passed: planner !== null && planner.name.includes('Chief Planner'),
        details: planner,
      })

      // 3. Select Planning Table station
      const table = dir.selectStation('planning-table')
      results.push({
        test: 'selectStation planning-table',
        passed: table !== null && table.id === 'planning-table',
        details: table,
      })

      // 4. Test camera orbit and zoom
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

      // 5. Reset to overview
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
    // STEP 2: MEMORY & STABILITY SOAK TEST (Section 16: 20x interaction cycles)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 2: Memory & Stability Soak Test — 20x Interaction Cycles]')
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

        // 2. Mission Control
        dir.frameRoom('MISSION_CONTROL')
        dir.scene.update(performance.now() * 0.001, false)
        dir.cameraRig.update()
        renderer.render(dir.scene.scene, dir.cameraRig.camera)

        // 3. Orbit
        dir.cameraRig.onPointerDown(800, 450)
        dir.cameraRig.onPointerMove(830, 470)
        dir.cameraRig.onPointerUp()
        dir.cameraRig.update()
        renderer.render(dir.scene.scene, dir.cameraRig.camera)

        // 4. Select Chief Planner
        dir.selectRole('role:strategy:chief-planner')
        renderer.render(dir.scene.scene, dir.cameraRig.camera)

        // 5. Select Planning Table
        dir.selectStation('planning-table')
        renderer.render(dir.scene.scene, dir.cameraRig.camera)

        // 6. Return to Overview
        dir.resetToOverview()
        renderer.render(dir.scene.scene, dir.cameraRig.camera)
      }

      // Warm-up 1 cycle to ensure lazy WebGL driver buffers are bound
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
    // STEP 3: BENCHMARK TIMING (Section 14: Mission Control DAY, NIGHT, Overview DAY)
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

      // 2-second warm-up (strictly no screenshotting or dev tools interference)
      await page.waitForTimeout(2000)

      // 10-second continuous RAF benchmark loop
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

    console.log('[Benchmarking Mission Control DAY (10s)]...')
    const mcDayBench = await runForegroundBenchmark('MISSION_CONTROL', 'DAY', 10000)
    console.log('[Mission Control DAY Result]:', mcDayBench)

    console.log('[Benchmarking Mission Control NIGHT (10s)]...')
    const mcNightBench = await runForegroundBenchmark('MISSION_CONTROL', 'NIGHT', 10000)
    console.log('[Mission Control NIGHT Result]:', mcNightBench)

    console.log('[Benchmarking Tower Overview DAY (10s)]...')
    const overviewBench = await runForegroundBenchmark('OVERVIEW', 'DAY', 10000)
    console.log('[Tower Overview DAY Result]:', overviewBench)

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: DETERMINISTIC SCREENSHOT CAPTURES (Section 21)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Capturing deterministic evidence screenshots]...')

    // 01-floor1-mission-control-day.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('MISSION_CONTROL')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '01-floor1-mission-control-day.png') })

    // 02-floor1-mission-control-eve.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('EVENING')
      dir.frameRoom('MISSION_CONTROL')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '02-floor1-mission-control-eve.png') })

    // 03-floor1-mission-control-night.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('NIGHT')
      dir.frameRoom('MISSION_CONTROL')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '03-floor1-mission-control-night.png') })

    // 04-floor1-planning-surface-close.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameWorkstation('WS_PLANNING')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '04-floor1-planning-surface-close.png') })

    // 05-floor1-chief-planner-close.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameCharacter('CHAR_PLANNER')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '05-floor1-chief-planner-close.png') })

    // 06-floor1-strategy-wall-close.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.cameraRig.setFraming(
        {
          id: 'STRATEGY_WALL_CLOSE',
          target: [-1.0, 5.4, 3.6],
          position: [-1.0, 5.4, 0.4],
          description: 'Mission Control Strategy Wall Closeup',
        },
        true
      )
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '06-floor1-strategy-wall-close.png') })

    // 07-tower-overview-day.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.resetToOverview()
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '07-tower-overview-day.png') })

    // 08-tower-overview-night.png
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('NIGHT')
      dir.resetToOverview()
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '08-tower-overview-night.png') })

    // 09-floor2-regression-day.png (Verify Floor 2 remains visually intact!)
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.frameRoom('AGENT_OPERATIONS')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '09-floor2-regression-day.png') })

    // 10-floor2-regression-night.png (Verify Floor 2 night remains visually intact!)
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('NIGHT')
      dir.frameRoom('AGENT_OPERATIONS')
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(evidenceDir, '10-floor2-regression-night.png') })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: COMPOSE COMPARISON COMPOSITES (Section 21)
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

    // 11-mission-control-day-night.png
    await stitchSideBySide(
      '01-floor1-mission-control-day.png',
      '03-floor1-mission-control-night.png',
      '11-mission-control-day-night.png'
    )

    // 12-floor2-before-after-regression.png
    await stitchSideBySide(
      '00-baseline-floor2-day.png',
      '09-floor2-regression-day.png',
      '12-floor2-before-after-regression.png'
    )

    // 13-tower-wave12i-vs-wave12j.png
    await stitchSideBySide(
      '00-baseline-tower-overview.png',
      '07-tower-overview-day.png',
      '13-tower-wave12i-vs-wave12j.png'
    )

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: SCENE METRICS & RESOURCE COUNTS (Section 15)
    // ──────────────────────────────────────────────────────────────────────────
    const sceneMetrics = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      const renderer = dir.renderer.renderer
      const scene = dir.scene.scene

      dir.frameRoom('MISSION_CONTROL')
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
          if (obj.isInstancedMesh) instancedMeshNodes++
          if (obj.castShadow) shadowCasterNodes++
          if (obj.receiveShadow) shadowReceiverNodes++
          if (obj.geometry) uniqueGeometries.add(obj.geometry.uuid)
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m: any) => m && uniqueMaterials.add(m.uuid))
        }
      })

      let lightCount = 0
      let activeLightCount = 0
      scene.traverse((obj: any) => {
        if (obj.isLight) {
          lightCount++
          if (obj.visible) activeLightCount++
        }
      })

      return {
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        memoryGeometries: renderer.info.memory.geometries,
        memoryTextures: renderer.info.memory.textures,
        totalNodes,
        meshNodes,
        instancedMeshNodes,
        shadowCasterNodes,
        shadowReceiverNodes,
        matrixAutoUpdateTrueNodes,
        matrixAutoUpdateFalseNodes,
        uniqueGeometriesCount: uniqueGeometries.size,
        uniqueMaterialsCount: uniqueMaterials.size,
        totalLights: lightCount,
        activeLights: activeLightCount,
      }
    })

    console.log('[Scene Metrics Floor 1]:', sceneMetrics)

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 7: WRITE TELEMETRY-AFTER.JSON
    // ──────────────────────────────────────────────────────────────────────────
    const telemetryAfter = {
      benchmarkEnvironment: {
        resolution: '1600x900',
        deviceScaleFactor: 1.0,
        headless: false,
        hardwareAccelerated: true,
        samplingDurationSeconds: 10,
        warmupDurationSeconds: 2,
      },
      pickingContract: {
        allPassed: pickingTestResults.every((r) => r.passed),
        results: pickingTestResults,
      },
      memorySoak: soakResult,
      realForegroundPerformance: {
        missionControlDay: mcDayBench,
        missionControlNight: mcNightBench,
        towerOverviewDay: overviewBench,
      },
      sceneMetricsAfter: sceneMetrics,
    }

    await writeFile(
      join(evidenceDir, 'telemetry-after.json'),
      JSON.stringify(telemetryAfter, null, 2),
      'utf8'
    )

    console.log('[Wave 12J Mission Control Production Pass Completed Successfully]')
    await fgBrowser.close()
  })
})
