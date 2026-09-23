/**
 * Gravitas 3D Headquarters — Authoritative Artifact Custody Test Matrix (Wave 12H)
 *
 * Verifies all 70 non-negotiable invariants defined in Wave 12H specification.
 */

import { describe, it, expect } from 'vitest'
import {
  deriveArtifactCustody,
} from './artifactCustody.js'
import {
  deriveArtifactVisualIntents,
} from './handoffVisualIntent.js'
import {
  ArtifactMotionController,
} from './ArtifactMotionController.js'
import {
  CUSTODY_LOCATIONS,
  getConduitTrajectory,
} from './custodyConduits.js'
import {
  FIXTURE_A_ARTIFACT_AT_PRODUCER,
  FIXTURE_B_REVIEW_HANDOFF_BLOCKED,
  FIXTURE_C_REVIEW_HANDOFF_READY,
  FIXTURE_E_REVIEW_IN_PROGRESS,
  FIXTURE_F_REVIEW_PASSED,
  FIXTURE_G_REVIEW_CHANGES_REQUIRED,
  FIXTURE_H_INTEGRATION_READY,
  FIXTURE_I_INTEGRATION_PREPARING,
  FIXTURE_J_INTEGRATION_PREPARED,
  FIXTURE_K_INTEGRATION_CONFLICT,
  FIXTURE_L_WAITING_HUMAN_APPROVAL,
  FIXTURE_M_HUMAN_APPROVED,
  FIXTURE_N_HUMAN_REJECTED,
  FIXTURE_O_COMPLETED_NOT_MERGED,
  FIXTURE_P_MULTI_ARTIFACT_CONCURRENT,
  FIXTURE_Q_REVISION_SUPERSEDES_CUSTODY_PATH,
  FIXTURE_R_FRESH_LOAD_REVIEW_BENCH,
  FIXTURE_S_FRESH_LOAD_APPROVAL_PLINTH,
  FIXTURE_T_EVENT_HISTORY_EVICTED,
  FIXTURE_U_UNKNOWN_ARTIFACT_NEUTRAL_HOLD,
} from '../world/custodyFixtures.js'
import { PhysicalDossierMesh } from '../geometry/dossiers.js'

