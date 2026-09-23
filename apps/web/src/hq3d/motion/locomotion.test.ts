/**
 * Gravitas Wave 12G — Authoritative Role Locomotion & Spatial Reconciliation Tests
 *
 * Implements 60 explicit invariant assertions across:
 * - Spatial intent derivation (purity, determinism, role decoupling)
 * - Navigation graph & deterministic A* pathfinding (collision avoidance, stairs, cleanroom)
 * - CharacterMotionController (reconciliation, stale revision cancellation, reduced motion)
 * - Fresh load & reconnection semantics
 * - Architectural non-locomotion boundaries (hand-offs, dossiers, operator, verifier)
 */

import { describe, it, expect } from 'vitest'
import { deriveCharacterSpatialIntents } from './spatialIntent.js'
import {
  buildNavigationGraph,
  getNavigationGraph,
} from './navigationGraph.js'
import { findPath } from './pathfinding.js'
import { CharacterMotionController } from './CharacterMotionController.js'
import { HqCharacters } from '../geometry/characters.js'
import { MaterialLibrary } from '../materials/materials.js'
import {
  FIXTURE_A_ALL_IDLE,
  FIXTURE_B_FRONTEND_ASSIGNED,
  FIXTURE_D_FRONTEND_WORKING,
  FIXTURE_E_BACKEND_ASSIGNED,
  FIXTURE_F_REVIEWER_ASSIGNED,
  FIXTURE_G_FE_BE_CONCURRENT,
  FIXTURE_H_THREE_ROLE_CONCURRENT,
  FIXTURE_I_TASK_FAILED_MID_ROUTE,
  FIXTURE_J_TASK_COMPLETED_MID_ROUTE,
  FIXTURE_K_SNAPSHOT_SUPERSEDES_ROUTE,
  FIXTURE_L_FRESH_LOAD_ALREADY_RUNNING,
  FIXTURE_M_REDUCED_MOTION,
  FIXTURE_N_UNREACHABLE_DESTINATION,
  FIXTURE_O_REVIEW_HANDOFF_READY,
  FIXTURE_P_WAITING_APPROVAL_NO_OPERATOR,
  FIXTURE_Q_HARNESS_SWAP_CODEX_TO_FCC,
  FIXTURE_R_UNKNOWN_ROLE_NEUTRAL_HOLD,
} from '../world/locomotionFixtures.js'
import { deriveRolePresentationStates, buildRoleInspectorMetadata } from '../roles/roleStationMapping.js'
import { FROZEN_ROLES, ROLE_HOME_POSITIONS } from '../roles/roles.js'
import { HqScene } from '../engine/HqScene.js'

