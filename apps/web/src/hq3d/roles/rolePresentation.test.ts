import { describe, it, expect } from 'vitest'
import {
  FROZEN_ROLES,
  ROLE_HOME_POSITIONS,
} from './roles.js'
import {
  deriveRolePresentationStates,
  buildRoleInspectorMetadata,
  resolveRoleIdFromStation,
} from './roleStationMapping.js'
import type { WorldState } from '../world/worldState.js'

function createEmptyWorldState(): WorldState {
  return {
    revisionIdentity: {
      projectionEpoch: 'epoch-1',
      projectionRevision: 1,
      canonicalTaskFingerprint: 'empty',
    },
    tasks: {},
    stations: {
      'planning-table': { id: 'planning-table', roomId: 'MISSION_CONTROL', status: 'IDLE' },
      'frontend-engineer-workstation': { id: 'frontend-engineer-workstation', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'backend-engineer-workstation': { id: 'backend-engineer-workstation', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'codex-workstation': { id: 'codex-workstation', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'engineering-workstation-01': { id: 'engineering-workstation-01', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'fcc-workstation': { id: 'fcc-workstation', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'engineering-workstation-02': { id: 'engineering-workstation-02', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'expansion-bay-3': { id: 'expansion-bay-3', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'expansion-bay-4': { id: 'expansion-bay-4', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'verifier-console': { id: 'verifier-console', roomId: 'VERIFICATION_LAB', status: 'IDLE' },
      'verification-lab-console': { id: 'verification-lab-console', roomId: 'VERIFICATION_LAB', status: 'IDLE' },
      'browser-qa-matrix': { id: 'browser-qa-matrix', roomId: 'BROWSER_QA_LAB', status: 'IDLE' },
      'omniroute-rack': { id: 'omniroute-rack', roomId: 'INFRASTRUCTURE_ROOM', status: 'IDLE' },
      'approval-plinth': { id: 'approval-plinth', roomId: 'APPROVAL_MEZZANINE', status: 'IDLE' },
      'repository-vault': { id: 'repository-vault', roomId: 'APPROVAL_MEZZANINE', status: 'IDLE' },
      'dispatch-console': { id: 'dispatch-console', roomId: 'INFRASTRUCTURE_ROOM', status: 'IDLE' },
      'reviewer-workstation': { id: 'reviewer-workstation', roomId: 'AGENT_OPERATIONS', status: 'IDLE' },
      'browser-qa-station': { id: 'browser-qa-station', roomId: 'BROWSER_QA_LAB', status: 'IDLE' },
      'evidence-wall': { id: 'evidence-wall', roomId: 'VERIFICATION_LAB', status: 'IDLE' },
    },
    infrastructure: {
      gateways: {
        'omniroute-local': {
          gatewayId: 'omniroute-local',
          active: false,
          activeTaskIds: [],
          activeRouteCount: 0,
          warningState: {
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      },
    },
    handoffs: [],
    alertLevel: 'NORMAL',
  }
}

describe('Wave 12D — Minimal Role-Based Character Foundation', () => {
  describe('B0 & B1: Four Frozen Reasoning Roles & Harness-Independent Identity', () => {
    it('defines exactly four frozen reasoning-role characters', () => {
      expect(FROZEN_ROLES).toHaveLength(4)
      const ids = FROZEN_ROLES.map((r) => r.roleId)
      expect(ids).toEqual([
        'role:strategy:chief-planner',
        'role:engineering:frontend-engineer',
        'role:engineering:backend-engineer',
        'role:quality:independent-reviewer',
      ])
    })

    it('guarantees all role IDs and home stations are unique', () => {
      const roleIds = new Set(FROZEN_ROLES.map((r) => r.roleId))
      expect(roleIds.size).toBe(4)

      const stationIds = new Set(FROZEN_ROLES.map((r) => r.stationId))
      expect(stationIds.size).toBe(4)
    })

    it('contains zero harness / provider / model dependencies in role definitions', () => {
      for (const role of FROZEN_ROLES) {
        // Must not embed provider or harness names into role names or IDs
        expect(role.roleId).not.toContain('codex')
        expect(role.roleId).not.toContain('claude')
        expect(role.roleId).not.toContain('fcc')
        expect(role.roleId).not.toContain('omniroute')
        expect(role.roleId).not.toContain('gpt')

        expect(role.displayName).not.toContain('Codex')
        expect(role.displayName).not.toContain('Claude')
        expect(role.displayName).not.toContain('FCC')
        expect(role.displayName).not.toContain('GPT')
      }
    })

    it('maps stations correctly through legacy compatibility mapping', () => {
      expect(resolveRoleIdFromStation('planning-table')).toBe('role:strategy:chief-planner')
      expect(resolveRoleIdFromStation('codex-workstation')).toBe('role:engineering:frontend-engineer')
      expect(resolveRoleIdFromStation('engineering-workstation-01')).toBe('role:engineering:frontend-engineer')
      expect(resolveRoleIdFromStation('fcc-workstation')).toBe('role:engineering:backend-engineer')
      expect(resolveRoleIdFromStation('engineering-workstation-02')).toBe('role:engineering:backend-engineer')
      expect(resolveRoleIdFromStation('verifier-console')).toBe('role:quality:independent-reviewer')
      expect(resolveRoleIdFromStation('verification-lab-console')).toBe('role:quality:independent-reviewer')

      // Unknown stations or infrastructure return null and do not impersonate humanoid roles
      expect(resolveRoleIdFromStation('browser-qa-matrix')).toBeNull()
      expect(resolveRoleIdFromStation('omniroute-rack')).toBeNull()
      expect(resolveRoleIdFromStation('unknown-station')).toBeNull()
    })
  })

  describe('B8: Harness Switch Demonstration (Independence Proof)', () => {
    it('maintains identical role identity when harness changes from codex-worker to fcc-worker', () => {
      const baseWorld = createEmptyWorldState()

      // Fixture State A: Frontend Engineer running with Codex harness
      const worldStateA: WorldState = {
        ...baseWorld,
        tasks: {
          'task-ui-1': {
            id: 'task-ui-1',
            title: 'Build UI Component',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            assignedStationId: 'codex-workstation',
            workerId: 'codex-worker',
            routeProvenance: {
              transport: 'DIRECT',
              active: true,
              actualProvider: 'openai',
              actualModel: 'gpt-4o',
              providerFallbackOccurred: false,
              transportFallbackOccurred: false,
            },
          },
        },
        stations: {
          ...baseWorld.stations,
          'codex-workstation': {
            id: 'codex-workstation',
            roomId: 'AGENT_OPERATIONS',
            status: 'ACTIVE',
            activeTaskId: 'task-ui-1',
            workerIdentity: 'codex-worker',
          },
        },
      }

      // Fixture State B: SAME Frontend Engineer running with FCC harness
      const worldStateB: WorldState = {
        ...baseWorld,
        tasks: {
          'task-ui-1': {
            id: 'task-ui-1',
            title: 'Build UI Component',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            assignedStationId: 'codex-workstation',
            workerId: 'fcc-worker',
            routeProvenance: {
              transport: 'GATEWAY',
              active: true,
              actualProvider: 'anthropic',
              actualModel: 'claude-3-7-sonnet',
              providerFallbackOccurred: false,
              transportFallbackOccurred: false,
            },
          },
        },
        stations: {
          ...baseWorld.stations,
          'codex-workstation': {
            id: 'codex-workstation',
            roomId: 'AGENT_OPERATIONS',
            status: 'ACTIVE',
            activeTaskId: 'task-ui-1',
            workerIdentity: 'fcc-worker',
          },
        },
      }

      const presentationA = deriveRolePresentationStates(worldStateA).get('role:engineering:frontend-engineer')!
      const presentationB = deriveRolePresentationStates(worldStateB).get('role:engineering:frontend-engineer')!

      // Role identity and station remain 100% stable
      expect(presentationA.roleId).toBe('role:engineering:frontend-engineer')
      expect(presentationB.roleId).toBe('role:engineering:frontend-engineer')
      expect(presentationA.displayName).toBe('Frontend Engineer')
      expect(presentationB.displayName).toBe('Frontend Engineer')
      expect(presentationA.departmentId).toBe('ENGINEERING')
      expect(presentationB.departmentId).toBe('ENGINEERING')
      expect(presentationA.characterState).toBe('FOCUSED')
      expect(presentationB.characterState).toBe('FOCUSED')
      expect(presentationA.homePosition).toEqual(presentationB.homePosition)

      // Only runtime harness/telemetry metadata changes
      expect(presentationA.currentHarness).toBe('codex-worker')
      expect(presentationB.currentHarness).toBe('fcc-worker')
      expect(presentationA.transport).toBe('Direct')
      expect(presentationB.transport).toBe('OmniRoute')
      expect(presentationA.provider).toBe('openai')
      expect(presentationB.provider).toBe('anthropic')
      expect(presentationA.model).toBe('gpt-4o')
      expect(presentationB.model).toBe('claude-3-7-sonnet')

      // Decoupled inspector inspection
      const inspectorA = buildRoleInspectorMetadata(presentationA)
      const inspectorB = buildRoleInspectorMetadata(presentationB)

      expect(inspectorA.roleName).toBe('Frontend Engineer')
      expect(inspectorB.roleName).toBe('Frontend Engineer')
      expect(inspectorA.currentHarness).toBe('codex-worker')
      expect(inspectorB.currentHarness).toBe('fcc-worker')
    })
  })

  describe('B9: Multi-Role Concurrency & Non-Contamination', () => {
    it('supports concurrent active roles without cross-contamination', () => {
      const baseWorld = createEmptyWorldState()
      const multiWorld: WorldState = {
        ...baseWorld,
        tasks: {
          'task-fe': {
            id: 'task-fe',
            title: 'Frontend Component Task',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            assignedStationId: 'codex-workstation',
            workerId: 'codex-worker',
          },
          'task-be': {
            id: 'task-be',
            title: 'Backend API Task',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            assignedStationId: 'fcc-workstation',
            workerId: 'fcc-worker',
          },
          'task-verify': {
            id: 'task-verify',
            title: 'Verification Execution',
            canonicalState: 'VERIFYING',
            physicalLocation: 'VERIFICATION_BENCH',
            assignedStationId: 'verifier-console',
          },
        },
        stations: {
          ...baseWorld.stations,
          'codex-workstation': {
            id: 'codex-workstation',
            roomId: 'AGENT_OPERATIONS',
            status: 'ACTIVE',
            activeTaskId: 'task-fe',
          },
          'fcc-workstation': {
            id: 'fcc-workstation',
            roomId: 'AGENT_OPERATIONS',
            status: 'ACTIVE',
            activeTaskId: 'task-be',
          },
          'verifier-console': {
            id: 'verifier-console',
            roomId: 'VERIFICATION_LAB',
            status: 'VERIFYING',
            activeTaskId: 'task-verify',
          },
        },
      }

      const presentationMap = deriveRolePresentationStates(multiWorld)

      // Frontend Engineer is FOCUSED on task-fe
      const fe = presentationMap.get('role:engineering:frontend-engineer')!
      expect(fe.characterState).toBe('FOCUSED')
      expect(fe.currentTaskId).toBe('task-fe')

      // Backend Engineer is FOCUSED on task-be
      const be = presentationMap.get('role:engineering:backend-engineer')!
      expect(be.characterState).toBe('FOCUSED')
      expect(be.currentTaskId).toBe('task-be')

      // Independent Reviewer is VERIFYING task-verify
      const reviewer = presentationMap.get('role:quality:independent-reviewer')!
      expect(reviewer.characterState).toBe('VERIFYING')
      expect(reviewer.currentTaskId).toBe('task-verify')

      // Chief Planner remains IDLE because no authoritative planner task exists
      const planner = presentationMap.get('role:strategy:chief-planner')!
      expect(planner.characterState).toBe('IDLE')
      expect(planner.currentTaskId).toBeNull()
    })
  })

  describe('B12: Zero Locomotion Invariant Proof', () => {
    it('proves character positions remain strictly equal to station anchors across all state changes', () => {
      const baseWorld = createEmptyWorldState()
      const states: ('IDLE' | 'FOCUSED' | 'VERIFYING' | 'WAITING' | 'SUCCESS' | 'FAILURE')[] = [
        'IDLE',
        'FOCUSED',
        'VERIFYING',
        'WAITING',
        'SUCCESS',
        'FAILURE',
      ]

      for (const role of FROZEN_ROLES) {
        const expectedHome = ROLE_HOME_POSITIONS[role.roleId]

        for (const testState of states) {
          const presentationMap = deriveRolePresentationStates(baseWorld, {
            [role.roleId]: { characterState: testState },
          })
          const charState = presentationMap.get(role.roleId)!

          // Positional coordinates must match exactly across all states
          expect(charState.homePosition).toEqual(expectedHome)
        }
      }
    })
  })

  describe('B16: Chief Planner Truth Rule', () => {
    it('keeps Chief Planner IDLE when no authoritative planner task exists, even if other tasks exist', () => {
      const baseWorld = createEmptyWorldState()
      const activeWorld: WorldState = {
        ...baseWorld,
        tasks: {
          'task-other': {
            id: 'task-other',
            title: 'Some general run task',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            assignedStationId: 'codex-workstation',
          },
        },
        stations: {
          ...baseWorld.stations,
          'codex-workstation': {
            id: 'codex-workstation',
            roomId: 'AGENT_OPERATIONS',
            status: 'ACTIVE',
          },
        },
      }

      const presentationMap = deriveRolePresentationStates(activeWorld)
      const planner = presentationMap.get('role:strategy:chief-planner')!

      expect(planner.characterState).toBe('IDLE')
      expect(planner.currentTaskId).toBeNull()
    })

    it('sets Chief Planner to FOCUSED only when an authoritative task is bound to planning table', () => {
      const baseWorld = createEmptyWorldState()
      const plannerWorld: WorldState = {
        ...baseWorld,
        tasks: {
          'task-plan-1': {
            id: 'task-plan-1',
            title: 'Authoritative Goal Decomposition Plan',
            canonicalState: 'RUNNING',
            physicalLocation: 'PLANNING_AREA',
            assignedStationId: 'planning-table',
          },
        },
        stations: {
          ...baseWorld.stations,
          'planning-table': {
            id: 'planning-table',
            roomId: 'MISSION_CONTROL',
            status: 'ACTIVE',
            activeTaskId: 'task-plan-1',
          },
        },
      }

      const presentationMap = deriveRolePresentationStates(plannerWorld)
      const planner = presentationMap.get('role:strategy:chief-planner')!

      expect(planner.characterState).toBe('FOCUSED')
      expect(planner.currentTaskId).toBe('task-plan-1')
    })
  })

  describe('B14 & B15: Browser QA and OmniRoute Infrastructure Invariant', () => {
    it('confirms Browser QA remains infrastructure without a humanoid role', () => {
      const role = resolveRoleIdFromStation('browser-qa-matrix')
      expect(role).toBeNull()
    })

    it('confirms OmniRoute remains infrastructure without a humanoid role', () => {
      const role = resolveRoleIdFromStation('omniroute-rack')
      expect(role).toBeNull()
    })
  })

  describe('Wave 12E: Canonical Role Contract & Harness Swap Proof', () => {
    it('B12 & B13: Frontend Engineer stays at home station when swapping between Codex and FCC harnesses', () => {
      const baseWorld = createEmptyWorldState()

      // Task A: Frontend Engineer + Codex harness
      const worldA: WorldState = {
        ...baseWorld,
        tasks: {
          'task-a': {
            id: 'task-a',
            title: 'Build UI Navigation',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            assignedStationId: 'codex-workstation',
            roleId: 'role:engineering:frontend-engineer',
            roleSource: 'CANONICAL',
            harnessId: 'codex-worker',
          },
        },
      }

      const presA = deriveRolePresentationStates(worldA)
      const feA = presA.get('role:engineering:frontend-engineer')!
      expect(feA.characterState).toBe('FOCUSED')
      expect(feA.currentHarness).toBe('codex-worker')
      expect(feA.roleSource).toBe('CANONICAL')
      expect(feA.stationId).toBe('engineering-workstation-01')

      // Task B: Frontend Engineer + FCC harness (swapped harness!)
      const worldB: WorldState = {
        ...baseWorld,
        tasks: {
          'task-b': {
            id: 'task-b',
            title: 'Refactor Layout Grid',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            assignedStationId: 'codex-workstation',
            roleId: 'role:engineering:frontend-engineer',
            roleSource: 'CANONICAL',
            harnessId: 'fcc-worker',
          },
        },
      }

      const presB = deriveRolePresentationStates(worldB)
      const feB = presB.get('role:engineering:frontend-engineer')!
      expect(feB.characterState).toBe('FOCUSED')
      expect(feB.currentHarness).toBe('fcc-worker')
      expect(feB.roleSource).toBe('CANONICAL')
      expect(feB.stationId).toBe('engineering-workstation-01')

      // Both belong to identical role identity and home station
      expect(feA.roleId).toBe(feB.roleId)
      expect(feA.stationId).toBe(feB.stationId)
      expect(feA.currentHarness).not.toBe(feB.currentHarness)
    })

    it('B10 & B12: Canonical roleId beats legacy compatibility mapping', () => {
      const baseWorld = createEmptyWorldState()
      // Even if legacy workstation mapping would associate fcc-workstation with backend engineer,
      // an explicit canonical roleId of frontend-engineer routes to the Frontend Engineer
      const world: WorldState = {
        ...baseWorld,
        tasks: {
          'task-override': {
            id: 'task-override',
            title: 'Cross-discipline task',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            roleId: 'role:engineering:frontend-engineer',
            roleSource: 'CANONICAL',
            harnessId: 'fcc-worker',
          },
        },
      }

      const pres = deriveRolePresentationStates(world)
      const fe = pres.get('role:engineering:frontend-engineer')!
      expect(fe.characterState).toBe('FOCUSED')
      expect(fe.roleSource).toBe('CANONICAL')

      // Backend Engineer remains IDLE
      const be = pres.get('role:engineering:backend-engineer')!
      expect(be.characterState).toBe('IDLE')
    })

    it('B26: buildRoleInspectorMetadata exposes roleSource as CANONICAL or LEGACY_COMPATIBILITY', () => {
      const baseWorld = createEmptyWorldState()
      const world: WorldState = {
        ...baseWorld,
        tasks: {
          'task-canonical': {
            id: 'task-canonical',
            title: 'Design Review System',
            canonicalState: 'RUNNING',
            physicalLocation: 'ASSIGNED_WORKSTATION',
            assignedStationId: 'codex-workstation',
            roleId: 'role:engineering:frontend-engineer',
            roleSource: 'CANONICAL',
            harnessId: 'codex-worker',
          },
        },
      }

      const pres = deriveRolePresentationStates(world)
      const fe = pres.get('role:engineering:frontend-engineer')!
      const meta = buildRoleInspectorMetadata(fe)
      expect(meta.roleSource).toBe('CANONICAL')
      expect(meta.currentHarness).toBe('codex-worker')
    })

    it('B14: Integration Engineer exists canonically without adding a 5th character in Wave 12E', () => {
      expect(FROZEN_ROLES).toHaveLength(4)
      expect(FROZEN_ROLES.map((r) => r.roleId)).not.toContain('role:integration:integration-engineer')
    })
  })
})
