/**
 * Gravitas Deterministic Artifact Custody Fixture Matrix (Wave 12H)
 *
 * Implements 21 pure, immutable deterministic test fixtures A through U:
 * A: ARTIFACT_AT_PRODUCER
 * B: REVIEW_HANDOFF_BLOCKED
 * C: REVIEW_HANDOFF_READY
 * D: ARTIFACT_REVIEW_INBOX
 * E: REVIEW_IN_PROGRESS
 * F: REVIEW_PASSED
 * G: REVIEW_CHANGES_REQUIRED
 * H: INTEGRATION_READY
 * I: INTEGRATION_PREPARING
 * J: INTEGRATION_PREPARED
 * K: INTEGRATION_CONFLICT
 * L: WAITING_HUMAN_APPROVAL
 * M: HUMAN_APPROVED
 * N: HUMAN_REJECTED
 * O: COMPLETED_NOT_MERGED
 * P: MULTI_ARTIFACT_CONCURRENT
 * Q: REVISION_SUPERSEDES_CUSTODY_PATH
 * R: FRESH_LOAD_REVIEW_BENCH
 * S: FRESH_LOAD_APPROVAL_PLINTH
 * T: EVENT_HISTORY_EVICTED
 * U: UNKNOWN_ARTIFACT_NEUTRAL_HOLD
 */

import type { Task } from '@gravitas/core'
import type { RuntimeProjectionSnapshot } from '../../api/types.js'
import { deriveWorldState, type WorldState } from './worldState.js'
import { deriveArtifactCustody, type ArtifactCustodyState } from '../custody/artifactCustody.js'

export const CUSTODY_FIXTURE_EPOCH = 'epoch_custody_wave12h'

export interface CustodyFixtureDefinition {
  readonly name: string
  readonly projection: RuntimeProjectionSnapshot
  readonly tasks: readonly Task[]
  readonly worldState: WorldState
  readonly custodyStates: readonly ArtifactCustodyState[]
}

function buildCustodyFixture(
  name: string,
  revision: number,
  tasks: Array<Partial<Task> & Record<string, any>>,
  activeTasks: any[] = [],
  handoffs: any[] = [],
  artifacts: any[] = []
): CustodyFixtureDefinition {
  const normalizedTasks = tasks.map((t) => ({
    ...t,
    state: (t.state ?? t.status ?? 'pending') as any,
    status: (t.status ?? t.state ?? 'pending') as any,
  }))

  const projection: RuntimeProjectionSnapshot = {
    schemaVersion: '1.0.0',
    epoch: CUSTODY_FIXTURE_EPOCH,
    revision,
    activeTasks,
    handoffs,
    artifacts,
  }

  const worldState = deriveWorldState({
    projection,
    tasks: normalizedTasks as any,
  })

  const custodyStates = deriveArtifactCustody({
    projection,
    tasks: normalizedTasks as any,
    worldState,
  })

  return {
    name,
    projection,
    tasks: normalizedTasks as any,
    worldState,
    custodyStates,
  }
}

// ── A: ARTIFACT_AT_PRODUCER ─────────────────────────────────────────────────
export const FIXTURE_A_ARTIFACT_AT_PRODUCER = buildCustodyFixture(
  'A_ARTIFACT_AT_PRODUCER',
  10,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      title: 'Build UI Component',
      status: 'completed',
      metadata: { roleId: 'frontend_developer', harnessId: 'codex' },
      result: {
        artifactRef: {
          id: 'artifact-ui-bundle',
          uri: 'git://sha-ui-1',
          name: 'ui-bundle.js',
          type: 'bundle',
        },
      },
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      sourceHarnessId: 'codex',
      commitSha: 'c0ffee1',
      verificationState: 'UNVERIFIED',
      reviewState: 'PENDING',
      integrationState: 'NOT_READY',
      currentCustody: 'PRODUCER_DESK',
    },
  ]
)

