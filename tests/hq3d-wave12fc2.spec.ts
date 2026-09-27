/**
 * Gravitas Wave 12F-C2 Playwright Test Suite
 * Visual Causal Proof + Active-View Performance Closure
 *
 * Sequence:
 * 01-idle.png
 * 02-preparing.png
 * 03-worker-running.png
 * 04-cleanup.png
 * 05-verifying.png
 * 06-night-idle.png
 * 07-night-worker-running.png
 * 08-workstation-wide.png
 *
 * Outputs:
 * - docs/3d-hq/evidence/12f-c2/runtime-character-causal-proof.json
 * - docs/3d-hq/evidence/12f-c2/benchmarks-before-after.json
 */

import { test, expect } from '@playwright/test'
import { chromium } from 'playwright'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile, mkdtemp } from 'node:fs/promises'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import { tmpdir } from 'node:os'
import {
  EventHub,
  GravitasServer,
  InMemoryRegistry,
  RunService,
} from '../apps/server/src/index.js'
import { executeGit } from '@gravitas/git'
import type { Task } from '../packages/core/src/types.js'
import type { VerificationPlan } from '@gravitas/verifier'
import { getFreePort } from './test-ports.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

test.describe('Wave 12F-C2 Visual Causal Proof & Performance Suite', () => {
  let server: GravitasServer
  let viteServer: ViteDevServer
  let fixtureRepoPath: string
  let runtimeRoot: string
  let SERVER_PORT: number
  let VITE_PORT: number
  const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/12f-c2')

  test.beforeAll(async () => {
    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12fc2-repo-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12fc2-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Gravitas Author'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'gravitas@internal.net'] })
    await writeFile(
      join(fixtureRepoPath, 'README.md'),
      '# Gravitas Wave 12F-C2 Character Runtime & Performance Test\n'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_12fc2',
      taskGoal: 'Wave 12F-C2 Character Visual Causal Proof',
      steps: [
        {
          id: 'step_fe_causal',
          name: 'Frontend Character Visual Causal Proof Verification',
          command: 'echo "Wave 12F-C2 causal proof verified"',
          expectedExitCode: 0,
        },
      ],
      timeoutMs: 30000,
    }

    const service = new RunService({
      registry,
      eventHub,
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
      logLevel: 'error',
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

  test('Execute Wave 12F-C2 Visual Causal Proof, Night Closure & Benchmarks', async () => {
    test.setTimeout(300000)

    const fgBrowser = await chromium.launch({
      headless: false,
      args: [
        '--window-size=1600,900',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=CalculateNativeWinOcclusion',
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
        '--no-sandbox',
      ],
    })
    const fgContext = await fgBrowser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1.0,
    })
    const page = await fgContext.newPage()

    await page.goto(`http://127.0.0.1:${VITE_PORT}`)
    await page.waitForSelector('[data-testid="living-hq-canvas-container"]', { timeout: 20000 })
    await page.bringToFront()
    await page.waitForTimeout(1000)

    const fgTowerBtn = page.locator('[data-testid="mode-3d-btn"]')
    await fgTowerBtn.click()
    await page.waitForTimeout(1000)
    await page.locator('canvas').focus()
    await page.mouse.click(800, 450)

    // Wait for Director initialization
    await page.waitForFunction(() => {
      const w = window as any
      return !!w.__hqDirector
    }, { timeout: 30000 })

    // Unified single deterministic camera angle framing the Frontend Engineer Workstation
    const setUnifiedCausalCamera = async () => {
      await page.evaluate(() => {
        const dir = (window as any).__hqDirector
        dir.scene.setFocusedRoom('WS_FRONTEND_CAUSAL')
        dir.cameraRig.setFraming(
          {
            id: 'WS_FRONTEND_CAUSAL',
            target: [-3.5, 7.80, 0.90],
            position: [-1.8, 8.65, 0.20],
            description: 'Frontend Engineer Workstation Unified Causal Framing',
          },
          true
        )
      })
      await page.waitForTimeout(800)
    }

    await setUnifiedCausalCamera()

    // Helper to query comprehensive character & spatial assertions
    const queryCharacterSpatialAudit = async () => {
      return page.evaluate(() => {
        const dir = (window as any).__hqDirector
        const charCtrl = dir.scene.characters.controllers.get('role:engineering:frontend-engineer')
        const fig = dir.scene.characters.getFigure('role:engineering:frontend-engineer')
        const motionState = dir.scene.motion.getCharacterState('role:engineering:frontend-engineer')
        const stationState = dir.currentWorldState?.stations['frontend-engineer-workstation']
        const worldTask = Object.values(dir.currentWorldState?.tasks || {})[0] as any

        const figPos = fig ? [fig.position.x, fig.position.y, fig.position.z] : [0, 0, 0]
        const expectedAnchor = [-3.5, 7.2, 1.15]
        const dx = figPos[0] - expectedAnchor[0]
        const dy = figPos[1] - expectedAnchor[1]
        const dz = figPos[2] - expectedAnchor[2]
        const distanceToAnchor = Math.sqrt(dx * dx + dy * dy + dz * dz)

        return {
          roleId: 'role:engineering:frontend-engineer',
          characterState: charCtrl?.characterState ?? 'UNKNOWN',
          runtimePhase: worldTask?.runtimePhase ?? null,
          typingActive: charCtrl?.characterState === 'FOCUSED',
          figureVisible: fig?.visible ?? false,
          figureWorldPosition: figPos,
          expectedWorkstationWorldPosition: expectedAnchor,
          distanceFigureToWorkstationAnchor: Number(distanceToAnchor.toFixed(4)),
          spatialIntent: motionState?.spatialState ?? 'UNKNOWN',
          motionState: motionState?.motionState ?? 'UNKNOWN',
          stationStatus: stationState?.status ?? 'UNKNOWN',
          isSeated: charCtrl?.isSeated ?? false,
        }
      })
    }

    const causalProof: any = {
      evidenceType: 'DETERMINISTIC_INTEGRATION',
      runId: 'run-w12fc2-causal-proof',
      taskId: 'task-fe-12fc2',
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'frontend-engineer-workstation',
      harness: 'codex',
      model: 'gpt-4o',
      routeTransport: 'DIRECT',
      timestamp: new Date().toISOString(),
      acceptedWorkstationInteractionRadiusMeters: 0.25,
      steps: [],
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: IDLE (01-idle.png)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 1: IDLE...]')
    await page.evaluate(async () => {
      const { deriveWorldState } = await import('/src/hq3d/world/worldState.js')
      const dir = (window as any).__hqDirector

      const idleWorld = deriveWorldState({
        projection: {
          schemaVersion: '1.0.0',
          epoch: 'epoch-12fc2-proof',
          revision: 1,
          activeTasks: [],
          handoffs: [],
        },
        tasks: [],
      })
      dir.updateWorldState(idleWorld)
      dir.setAtmosphere('DAY')
    })
    await page.locator('[data-testid="hq-atmosphere-day"]').click()
    await setUnifiedCausalCamera()
    await page.waitForTimeout(600)

    const step1Audit = await queryCharacterSpatialAudit()
    expect(step1Audit.characterState).toBe('IDLE')
    expect(step1Audit.typingActive).toBe(false)
    expect(step1Audit.figureVisible).toBe(true)
    expect(step1Audit.distanceFigureToWorkstationAnchor).toBeLessThanOrEqual(0.25)

    await page.screenshot({ path: join(evidenceDir, '01-idle.png') })
    causalProof.steps.push({
      step: 1,
      name: 'IDLE',
      screenshot: '01-idle.png',
      ...step1Audit,
    })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: PREPARING (02-preparing.png)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 2: PREPARING...]')
    await page.evaluate(async () => {
      const { deriveWorldState } = await import('/src/hq3d/world/worldState.js')
      const dir = (window as any).__hqDirector

      const prepWorld = deriveWorldState({
        projection: {
          schemaVersion: '1.0.0',
          epoch: 'epoch-12fc2-proof',
          revision: 2,
          activeTasks: [
            {
              taskId: 'task-fe-12fc2',
              roleId: 'role:engineering:frontend-engineer',
              phase: 'PREPARING',
              workerIdentity: 'codex',
              harnessId: 'codex',
              route: {
                transport: 'DIRECT',
                active: true,
                requestedProvider: 'openai',
                requestedModel: 'gpt-4o',
                actualProvider: 'openai',
                actualModel: 'gpt-4o',
                providerFallbackOccurred: false,
                transportFallbackOccurred: false,
              },
            },
          ],
          handoffs: [],
        },
        tasks: [
          {
            id: 'task-fe-12fc2',
            title: 'Visual Causal Proof & Performance Closure',
            state: 'READY',
            role: 'role:engineering:frontend-engineer',
            assignedRole: 'role:engineering:frontend-engineer',
            assignedStationId: 'frontend-engineer-workstation',
            type: 'CODE',
            payload: {},
            createdAt: '2026-09-27T12:00:00.000Z',
            updatedAt: '2026-09-27T12:00:01.000Z',
          } as any,
        ],
      })
      dir.updateWorldState(prepWorld)
    })
    await setUnifiedCausalCamera()
    await page.waitForTimeout(600)

    const step2Audit = await queryCharacterSpatialAudit()
    expect(step2Audit.characterState).toBe('ATTENTION')
    expect(step2Audit.typingActive).toBe(false)
    expect(step2Audit.figureVisible).toBe(true)
    expect(step2Audit.distanceFigureToWorkstationAnchor).toBeLessThanOrEqual(0.25)

    await page.screenshot({ path: join(evidenceDir, '02-preparing.png') })
    causalProof.steps.push({
      step: 2,
      name: 'PREPARING',
      screenshot: '02-preparing.png',
      ...step2Audit,
    })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: WORKER_RUNNING (03-worker-running.png)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 3: WORKER_RUNNING...]')
    await page.evaluate(async () => {
      const { deriveWorldState } = await import('/src/hq3d/world/worldState.js')
      const dir = (window as any).__hqDirector

      const runningWorld = deriveWorldState({
        projection: {
          schemaVersion: '1.0.0',
          epoch: 'epoch-12fc2-proof',
          revision: 3,
          activeTasks: [
            {
              taskId: 'task-fe-12fc2',
              roleId: 'role:engineering:frontend-engineer',
              phase: 'WORKER_RUNNING',
              workerIdentity: 'codex',
              harnessId: 'codex',
              route: {
                transport: 'DIRECT',
                active: true,
                requestedProvider: 'openai',
                requestedModel: 'gpt-4o',
                actualProvider: 'openai',
                actualModel: 'gpt-4o',
                providerFallbackOccurred: false,
                transportFallbackOccurred: false,
              },
            },
          ],
          handoffs: [],
        },
        tasks: [
          {
            id: 'task-fe-12fc2',
            title: 'Visual Causal Proof & Performance Closure',
            state: 'RUNNING',
            role: 'role:engineering:frontend-engineer',
            assignedRole: 'role:engineering:frontend-engineer',
            assignedStationId: 'frontend-engineer-workstation',
            type: 'CODE',
            payload: {},
            createdAt: '2026-09-27T12:00:00.000Z',
            updatedAt: '2026-09-27T12:00:02.000Z',
          } as any,
        ],
      })
      dir.updateWorldState(runningWorld)
    })
    await setUnifiedCausalCamera()
    await page.waitForTimeout(600)

    const step3Audit = await queryCharacterSpatialAudit()
    expect(step3Audit.characterState).toBe('FOCUSED')
    expect(step3Audit.typingActive).toBe(true)
    expect(step3Audit.figureVisible).toBe(true)

    // HARD CONTRACT ASSERTION: Distance MUST be <= 0.25m
    if (step3Audit.distanceFigureToWorkstationAnchor > 0.25) {
      throw new Error(
        `WORKER_RUNNING anchor violation: figure at distance ${step3Audit.distanceFigureToWorkstationAnchor}m exceeds 0.25m radius`
      )
    }
    expect(step3Audit.distanceFigureToWorkstationAnchor).toBeLessThanOrEqual(0.25)

    await page.screenshot({ path: join(evidenceDir, '03-worker-running.png') })
    causalProof.steps.push({
      step: 3,
      name: 'WORKER_RUNNING',
      screenshot: '03-worker-running.png',
      ...step3Audit,
    })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: CLEANUP (04-cleanup.png)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 4: CLEANUP...]')
    await page.evaluate(async () => {
      const { deriveWorldState } = await import('/src/hq3d/world/worldState.js')
      const dir = (window as any).__hqDirector

      const cleanupWorld = deriveWorldState({
        projection: {
          schemaVersion: '1.0.0',
          epoch: 'epoch-12fc2-proof',
          revision: 4,
          activeTasks: [
            {
              taskId: 'task-fe-12fc2',
              roleId: 'role:engineering:frontend-engineer',
              phase: 'CLEANUP',
              workerIdentity: 'codex',
              harnessId: 'codex',
              route: {
                transport: 'DIRECT',
                active: true,
                requestedProvider: 'openai',
                requestedModel: 'gpt-4o',
                actualProvider: 'openai',
                actualModel: 'gpt-4o',
                providerFallbackOccurred: false,
                transportFallbackOccurred: false,
              },
            },
          ],
          handoffs: [],
        },
        tasks: [
          {
            id: 'task-fe-12fc2',
            title: 'Visual Causal Proof & Performance Closure',
            state: 'RUNNING',
            role: 'role:engineering:frontend-engineer',
            assignedRole: 'role:engineering:frontend-engineer',
            assignedStationId: 'frontend-engineer-workstation',
            type: 'CODE',
            payload: {},
            createdAt: '2026-09-27T12:00:00.000Z',
            updatedAt: '2026-09-27T12:00:03.000Z',
          } as any,
        ],
      })
      dir.updateWorldState(cleanupWorld)
    })
    await setUnifiedCausalCamera()
    await page.waitForTimeout(600)

    const step4Audit = await queryCharacterSpatialAudit()
    expect(step4Audit.characterState).toBe('WAITING')
    expect(step4Audit.typingActive).toBe(false)
    expect(step4Audit.figureVisible).toBe(true)
    expect(step4Audit.distanceFigureToWorkstationAnchor).toBeLessThanOrEqual(0.25)

    await page.screenshot({ path: join(evidenceDir, '04-cleanup.png') })
    causalProof.steps.push({
      step: 4,
      name: 'CLEANUP',
      screenshot: '04-cleanup.png',
      ...step4Audit,
    })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: VERIFYING (05-verifying.png)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 5: VERIFYING...]')
    await page.evaluate(async () => {
      const { deriveWorldState } = await import('/src/hq3d/world/worldState.js')
      const dir = (window as any).__hqDirector

      const verifyingWorld = deriveWorldState({
        projection: {
          schemaVersion: '1.0.0',
          epoch: 'epoch-12fc2-proof',
          revision: 5,
          activeTasks: [
            {
              taskId: 'task-fe-12fc2',
              roleId: 'role:engineering:frontend-engineer',
              phase: 'VERIFYING',
              workerIdentity: 'verifier',
              harnessId: 'verifier',
              route: {
                transport: 'DIRECT',
                active: true,
                requestedProvider: 'deterministic-verifier',
                requestedModel: 'verifier-v1',
                actualProvider: 'deterministic-verifier',
                actualModel: 'verifier-v1',
                providerFallbackOccurred: false,
                transportFallbackOccurred: false,
              },
            },
          ],
          handoffs: [],
        },
        tasks: [
          {
            id: 'task-fe-12fc2',
            title: 'Visual Causal Proof & Performance Closure',
            state: 'VERIFYING',
            role: 'role:engineering:frontend-engineer',
            assignedRole: 'role:engineering:frontend-engineer',
            type: 'CODE',
            payload: {},
            createdAt: '2026-09-27T12:00:00.000Z',
            updatedAt: '2026-09-27T12:00:04.000Z',
          } as any,
        ],
      })
      dir.updateWorldState(verifyingWorld)
    })
    await setUnifiedCausalCamera()
    await page.waitForTimeout(600)

    const step5Audit = await queryCharacterSpatialAudit()
    expect(step5Audit.characterState).not.toBe('FOCUSED')
    expect(step5Audit.typingActive).toBe(false)
    expect(step5Audit.figureVisible).toBe(true)

    await page.screenshot({ path: join(evidenceDir, '05-verifying.png') })
    causalProof.steps.push({
      step: 5,
      name: 'VERIFYING',
      screenshot: '05-verifying.png',
      ...step5Audit,
    })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: NIGHT IDLE (06-night-idle.png)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 6: NIGHT IDLE...]')
    await page.evaluate(async () => {
      const { deriveWorldState } = await import('/src/hq3d/world/worldState.js')
      const dir = (window as any).__hqDirector

      const nightIdleWorld = deriveWorldState({
        projection: {
          schemaVersion: '1.0.0',
          epoch: 'epoch-12fc2-proof',
          revision: 6,
          activeTasks: [],
          handoffs: [],
        },
        tasks: [],
      })
      dir.updateWorldState(nightIdleWorld)
      dir.setAtmosphere('NIGHT')
    })
    await page.locator('[data-testid="hq-atmosphere-night"]').click()
    await setUnifiedCausalCamera()
    await page.waitForTimeout(800)

    const step6Audit = await queryCharacterSpatialAudit()
    expect(step6Audit.characterState).toBe('IDLE')
    expect(step6Audit.typingActive).toBe(false)
    expect(step6Audit.stationStatus).toBe('IDLE')

    await page.screenshot({ path: join(evidenceDir, '06-night-idle.png') })
    causalProof.steps.push({
      step: 6,
      name: 'NIGHT_IDLE',
      screenshot: '06-night-idle.png',
      ...step6Audit,
    })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 7: NIGHT WORKER RUNNING (07-night-worker-running.png)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 7: NIGHT WORKER RUNNING...]')
    await page.evaluate(async () => {
      const { deriveWorldState } = await import('/src/hq3d/world/worldState.js')
      const dir = (window as any).__hqDirector

      const nightRunningWorld = deriveWorldState({
        projection: {
          schemaVersion: '1.0.0',
          epoch: 'epoch-12fc2-proof',
          revision: 7,
          activeTasks: [
            {
              taskId: 'task-fe-12fc2',
              roleId: 'role:engineering:frontend-engineer',
              phase: 'WORKER_RUNNING',
              workerIdentity: 'codex',
              harnessId: 'codex',
              route: {
                transport: 'DIRECT',
                active: true,
                requestedProvider: 'openai',
                requestedModel: 'gpt-4o',
                actualProvider: 'openai',
                actualModel: 'gpt-4o',
                providerFallbackOccurred: false,
                transportFallbackOccurred: false,
              },
            },
          ],
          handoffs: [],
        },
        tasks: [
          {
            id: 'task-fe-12fc2',
            title: 'Visual Causal Proof & Performance Closure',
            state: 'RUNNING',
            role: 'role:engineering:frontend-engineer',
            assignedRole: 'role:engineering:frontend-engineer',
            assignedStationId: 'frontend-engineer-workstation',
            type: 'CODE',
            payload: {},
            createdAt: '2026-09-27T12:00:00.000Z',
            updatedAt: '2026-09-27T12:00:07.000Z',
          } as any,
        ],
      })
      dir.updateWorldState(nightRunningWorld)
      dir.setAtmosphere('NIGHT')
    })
    await setUnifiedCausalCamera()
    await page.waitForTimeout(800)

    const step7Audit = await queryCharacterSpatialAudit()
    expect(step7Audit.characterState).toBe('FOCUSED')
    expect(step7Audit.typingActive).toBe(true)
    expect(step7Audit.distanceFigureToWorkstationAnchor).toBeLessThanOrEqual(0.25)

    await page.screenshot({ path: join(evidenceDir, '07-night-worker-running.png') })
    causalProof.steps.push({
      step: 7,
      name: 'NIGHT_WORKER_RUNNING',
      screenshot: '07-night-worker-running.png',
      ...step7Audit,
    })

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 8: WORKSTATION WIDE (08-workstation-wide.png)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Step 8: WORKSTATION WIDE...]')
    await page.locator('[data-testid="hq-atmosphere-day"]').click()
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setAtmosphere('DAY')
      dir.scene.setFocusedRoom('WS_FRONTEND')
      dir.cameraRig.setFraming(
        {
          id: 'WS_FRONTEND_WIDE',
          target: [-3.5, 7.8, 0.6],
          position: [-5.0, 9.2, -2.6],
          description: 'Frontend Engineer Workstation Wide Context',
        },
        true
      )
    })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: join(evidenceDir, '08-workstation-wide.png') })

    // Write machine-readable causal proof JSON
    await writeFile(
      join(evidenceDir, 'runtime-character-causal-proof.json'),
      JSON.stringify(causalProof, null, 2)
    )
    console.log('[runtime-character-causal-proof.json written successfully]')

    // ──────────────────────────────────────────────────────────────────────────
    // PERFORMANCE BENCHMARKS (10s RAF loop at F2 Workstation View)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[Running 10s RAF Performance Benchmark at F2 Workstation View]...')
    await setUnifiedCausalCamera()
    await page.waitForTimeout(1000)

    const workstationBench = await page.evaluate((duration) => {
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
            frameDeltas.sort((a, b) => a - b)
            const sum = frameDeltas.reduce((a, b) => a + b, 0)
            const avgDelta = sum / frameDeltas.length
            const medianDelta = frameDeltas[Math.floor(frameDeltas.length * 0.5)]
            const p95Delta = frameDeltas[Math.floor(frameDeltas.length * 0.95)]
            const p99Delta = frameDeltas[Math.floor(frameDeltas.length * 0.99)]
            const avgFps = 1000 / avgDelta

            const dir = (window as any).__hqDirector
            const threeRenderer = dir.renderer.renderer
            const memInfo = threeRenderer.info.memory
            const renderInfo = threeRenderer.info.render

            resolve({
              view: 'F2_WORKSTATION_CAMERA',
              viewport: { width: 1600, height: 900 },
              dpr: window.devicePixelRatio || 1,
              atmosphere: dir.getAtmosphere(),
              camera: 'WS_FRONTEND_CAUSAL',
              browser: 'Chromium (Playwright)',
              durationMs: duration,
              totalFrames: count,
              averageFps: Math.round(avgFps * 10) / 10,
              medianFrameTimeMs: Math.round(medianDelta * 100) / 100,
              p95FrameTimeMs: Math.round(p95Delta * 100) / 100,
              p99FrameTimeMs: Math.round(p99Delta * 100) / 100,
              drawCalls: renderInfo.calls,
              triangles: renderInfo.triangles,
              geometries: memInfo.geometries,
              textures: memInfo.textures,
            })
          }
        }
        requestAnimationFrame(frame)
      })
    }, 10000)

    console.log('[Workstation Benchmark Result]:', workstationBench)

    // Tower overview benchmark
    console.log('[Running 5s RAF Performance Benchmark at Tower Overview]...')
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.scene.setFocusedRoom(null)
      dir.cameraRig.setFraming(
        {
          id: 'HQ_OVERVIEW',
          target: [0.5, 12.6, 0.0],
          position: [-14.0, 15.0, -44.0],
          description: 'Tower Overview',
        },
        true
      )
    })
    await page.waitForTimeout(1000)

    const overviewBench = await page.evaluate((duration) => {
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
            frameDeltas.sort((a, b) => a - b)
            const sum = frameDeltas.reduce((a, b) => a + b, 0)
            const avgDelta = sum / frameDeltas.length
            const medianDelta = frameDeltas[Math.floor(frameDeltas.length * 0.5)]
            const p95Delta = frameDeltas[Math.floor(frameDeltas.length * 0.95)]
            const p99Delta = frameDeltas[Math.floor(frameDeltas.length * 0.99)]
            const avgFps = 1000 / avgDelta

            const dir = (window as any).__hqDirector
            const threeRenderer = dir.renderer.renderer
            const memInfo = threeRenderer.info.memory
            const renderInfo = threeRenderer.info.render

            resolve({
              view: 'TOWER_OVERVIEW_CAMERA',
              viewport: { width: 1600, height: 900 },
              dpr: window.devicePixelRatio || 1,
              atmosphere: dir.getAtmosphere(),
              camera: 'HQ_OVERVIEW',
              browser: 'Chromium (Playwright)',
              durationMs: duration,
              totalFrames: count,
              averageFps: Math.round(avgFps * 10) / 10,
              medianFrameTimeMs: Math.round(medianDelta * 100) / 100,
              p95FrameTimeMs: Math.round(p95Delta * 100) / 100,
              p99FrameTimeMs: Math.round(p99Delta * 100) / 100,
              drawCalls: renderInfo.calls,
              triangles: renderInfo.triangles,
              geometries: memInfo.geometries,
              textures: memInfo.textures,
            })
          }
        }
        requestAnimationFrame(frame)
      })
    }, 5000)

    console.log('[Overview Benchmark Result]:', overviewBench)

    const benchmarksBeforeAfter = {
      benchmarkTimestamp: new Date().toISOString(),
      viewport: { width: 1600, height: 900 },
      devicePixelRatio: 1.0,
      browser: 'Chromium (Playwright)',
      baselineWave12FC: {
        view: 'F2_WORKSTATION_CAMERA',
        averageFps: 36.9,
        medianFrameTimeMs: 33.3,
        p95FrameTimeMs: 33.6,
        p99FrameTimeMs: 33.9,
        drawCalls: 357,
        triangles: 41012,
        geometries: 1037,
        textures: 22,
      },
      currentWave12FC2: {
        workstationView: workstationBench,
        towerOverview: overviewBench,
      },
    }

    await writeFile(
      join(evidenceDir, 'benchmarks-before-after.json'),
      JSON.stringify(benchmarksBeforeAfter, null, 2)
    )
    console.log('[benchmarks-before-after.json written successfully]')

    await fgContext.close()
    await fgBrowser.close()
  })
})
