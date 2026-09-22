/**
 * Gravitas 3D Headquarters — Deterministic Test Fixtures A through O (Wave 12C)
 *
 * Defines complete, immutable fixture inputs for pure world projection verification:
 * A: EMPTY
 * B: READY / Queued
 * C: PREPARING
 * D: WORKER_RUNNING (DIRECT)
 * E: WORKER_RUNNING (GATEWAY ACTIVE)
 * F: WORKER_RUNNING_AFTER_GATEWAY_CALL (GATEWAY INACTIVE PROVENANCE)
 * G: VERIFYING
 * H: BROWSER_QA_RUNNING
 * I: WAITING_APPROVAL
 * J: FAILED
 * K: COMPLETED
 * L: PROVIDER_FALLBACK
 * M: TRANSPORT_FALLBACK
 * N: UNKNOWN_PROVIDER_MODEL
 * O: MULTIPLE_CONCURRENT_TASKS
 */

import type { Task } from '@gravitas/core'
import type { DeriveWorldStateInput } from './worldState.js'

export const FIXTURE_EPOCH = 'proj_epoch_fixture_test_12c'

// ─── A: EMPTY ─────────────────────────────────────────────────────────────────

export const FIXTURE_A_EMPTY: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 0,
    activeTasks: [],
  },
  tasks: [],
}

// ─── B: READY / QUEUED ────────────────────────────────────────────────────────

const TASK_B: Task = {
  id: 'task-b-ready',
  runId: 'run-fixture',
  title: 'Queued Task B',
  objective: 'Objective B',
  state: 'READY',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:00.000Z',
}

export const FIXTURE_B_READY_QUEUED: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 1,
    activeTasks: [],
  },
  tasks: [TASK_B],
}

// ─── C: PREPARING ─────────────────────────────────────────────────────────────

const TASK_C: Task = {
  id: 'task-c-prep',
  runId: 'run-fixture',
  title: 'Preparing Task C',
  objective: 'Objective C',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:05.000Z',
}

export const FIXTURE_C_PREPARING: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 2,
    activeTasks: [
      {
        taskId: 'task-c-prep',
        phase: 'PREPARING',
        workerIdentity: 'codex',
        route: {
          transport: 'DIRECT',
          active: true,
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
      },
    ],
  },
  tasks: [TASK_C],
}

// ─── D: WORKER_RUNNING (DIRECT) ───────────────────────────────────────────────

const TASK_D: Task = {
  id: 'task-d-direct',
  runId: 'run-fixture',
  title: 'Direct Worker Task D',
  objective: 'Objective D',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:10.000Z',
}

export const FIXTURE_D_WORKER_RUNNING_DIRECT: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 3,
    activeTasks: [
      {
        taskId: 'task-d-direct',
        phase: 'WORKER_RUNNING',
        workerIdentity: 'codex',
        route: {
          transport: 'DIRECT',
          active: true,
          gatewayId: null,
          requestedProvider: null,
          requestedModel: null,
          actualProvider: 'direct',
          actualModel: 'codex-cli',
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
      },
    ],
  },
  tasks: [TASK_D],
}

// ─── E: WORKER_RUNNING (GATEWAY ACTIVE) ────────────────────────────────────────

const TASK_E: Task = {
  id: 'task-e-gw-active',
  runId: 'run-fixture',
  title: 'Gateway Active Task E',
  objective: 'Objective E',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:15.000Z',
}

export const FIXTURE_E_WORKER_RUNNING_GATEWAY_ACTIVE: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 4,
    activeTasks: [
      {
        taskId: 'task-e-gw-active',
        phase: 'WORKER_RUNNING',
        workerIdentity: 'fcc',
        route: {
          transport: 'GATEWAY',
          active: true,
          gatewayId: 'omniroute-local',
          requestedProvider: 'openai',
          requestedModel: 'gpt-4o',
          actualProvider: 'openai',
          actualModel: 'gpt-4o',
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
      },
    ],
  },
  tasks: [TASK_E],
}

