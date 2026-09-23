/**
 * Gravitas Deterministic Locomotion Fixture Matrix (Wave 12G)
 *
 * Implements 18 pure, immutable deterministic test fixtures A through R:
 * A: ALL_IDLE
 * B: FRONTEND_ASSIGNED
 * C: FRONTEND_WALKING
 * D: FRONTEND_WORKING
 * E: BACKEND_ASSIGNED
 * F: REVIEWER_ASSIGNED
 * G: FE_BE_CONCURRENT
 * H: THREE_ROLE_CONCURRENT
 * I: TASK_FAILED_MID_ROUTE
 * J: TASK_COMPLETED_MID_ROUTE
 * K: SNAPSHOT_SUPERSEDES_ROUTE
 * L: FRESH_LOAD_ALREADY_RUNNING
 * M: REDUCED_MOTION
 * N: UNREACHABLE_DESTINATION
 * O: REVIEW_HANDOFF_READY
 * P: WAITING_APPROVAL_NO_OPERATOR
 * Q: HARNESS_SWAP_CODEX_TO_FCC
 * R: UNKNOWN_ROLE_NEUTRAL_HOLD
 */

import type { Task } from '@gravitas/core'
import { deriveWorldState, type WorldState } from './worldState.js'

export const LOCOMOTION_FIXTURE_EPOCH = 'epoch_locomotion_wave12g'

function createBaseWorldState(options: {
  revision: number
  tasks: Array<Partial<Task> & Record<string, any>>
  activeTasks?: any[]
  handoffs?: any[]
}): WorldState {
  return deriveWorldState({
    projection: {
      schemaVersion: '1.0.0',
      epoch: LOCOMOTION_FIXTURE_EPOCH,
      revision: options.revision,
      activeTasks: options.activeTasks ?? [],
      handoffs: options.handoffs ?? [],
    },
    tasks: options.tasks as any,
  })
}

// ── A: ALL_IDLE ─────────────────────────────────────────────────────────────
export const FIXTURE_A_ALL_IDLE: WorldState = createBaseWorldState({
  revision: 1,
  tasks: [],
})