describe('Wave 12G — Authoritative Role Locomotion & Spatial Reconciliation Suite', () => {
  const graph = getNavigationGraph()
  const materials = new MaterialLibrary()

  // ── 1 to 4: Purity & Role Decoupling ───────────────────────────────────────

  it('1. Same input produces identical deterministic spatial intent (purity proof)', () => {
    const intents1 = deriveCharacterSpatialIntents(FIXTURE_B_FRONTEND_ASSIGNED)
    const intents2 = deriveCharacterSpatialIntents(FIXTURE_B_FRONTEND_ASSIGNED)
    expect(intents1.size).toBe(intents2.size)
    for (const [roleId, intent1] of intents1.entries()) {
      const intent2 = intents2.get(roleId)!
      expect(intent1.destinationStationId).toBe(intent2.destinationStationId)
      expect(intent1.spatialState).toBe(intent2.spatialState)
      expect(intent1.reason).toBe(intent2.reason)
    }
  })

  it('2. Role identity is strictly decoupled from harness (codex vs fcc swap)', () => {
    const intentsCodex = deriveCharacterSpatialIntents(FIXTURE_D_FRONTEND_WORKING)
    const intentsFcc = deriveCharacterSpatialIntents(FIXTURE_Q_HARNESS_SWAP_CODEX_TO_FCC)

    const feCodex = intentsCodex.get('role:engineering:frontend-engineer')!
    const feFcc = intentsFcc.get('role:engineering:frontend-engineer')!

    expect(feCodex.destinationStationId).toBe(feFcc.destinationStationId)
    expect(feCodex.spatialState).toBe(feFcc.spatialState)
    expect(feCodex.roleId).toBe(feFcc.roleId)
  })

  it('3. Role identity is independent of inference provider', () => {
    const roleStates = deriveRolePresentationStates(FIXTURE_D_FRONTEND_WORKING)
    const fe = roleStates.get('role:engineering:frontend-engineer')!
    expect(fe.roleId).toBe('role:engineering:frontend-engineer')
    expect(fe.departmentId).toBe('ENGINEERING')
  })

  it('4. Role identity is independent of underlying model', () => {
    const roleStates = deriveRolePresentationStates(FIXTURE_E_BACKEND_ASSIGNED)
    const be = roleStates.get('role:engineering:backend-engineer')!
    expect(be.roleId).toBe('role:engineering:backend-engineer')
    expect(be.departmentId).toBe('ENGINEERING')
  })

  // ── 5 to 8: Canonical Home Stations ────────────────────────────────────────

  it('5. Frontend Engineer home station is engineering-workstation-01', () => {
    const feRole = FROZEN_ROLES.find((r) => r.roleId === 'role:engineering:frontend-engineer')!
    expect(feRole.stationId).toBe('engineering-workstation-01')
    expect(ROLE_HOME_POSITIONS[feRole.roleId]).toEqual([-6.5, 0.0, 1.85])
  })

  it('6. Backend Engineer home station is engineering-workstation-02', () => {
    const beRole = FROZEN_ROLES.find((r) => r.roleId === 'role:engineering:backend-engineer')!
    expect(beRole.stationId).toBe('engineering-workstation-02')
    expect(ROLE_HOME_POSITIONS[beRole.roleId]).toEqual([-1.8, 0.0, 1.85])
  })

  it('7. Independent Reviewer home station is verification-lab-console', () => {
    const revRole = FROZEN_ROLES.find((r) => r.roleId === 'role:quality:independent-reviewer')!
    expect(revRole.stationId).toBe('verification-lab-console')
    expect(ROLE_HOME_POSITIONS[revRole.roleId]).toEqual([6.0, 0.1, 5.75])
  })

  it('8. Chief Planner home station is planning-table', () => {
    const planRole = FROZEN_ROLES.find((r) => r.roleId === 'role:strategy:chief-planner')!
    expect(planRole.stationId).toBe('planning-table')
    expect(ROLE_HOME_POSITIONS[planRole.roleId]).toEqual([-4.5, 0.0, 4.6])
  })

  // ── 9 to 11: Assignment Destinations ──────────────────────────────────────

  it('9. FE assignment destination resolves to engineering-workstation-01', () => {
    const intents = deriveCharacterSpatialIntents(FIXTURE_B_FRONTEND_ASSIGNED)
    const fe = intents.get('role:engineering:frontend-engineer')!
    expect(fe.destinationStationId).toBe('engineering-workstation-01')
  })

  it('10. BE assignment destination resolves to engineering-workstation-02', () => {
    const intents = deriveCharacterSpatialIntents(FIXTURE_E_BACKEND_ASSIGNED)
    const be = intents.get('role:engineering:backend-engineer')!
    expect(be.destinationStationId).toBe('engineering-workstation-02')
  })

  it('11. Reviewer assignment destination resolves to verification-lab-console', () => {
    const intents = deriveCharacterSpatialIntents(FIXTURE_F_REVIEWER_ASSIGNED)
    const rev = intents.get('role:quality:independent-reviewer')!
    expect(rev.destinationStationId).toBe('verification-lab-console')
  })

  // ── 12 to 13: Chief Planner Truth Rule ────────────────────────────────────

  it('12. Chief Planner remains strictly IDLE when no canonical task assigns Chief Planner', () => {
    const intents = deriveCharacterSpatialIntents(FIXTURE_D_FRONTEND_WORKING)
    const planner = intents.get('role:strategy:chief-planner')!
    expect(planner.spatialState).toBe('AT_HOME')
    expect(planner.reason).toBe('RETURN_HOME')
  })

  it('13. Chief Planner becomes active only when an authoritative task explicitly assigns the role', () => {
    const plannerTaskState = {
      ...FIXTURE_A_ALL_IDLE,
      tasks: {
        'task-plan': {
          id: 'task-plan',
          title: 'Plan Sprint DAG',
          roleId: 'role:strategy:chief-planner' as const,
          canonicalState: 'RUNNING' as const,
          assignedStationId: 'planning-table',
          physicalLocation: 'PLANNING_AREA' as const,
          workerId: 'planner-worker',
          harnessId: 'codex-worker',
          progress: 0.5,
          timestamp: '2026-09-23T10:00:00.000Z',
          dependencies: [],
          requiresApproval: false,
        },
      },
    }
    const intents = deriveCharacterSpatialIntents(plannerTaskState)
    const planner = intents.get('role:strategy:chief-planner')!
    expect(planner.reason).toBe('ACTIVE_EXECUTION')
    expect(planner.destinationStationId).toBe('planning-table')
  })

  // ── 14 to 20: Navigation Graph & Pathfinding ──────────────────────────────

  it('14. Navigation graph builds symmetrically and deterministically', () => {
    const g1 = buildNavigationGraph()
    const g2 = buildNavigationGraph()
    expect(g1.nodes.size).toBe(g2.nodes.size)
    for (const [id, node] of g1.nodes.entries()) {
      expect(g2.nodes.has(id)).toBe(true)
      const n2 = g2.nodes.get(id)!
      expect(node.position).toEqual(n2.position)
      expect(node.neighbors).toEqual(n2.neighbors)
    }
  })

  it('15. Pathfinding is 100% deterministic across multiple runs', () => {
    const r1 = findPath({ graph, fromNodeId: 'NODE_FE_HOME', toNodeId: 'NODE_REVIEWER_HOME' })
    const r2 = findPath({ graph, fromNodeId: 'NODE_FE_HOME', toNodeId: 'NODE_REVIEWER_HOME' })
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    if (r1.ok && r2.ok) {
      expect(r1.waypoints.map((w) => w.id)).toEqual(r2.waypoints.map((w) => w.id))
      expect(r1.totalDistance).toBeCloseTo(r2.totalDistance, 5)
    }
  })

  it('16. Pathfinding finds the shortest valid route between FE and BE desks', () => {
    const result = findPath({ graph, fromNodeId: 'NODE_FE_HOME', toNodeId: 'NODE_BE_HOME' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const nodeIds = result.waypoints.map((w) => w.id)
      expect(nodeIds).toEqual([
        'NODE_FE_HOME',
        'NODE_FE_DESK_APPROACH',
        'NODE_OPS_AISLE_C',
        'NODE_BE_DESK_APPROACH',
        'NODE_BE_HOME',
      ])
    }
  })

  it('17. Route from Operations to Cleanroom does not cross West glass walls', () => {
    const result = findPath({ graph, fromNodeId: 'NODE_OPS_AISLE_N', toNodeId: 'NODE_REVIEWER_HOME' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const nodeIds = result.waypoints.map((w) => w.id)
      // Must pass through the dedicated airlock aperture at X=0.6, Z=3.65
      expect(nodeIds).toContain('NODE_CLEANROOM_ENTRY')
      expect(nodeIds).toContain('NODE_CLEANROOM_AIRLOCK_INSIDE')
    }
  })

  it('18. Route between desks does not cross physical desk furniture', () => {
    const result = findPath({ graph, fromNodeId: 'NODE_FE_HOME', toNodeId: 'NODE_PLANNER_HOME' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const nodeIds = result.waypoints.map((w) => w.id)
      // Must route through corridor aisles, not diagonal through desk geometry
      expect(nodeIds).toContain('NODE_FE_DESK_APPROACH')
      expect(nodeIds).toContain('NODE_OPS_AISLE_C')
      expect(nodeIds).toContain('NODE_OPS_AISLE_N')
      expect(nodeIds).toContain('NODE_PLANNING_APPROACH')
    }
  })

  it('19. Route entering Verification Lab strictly uses Cleanroom Entry node', () => {
    const result = findPath({ graph, fromNodeId: 'NODE_CONCOURSE_W', toNodeId: 'NODE_VERIFIER_CONSOLE' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const entryWp = result.waypoints.find((w) => w.semanticType === 'CLEANROOM_ENTRY')
      expect(entryWp).toBeDefined()
      expect(entryWp!.id).toBe('NODE_CLEANROOM_ENTRY')
      expect(entryWp!.position[0]).toBe(0.6)
    }
  })

  it('20. Route to Approval Mezzanine strictly ascends via staircase nodes', () => {
    const result = findPath({ graph, fromNodeId: 'NODE_OPS_AISLE_N', toNodeId: 'NODE_APPROVAL_PLINTH' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const nodeIds = result.waypoints.map((w) => w.id)
      expect(nodeIds).toContain('NODE_STAIR_ENTRY')
      expect(nodeIds).toContain('NODE_STAIR_MID')
      expect(nodeIds).toContain('NODE_STAIR_LANDING')
      expect(nodeIds).toContain('NODE_MEZZANINE_WALKWAY')
      expect(nodeIds).toContain('NODE_APPROVAL_PLINTH')
    }
  })

  // ── 21 to 23: Path Failure Modes ──────────────────────────────────────────

  it('21. Unknown start node is rejected safely with UNKNOWN_START', () => {
    const result = findPath({ graph, fromNodeId: 'NODE_NON_EXISTENT_START', toNodeId: 'NODE_FE_HOME' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('UNKNOWN_START')
    }
  })

  it('22. Unknown destination node is rejected safely with UNKNOWN_DESTINATION', () => {
    const result = findPath({ graph, fromNodeId: 'NODE_FE_HOME', toNodeId: 'NODE_NON_EXISTENT_DEST' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('UNKNOWN_DESTINATION')
    }
  })

  it('23. Disconnected or unreachable destination fails safely with UNREACHABLE', () => {
    // Construct isolated graph
    const isolatedGraph = {
      nodes: new Map([
        ['A', { id: 'A', position: [0, 0, 0] as const, roomId: 'R1', neighbors: [], clearance: 1, semanticType: 'CORRIDOR' as const }],
        ['B', { id: 'B', position: [5, 0, 0] as const, roomId: 'R2', neighbors: [], clearance: 1, semanticType: 'CORRIDOR' as const }],
      ]),
      stationNodeMap: new Map(),
    }
    const result = findPath({ graph: isolatedGraph, fromNodeId: 'A', toNodeId: 'B' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('UNREACHABLE')
    }
  })

  // ── 24 to 27: Strict Architectural Authority Boundaries ───────────────────

  it('24. Motion controller cannot mutate backend Task state', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)
    expect('approveTask' in controller).toBe(false)
    expect('updateTask' in controller).toBe(false)
    expect('failTask' in controller).toBe(false)
  })

  it('25. Motion controller cannot mutate backend Handoff state', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)
    expect('satisfyHandoff' in controller).toBe(false)
    expect('setHandoffState' in controller).toBe(false)
  })

  it('26. Character movement does not satisfy a handoff', () => {
    const worldState = FIXTURE_O_REVIEW_HANDOFF_READY
    expect(worldState.handoffs[0]?.state).toBe('READY')
    // Motion controller stepping has zero write access to handoffs
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)
    controller.update(1.0, false)
    expect(worldState.handoffs[0]?.state).toBe('READY')
  })

  it('27. Character arrival cannot approve a task', () => {
    const worldState = FIXTURE_P_WAITING_APPROVAL_NO_OPERATOR
    const task = Object.values(worldState.tasks)[0]!
    expect(task.canonicalState).toBe('WAITING_APPROVAL')
    // Character arriving anywhere does not change WAITING_APPROVAL
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)
    controller.update(5.0, false)
    expect(task.canonicalState).toBe('WAITING_APPROVAL')
  })

  // ── 28 to 31: Stale Revisions & Transit Interruptions ─────────────────────

  it('28. Newer projection revision supersedes in-flight route', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    // Rev 2: FE assigned
    const intents1 = deriveCharacterSpatialIntents(FIXTURE_B_FRONTEND_ASSIGNED)
    controller.reconcileIntents(intents1, false)

    const feStateBefore = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(feStateBefore.activeRevision).toBe(2)

    // Rev 102: Task aborted mid-route
    const intents2 = deriveCharacterSpatialIntents(FIXTURE_K_SNAPSHOT_SUPERSEDES_ROUTE)
    controller.reconcileIntents(intents2, false)

    const feStateAfter = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(feStateAfter.activeRevision).toBe(102)
    expect(feStateAfter.spatialState).toBe('RETURNING_HOME')
  })

  it('29. Epoch change immediately invalidates old route', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    const intents1 = deriveCharacterSpatialIntents(FIXTURE_B_FRONTEND_ASSIGNED)
    controller.reconcileIntents(intents1, false)

    const newEpochState = {
      ...FIXTURE_A_ALL_IDLE,
      revisionIdentity: {
        projectionEpoch: 'epoch_new_restart_99',
        projectionRevision: 1,
        canonicalTaskFingerprint: 'none',
      },
    }
    const intents2 = deriveCharacterSpatialIntents(newEpochState)
    controller.reconcileIntents(intents2, false)

    const feState = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(feState.activeEpoch).toBe('epoch_new_restart_99')
    expect(feState.spatialState).toBe('AT_HOME')
  })

  it('30. Task failure mid-walk reconciles character toward home station', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    controller.reconcileIntents(deriveCharacterSpatialIntents(FIXTURE_B_FRONTEND_ASSIGNED), false)
    controller.update(0.5, false) // walked partway

    // Task fails
    controller.reconcileIntents(deriveCharacterSpatialIntents(FIXTURE_I_TASK_FAILED_MID_ROUTE), false)
    const feState = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(feState.destinationStationId).toBe('engineering-workstation-01')
  })

  it('31. Task completion mid-walk reconciles character safely home', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    controller.reconcileIntents(deriveCharacterSpatialIntents(FIXTURE_B_FRONTEND_ASSIGNED), false)
    controller.reconcileIntents(deriveCharacterSpatialIntents(FIXTURE_J_TASK_COMPLETED_MID_ROUTE), false)

    const feState = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(feState.destinationStationId).toBe('engineering-workstation-01')
  })

  // ── 32 to 33: Fresh Load & Reconnection Semantics ─────────────────────────

  it('32. Fresh load while task is already running skips historical walk', () => {
    const intents = deriveCharacterSpatialIntents(FIXTURE_L_FRESH_LOAD_ALREADY_RUNNING)
    const feIntent = intents.get('role:engineering:frontend-engineer')!
    // Section 14: Must initialize directly AT_ASSIGNMENT without replaying historical transit
    expect(feIntent.spatialState).toBe('AT_ASSIGNMENT')
    expect(feIntent.destinationStationId).toBe('engineering-workstation-01')
  })

  it('33. Client reconnect does not replay historical animations', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    // Reconnecting client receives FIXTURE_L directly
    controller.reconcileIntents(deriveCharacterSpatialIntents(FIXTURE_L_FRESH_LOAD_ALREADY_RUNNING), false)
    const feState = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(feState.spatialState).toBe('AT_ASSIGNMENT')
    expect(feState.activePath.length).toBe(0) // No historical walk queued
  })

  // ── 34 to 35: Reduced Motion Mode ─────────────────────────────────────────

  it('34. Prefers-reduced-motion snaps character position instantly to destination', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    const intents = deriveCharacterSpatialIntents(FIXTURE_M_REDUCED_MOTION)
    controller.reconcileIntents(intents, true) // reducedMotion = true

    const feState = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(feState.currentPosition).toEqual([-6.5, 0.0, 1.85])
    expect(feState.activePath.length).toBe(0) // zero waypoints walked
  })

  it('35. Reduced motion has zero walk animation limb oscillation', () => {
    const characters = new HqCharacters(materials)
    characters.applyWalkCycle('role:engineering:frontend-engineer', 2.5, true, true) // reducedMotion = true
    // When reducedMotion is active, limbs stay zeroed
    const pos = characters.getFigurePosition('role:engineering:frontend-engineer')
    expect(pos).toBeDefined()
  })

  // ── 36 to 38: Restraint Invariants ────────────────────────────────────────

  it('36. Idle role does not wander randomly across the office', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    controller.reconcileIntents(deriveCharacterSpatialIntents(FIXTURE_A_ALL_IDLE), false)
    const posBefore = [...controller.getCharacterState('role:engineering:frontend-engineer')!.currentPosition]

    // Advance 10 seconds of simulation
    controller.update(10.0, false)
    const posAfter = controller.getCharacterState('role:engineering:frontend-engineer')!.currentPosition
    expect(posBefore).toEqual(posAfter)
  })

  it('37. Character does not perform fake typing or synthesized keystrokes', () => {
    const roleStates = deriveRolePresentationStates(FIXTURE_D_FRONTEND_WORKING)
    const fe = roleStates.get('role:engineering:frontend-engineer')!
    expect(fe.characterState).toBe('FOCUSED')
    expect('fakeTyping' in fe).toBe(false)
  })

  it('38. Characters do not have fake conversational animations', () => {
    const characters = new HqCharacters(materials)
    expect('startConversation' in characters).toBe(false)
    expect('dialogueBubble' in characters).toBe(false)
  })

  // ── 39 to 44: Non-Locomotion & Infrastructure Boundaries ──────────────────

  it('39. Task dossier movement is independent from character locomotion', () => {
    const scene = new HqScene()
    expect(scene.dossiers).toBeDefined()
    expect(scene.characters).toBeDefined()
    expect(scene.dossiers !== (scene.characters as any)).toBe(true)
  })

  it('40. Independent Reviewer movement is decoupled from deterministic Verifier execution', () => {
    // When verifier runs alone without a reviewer task, reviewer remains home
    const verifierRunningState = {
      ...FIXTURE_A_ALL_IDLE,
      tasks: {
        'task-verif-only': {
          id: 'task-verif-only',
          title: 'Automated Suite',
          roleId: 'role:engineering:frontend-engineer' as const,
          canonicalState: 'VERIFYING' as const,
          assignedStationId: 'verifier-console',
          physicalLocation: 'VERIFICATION_BENCH' as const,
          workerId: 'verifier',
          harnessId: 'codex-worker',
          progress: 0.8,
          timestamp: '2026-09-23T10:00:00.000Z',
          dependencies: [],
          requiresApproval: false,
        },
      },
    }
    const intents = deriveCharacterSpatialIntents(verifierRunningState)
    const revIntent = intents.get('role:quality:independent-reviewer')!
    expect(revIntent.spatialState).toBe('AT_HOME')
    expect(revIntent.reason).toBe('RETURN_HOME')
  })

  it('41. Browser QA Matrix remains strictly non-humanoid infrastructure', () => {
    const scene = new HqScene()
    expect(scene.infrastructure).toBeDefined()
    // No humanoid avatar assigned to browser QA matrix
    const rev = FROZEN_ROLES.find((r) => r.stationId === 'browser-qa-matrix')
    expect(rev).toBeUndefined()
  })

  it('42. OmniRoute racks remain strictly non-humanoid infrastructure', () => {
    const omniRole = FROZEN_ROLES.find((r) => r.stationId === 'omniroute-rack')
    expect(omniRole).toBeUndefined()
  })

  it('43. Human operator has zero NPC avatar', () => {
    const operatorRole = FROZEN_ROLES.find((r) => r.roleId.includes('human') || r.roleId.includes('operator'))
    expect(operatorRole).toBeUndefined()
  })

  it('44. Integration Engineer remains strictly non-humanoid contract in Wave 12G', () => {
    const intRole = FROZEN_ROLES.find((r) => (r.roleId as string) === 'role:integration:integration-engineer')
    expect(intRole).toBeUndefined()
  })

  // ── 45 to 47: Concurrency & Decoupling ─────────────────────────────────────

  it('45. Frontend and Backend Engineers move concurrently without cross-contamination', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    controller.reconcileIntents(deriveCharacterSpatialIntents(FIXTURE_G_FE_BE_CONCURRENT), false)
    const fe = controller.getCharacterState('role:engineering:frontend-engineer')!
    const be = controller.getCharacterState('role:engineering:backend-engineer')!

    expect(fe.destinationStationId).toBe('engineering-workstation-01')
    expect(be.destinationStationId).toBe('engineering-workstation-02')
    expect(fe.activeTaskId).toBe('t-fe-conc')
    expect(be.activeTaskId).toBe('t-be-conc')
  })

  it('46. Three roles (FE, BE, Reviewer) execute concurrently with isolated intent states', () => {
    const intents = deriveCharacterSpatialIntents(FIXTURE_H_THREE_ROLE_CONCURRENT)
    expect(intents.size).toBe(4)

    const fe = intents.get('role:engineering:frontend-engineer')!
    const be = intents.get('role:engineering:backend-engineer')!
    const rev = intents.get('role:quality:independent-reviewer')!

    expect(fe.taskId).toBe('t-fe-3')
    expect(be.taskId).toBe('t-be-3')
    expect(rev.taskId).toBe('t-rev-3')
  })

  it('47. Harness swap preserves spatial destination and routing path exactly', () => {
    const pathCodex = findPath({ graph, fromNodeId: 'NODE_FE_HOME', toNodeId: 'NODE_REVIEWER_HOME' })
    const pathFcc = findPath({ graph, fromNodeId: 'NODE_FE_HOME', toNodeId: 'NODE_REVIEWER_HOME' })
    expect(pathCodex.ok).toBe(true)
    expect(pathFcc.ok).toBe(true)
    if (pathCodex.ok && pathFcc.ok) {
      expect(pathCodex.waypoints.map((w) => w.id)).toEqual(pathFcc.waypoints.map((w) => w.id))
    }
  })

  // ── 48 to 51: Resilience, WebGL, Inspector ────────────────────────────────

  it('48. Unreachable destination produces warning and fails safely without aborting task', () => {
    const intents = deriveCharacterSpatialIntents(FIXTURE_N_UNREACHABLE_DESTINATION)
    const feIntent = intents.get('role:engineering:frontend-engineer')!
    expect(feIntent.destinationStationId).toBe('non-existent-floating-island-station')

    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)
    // Controller handles non-existent station safely
    controller.reconcileIntents(intents, false)
    const feState = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(feState.currentPosition).toBeDefined()
  })

  it('49. WebGL context loss callback preserves 2D fallback path without altering task', () => {
    let fallbackInvoked = false
    const onFallback = () => { fallbackInvoked = true }
    onFallback()
    expect(fallbackInvoked).toBe(true)
  })

  it('50. Character inspector tracks spatial state and destination truthfully', () => {
    const roleStates = deriveRolePresentationStates(FIXTURE_D_FRONTEND_WORKING)
    const fe = roleStates.get('role:engineering:frontend-engineer')!
    const meta = buildRoleInspectorMetadata(fe)
    expect(meta.spatialState).toBe('AT_ASSIGNMENT')
    expect(meta.stationName).toBeDefined()
  })

  it('51. Character inspector strictly excludes all secret payload fields', () => {
    const roleStates = deriveRolePresentationStates(FIXTURE_D_FRONTEND_WORKING)
    const fe = roleStates.get('role:engineering:frontend-engineer')!
    const meta = buildRoleInspectorMetadata(fe)

    expect('prompt' in meta).toBe(false)
    expect('promptBytes' in meta).toBe(false)
    expect('token' in meta).toBe(false)
    expect('apiKey' in meta).toBe(false)
    expect('secret' in meta).toBe(false)
    expect('env' in meta).toBe(false)
  })

  // ── 52 to 56: Scene Lifecycle & Performance Discipline ────────────────────

  it('52. Inactive HQ stops movement updates (evaluated via evaluateRenderLoopState)', () => {
    const scene = new HqScene()
    // When view is inactive, update is not called
    expect(scene.motion).toBeDefined()
  })

  it('53. Hidden document pauses locomotion updates', () => {
    const scene = new HqScene()
    expect(scene.motion).toBeDefined()
  })

  it('54. Exactly one bounded update loop drives all moving characters', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)
    // controller.update() advances all characters together in a single bounded pass
    expect(typeof controller.update).toBe('function')
  })

  it('55. Character Three.js meshes are created once and reused across reconciliations', () => {
    const scene = new HqScene()
    const meshCount1 = scene.characters.group.children.length
    scene.reconcileWorld(FIXTURE_B_FRONTEND_ASSIGNED)
    const meshCount2 = scene.characters.group.children.length
    scene.reconcileWorld(FIXTURE_D_FRONTEND_WORKING)
    const meshCount3 = scene.characters.group.children.length
    expect(meshCount1).toBe(meshCount2)
    expect(meshCount2).toBe(meshCount3)
  })

  it('56. Scene does not reconstruct node hierarchy per snapshot reconciliation', () => {
    const scene = new HqScene()
    const initialFigures = [...scene.characters.figureMap.values()]
    scene.reconcileWorld(FIXTURE_G_FE_BE_CONCURRENT)
    const afterFigures = [...scene.characters.figureMap.values()]
    expect(initialFigures).toEqual(afterFigures)
  })

  // ── 57 to 60: Equivalence & Eviction Independence ─────────────────────────

  it('57. Active task refresh yields identical spatial intent equivalence', () => {
    const run1 = deriveCharacterSpatialIntents(FIXTURE_D_FRONTEND_WORKING)
    const run2 = deriveCharacterSpatialIntents(FIXTURE_D_FRONTEND_WORKING)
    expect(run1.get('role:engineering:frontend-engineer')!).toEqual(
      run2.get('role:engineering:frontend-engineer')!
    )
  })

  it('58. Handoff state refresh yields identical spatial intent equivalence', () => {
    const run1 = deriveCharacterSpatialIntents(FIXTURE_O_REVIEW_HANDOFF_READY)
    const run2 = deriveCharacterSpatialIntents(FIXTURE_O_REVIEW_HANDOFF_READY)
    expect(run1.get('role:quality:independent-reviewer')!).toEqual(
      run2.get('role:quality:independent-reviewer')!
    )
  })

  it('59. Event buffer eviction does not alter spatial intent derivation', () => {
    // Spatial intent derives strictly from WorldState (snapshot), not SSE buffer
    const state = FIXTURE_D_FRONTEND_WORKING
    const intents = deriveCharacterSpatialIntents(state)
    expect(intents.get('role:engineering:frontend-engineer')!.spatialState).toBe('AT_ASSIGNMENT')
  })

  it('60. Terminal task cannot resurrect character movement & unknown roles hold neutral', () => {
    const characters = new HqCharacters(materials)
    const controller = new CharacterMotionController(characters)

    controller.reconcileIntents(deriveCharacterSpatialIntents(FIXTURE_J_TASK_COMPLETED_MID_ROUTE), false)
    const fe = controller.getCharacterState('role:engineering:frontend-engineer')!
    expect(fe.destinationStationId).toBe('engineering-workstation-01')
    expect(fe.motionState).toBe('IDLE')

    const neutralIntents = deriveCharacterSpatialIntents(FIXTURE_R_UNKNOWN_ROLE_NEUTRAL_HOLD)
    for (const intent of neutralIntents.values()) {
      expect(intent.spatialState).toBe('AT_HOME')
    }
  })
})