// ── B: REVIEW_HANDOFF_BLOCKED ───────────────────────────────────────────────
export const FIXTURE_B_REVIEW_HANDOFF_BLOCKED = buildCustodyFixture(
  'B_REVIEW_HANDOFF_BLOCKED',
  11,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      title: 'Build UI Component',
      status: 'running',
      metadata: { roleId: 'frontend_developer' },
    },
  ],
  [],
  [
    {
      handoffId: 'handoff-fe-review',
      runId: 'run-w12h',
      sourceTaskId: 'task-fe-1',
      targetTaskId: 'task-rev-1',
      sourceRoleId: 'frontend_developer',
      targetRoleId: 'independent_reviewer',
      kind: 'REVIEW',
      state: 'BLOCKED',
      reasonCode: 'REVIEW_BLOCKED',
    },
  ],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'PRODUCER_DESK',
      verificationState: 'UNVERIFIED',
      reviewState: 'PENDING',
      integrationState: 'NOT_READY',
    },
  ]
)

// ── C: REVIEW_HANDOFF_READY ────────────────────────────────────────────────
export const FIXTURE_C_REVIEW_HANDOFF_READY = buildCustodyFixture(
  'C_REVIEW_HANDOFF_READY',
  12,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'frontend_developer' },
      result: {
        artifactRef: {
          id: 'artifact-ui-bundle',
          uri: 'git://sha-ui-1',
          name: 'ui-bundle.js',
          type: 'bundle',
        },
      },
    },
  ],
  [],
  [
    {
      handoffId: 'handoff-fe-review',
      runId: 'run-w12h',
      sourceTaskId: 'task-fe-1',
      targetTaskId: 'task-rev-1',
      sourceRoleId: 'frontend_developer',
      targetRoleId: 'independent_reviewer',
      kind: 'REVIEW',
      state: 'READY',
      reasonCode: 'REVIEW_PENDING',
      artifactRef: {
        id: 'artifact-ui-bundle',
        uri: 'git://sha-ui-1',
        name: 'ui-bundle.js',
        type: 'bundle',
      },
    },
  ],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'REVIEW_INBOX',
      verificationState: 'VERIFIED',
      reviewState: 'PENDING',
      integrationState: 'NOT_READY',
    },
  ]
)

// ── D: ARTIFACT_REVIEW_INBOX ───────────────────────────────────────────────
export const FIXTURE_D_ARTIFACT_REVIEW_INBOX = buildCustodyFixture(
  'D_ARTIFACT_REVIEW_INBOX',
  13,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'frontend_developer' },
    },
    {
      id: 'task-rev-1',
      runId: 'run-w12h',
      status: 'pending',
      metadata: { roleId: 'independent_reviewer' },
    },
  ],
  [],
  [
    {
      handoffId: 'handoff-fe-review',
      runId: 'run-w12h',
      sourceTaskId: 'task-fe-1',
      targetTaskId: 'task-rev-1',
      sourceRoleId: 'frontend_developer',
      targetRoleId: 'independent_reviewer',
      kind: 'REVIEW',
      state: 'READY',
      reasonCode: 'REVIEW_PENDING',
      artifactRef: { id: 'artifact-ui-bundle' },
    },
  ],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'REVIEW_INBOX',
      verificationState: 'VERIFIED',
      reviewState: 'PENDING',
      integrationState: 'NOT_READY',
    },
  ]
)