// ── B: FRONTEND_ASSIGNED ───────────────────────────────────────────────────
export const FIXTURE_B_FRONTEND_ASSIGNED: WorldState = createBaseWorldState({
  revision: 2,
  tasks: [
    {
      id: 'task-fe-prep',
      runId: 'run-w12g',
      title: 'Implement Navigation UI',
      objective: 'Build responsive navigation',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:01.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-fe-prep',
      harnessId: 'codex-worker',
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'engineering-workstation-01',
      phase: 'PREPARING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
})

// ── C: FRONTEND_WALKING ────────────────────────────────────────────────────
export const FIXTURE_C_FRONTEND_WALKING: WorldState = createBaseWorldState({
  revision: 3,
  tasks: [
    {
      id: 'task-fe-walk',
      runId: 'run-w12g',
      title: 'Implement Navigation UI',
      objective: 'Transit to workstation',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:02.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-fe-walk',
      harnessId: 'codex-worker',
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'engineering-workstation-01',
      phase: 'PREPARING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
})

// ── D: FRONTEND_WORKING ────────────────────────────────────────────────────
export const FIXTURE_D_FRONTEND_WORKING: WorldState = createBaseWorldState({
  revision: 4,
  tasks: [
    {
      id: 'task-fe-work',
      runId: 'run-w12g',
      title: 'Implement Navigation UI',
      objective: 'Active coding at workstation',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-fe-work',
      harnessId: 'codex-worker',
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'engineering-workstation-01',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
})

// ── E: BACKEND_ASSIGNED ────────────────────────────────────────────────────
export const FIXTURE_E_BACKEND_ASSIGNED: WorldState = createBaseWorldState({
  revision: 5,
  tasks: [
    {
      id: 'task-be-work',
      runId: 'run-w12g',
      title: 'Implement Graph API',
      objective: 'Active coding at backend workstation',
      state: 'RUNNING',
      role: 'role:engineering:backend-engineer',
      assignedStationId: 'engineering-workstation-02',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-be-work',
      harnessId: 'fcc-worker',
      roleId: 'role:engineering:backend-engineer',
      stationId: 'engineering-workstation-02',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
})

// ── F: REVIEWER_ASSIGNED ───────────────────────────────────────────────────
export const FIXTURE_F_REVIEWER_ASSIGNED: WorldState = createBaseWorldState({
  revision: 6,
  tasks: [
    {
      id: 'task-rev-work',
      runId: 'run-w12g',
      title: 'Review Frontend & Backend Architecture',
      objective: 'Audit independence and contracts',
      state: 'RUNNING',
      role: 'role:quality:independent-reviewer',
      assignedStationId: 'verification-lab-console',
      dependencies: [{ taskId: 'task-fe-work' }],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:10.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-rev-work',
      harnessId: 'codex-worker',
      roleId: 'role:quality:independent-reviewer',
      stationId: 'verification-lab-console',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:10.000Z',
    },
  ],
  handoffs: [
    {
      handoffId: 'h-fe-to-rev',
      kind: 'REVIEW',
      sourceTaskId: 'task-fe-work',
      targetTaskId: 'task-rev-work',
      sourceRoleId: 'role:engineering:frontend-engineer',
      targetRoleId: 'role:quality:independent-reviewer',
      state: 'IN_PROGRESS',
      reasonCode: 'REVIEW_IN_PROGRESS',
    },
  ],
})

// ── G: FE_BE_CONCURRENT ────────────────────────────────────────────────────
export const FIXTURE_G_FE_BE_CONCURRENT: WorldState = createBaseWorldState({
  revision: 7,
  tasks: [
    {
      id: 't-fe-conc',
      runId: 'run-w12g',
      title: 'Frontend Work',
      objective: 'FE build',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
    {
      id: 't-be-conc',
      runId: 'run-w12g',
      title: 'Backend Work',
      objective: 'BE build',
      state: 'RUNNING',
      role: 'role:engineering:backend-engineer',
      assignedStationId: 'engineering-workstation-02',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 't-fe-conc',
      harnessId: 'codex-worker',
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'engineering-workstation-01',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
    {
      taskId: 't-be-conc',
      harnessId: 'fcc-worker',
      roleId: 'role:engineering:backend-engineer',
      stationId: 'engineering-workstation-02',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
})

// ── H: THREE_ROLE_CONCURRENT ───────────────────────────────────────────────
export const FIXTURE_H_THREE_ROLE_CONCURRENT: WorldState = createBaseWorldState({
  revision: 8,
  tasks: [
    {
      id: 't-fe-3',
      runId: 'run-w12g',
      title: 'Frontend Active',
      objective: 'FE task',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
    {
      id: 't-be-3',
      runId: 'run-w12g',
      title: 'Backend Active',
      objective: 'BE task',
      state: 'RUNNING',
      role: 'role:engineering:backend-engineer',
      assignedStationId: 'engineering-workstation-02',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
    {
      id: 't-rev-3',
      runId: 'run-w12g',
      title: 'Reviewer Active',
      objective: 'Review task',
      state: 'RUNNING',
      role: 'role:quality:independent-reviewer',
      assignedStationId: 'verification-lab-console',
      dependencies: [{ taskId: 't-fe-3' }],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 't-fe-3',
      harnessId: 'codex-worker',
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'engineering-workstation-01',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
    {
      taskId: 't-be-3',
      harnessId: 'fcc-worker',
      roleId: 'role:engineering:backend-engineer',
      stationId: 'engineering-workstation-02',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
    {
      taskId: 't-rev-3',
      harnessId: 'codex-worker',
      roleId: 'role:quality:independent-reviewer',
      stationId: 'verification-lab-console',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:05.000Z',
    },
  ],
})

// ── I: TASK_FAILED_MID_ROUTE ───────────────────────────────────────────────
export const FIXTURE_I_TASK_FAILED_MID_ROUTE: WorldState = createBaseWorldState({
  revision: 9,
  tasks: [
    {
      id: 'task-fe-failed',
      runId: 'run-w12g',
      title: 'Frontend Aborted',
      objective: 'Terminated task',
      state: 'FAILED',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:08.000Z',
    },
  ],
  activeTasks: [],
})

// ── J: TASK_COMPLETED_MID_ROUTE ───────────────────────────────────────────
export const FIXTURE_J_TASK_COMPLETED_MID_ROUTE: WorldState = createBaseWorldState({
  revision: 10,
  tasks: [
    {
      id: 'task-fe-completed',
      runId: 'run-w12g',
      title: 'Frontend Completed',
      objective: 'Succeeded task',
      state: 'SUCCEEDED',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:15.000Z',
    },
  ],
  activeTasks: [],
})

// ── K: SNAPSHOT_SUPERSEDES_ROUTE ───────────────────────────────────────────
export const FIXTURE_K_SNAPSHOT_SUPERSEDES_ROUTE: WorldState = createBaseWorldState({
  revision: 102,
  tasks: [
    {
      id: 'task-fe-superseded',
      runId: 'run-w12g',
      title: 'Superseded Task',
      objective: 'New authoritative revision',
      state: 'FAILED',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:20.000Z',
    },
  ],
  activeTasks: [],
})

// ── L: FRESH_LOAD_ALREADY_RUNNING ──────────────────────────────────────────
export const FIXTURE_L_FRESH_LOAD_ALREADY_RUNNING: WorldState = createBaseWorldState({
  revision: 55,
  tasks: [
    {
      id: 'task-fresh-running',
      runId: 'run-w12g',
      title: 'Already Running Task on Fresh Page Load',
      objective: 'In-progress task',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:30.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-fresh-running',
      harnessId: 'codex-worker',
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'engineering-workstation-01',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:10.000Z',
    },
  ],
})

// ── M: REDUCED_MOTION ──────────────────────────────────────────────────────
export const FIXTURE_M_REDUCED_MOTION: WorldState = createBaseWorldState({
  revision: 12,
  tasks: [
    {
      id: 'task-fe-reduced',
      runId: 'run-w12g',
      title: 'Task under Reduced Motion',
      objective: 'Instant snap',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:01.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-fe-reduced',
      harnessId: 'codex-worker',
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'engineering-workstation-01',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
})

// ── N: UNREACHABLE_DESTINATION ─────────────────────────────────────────────
export const FIXTURE_N_UNREACHABLE_DESTINATION: WorldState = createBaseWorldState({
  revision: 13,
  tasks: [
    {
      id: 'task-unreachable',
      runId: 'run-w12g',
      title: 'Task with Non-Existent Station',
      objective: 'Safe failure proof',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'non-existent-floating-island-station',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:01.000Z',
    },
  ],
})

// ── O: REVIEW_HANDOFF_READY ────────────────────────────────────────────────
export const FIXTURE_O_REVIEW_HANDOFF_READY: WorldState = createBaseWorldState({
  revision: 14,
  tasks: [
    {
      id: 'task-fe-done',
      runId: 'run-w12g',
      title: 'Frontend Complete',
      objective: 'Produce artifact for reviewer',
      state: 'SUCCEEDED',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:10.000Z',
    },
  ],
  handoffs: [
    {
      handoffId: 'h-fe-rev-ready',
      kind: 'REVIEW',
      sourceTaskId: 'task-fe-done',
      targetTaskId: 'task-rev-pending',
      sourceRoleId: 'role:engineering:frontend-engineer',
      targetRoleId: 'role:quality:independent-reviewer',
      state: 'READY',
      reasonCode: 'REVIEW_REQUIRED',
    },
  ],
})

// ── P: WAITING_APPROVAL_NO_OPERATOR ────────────────────────────────────────
export const FIXTURE_P_WAITING_APPROVAL_NO_OPERATOR: WorldState = createBaseWorldState({
  revision: 15,
  tasks: [
    {
      id: 'task-waiting-approval',
      runId: 'run-w12g',
      title: 'Verified Release Candidate',
      objective: 'Awaiting sovereign human approval at plinth',
      state: 'WAITING_APPROVAL',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'approval-plinth',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:20.000Z',
    },
  ],
  activeTasks: [],
})

// ── Q: HARNESS_SWAP_CODEX_TO_FCC ───────────────────────────────────────────
export const FIXTURE_Q_HARNESS_SWAP_CODEX_TO_FCC: WorldState = createBaseWorldState({
  revision: 16,
  tasks: [
    {
      id: 'task-fe-fcc-swap',
      runId: 'run-w12g',
      title: 'Frontend Task with FCC Harness',
      objective: 'Harness decoupling proof: same role & station, different harness',
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer',
      assignedStationId: 'engineering-workstation-01',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-fe-fcc-swap',
      harnessId: 'fcc-worker', // Swapped harness for Frontend Engineer role
      roleId: 'role:engineering:frontend-engineer',
      stationId: 'engineering-workstation-01',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
})

// ── R: UNKNOWN_ROLE_NEUTRAL_HOLD ───────────────────────────────────────────
export const FIXTURE_R_UNKNOWN_ROLE_NEUTRAL_HOLD: WorldState = createBaseWorldState({
  revision: 17,
  tasks: [
    {
      id: 'task-unknown-role',
      runId: 'run-w12g',
      title: 'Dynamic Agent with Unregistered Role',
      objective: 'Neutral hold: must not guess another employee station',
      state: 'RUNNING',
      role: 'role:custom:external-contractor' as any,
      assignedStationId: 'unknown-remote-desk',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:05.000Z',
    },
  ],
  activeTasks: [
    {
      taskId: 'task-unknown-role',
      harnessId: 'generic-worker',
      roleId: 'role:custom:external-contractor',
      stationId: 'unknown-remote-desk',
      phase: 'WORKER_RUNNING',
      startedAt: '2026-09-23T10:00:00.000Z',
    },
  ],
})