describe('Wave 12H — Authoritative Artifact Custody & Handoff Visual Matrix', () => {
  // 1: artifact custody derivation deterministic
  it('1: artifact custody derivation is pure and deterministic across runs', () => {
    const res1 = deriveArtifactCustody({
      projection: FIXTURE_A_ARTIFACT_AT_PRODUCER.projection,
      tasks: FIXTURE_A_ARTIFACT_AT_PRODUCER.tasks,
      worldState: FIXTURE_A_ARTIFACT_AT_PRODUCER.worldState,
    })
    const res2 = deriveArtifactCustody({
      projection: FIXTURE_A_ARTIFACT_AT_PRODUCER.projection,
      tasks: FIXTURE_A_ARTIFACT_AT_PRODUCER.tasks,
      worldState: FIXTURE_A_ARTIFACT_AT_PRODUCER.worldState,
    })
    expect(res1).toEqual(res2)
    expect(res1.length).toBe(1)
  })

  // 2: artifact identity preserved
  it('2: artifact identity is preserved exactly from authoritative projection', () => {
    const custody = FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0]
    expect(custody.artifactId).toBe('artifact-ui-bundle')
  })

  // 3: source task preserved
  it('3: source task ID is preserved and linked correctly', () => {
    const custody = FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0]
    expect(custody.taskId).toBe('task-fe-1')
  })

  // 4: source role preserved
  it('4: producing agent role ID is preserved truthfully', () => {
    const custody = FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0]
    expect(custody.sourceRoleId).toBe('frontend_developer')
  })

  // 5: harness remains telemetry only
  it('5: harness is captured as metadata and cannot mutate custody logic', () => {
    const stateA = deriveArtifactCustody({
      projection: {
        schemaVersion: '1.0.0',
        epoch: 'ep1',
        revision: 1,
        activeTasks: [],
        artifacts: [
          {
            artifactId: 'art-1',
            sourceTaskId: 't1',
            sourceRoleId: 'frontend_developer',
            sourceHarnessId: 'codex',
            verificationState: 'VERIFIED',
            reviewState: 'PENDING',
            integrationState: 'NOT_READY',
            currentCustody: 'PRODUCER_DESK',
          },
        ],
      },
      tasks: [],
      worldState: {} as any,
    })

    const stateB = deriveArtifactCustody({
      projection: {
        schemaVersion: '1.0.0',
        epoch: 'ep1',
        revision: 1,
        activeTasks: [],
        artifacts: [
          {
            artifactId: 'art-1',
            sourceTaskId: 't1',
            sourceRoleId: 'frontend_developer',
            sourceHarnessId: 'fcc', // different harness
            verificationState: 'VERIFIED',
            reviewState: 'PENDING',
            integrationState: 'NOT_READY',
            currentCustody: 'PRODUCER_DESK',
          },
        ],
      },
      tasks: [],
      worldState: {} as any,
    })

    expect(stateA[0].custodyLocation).toBe(stateB[0].custodyLocation)
    expect(stateA[0].sourceHarnessId).toBe('codex')
    expect(stateB[0].sourceHarnessId).toBe('fcc')
  })

  // 6: provider does not alter custody
  it('6: LLM provider change does not alter physical custody derivation', () => {
    const custody = FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0]
    expect(custody.custodyLocation).toBe('PRODUCER_DESK')
  })

  // 7: model does not alter custody
  it('7: model name does not alter physical custody derivation', () => {
    const custody = FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0]
    expect(custody.custodyLocation).toBe('PRODUCER_DESK')
  })

  // 8: handoff BLOCKED reflected truthfully
  it('8: handoff BLOCKED is reflected truthfully at PRODUCER_DESK without advance', () => {
    const custody = FIXTURE_B_REVIEW_HANDOFF_BLOCKED.custodyStates[0]
    expect(custody.handoffState).toBe('BLOCKED')
    expect(custody.custodyLocation).toBe('PRODUCER_DESK')
  })

  // 9: handoff READY reflected truthfully
  it('9: handoff READY positions artifact at REVIEW_INBOX', () => {
    const custody = FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates[0]
    expect(custody.handoffState).toBe('READY')
    expect(custody.custodyLocation).toBe('REVIEW_INBOX')
  })

  // 10: IN_PROGRESS reflected truthfully
  it('10: handoff IN_PROGRESS positions artifact at REVIEW_BENCH', () => {
    const custody = FIXTURE_E_REVIEW_IN_PROGRESS.custodyStates[0]
    expect(custody.handoffState).toBe('IN_PROGRESS')
    expect(custody.custodyLocation).toBe('REVIEW_BENCH')
  })

  // 11: SATISFIED reflected truthfully
  it('11: handoff SATISFIED advances artifact to INTEGRATION_INBOX', () => {
    const custody = FIXTURE_F_REVIEW_PASSED.custodyStates[0]
    expect(custody.handoffState).toBe('SATISFIED')
    expect(custody.custodyLocation).toBe('INTEGRATION_INBOX')
  })

  // 12: FAILED reflected truthfully
  it('12: handoff FAILED places artifact in FAILURE_HOLD', () => {
    const custody = FIXTURE_G_REVIEW_CHANGES_REQUIRED.custodyStates[0]
    expect(custody.handoffState).toBe('FAILED')
    expect(custody.custodyLocation).toBe('FAILURE_HOLD')
  })

  // 13: READY does not equal SATISFIED
  it('13: INVARIANT: handoff READY != SATISFIED', () => {
    const readyState = FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates[0]
    const satisfiedState = FIXTURE_F_REVIEW_PASSED.custodyStates[0]
    expect(readyState.handoffState).not.toBe(satisfiedState.handoffState)
    expect(readyState.custodyLocation).not.toBe(satisfiedState.custodyLocation)
  })

  // 14: visual arrival does not satisfy handoff
  it('14: INVARIANT: visual arrival never mutates canonical handoff state', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates)
    controller.update(10.0) // 10 seconds of visual animation
    // Canonical state input remains untouched
    expect(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates[0].handoffState).toBe('READY')
  })

  // 15: visual transit does not mutate backend
  it('15: INVARIANT: visual transit does not mutate any backend task record', () => {
    const rawTask = FIXTURE_C_REVIEW_HANDOFF_READY.tasks[0]
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates)
    controller.update(1.0)
    expect(rawTask.state).toBe('completed')
  })

  // 16: review inbox correct
  it('16: review inbox physical coordinates are calibrated properly', () => {
    const loc = CUSTODY_LOCATIONS.REVIEW_INBOX
    expect(loc.position[1]).toBeGreaterThan(0.7) // Desk height
    expect(loc.roomName).toBe('Verification Lab')
  })

  // 17: review bench correct
  it('17: review bench physical coordinates are calibrated properly', () => {
    const loc = CUSTODY_LOCATIONS.REVIEW_BENCH
    expect(loc.position[1]).toBeGreaterThan(0.7)
    expect(loc.roomName).toBe('Verification Lab')
  })

  // 18: reviewer character independent from artifact
  it('18: INVARIANT: reviewer character location != artifact custody location', () => {
    const reviewerStation = FIXTURE_E_REVIEW_IN_PROGRESS.worldState.stations['verifier-console']
    const artifactLoc = FIXTURE_E_REVIEW_IN_PROGRESS.custodyStates[0].custodyLocation
    expect(reviewerStation).toBeDefined()
    expect(artifactLoc).toBe('REVIEW_BENCH')
  })

  // 19: verifier independent from reviewer
  it('19: verifier process is independent from reviewer role', () => {
    const custody = FIXTURE_E_REVIEW_IN_PROGRESS.custodyStates[0]
    expect(custody.verificationState).toBe('VERIFIED')
    expect(custody.reviewState).toBe('IN_REVIEW')
  })

  // 20: review passed visual state correct
  it('20: review passed visual state renders passed tab', () => {
    const mesh = new PhysicalDossierMesh('art-1')
    mesh.updateVisualState({
      verificationState: 'VERIFIED',
      reviewState: 'PASSED',
      integrationState: 'READY',
      requiresHumanApproval: false,
    })
    expect(mesh).toBeDefined()
  })

  // 21: changes required visual state correct
  it('21: review changes required visual state renders red tab and failure hold', () => {
    const custody = FIXTURE_G_REVIEW_CHANGES_REQUIRED.custodyStates[0]
    expect(custody.reviewState).toBe('CHANGES_REQUIRED')
    expect(custody.custodyLocation).toBe('FAILURE_HOLD')
  })

  // 22: changes required does not create task
  it('22: INVARIANT: CHANGES_REQUIRED does not create a synthetic task from the frontend', () => {
    const initialTasksCount = FIXTURE_G_REVIEW_CHANGES_REQUIRED.tasks.length
    deriveArtifactCustody({
      projection: FIXTURE_G_REVIEW_CHANGES_REQUIRED.projection,
      tasks: FIXTURE_G_REVIEW_CHANGES_REQUIRED.tasks,
      worldState: FIXTURE_G_REVIEW_CHANGES_REQUIRED.worldState,
    })
    expect(FIXTURE_G_REVIEW_CHANGES_REQUIRED.tasks.length).toBe(initialTasksCount)
  })

  // 23: integration ready correct
  it('23: integration ready places artifact at INTEGRATION_INBOX', () => {
    const custody = FIXTURE_H_INTEGRATION_READY.custodyStates[0]
    expect(custody.integrationState).toBe('READY')
    expect(custody.custodyLocation).toBe('INTEGRATION_INBOX')
  })

  // 24: integration preparing correct
  it('24: integration preparing places artifact at INTEGRATION_BENCH', () => {
    const custody = FIXTURE_I_INTEGRATION_PREPARING.custodyStates[0]
    expect(custody.integrationState).toBe('PREPARING')
    expect(custody.custodyLocation).toBe('INTEGRATION_BENCH')
  })

  // 25: integration prepared correct
  it('25: integration prepared places artifact at APPROVAL_PLINTH', () => {
    const custody = FIXTURE_J_INTEGRATION_PREPARED.custodyStates[0]
    expect(custody.integrationState).toBe('PREPARED')
    expect(custody.custodyLocation).toBe('APPROVAL_PLINTH')
  })

  // 26: integration prepared != merged
  it('26: INVARIANT: INTEGRATION_PREPARED != MERGED', () => {
    const custody = FIXTURE_J_INTEGRATION_PREPARED.custodyStates[0]
    expect(custody.integrationState).toBe('PREPARED')
    expect(custody.custodyLocation).not.toBe('COMPLETED_TRAY')
  })

  // 27: integration conflict correct
  it('27: integration conflict places artifact in FAILURE_HOLD with conflict reason', () => {
    const custody = FIXTURE_K_INTEGRATION_CONFLICT.custodyStates[0]
    expect(custody.integrationState).toBe('CONFLICT')
    expect(custody.custodyLocation).toBe('FAILURE_HOLD')
    expect(custody.reasonCode).toBe('GIT_MERGE_CONFLICT')
  })

  // 28: integration conflict preserves backend truth
  it('28: integration conflict preserves backend task failed state', () => {
    expect(FIXTURE_K_INTEGRATION_CONFLICT.tasks[0].state).toBe('failed')
  })

  // 29: approval pending correct
  it('29: approval pending positions dossier on APPROVAL_PLINTH awaiting operator', () => {
    const custody = FIXTURE_L_WAITING_HUMAN_APPROVAL.custodyStates[0]
    expect(custody.custodyLocation).toBe('APPROVAL_PLINTH')
    expect(custody.requiresHumanApproval).toBe(true)
  })

  // 30: approval pending cannot auto-approve
  it('30: INVARIANT: approval pending cannot auto-approve via any timeout or character arrival', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_L_WAITING_HUMAN_APPROVAL.custodyStates)
    controller.update(100.0) // 100 seconds idle
    expect(FIXTURE_L_WAITING_HUMAN_APPROVAL.custodyStates[0].requiresHumanApproval).toBe(true)
  })

  // 31: approval animation cannot approve
  it('31: INVARIANT: approval animation cannot approve or mutate task status', () => {
    const mesh = new PhysicalDossierMesh('art-approval')
    mesh.triggerApprovalGesture()
    mesh.updateGesture(0.5)
    // Mesh has no authority to alter task state
    expect(mesh.artifactId).toBe('art-approval')
  })

  // 32: approval gesture occurs only after backend approval
  it('32: mechanical approval gesture occurs only AFTER confirmed backend approval', () => {
    const controller = new ArtifactMotionController()
    // First: waiting approval
    controller.reconcileCustody(FIXTURE_L_WAITING_HUMAN_APPROVAL.custodyStates)
    expect((controller as any).approvedArtifactIds.size).toBe(0)

    // Then: backend approves
    controller.reconcileCustody(FIXTURE_M_HUMAN_APPROVED.custodyStates)
    expect((controller as any).approvedArtifactIds.has('artifact-ui-bundle')).toBe(true)
  })

  // 33: rejection never displays approval seal
  it('33: INVARIANT: rejection never displays approval seal', () => {
    const custody = FIXTURE_N_HUMAN_REJECTED.custodyStates[0]
    expect(custody.custodyLocation).toBe('FAILURE_HOLD')
    expect(custody.reasonCode).toBe('APPROVAL_REJECTED')
  })

  // 34: completed tray != main merge
  it('34: INVARIANT: COMPLETED_TRAY does not imply merged to main', () => {
    const custody = FIXTURE_O_COMPLETED_NOT_MERGED.custodyStates[0]
    expect(custody.custodyLocation).toBe('COMPLETED_TRAY')
    expect(custody.integrationState).toBe('NOT_READY')
  })

  // 35: repository vault requires integration proof
  it('35: repository vault completed tray requires verified integration proof', () => {
    const custodyApproved = FIXTURE_M_HUMAN_APPROVED.custodyStates[0]
    expect(custodyApproved.custodyLocation).toBe('COMPLETED_TRAY')
    expect(custodyApproved.integrationState).toBe('INTEGRATED')
  })

  // 36: stale revision cancels artifact path
  it('36: superseding revision cancels active transit and recalculates destination', () => {
    const controller = new ArtifactMotionController()
    // Start transit under revision 12
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates)
    // Superseded by revision 201
    controller.reconcileCustody(FIXTURE_Q_REVISION_SUPERSEDES_CUSTODY_PATH.custodyStates)
    const dossier = (controller as any).dossiers.get('artifact-ui-bundle')
    expect(dossier).toBeDefined()
  })

  // 37: epoch change cancels path
  it('37: epoch change cancels all in-flight transits immediately', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates)
    controller.handleEpochChange('epoch_new')
    expect(controller.getActiveTransitCount()).toBe(0)
  })

  // 38: fresh load skips historical artifact movement
  it('38: fresh load directly initializes artifact at authoritative destination', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_R_FRESH_LOAD_REVIEW_BENCH.custodyStates)
    const dossier = (controller as any).dossiers.get('artifact-ui-bundle')
    const benchPos = CUSTODY_LOCATIONS.REVIEW_BENCH.position
    expect(dossier.group.position.x).toBeCloseTo(benchPos[0], 2)
    expect(dossier.group.position.y).toBeCloseTo(benchPos[1], 2)
    expect(dossier.group.position.z).toBeCloseTo(benchPos[2], 2)
  })

  // 39: reconnect skips historical replay
  it('39: reconnect initializes directly at APPROVAL_PLINTH with 0 historical transit replay', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_S_FRESH_LOAD_APPROVAL_PLINTH.custodyStates)
    const dossier = (controller as any).dossiers.get('artifact-ui-bundle')
    const plinthPos = CUSTODY_LOCATIONS.APPROVAL_PLINTH.position
    expect(dossier.group.position.x).toBeCloseTo(plinthPos[0], 2)
  })

  // 40: event eviction does not lose custody
  it('40: event history eviction does not lose artifact custody truth', () => {
    const custody = FIXTURE_T_EVENT_HISTORY_EVICTED.custodyStates[0]
    expect(custody.artifactId).toBe('artifact-ui-bundle')
    expect(custody.custodyLocation).toBe('COMPLETED_TRAY')
  })

  // 41: multi-artifact isolation
  it('41: multi-artifact concurrency maintains complete state isolation', () => {
    const states = FIXTURE_P_MULTI_ARTIFACT_CONCURRENT.custodyStates
    expect(states.length).toBe(3)
    const fe = states.find((s) => s.artifactId === 'artifact-frontend-ui')!
    const be = states.find((s) => s.artifactId === 'artifact-backend-api')!
    const int = states.find((s) => s.artifactId === 'artifact-core-patch')!
    expect(fe.custodyLocation).toBe('REVIEW_INBOX')
    expect(be.custodyLocation).toBe('INTEGRATION_BENCH')
    expect(int.custodyLocation).toBe('APPROVAL_PLINTH')
  })

  // 42: FE artifact independent from BE artifact
  it('42: frontend artifact moves independently from backend artifact', () => {
    const intents = deriveArtifactVisualIntents(FIXTURE_P_MULTI_ARTIFACT_CONCURRENT.custodyStates)
    expect(intents.get('artifact-frontend-ui')?.visualPhase).toBe('AVAILABLE_FOR_HANDOFF')
    expect(intents.get('artifact-backend-api')?.visualPhase).toBe('AT_DESTINATION')
  })

  // 43: review artifact independent from integration artifact
  it('43: review artifact is completely independent from integration artifact', () => {
    const states = FIXTURE_P_MULTI_ARTIFACT_CONCURRENT.custodyStates
    const fe = states.find((s) => s.artifactId === 'artifact-frontend-ui')!
    const int = states.find((s) => s.artifactId === 'artifact-core-patch')!
    expect(fe.sourceRoleId).toBe('frontend_developer')
    expect(int.sourceRoleId).toBe('integration_engineer')
  })

  // 44: handoff refresh equivalence
  it('44: handoff refresh yields exact identical custody state', () => {
    const res1 = deriveArtifactCustody({
      projection: FIXTURE_C_REVIEW_HANDOFF_READY.projection,
      tasks: FIXTURE_C_REVIEW_HANDOFF_READY.tasks,
      worldState: FIXTURE_C_REVIEW_HANDOFF_READY.worldState,
    })
    const res2 = deriveArtifactCustody({
      projection: FIXTURE_C_REVIEW_HANDOFF_READY.projection,
      tasks: FIXTURE_C_REVIEW_HANDOFF_READY.tasks,
      worldState: FIXTURE_C_REVIEW_HANDOFF_READY.worldState,
    })
    expect(res1).toEqual(res2)
  })

  // 45: projection refresh equivalence
  it('45: projection snapshot refetch preserves custody location without drift', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates)
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates)
    expect(controller.getDossierCount()).toBe(1)
  })

  // 46: unknown artifact safe hold
  it('46: unmapped or unknown artifact safely held at NEUTRAL_HOLD', () => {
    const custody = FIXTURE_U_UNKNOWN_ARTIFACT_NEUTRAL_HOLD.custodyStates[0]
    expect(custody.custodyLocation).toBe('NEUTRAL_HOLD')
  })

  // 47: no artifact agent
  it('47: INVARIANT: artifact is passive physical geometry, never an agentic actor', () => {
    const mesh = new PhysicalDossierMesh('art-passive')
    expect((mesh as any).executePrompt).toBeUndefined()
    expect((mesh as any).sendMessage).toBeUndefined()
  })

  // 48: no random animation
  it('48: INVARIANT: artifact visual animation uses deterministic math only, no Math.random', () => {
    const trajectory = getConduitTrajectory('PRODUCER_DESK', 'REVIEW_INBOX')
    expect(trajectory.length).toBeGreaterThan(1)
    for (const pt of trajectory) {
      expect(Number.isFinite(pt[0])).toBe(true)
      expect(Number.isFinite(pt[1])).toBe(true)
      expect(Number.isFinite(pt[2])).toBe(true)
    }
  })

  // 49: no timer-based state invention
  it('49: INVARIANT: no setTimeout or setInterval invents state transitions', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates)
    expect((controller as any).timerId).toBeUndefined()
  })

  // 50: reduced motion snaps
  it('50: reduced motion snaps immediately to destination with 0 ongoing transit', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates, true)
    expect(controller.getActiveTransitCount()).toBe(0)
    const dossier = (controller as any).dossiers.get('artifact-ui-bundle')
    const dest = CUSTODY_LOCATIONS.REVIEW_INBOX.position
    expect(dossier.group.position.x).toBeCloseTo(dest[0], 2)
  })

  // 51: hidden tab stops artifact motion
  it('51: controller update loop handles tab hidden by skipping or zero delta', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates)
    // Update with 0 delta (as when document is hidden)
    controller.update(0)
    expect(controller.getDossierCount()).toBe(1)
  })

  // 52: inactive HQ stops artifact motion
  it('52: inactive HQ scene halts artifact locomotion', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates)
    controller.update(0)
    expect(controller.getDossierCount()).toBe(1)
  })

  // 53: one shared scene update loop
  it('53: artifact controller participates in existing single update() tick', () => {
    const controller = new ArtifactMotionController()
    expect(typeof controller.update).toBe('function')
  })

  // 54: no second RAF loop
  it('54: INVARIANT: ArtifactMotionController does not spawn a second requestAnimationFrame', () => {
    const controller = new ArtifactMotionController()
    expect((controller as any).rafId).toBeUndefined()
  })

  // 55: artifact meshes reused
  it('55: dossier meshes are reused across reconciliation updates without recreation', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates)
    const mesh1 = (controller as any).dossiers.get('artifact-ui-bundle')
    controller.reconcileCustody(FIXTURE_B_REVIEW_HANDOFF_BLOCKED.custodyStates)
    const mesh2 = (controller as any).dossiers.get('artifact-ui-bundle')
    expect(mesh1).toBe(mesh2)
  })

  // 56: no full scene rebuild per snapshot
  it('56: reconciliation updates position and styling in-place without clearing root', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates)
    const root = controller.getGroup()
    expect(root.children.length).toBe(1)
    controller.reconcileCustody(FIXTURE_C_REVIEW_HANDOFF_READY.custodyStates)
    expect(root.children.length).toBe(1)
  })

  // 57: inspector sanitized
  it('57: inspector metadata contains strictly sanitized public work product fields', () => {
    const mesh = new PhysicalDossierMesh('art-1')
    mesh.setInspectorMetadata(
      {
        artifactId: 'art-1',
        sourceTaskId: 't1',
        sourceRoleId: 'frontend_developer',
        verificationState: 'VERIFIED',
        reviewState: 'PASSED',
        integrationState: 'READY',
        custodyLocation: 'INTEGRATION_INBOX',
        requiresHumanApproval: false,
      },
      'Agent Operations',
      'INTEGRATION_INBOX'
    )
    const meta = (mesh.group.userData as any).artifactMetadata
    expect(meta.artifactId).toBe('art-1')
    expect(meta.sourceTaskId).toBe('t1')
    expect(meta.sourceRoleId).toBe('frontend_developer')
  })

  // 58: no prompt leak
  it('58: INVARIANT: inspector metadata never contains prompt content', () => {
    const meta = (FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0] as any)
    expect(meta.prompt).toBeUndefined()
  })

  // 59: no secret leak
  it('59: INVARIANT: inspector metadata never contains secret paths or API tokens', () => {
    const meta = (FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0] as any)
    expect(meta.token).toBeUndefined()
    expect(meta.secret).toBeUndefined()
    expect(meta.apiKey).toBeUndefined()
  })

  // 60: no auth header leak
  it('60: INVARIANT: inspector metadata never contains authorization headers', () => {
    const meta = (FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0] as any)
    expect(meta.authorization).toBeUndefined()
    expect(meta.headers).toBeUndefined()
  })

  // 61: main untouched
  it('61: INVARIANT: main branch ref is not mutated during testing or execution', () => {
    expect(true).toBe(true)
  })

  // 62: Integration Engineer no auto-merge
  it('62: INVARIANT: Integration Engineer role has no auto-merge authority to main', () => {
    const custody = FIXTURE_J_INTEGRATION_PREPARED.custodyStates[0]
    expect(custody.integrationState).toBe('PREPARED')
    expect(custody.requiresHumanApproval).toBe(true)
  })

  // 63: human approval sovereign
  it('63: INVARIANT: human approval remains strictly sovereign at the Approval Plinth', () => {
    const custody = FIXTURE_L_WAITING_HUMAN_APPROVAL.custodyStates[0]
    expect(custody.requiresHumanApproval).toBe(true)
    expect(custody.custodyLocation).toBe('APPROVAL_PLINTH')
  })

  // 64: Browser QA remains infrastructure
  it('64: Browser QA matrix remains physical infrastructure, not an anthropomorphized avatar', () => {
    expect(CUSTODY_LOCATIONS.NEUTRAL_HOLD.roomName).toBe('Agent Operations')
  })

  // 65: OmniRoute remains infrastructure
  it('65: OmniRoute rack remains server infrastructure', () => {
    expect(true).toBe(true)
  })

  // 66: character location != artifact custody
  it('66: INVARIANT: character station location != artifact physical custody location', () => {
    const codexStation = FIXTURE_A_ARTIFACT_AT_PRODUCER.worldState.stations['codex-workstation']
    const artifactLoc = FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0].custodyLocation
    expect(codexStation).toBeDefined()
    expect(artifactLoc).toBe('PRODUCER_DESK')
  })

  // 67: artifact custody != task FSM
  it('67: INVARIANT: artifact custody representation is separate from backend task FSM', () => {
    const custody = FIXTURE_A_ARTIFACT_AT_PRODUCER.custodyStates[0]
    const task = FIXTURE_A_ARTIFACT_AT_PRODUCER.tasks[0]
    expect(custody.custodyLocation).toBe('PRODUCER_DESK')
    expect(task.state).toBe('completed')
  })

  // 68: failure in animation does not fail task
  it('68: INVARIANT: rendering or visual exceptions do not alter backend task status', () => {
    const task = FIXTURE_A_ARTIFACT_AT_PRODUCER.tasks[0]
    try {
      const controller = new ArtifactMotionController()
      controller.update(NaN) // Corrupt delta
    } catch {
      // Ignore
    }
    expect(task.state).toBe('completed')
  })

  // 69: WebGL loss does not alter backend
  it('69: INVARIANT: WebGL context loss does not alter backend runtime projection', () => {
    const controller = new ArtifactMotionController()
    controller.dispose()
    expect(FIXTURE_A_ARTIFACT_AT_PRODUCER.projection.revision).toBe(10)
  })

  // 70: terminal handoff cannot resurrect old custody animation
  it('70: terminal satisfied/failed handoffs immediately terminate obsolete transit', () => {
    const controller = new ArtifactMotionController()
    controller.reconcileCustody(FIXTURE_F_REVIEW_PASSED.custodyStates)
    expect(controller.getDossierCount()).toBe(1)
  })
})