// ─── F: WORKER_RUNNING_AFTER_GATEWAY_CALL (INACTIVE PROVENANCE) ───────────────

const TASK_F: Task = {
  id: 'task-f-gw-inactive',
  runId: 'run-fixture',
  title: 'Task F after Gateway Call',
  objective: 'Objective F',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:20.000Z',
}

export const FIXTURE_F_WORKER_RUNNING_AFTER_GATEWAY_CALL: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 5,
    activeTasks: [
      {
        taskId: 'task-f-gw-inactive',
        phase: 'WORKER_RUNNING',
        workerIdentity: 'fcc',
        route: {
          transport: 'GATEWAY',
          active: false,
          gatewayId: 'omniroute-local',
          requestedProvider: 'openai',
          requestedModel: 'gpt-4o',
          actualProvider: 'openai',
          actualModel: 'gpt-4o',
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
      },
    ],
  },
  tasks: [TASK_F],
}

// ─── G: VERIFYING ─────────────────────────────────────────────────────────────

const TASK_G: Task = {
  id: 'task-g-verifying',
  runId: 'run-fixture',
  title: 'Deterministic Verifying Task G',
  objective: 'Objective G',
  state: 'VERIFYING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:25.000Z',
}

export const FIXTURE_G_VERIFYING: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 6,
    activeTasks: [
      {
        taskId: 'task-g-verifying',
        phase: 'VERIFYING',
        workerIdentity: 'codex',
        route: {
          transport: 'DIRECT',
          active: false,
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
        verification: {
          status: 'RUNNING',
        },
      },
    ],
  },
  tasks: [TASK_G],
}

// ─── H: BROWSER_QA_RUNNING ────────────────────────────────────────────────────

const TASK_H: Task = {
  id: 'task-h-browser-qa',
  runId: 'run-fixture',
  title: 'Browser QA Task H',
  objective: 'Objective H',
  state: 'VERIFYING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:30.000Z',
}

export const FIXTURE_H_BROWSER_QA_RUNNING: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 7,
    activeTasks: [
      {
        taskId: 'task-h-browser-qa',
        phase: 'BROWSER_QA',
        workerIdentity: 'codex',
        route: {
          transport: 'DIRECT',
          active: false,
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
        browserQa: {
          status: 'RUNNING',
        },
      },
    ],
  },
  tasks: [TASK_H],
}

// ─── I: WAITING_APPROVAL ──────────────────────────────────────────────────────

const TASK_I: Task = {
  id: 'task-i-waiting-approval',
  runId: 'run-fixture',
  title: 'Approval Required Task I',
  objective: 'Objective I',
  state: 'WAITING_APPROVAL',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:35.000Z',
}

export const FIXTURE_I_WAITING_APPROVAL: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 8,
    activeTasks: [],
  },
  tasks: [TASK_I],
}

// ─── J: FAILED ────────────────────────────────────────────────────────────────

const TASK_J: Task = {
  id: 'task-j-failed',
  runId: 'run-fixture',
  title: 'Failed Task J',
  objective: 'Objective J',
  state: 'FAILED',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:40.000Z',
}

export const FIXTURE_J_FAILED: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 9,
    activeTasks: [],
  },
  tasks: [TASK_J],
}

// ─── K: COMPLETED ─────────────────────────────────────────────────────────────

const TASK_K: Task = {
  id: 'task-k-completed',
  runId: 'run-fixture',
  title: 'Completed Task K',
  objective: 'Objective K',
  state: 'SUCCEEDED',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:45.000Z',
}

export const FIXTURE_K_COMPLETED: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 10,
    activeTasks: [],
  },
  tasks: [TASK_K],
}

// ─── L: PROVIDER_FALLBACK ─────────────────────────────────────────────────────

const TASK_L: Task = {
  id: 'task-l-provider-fallback',
  runId: 'run-fixture',
  title: 'Provider Fallback Task L',
  objective: 'Objective L',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:50.000Z',
}

