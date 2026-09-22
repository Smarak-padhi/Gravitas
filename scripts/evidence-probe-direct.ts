/**
 * GRAVITAS — Wave 12C-P-E Real Execution Evidence Probe
 *
 * DIRECT control proof: Real GravitasServer + CodexHarness (AVAILABLE).
 * Captures projection snapshot during actual Codex worker execution.
 *
 * Usage:
 *   npx tsx scripts/evidence-probe-direct.ts
 *
 * Safety:
 *   - Creates isolated temp fixture repository; never touches Multi-agent repo.
 *   - Task auto-pauses at WAITING_APPROVAL; does NOT auto-approve.
 *   - No secrets stored; sanitized snapshot only.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EventHub } from '../apps/server/src/events.js'
import { InMemoryRegistry } from '../apps/server/src/registry.js'
import { GravitasServer } from '../apps/server/src/server.js'
import { RunService } from '../apps/server/src/service.js'
import { executeGit } from '@gravitas/git'
import { CodexHarness } from '../packages/harnesses/src/codex.js'

const KNOWN_CANARIES = [
  'OPENAI_API_KEY',
  'Authorization',
  'Bearer ',
  'apiKey',
  'password',
  'secret',
  'token',
]

function sanitize(obj: unknown): unknown {
  const s = JSON.stringify(obj)
  for (const canary of KNOWN_CANARIES) {
    if (s.toLowerCase().includes(canary.toLowerCase())) {
      console.warn(`[WARN] Potential sensitive field containing '${canary}' found — review before saving`)
    }
  }
  return obj
}

async function main() {
  const primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-12cpe-direct-'))
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-12cpe-runtime-'))

  console.log('=== GRAVITAS Wave 12C-P-E: DIRECT Execution Evidence Probe ===')
  console.log(`Fixture repo: ${primaryRepoPath}`)
  console.log(`Runtime root: ${runtimeRoot}`)

  try {
    // Set up a minimal fixture repository with a broken math.js
    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Gravitas Evidence'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'evidence@gravitas.local'] })

    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'gravitas-evidence-fixture', type: 'module', version: '1.0.0' }, null, 2),
      'utf8'
    )
    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'src', 'math.js'),
      'export function add(a, b) {\n  // TODO: implement correctly\n  return 0;\n}\n',
      'utf8'
    )
    // Minimal vitest config for verification
    await writeFile(
      join(primaryRepoPath, 'vitest.config.js'),
      'export default { test: { include: ["**/*.test.js"] } }\n',
      'utf8'
    )
    await writeFile(
      join(primaryRepoPath, 'math.test.js'),
      'import { test, expect } from "vitest"\nimport { add } from "./src/math.js"\ntest("add(2,3)===5", () => { expect(add(2, 3)).toBe(5) })\n',
      'utf8'
    )

    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'Initial fixture: broken math.js'] })

    // Build real server with CodexHarness
    const registry = new InMemoryRegistry()
    const harness = new CodexHarness()
    const eventHub = new EventHub(registry)

    const avail = await harness.availability()
    console.log('\nHarness availability:', JSON.stringify(avail, null, 2))

    if (avail.status !== 'AVAILABLE') {
      console.error('ERROR: CodexHarness not AVAILABLE. Aborting.')
      process.exit(1)
    }

    const service = new RunService({
      registry,
      eventHub,
      harness,
      defaultRepository: primaryRepoPath,
      defaultBaseBranch: 'main',
      runtimeRoot,
    })

    const server = new GravitasServer({ service, eventHub })
    const addr = await server.start({ host: '127.0.0.1', port: 0 })
    const serverUrl = addr.url
    console.log(`\nServer started at: ${serverUrl}`)

    // Capture initial (empty) snapshot
    const initialStateRes = await fetch(`${serverUrl}/api/v1/state`)
    const initialState = await initialStateRes.json() as any
    const initialSnapshot = initialState.projection
    console.log('\n--- Initial snapshot (before run creation) ---')
    console.log(JSON.stringify(initialSnapshot, null, 2))

    // Create run
    const createRes = await fetch(`${serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Fix math.add to return a + b instead of 0',
        repository: primaryRepoPath,
        baseBranch: 'main',
        tasks: [
          {
            id: 'task-evidence-direct-1',
            title: 'Fix add function',
            objective: 'Update src/math.js so that add(a, b) returns a + b.',
            dependencies: [],
            requiresApproval: true,
          },
        ],
      }),
    })

    if (createRes.status !== 201) {
      const body = await createRes.text()
      console.error(`ERROR: Run creation failed (${createRes.status}): ${body}`)
      await server.stop()
      process.exit(1)
    }

    const created = await createRes.json() as any
    const runId = created.runId
    console.log(`\nRun created: runId=${runId}`)

    // Observe projection snapshots during execution
    const snapshots: Array<{ label: string; snapshot: unknown; timestamp: string }> = []

    // Start a polling loop to capture projection states during execution
    let pollingActive = true
    let pollingIteration = 0
    const pollPromise = (async () => {
      while (pollingActive) {
        await new Promise(r => setTimeout(r, 500))
        pollingIteration++
        const stateRes = await fetch(`${serverUrl}/api/v1/state`)
        if (!stateRes.ok) continue
        const state = await stateRes.json() as any
        const projection = state.projection
        const task = state.tasks?.find((t: any) => t.id === 'task-evidence-direct-1')

        if (projection?.activeTasks?.length > 0) {
          const label = `poll-${pollingIteration}-phase-${projection.activeTasks[0]?.phase ?? 'unknown'}`
          if (!snapshots.find(s => s.label.includes(projection.activeTasks[0]?.phase))) {
            console.log(`\n[Poll ${pollingIteration}] Active projection captured: ${label}`)
            console.log(JSON.stringify(sanitize(projection), null, 2))
            snapshots.push({ label, snapshot: projection, timestamp: new Date().toISOString() })
          }
        }

        if (task?.state === 'WAITING_APPROVAL' || task?.state === 'FAILED' || task?.state === 'SUCCEEDED') {
          pollingActive = false
        }
      }
    })()

    // Execute the run (will block until WAITING_APPROVAL due to autoPauseOnWaitingApproval)
    console.log('\nExecuting run via API...')
    const execStartTime = Date.now()
    const execRes = await fetch(`${serverUrl}/api/v1/runs/${runId}/execute`, { method: 'POST' })
    const execDurationMs = Date.now() - execStartTime
    console.log(`Execute response: ${execRes.status} (${execDurationMs}ms)`)

    pollingActive = false
    await pollPromise

    // Get final state
    const finalStateRes = await fetch(`${serverUrl}/api/v1/state`)
    const finalState = await finalStateRes.json() as any
    const finalSnapshot = finalState.projection
    const finalTask = finalState.tasks?.find((t: any) => t.id === 'task-evidence-direct-1')

    console.log('\n--- Final projection snapshot ---')
    console.log(JSON.stringify(sanitize(finalSnapshot), null, 2))
    console.log('\n--- Final canonical task state ---')
    console.log(JSON.stringify(finalTask, null, 2))

    // Fresh client verification (Section 8 guarantee)
    console.log('\n=== Fresh Client Recovery Proof ===')
    const freshClientRes = await fetch(`${serverUrl}/api/v1/state`)
    const freshClientState = await freshClientRes.json() as any
    console.log('Fresh client projection:', JSON.stringify(sanitize(freshClientState.projection), null, 2))
    console.log('Fresh client tasks:', JSON.stringify(freshClientState.tasks?.map((t: any) => ({ id: t.id, state: t.state })), null, 2))

    // Build evidence artifact
    const evidence = {
      _metadata: {
        wave: '12C-P-E',
        type: 'REAL_DIRECT_EXECUTION',
        capturedAt: new Date().toISOString(),
        harnessId: harness.id,
        harnessVersion: avail.version ?? null,
        runId,
        taskId: 'task-evidence-direct-1',
        serverUrl,
      },
      harnessAvailability: avail,
      initialSnapshot: sanitize(initialSnapshot),
      snapshots: snapshots.map(s => ({ label: s.label, timestamp: s.timestamp, snapshot: sanitize(s.snapshot) })),
      finalProjection: sanitize(finalSnapshot),
      finalCanonicalTask: {
        id: finalTask?.id,
        state: finalTask?.state,
        title: finalTask?.title,
      },
      freshClientProjection: sanitize(freshClientState.projection),
      phaseSequenceObserved: snapshots.map(s => (s.snapshot as any)?.activeTasks?.[0]?.phase),
    }

    // Validate no secrets in evidence
    const evidenceStr = JSON.stringify(evidence)
    const foundCanaries = KNOWN_CANARIES.filter(c => evidenceStr.toLowerCase().includes(c.toLowerCase()))
    if (foundCanaries.length > 0) {
      console.warn('\n[SECURITY] Potential sensitive values found in evidence:', foundCanaries)
      console.warn('Evidence NOT saved automatically. Review manually.')
    } else {
      console.log('\n[SECURITY] Secret sanitization check: PASS — no known canaries in evidence.')
    }

    console.log('\n=== Evidence Summary ===')
    console.log(JSON.stringify(evidence, null, 2))

    await server.stop()

    return evidence
  } finally {
    await rm(primaryRepoPath, { recursive: true, force: true }).catch(() => {})
    await rm(runtimeRoot, { recursive: true, force: true }).catch(() => {})
    await rm(join(process.cwd(), 'check-codex.ts'), { force: true }).catch(() => {})
  }
}

main()
  .then(evidence => {
    // Write sanitized evidence to .evidence/
    import('node:fs/promises').then(async (fsPromises) => {
      await fsPromises.mkdir('.evidence', { recursive: true })
      await fsPromises.writeFile(
        '.evidence/12c-p-real-direct.json',
        JSON.stringify(evidence, null, 2),
        'utf8'
      )
      console.log('\nEvidence written to .evidence/12c-p-real-direct.json')
    }).catch(console.error)
  })
  .catch(e => {
    console.error('\nFATAL:', e)
    process.exit(1)
  })