// ── E: REVIEW_IN_PROGRESS ──────────────────────────────────────────────────
export const FIXTURE_E_REVIEW_IN_PROGRESS = buildCustodyFixture(
  'E_REVIEW_IN_PROGRESS',
  14,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'frontend_developer' },
    },
    {
      id: 'task-rev-1',
      runId: 'run-w12h',
      status: 'running',
      metadata: { roleId: 'independent_reviewer' },
    },
  ],
  [
    {
      taskId: 'task-rev-1',
      status: 'running',
      role: 'independent_reviewer',
      runtimePhase: 'WORKER_RUNNING',
    },
  ],
  [
    {
      handoffId: 'handoff-fe-review',
      runId: 'run-w12h',
      sourceTaskId: 'task-fe-1',
      targetTaskId: 'task-rev-1',
      sourceRoleId: 'frontend_developer',
      targetRoleId: 'independent_reviewer',
      kind: 'REVIEW',
      state: 'IN_PROGRESS',
      reasonCode: 'REVIEW_REQUIRED',
      artifactRef: { id: 'artifact-ui-bundle' },
    },
  ],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'REVIEW_BENCH',
      verificationState: 'VERIFIED',
      reviewState: 'IN_REVIEW',
      integrationState: 'NOT_READY',
    },
  ]
)

// ── F: REVIEW_PASSED ───────────────────────────────────────────────────────
export const FIXTURE_F_REVIEW_PASSED = buildCustodyFixture(
  'F_REVIEW_PASSED',
  15,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'frontend_developer' },
    },
  ],
  [],
  [
    {
      handoffId: 'handoff-fe-review',
      runId: 'run-w12h',
      sourceTaskId: 'task-fe-1',
      targetTaskId: 'task-rev-1',
      sourceRoleId: 'frontend_developer',
      targetRoleId: 'independent_reviewer',
      kind: 'REVIEW',
      state: 'SATISFIED',
      reasonCode: 'REVIEW_PASSED',
      artifactRef: { id: 'artifact-ui-bundle' },
    },
  ],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'INTEGRATION_INBOX',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'READY',
    },
  ]
)

// ── G: REVIEW_CHANGES_REQUIRED ─────────────────────────────────────────────
export const FIXTURE_G_REVIEW_CHANGES_REQUIRED = buildCustodyFixture(
  'G_REVIEW_CHANGES_REQUIRED',
  16,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'frontend_developer' },
    },
  ],
  [],
  [
    {
      handoffId: 'handoff-fe-review',
      runId: 'run-w12h',
      sourceTaskId: 'task-fe-1',
      targetTaskId: 'task-rev-1',
      sourceRoleId: 'frontend_developer',
      targetRoleId: 'independent_reviewer',
      kind: 'REVIEW',
      state: 'FAILED',
      reasonCode: 'REVIEW_CHANGES_REQUIRED',
      artifactRef: { id: 'artifact-ui-bundle' },
    },
  ],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'FAILURE_HOLD',
      verificationState: 'VERIFIED',
      reviewState: 'CHANGES_REQUIRED',
      integrationState: 'NOT_READY',
      reasonCode: 'REVIEW_CHANGES_REQUIRED',
    },
  ]
)

// ── H: INTEGRATION_READY ───────────────────────────────────────────────────
export const FIXTURE_H_INTEGRATION_READY = buildCustodyFixture(
  'H_INTEGRATION_READY',
  17,
  [
    {
      id: 'task-int-1',
      runId: 'run-w12h',
      status: 'pending',
      metadata: { roleId: 'integration_engineer' },
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-int-1',
      sourceRoleId: 'integration_engineer',
      currentCustody: 'INTEGRATION_INBOX',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'READY',
    },
  ]
)

// ── I: INTEGRATION_PREPARING ───────────────────────────────────────────────
export const FIXTURE_I_INTEGRATION_PREPARING = buildCustodyFixture(
  'I_INTEGRATION_PREPARING',
  18,
  [
    {
      id: 'task-int-1',
      runId: 'run-w12h',
      status: 'running',
      metadata: { roleId: 'integration_engineer' },
    },
  ],
  [
    {
      taskId: 'task-int-1',
      status: 'running',
      role: 'integration_engineer',
      runtimePhase: 'WORKER_RUNNING',
    },
  ],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-int-1',
      sourceRoleId: 'integration_engineer',
      currentCustody: 'INTEGRATION_BENCH',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'PREPARING',
    },
  ]
)

