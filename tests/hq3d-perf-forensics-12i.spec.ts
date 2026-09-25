import { test, expect, chromium } from '@playwright/test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
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

const __dirname = fileURLToPath(new URL('.', import.meta.url))

class HybridTestHarness implements AgentHarness {
  public readonly id = 'hybrid-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Wave 12I test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      exitCode: 0,
      stdout: 'Wave 12I executed successfully\n',
      stderr: '',
      failureReason: undefined,
    }
  }

  public async abort(): Promise<void> {}
}

test.describe('Wave 12I Performance Forensics & Architecture Profiling Suite', () => {
  let runtimeRoot: string
  let fixtureRepoPath: string
  let service: RunService
  let harness: HybridTestHarness
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number

  test.beforeAll(async () => {
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-12i-forensics-'))
    fixtureRepoPath = join(runtimeRoot, 'repo')
    await mkdir(fixtureRepoPath, { recursive: true })

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Gravitas 12I Forensics'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'gravitas-12i@deepmind.google.com'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-12i-forensics-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new HybridTestHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_12i_forensics',
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
  })

  test('Runs comprehensive Phase A performance forensics profiling', async ({ page }) => {
    test.setTimeout(300000)
    await page.setViewportSize({ width: 1600, height: 900 })

    await page.goto(`http://127.0.0.1:${VITE_PORT}`)
    await page.waitForSelector('[data-testid="living-hq-canvas-container"]', { timeout: 15000 })
    await page.waitForTimeout(1000)

    // Switch to Hybrid HQ mode on Floor 2
    const hybridBtn = page.locator('[data-testid="mode-hybrid-btn"]')
    await hybridBtn.click()
    await page.waitForTimeout(1000)

    // Extract deep scene graph, renderer, material, and geometry forensics
    const sceneForensics = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      if (!dir) throw new Error('HqDirector not found')

      const scene = dir.scene.scene
      const renderer = dir.renderer.renderer
      const camera = dir.cameraRig.camera

      // Floor buckets based on world Y coordinates
      const floorNames = [
        'Floor 0 (Foundation / Plinth)',
        'Floor 1 (Mission Control)',
        'Floor 2 (Agent Operations)',
        'Floor 3 (Verification Lab)',
        'Floor 4 (Browser QA Lab)',
        'Floor 5 (Infrastructure)',
        'Floor 6 (Approval Mezzanine)',
        'Tower Core & Envelope (Global)',
      ]

      const getFloorIndex = (y: number, obj: any): number => {
        // Check if object is part of tower framing or elevator
        let p = obj
        while (p) {
          if (p.name === 'elevatorCab' || p.name === 'elevatorColumn' || p.name === 'towerShell') {
            return 7
          }
          p = p.parent
        }
        if (y < 1.8) return 0
        if (y < 5.4) return 1
        if (y < 9.0) return 2
        if (y < 12.6) return 3
        if (y < 16.2) return 4
        if (y < 19.8) return 5
        if (y >= 19.8) return 6
        return 7
      }

      const floorStats = floorNames.map((name) => ({
        floor: name,
        objects: 0,
        meshes: 0,
        instancedMeshes: 0,
        shadowCasters: 0,
        shadowReceivers: 0,
        transparentMeshes: 0,
        matrixAutoUpdateCount: 0,
        uniqueGeometries: new Set<string>(),
        uniqueMaterials: new Set<string>(),
      }))

      let totalNodes = 0
      let meshNodes = 0
      let skinnedMeshNodes = 0
      let instancedMeshNodes = 0
      let transparentMeshNodes = 0
      let shadowCasterNodes = 0
      let shadowReceiverNodes = 0
      let matrixAutoUpdateNodes = 0
      let hiddenNodesTraversed = 0

      const allUniqueGeometries = new Map<string, { type: string; parameters?: any }>()
      const allUniqueMaterials = new Map<string, { type: string; name?: string; color?: string; roughness?: number; metalness?: number; transparent?: boolean; opacity?: number }>()

      const geometryTypeCount: Record<string, number> = {}
      const materialTypeCount: Record<string, number> = {}

      scene.traverse((obj: any) => {
        totalNodes++
        if (obj.visible === false) {
          hiddenNodesTraversed++
        }
        if (obj.matrixAutoUpdate) {
          matrixAutoUpdateNodes++
        }

        // World position Y from matrixWorld (elements[13] in column-major 4x4 matrix)
        const worldY = obj.matrixWorld && obj.matrixWorld.elements ? obj.matrixWorld.elements[13] : obj.position.y
        const fIdx = getFloorIndex(worldY, obj)
        const fStat = floorStats[fIdx]
        fStat.objects++
        if (obj.matrixAutoUpdate) fStat.matrixAutoUpdateCount++

        if (obj.isMesh) {
          meshNodes++
          fStat.meshes++

          if (obj.isInstancedMesh) {
            instancedMeshNodes++
            fStat.instancedMeshes++
          }
          if (obj.isSkinnedMesh) {
            skinnedMeshNodes++
          }

          if (obj.castShadow) {
            shadowCasterNodes++
            fStat.shadowCasters++
          }
          if (obj.receiveShadow) {
            shadowReceiverNodes++
            fStat.shadowReceivers++
          }

          // Geometry
          if (obj.geometry) {
            const geo = obj.geometry
            fStat.uniqueGeometries.add(geo.uuid)
            if (!allUniqueGeometries.has(geo.uuid)) {
              allUniqueGeometries.set(geo.uuid, {
                type: geo.type,
                parameters: geo.parameters,
              })
              geometryTypeCount[geo.type] = (geometryTypeCount[geo.type] || 0) + 1
            }
          }

          // Material(s)
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((mat: any) => {
            if (!mat) return
            fStat.uniqueMaterials.add(mat.uuid)
            if (mat.transparent || (mat.opacity !== undefined && mat.opacity < 1.0)) {
              transparentMeshNodes++
              fStat.transparentMeshes++
            }
            if (!allUniqueMaterials.has(mat.uuid)) {
              allUniqueMaterials.set(mat.uuid, {
                type: mat.type,
                name: mat.name,
                color: mat.color ? '#' + mat.color.getHexString() : undefined,
                roughness: mat.roughness,
                metalness: mat.metalness,
                transparent: mat.transparent,
                opacity: mat.opacity,
              })
              materialTypeCount[mat.type] = (materialTypeCount[mat.type] || 0) + 1
            }
          })
        }
      })

      // Lights
      const lights: any[] = []
      scene.traverse((obj: any) => {
        if (obj.isLight) {
          lights.push({
            type: obj.type,
            name: obj.name,
            color: '#' + obj.color.getHexString(),
            intensity: obj.intensity,
            castShadow: obj.castShadow,
            shadowMapSize: obj.shadow ? { w: obj.shadow.mapSize.width, h: obj.shadow.mapSize.height } : null,
          })
        }
      })

      // Render stats
      const renderInfo = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        lines: renderer.info.render.lines,
        memoryGeometries: renderer.info.memory.geometries,
        memoryTextures: renderer.info.memory.textures,
      }

      return {
        renderer: {
          info: renderInfo,
          pixelRatio: renderer.getPixelRatio(),
          antialias: true,
          shadowMap: {
            enabled: renderer.shadowMap.enabled,
            type: renderer.shadowMap.type, // 2 = PCFSoftShadowMap
          },
          toneMapping: renderer.toneMapping, // 4 = ACESFilmic
          toneMappingExposure: renderer.toneMappingExposure,
          outputColorSpace: renderer.outputColorSpace,
        },
        sceneGraph: {
          totalNodes,
          meshNodes,
          skinnedMeshNodes,
          instancedMeshNodes,
          shadowCasterNodes,
          shadowReceiverNodes,
          transparentMeshNodes,
          matrixAutoUpdateNodes,
          hiddenNodesTraversed,
          uniqueGeometriesCount: allUniqueGeometries.size,
          uniqueMaterialsCount: allUniqueMaterials.size,
          geometryTypeCount,
          materialTypeCount,
          floors: floorStats.map((f) => ({
            floor: f.floor,
            objects: f.objects,
            meshes: f.meshes,
            instancedMeshes: f.instancedMeshes,
            shadowCasters: f.shadowCasters,
            shadowReceivers: f.shadowReceivers,
            transparentMeshes: f.transparentMeshes,
            matrixAutoUpdateCount: f.matrixAutoUpdateCount,
            uniqueGeometries: f.uniqueGeometries.size,
            uniqueMaterials: f.uniqueMaterials.size,
          })),
        },
        lights,
      }
    })

    console.log('[Forensics Scene Graph Summary]:', {
      totalNodes: sceneForensics.sceneGraph.totalNodes,
      meshNodes: sceneForensics.sceneGraph.meshNodes,
      shadowCasters: sceneForensics.sceneGraph.shadowCasterNodes,
      drawCalls: sceneForensics.renderer.info.calls,
      geometries: sceneForensics.renderer.info.memoryGeometries,
    })

    // CPU vs GPU and Shadow Map Delta Cost Measurement
    const profilingBreakdown = await page.evaluate(async () => {
      const dir = (window as any).__hqDirector
      const renderer = dir.renderer.renderer
      const scene = dir.scene.scene
      const camera = dir.cameraRig.camera

      // Measure CPU time spent in scene.update vs renderer.render
      const samples: { sceneUpdateMs: number; cameraRigUpdateMs: number; renderMs: number }[] = []

      for (let i = 0; i < 60; i++) {
        const t0 = performance.now()
        dir.scene.update(t0 * 0.001, false)
        const t1 = performance.now()
        dir.cameraRig.update()
        const t2 = performance.now()
        renderer.render(scene, camera)
        const t3 = performance.now()

        samples.push({
          sceneUpdateMs: t1 - t0,
          cameraRigUpdateMs: t2 - t1,
          renderMs: t3 - t2,
        })
      }

      const avgSceneUpdateMs = samples.reduce((a, b) => a + b.sceneUpdateMs, 0) / samples.length
      const avgCameraRigUpdateMs = samples.reduce((a, b) => a + b.cameraRigUpdateMs, 0) / samples.length
      const avgRenderMs = samples.reduce((a, b) => a + b.renderMs, 0) / samples.length

      // Measure A/B Shadow Map Impact
      // A: Shadows Enabled
      renderer.shadowMap.enabled = true
      let callsWithShadow = 0
      for (let i = 0; i < 10; i++) {
        renderer.render(scene, camera)
      }
      callsWithShadow = renderer.info.render.calls

      // B: Shadows Disabled
      renderer.shadowMap.enabled = false
      let callsWithoutShadow = 0
      for (let i = 0; i < 10; i++) {
        renderer.render(scene, camera)
      }
      callsWithoutShadow = renderer.info.render.calls

      // Restore Shadows
      renderer.shadowMap.enabled = true
      renderer.render(scene, camera)

      return {
        cpuBreakdownMs: {
          sceneUpdate: Number(avgSceneUpdateMs.toFixed(3)),
          cameraRigUpdate: Number(avgCameraRigUpdateMs.toFixed(3)),
          rendererRender: Number(avgRenderMs.toFixed(3)),
        },
        shadowAblation: {
          drawCallsWithShadow: callsWithShadow,
          drawCallsWithoutShadow: callsWithoutShadow,
          shadowDrawCallsDelta: callsWithShadow - callsWithoutShadow,
        },
      }
    })

    console.log('[CPU Breakdown & Shadow Ablation]:', profilingBreakdown)

    // Launch Foreground Hardware-Accelerated Interactive Browser to measure true foreground baseline
    console.log('[Launching Visible Foreground Chromium for Baseline 10s Measurement...]')
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
    const fgPage = await fgContext.newPage()

    await fgPage.goto(`http://127.0.0.1:${VITE_PORT}`)
    await fgPage.waitForSelector('[data-testid="living-hq-canvas-container"]', { timeout: 15000 })
    await fgPage.bringToFront()
    await fgPage.waitForTimeout(800)

    const fgHybridBtn = fgPage.locator('[data-testid="mode-hybrid-btn"]')
    await fgHybridBtn.click()
    await fgPage.waitForTimeout(1000)
    await fgPage.locator('canvas').focus()
    await fgPage.mouse.click(800, 450)

    // High-precision foreground timing helper (10 seconds sample after 2s warm-up)
    const runForegroundBenchmark = async (roomName: string, durationMs: number = 10000) => {
      // 2-second warm-up
      await fgPage.waitForTimeout(2000)

      const result = await fgPage.evaluate((duration) => {
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

      console.log(`[Foreground Baseline 10s: ${roomName}]`, result)
      return result
    }

    // 1. DAY Floor 2
    const dayBtn = fgPage.locator('[data-testid="hq-atmosphere-day"]')
    await dayBtn.click()
    await fgPage.waitForTimeout(800)
    const fgDayFloor2 = await runForegroundBenchmark('DAY Floor 2', 10000)

    // 2. NIGHT Floor 2
    const nightBtn = fgPage.locator('[data-testid="hq-atmosphere-night"]')
    await nightBtn.click()
    await fgPage.waitForTimeout(800)
    const fgNightFloor2 = await runForegroundBenchmark('NIGHT Floor 2', 10000)

    // 3. Tower Overview DAY
    await dayBtn.click()
    await fgPage.waitForTimeout(500)
    const overviewBtn = fgPage.locator('[data-testid="hq-nav-overview-pill"]')
    await overviewBtn.click()
    await fgPage.waitForTimeout(1500)
    const fgOverviewDay = await runForegroundBenchmark('Tower Overview DAY', 10000)

    await fgBrowser.close()

    // Write Phase A machine-readable evidence artifact
    const baselineArtifact = {
      wave: '12I',
      checkpoint: '886b5df7714a756543a1ceb8e728a59a45dc3e96',
      timestamp: new Date().toISOString(),
      viewport: { width: 1600, height: 900, dpr: 1.0 },
      renderer: sceneForensics.renderer,
      sceneGraph: sceneForensics.sceneGraph,
      lights: sceneForensics.lights,
      profilingBreakdown,
      foregroundInteractiveBenchmarks: {
        floor2Day: fgDayFloor2,
        floor2Night: fgNightFloor2,
        towerOverviewDay: fgOverviewDay,
      },
    }

    const dotEvidenceDir = join(__dirname, '../.evidence')
    const perfDocsDir = join(__dirname, '../docs/3d-hq/performance')
    const evidence12iDir = join(__dirname, '../docs/3d-hq/evidence/12i')

    await mkdir(dotEvidenceDir, { recursive: true })
    await mkdir(perfDocsDir, { recursive: true })
    await mkdir(evidence12iDir, { recursive: true })

    await writeFile(
      join(dotEvidenceDir, 'wave-12i-baseline.json'),
      JSON.stringify(baselineArtifact, null, 2),
      'utf8'
    )

    await writeFile(
      join(evidence12iDir, 'telemetry-before.json'),
      JSON.stringify(baselineArtifact, null, 2),
      'utf8'
    )

    console.log('[Wave 12I Baseline Telemetry Successfully Written]')
  })
})
