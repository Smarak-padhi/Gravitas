/**
 * Fault Injection Runner Subprocess
 *
 * Spawns an isolated WorkSessionKernel instance, executes targeted setup or commands,
 * and executes simulated crash fault injection at precise lifecycle boundaries.
 */

import { WorkSessionKernel } from '../index.js'

async function main() {
  const mode = process.argv[2]
  const dataRoot = process.argv[3]

  if (!mode || !dataRoot) {
    console.error('Usage: fault-worker.ts <mode> <dataRoot>')
    process.exit(1)
  }

  const kernel = new WorkSessionKernel({ dataRoot })
  await kernel.start()

  switch (mode) {
    case 'CRASH_A': {
      // In this mode, we start an uncommitted transaction and kill the process abruptly
      const writer = kernel['getWriter']()
      const rawDb = writer.getRawDb()
      rawDb.exec('BEGIN IMMEDIATE TRANSACTION;')
      rawDb.exec(`
        INSERT INTO work_sessions (
          id, title, objective, repository_root, base_branch, state, revision, created_at, updated_at
        ) VALUES (
          'ws-crash-a', 'Crash A Pre-Commit', 'Should be rolled back', 'repo', 'main', 'CREATED', 1,
          '${new Date().toISOString()}', '${new Date().toISOString()}'
        );
      `)
      // Abrupt process termination BEFORE commit
      process.kill(process.pid, 'SIGKILL')
      break
    }

    case 'CRASH_B': {
      // Transaction commits cleanly, then process dies abruptly before returning response to caller
      const res = await kernel.executeCommand({
        commandId: 'cmd-crash-b',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-crash-b',
        payload: { title: 'Crash B Session', goal: 'Committed but process died' },
      })
      if (!res.success) {
        process.exit(2)
      }
      // Process killed abruptly immediately after commit
      process.kill(process.pid, 'SIGKILL')
      break
    }

    case 'CRASH_C': {
      // Create job, lease it with short expiration, and kill process
      await kernel.executeCommand({
        commandId: 'cmd-ws-crash-c',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-crash-c',
        payload: { title: 'Crash C Job Host' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-job-crash-c',
        type: 'CREATE_DURABLE_JOB',
        payload: {
          jobId: 'job-crash-c',
          jobType: 'COMPUTE',
          workSessionId: 'ws-crash-c',
        },
      })
      await kernel.executeCommand({
        commandId: 'cmd-lease-crash-c',
        type: 'CLAIM_JOB_LEASE',
        payload: {
          jobId: 'job-crash-c',
          leaseOwner: 'doomed-worker',
          leaseExpiresAt: new Date(Date.now() - 1000).toISOString(), // expired
        },
      })
      process.kill(process.pid, 'SIGKILL')
      break
    }

    case 'CRASH_D': {
      // WorkSession reaches WAITING_APPROVAL, then process terminates uncleanly
      await kernel.executeCommand({
        commandId: 'cmd-ws-crash-d',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-crash-d',
        payload: { title: 'Human Gate Crash' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-ready-crash-d',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-crash-d',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-act-crash-d',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-crash-d',
        expectedRevision: 2,
        payload: { targetState: 'ACTIVE' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-appr-crash-d',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-crash-d',
        expectedRevision: 3,
        payload: { targetState: 'WAITING_APPROVAL' },
      })
      process.kill(process.pid, 'SIGKILL')
      break
    }

    case 'CRASH_E': {
      // WorkSession ACTIVE and Task RUNNING, then process dies abruptly
      await kernel.executeCommand({
        commandId: 'cmd-ws-crash-e',
        type: 'CREATE_WORK_SESSION',
        workSessionId: 'ws-crash-e',
        payload: { title: 'Active Run Crash' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-ready-crash-e',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-crash-e',
        expectedRevision: 1,
        payload: { targetState: 'READY' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-act-crash-e',
        type: 'TRANSITION_WORK_SESSION',
        workSessionId: 'ws-crash-e',
        expectedRevision: 2,
        payload: { targetState: 'ACTIVE' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-run-crash-e',
        type: 'CREATE_RUN',
        payload: { runId: 'run-crash-e', workSessionId: 'ws-crash-e', goal: 'Run in flight' },
      })
      await kernel.executeCommand({
        commandId: 'cmd-task-crash-e',
        type: 'CREATE_TASK',
        workSessionId: 'ws-crash-e',
        payload: {
          taskId: 'task-crash-e',
          runId: 'run-crash-e',
          title: 'Task in flight',
          requiresApproval: false,
        },
      })
      await kernel.executeCommand({
        commandId: 'cmd-task-run-crash-e',
        type: 'TRANSITION_TASK',
        payload: { taskId: 'task-crash-e', targetState: 'RUNNING' },
      })
      process.kill(process.pid, 'SIGKILL')
      break
    }

    default:
      console.error(`Unknown mode: ${mode}`)
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fault worker unexpected error:', err)
  process.exit(1)
})