// ── J: INTEGRATION_PREPARED ────────────────────────────────────────────────
export const FIXTURE_J_INTEGRATION_PREPARED = buildCustodyFixture(
  'J_INTEGRATION_PREPARED',
  19,
  [
    {
      id: 'task-int-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'integration_engineer' },
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-int-1',
      sourceRoleId: 'integration_engineer',
      currentCustody: 'APPROVAL_PLINTH',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'PREPARED',
      requiresHumanApproval: true,
    },
  ]
)

// ── K: INTEGRATION_CONFLICT ────────────────────────────────────────────────
export const FIXTURE_K_INTEGRATION_CONFLICT = buildCustodyFixture(
  'K_INTEGRATION_CONFLICT',
  20,
  [
    {
      id: 'task-int-1',
      runId: 'run-w12h',
      status: 'failed',
      metadata: { roleId: 'integration_engineer' },
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-int-1',
      sourceRoleId: 'integration_engineer',
      currentCustody: 'FAILURE_HOLD',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'CONFLICT',
      reasonCode: 'GIT_MERGE_CONFLICT',
    },
  ]
)

// ── L: WAITING_HUMAN_APPROVAL ──────────────────────────────────────────────
export const FIXTURE_L_WAITING_HUMAN_APPROVAL = buildCustodyFixture(
  'L_WAITING_HUMAN_APPROVAL',
  21,
  [
    {
      id: 'task-approval-1',
      runId: 'run-w12h',
      status: 'waiting_approval',
    },
  ],
  [
    {
      taskId: 'task-approval-1',
      status: 'waiting_approval',
      runtimePhase: 'WAITING_APPROVAL',
    },
  ],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-approval-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'APPROVAL_PLINTH',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'PREPARED',
      requiresHumanApproval: true,
    },
  ]
)

// ── M: HUMAN_APPROVED ──────────────────────────────────────────────────────
export const FIXTURE_M_HUMAN_APPROVED = buildCustodyFixture(
  'M_HUMAN_APPROVED',
  22,
  [
    {
      id: 'task-approval-1',
      runId: 'run-w12h',
      status: 'completed',
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-approval-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'COMPLETED_TRAY',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'INTEGRATED',
      requiresHumanApproval: false,
    },
  ]
)

// ── N: HUMAN_REJECTED ──────────────────────────────────────────────────────
export const FIXTURE_N_HUMAN_REJECTED = buildCustodyFixture(
  'N_HUMAN_REJECTED',
  23,
  [
    {
      id: 'task-approval-1',
      runId: 'run-w12h',
      status: 'failed',
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-approval-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'FAILURE_HOLD',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'PREPARED',
      requiresHumanApproval: false,
      reasonCode: 'APPROVAL_REJECTED',
    },
  ]
)

// ── O: COMPLETED_NOT_MERGED ────────────────────────────────────────────────
export const FIXTURE_O_COMPLETED_NOT_MERGED = buildCustodyFixture(
  'O_COMPLETED_NOT_MERGED',
  24,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'frontend_developer' },
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'COMPLETED_TRAY',
      verificationState: 'VERIFIED',
      reviewState: 'NOT_REQUIRED',
      integrationState: 'NOT_READY',
      requiresHumanApproval: false,
    },
  ]
)

// ── P: MULTI_ARTIFACT_CONCURRENT ───────────────────────────────────────────
export const FIXTURE_P_MULTI_ARTIFACT_CONCURRENT = buildCustodyFixture(
  'P_MULTI_ARTIFACT_CONCURRENT',
  25,
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'frontend_developer' },
    },
    {
      id: 'task-be-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'backend_developer' },
    },
    {
      id: 'task-int-1',
      runId: 'run-w12h',
      status: 'completed',
      metadata: { roleId: 'integration_engineer' },
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-frontend-ui',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'REVIEW_INBOX',
      verificationState: 'VERIFIED',
      reviewState: 'PENDING',
      integrationState: 'NOT_READY',
    },
    {
      artifactId: 'artifact-backend-api',
      sourceTaskId: 'task-be-1',
      sourceRoleId: 'backend_developer',
      currentCustody: 'INTEGRATION_BENCH',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'PREPARING',
    },
    {
      artifactId: 'artifact-core-patch',
      sourceTaskId: 'task-int-1',
      sourceRoleId: 'integration_engineer',
      currentCustody: 'APPROVAL_PLINTH',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'PREPARED',
      requiresHumanApproval: true,
    },
  ]
)