export const FIXTURE_L_PROVIDER_FALLBACK: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 11,
    activeTasks: [
      {
        taskId: 'task-l-provider-fallback',
        phase: 'WORKER_RUNNING',
        workerIdentity: 'fcc',
        route: {
          transport: 'GATEWAY',
          active: true,
          gatewayId: 'omniroute-local',
          requestedProvider: 'anthropic',
          requestedModel: 'claude-3-5-sonnet',
          actualProvider: 'openai',
          actualModel: 'gpt-4o',
          providerFallbackOccurred: true,
          transportFallbackOccurred: false,
        },
      },
    ],
  },
  tasks: [TASK_L],
}

// ─── M: TRANSPORT_FALLBACK ───────────────────────────────────────────────────

const TASK_M: Task = {
  id: 'task-m-transport-fallback',
  runId: 'run-fixture',
  title: 'Transport Fallback Task M',
  objective: 'Objective M',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:55.000Z',
}

export const FIXTURE_M_TRANSPORT_FALLBACK: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 12,
    activeTasks: [
      {
        taskId: 'task-m-transport-fallback',
        phase: 'WORKER_RUNNING',
        workerIdentity: 'fcc',
        route: {
          transport: 'DIRECT',
          active: true,
          gatewayId: 'omniroute-local',
          requestedProvider: 'openai',
          requestedModel: 'gpt-4o',
          actualProvider: 'direct',
          actualModel: 'default-model',
          providerFallbackOccurred: false,
          transportFallbackOccurred: true,
        },
      },
    ],
  },
  tasks: [TASK_M],
}

// ─── N: UNKNOWN_PROVIDER_MODEL ───────────────────────────────────────────────

const TASK_N: Task = {
  id: 'task-n-unknown-model',
  runId: 'run-fixture',
  title: 'Unknown Provider Model Task N',
  objective: 'Objective N',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:01:00.000Z',
}

export const FIXTURE_N_UNKNOWN_PROVIDER_MODEL: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 13,
    activeTasks: [
      {
        taskId: 'task-n-unknown-model',
        phase: 'WORKER_RUNNING',
        workerIdentity: 'codex',
        route: {
          transport: 'GATEWAY',
          active: true,
          gatewayId: 'omniroute-local',
          requestedProvider: 'mystery-corp',
          requestedModel: 'mystery-70b',
          actualProvider: null,
          actualModel: null,
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
      },
    ],
  },
  tasks: [TASK_N],
}

// ─── O: MULTIPLE_CONCURRENT_TASKS ─────────────────────────────────────────────

const TASK_O_1: Task = {
  id: 'task-o-1',
  runId: 'run-fixture',
  title: 'Concurrent Task 1 (Codex Direct)',
  objective: 'Objective O-1',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:01:05.000Z',
}

const TASK_O_2: Task = {
  id: 'task-o-2',
  runId: 'run-fixture',
  title: 'Concurrent Task 2 (FCC Gateway)',
  objective: 'Objective O-2',
  state: 'RUNNING',
  dependencies: [],
  acceptanceCriteria: [],
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:01:05.000Z',
}

export const FIXTURE_O_MULTIPLE_CONCURRENT_TASKS: DeriveWorldStateInput = {
  projection: {
    schemaVersion: '1.0.0',
    epoch: FIXTURE_EPOCH,
    revision: 14,
    activeTasks: [
      {
        taskId: 'task-o-1',
        phase: 'WORKER_RUNNING',
        workerIdentity: 'codex',
        route: {
          transport: 'DIRECT',
          active: true,
          actualProvider: 'direct',
          actualModel: 'codex-cli',
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
      },
      {
        taskId: 'task-o-2',
        phase: 'WORKER_RUNNING',
        workerIdentity: 'fcc',
        route: {
          transport: 'GATEWAY',
          active: true,
          gatewayId: 'omniroute-local',
          requestedProvider: 'openai',
          requestedModel: 'gpt-4o',
          actualProvider: 'openai',
          actualModel: 'gpt-4o',
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        },
      },
    ],
  },
  tasks: [TASK_O_1, TASK_O_2],
}