// ── Q: REVISION_SUPERSEDES_CUSTODY_PATH ────────────────────────────────────
export const FIXTURE_Q_REVISION_SUPERSEDES_CUSTODY_PATH = buildCustodyFixture(
  'Q_REVISION_SUPERSEDES_CUSTODY_PATH',
  201, // revision changed mid-transit
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'failed',
      metadata: { roleId: 'frontend_developer' },
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'FAILURE_HOLD',
      verificationState: 'FAILED',
      reviewState: 'CHANGES_REQUIRED',
      integrationState: 'NOT_READY',
      reasonCode: 'TEST_SUITE_FAILED',
    },
  ]
)

// ── R: FRESH_LOAD_REVIEW_BENCH ─────────────────────────────────────────────
export const FIXTURE_R_FRESH_LOAD_REVIEW_BENCH = buildCustodyFixture(
  'R_FRESH_LOAD_REVIEW_BENCH',
  50,
  [
    {
      id: 'task-rev-1',
      runId: 'run-w12h',
      status: 'running',
      metadata: { roleId: 'independent_reviewer' },
    },
  ],
  [
    {
      taskId: 'task-rev-1',
      status: 'running',
      role: 'independent_reviewer',
      runtimePhase: 'WORKER_RUNNING',
    },
  ],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-rev-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'REVIEW_BENCH',
      verificationState: 'VERIFIED',
      reviewState: 'IN_REVIEW',
      integrationState: 'NOT_READY',
    },
  ]
)

// ── S: FRESH_LOAD_APPROVAL_PLINTH ──────────────────────────────────────────
export const FIXTURE_S_FRESH_LOAD_APPROVAL_PLINTH = buildCustodyFixture(
  'S_FRESH_LOAD_APPROVAL_PLINTH',
  60,
  [
    {
      id: 'task-app-1',
      runId: 'run-w12h',
      status: 'waiting_approval',
    },
  ],
  [
    {
      taskId: 'task-app-1',
      status: 'waiting_approval',
      runtimePhase: 'WAITING_APPROVAL',
    },
  ],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-app-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'APPROVAL_PLINTH',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'PREPARED',
      requiresHumanApproval: true,
    },
  ]
)

// ── T: EVENT_HISTORY_EVICTED ───────────────────────────────────────────────
export const FIXTURE_T_EVENT_HISTORY_EVICTED = buildCustodyFixture(
  'T_EVENT_HISTORY_EVICTED',
  999, // High revision where events have been purged
  [
    {
      id: 'task-fe-1',
      runId: 'run-w12h',
      status: 'completed',
    },
  ],
  [],
  [],
  [
    {
      artifactId: 'artifact-ui-bundle',
      sourceTaskId: 'task-fe-1',
      sourceRoleId: 'frontend_developer',
      currentCustody: 'COMPLETED_TRAY',
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'INTEGRATED',
    },
  ]
)

// ── U: UNKNOWN_ARTIFACT_NEUTRAL_HOLD ───────────────────────────────────────
export const FIXTURE_U_UNKNOWN_ARTIFACT_NEUTRAL_HOLD = buildCustodyFixture(
  'U_UNKNOWN_ARTIFACT_NEUTRAL_HOLD',
  1,
  [],
  [],
  [],
  [
    {
      artifactId: 'artifact-unknown-ghost',
      sourceTaskId: 'task-nonexistent',
      currentCustody: 'NEUTRAL_HOLD',
      verificationState: 'UNVERIFIED',
      reviewState: 'NOT_REQUIRED',
      integrationState: 'NOT_READY',
    },
  ]
)
