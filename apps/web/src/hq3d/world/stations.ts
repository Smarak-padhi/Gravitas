/**
 * Gravitas 3D Headquarters — Station Definitions & Metadata
 * Truthful station models aligned with the Living HQ North-Star vertical cutaway tower.
 *
 * Implements role-oriented physical stations with explicit presentation mapping
 * to preserve backwards compatibility for historical and runtime canonical IDs.
 */

import type { StationDefinition, StationId } from '../types.js'

export function resolveCanonicalStationId(stationId: string): StationId {
  if (stationId === 'codex-workstation' || stationId === 'engineering-workstation-01') {
    return 'frontend-engineer-workstation'
  }
  if (stationId === 'fcc-workstation' || stationId === 'engineering-workstation-02') {
    return 'backend-engineer-workstation'
  }
  return stationId as StationId
}

export const STATION_DEFINITIONS: Record<StationId, StationDefinition> = {
  // ── Floor 1: Mission Control (Y = 3.6m) ──────────────────────────────────
  'planning-table': {
    id: 'planning-table',
    name: 'Mission Planning Table',
    roomId: 'MISSION_CONTROL',
    position: [-1.5, 3.6, 0.5],
    rotationY: 0,
    role: 'Goal Ingestion & DAG Decomposition',
    status: 'Operational Foundation',
    description: 'Central architectural light table for DAG planning and run orchestration.',
  },

  // ── Floor 2: Agent Operations Hero Room (Y = 7.2m) ───────────────────────
  'frontend-engineer-workstation': {
    id: 'frontend-engineer-workstation',
    name: 'Frontend Engineer Workstation',
    roomId: 'AGENT_OPERATIONS',
    position: [-3.5, 7.2, 0.6],
    rotationY: 0,
    role: 'Frontend Engineering Specialist',
    status: 'Active Workstation',
    description: 'Specialist drafting station with curved visual displays, design tablet, and preview surface.',
  },
  'backend-engineer-workstation': {
    id: 'backend-engineer-workstation',
    name: 'Backend Engineer Workstation',
    roomId: 'AGENT_OPERATIONS',
    position: [2.5, 7.2, 0.6],
    rotationY: 0,
    role: 'Backend Engineering Specialist',
    status: 'Active Workstation',
    description: 'Technical systems workstation with multi-terminal monitoring array and telemetry console.',
  },
  'reviewer-workstation': {
    id: 'reviewer-workstation',
    name: 'Independent Reviewer Verification Station',
    roomId: 'AGENT_OPERATIONS',
    position: [0.0, 7.2, -0.1],
    rotationY: 0,
    role: 'Quality & Verification Gate',
    status: 'Active Review Gate',
    description: 'Specialist acoustic inspection pod with dual curved monitors and analysis tablet.',
  },

  'codex-workstation': {
    id: 'codex-workstation',
    name: 'Frontend Engineer Workstation (Legacy Alias)',
    roomId: 'AGENT_OPERATIONS',
    position: [-3.5, 7.2, 0.6],
    rotationY: 0,
    role: 'Frontend Engineering Specialist',
    status: 'Active Workstation',
    description: 'Legacy station identifier mapped to Frontend Engineer physical workstation.',
  },
  'engineering-workstation-01': {
    id: 'engineering-workstation-01',
    name: 'Frontend Engineer Workstation (Engineering-01 Alias)',
    roomId: 'AGENT_OPERATIONS',
    position: [-3.5, 7.2, 0.6],
    rotationY: 0,
    role: 'Frontend Engineering Specialist',
    status: 'Active Workstation',
    description: 'Presentation station identifier mapped to Frontend Engineer physical workstation.',
  },
  'fcc-workstation': {
    id: 'fcc-workstation',
    name: 'Backend Engineer Workstation (Legacy Alias)',
    roomId: 'AGENT_OPERATIONS',
    position: [2.5, 7.2, 0.6],
    rotationY: 0,
    role: 'Backend Engineering Specialist',
    status: 'Active Workstation',
    description: 'Legacy station identifier mapped to Backend Engineer physical workstation.',
  },
  'engineering-workstation-02': {
    id: 'engineering-workstation-02',
    name: 'Backend Engineer Workstation (Engineering-02 Alias)',
    roomId: 'AGENT_OPERATIONS',
    position: [2.5, 7.2, 0.6],
    rotationY: 0,
    role: 'Backend Engineering Specialist',
    status: 'Active Workstation',
    description: 'Presentation station identifier mapped to Backend Engineer physical workstation.',
  },
  'verification-lab-console': {
    id: 'verification-lab-console',
    name: 'Verification Console (Cleanroom Alias)',
    roomId: 'VERIFICATION_LAB',
    position: [0.0, 10.8, 1.0],
    rotationY: 0,
    role: 'Verification Cleanroom Lead',
    status: 'Inspection Standby',
    description: 'Presentation station identifier mapped to Verification Console.',
  },

  'expansion-bay-3': {
    id: 'expansion-bay-3',
    name: 'Expansion Bay 03',
    roomId: 'AGENT_OPERATIONS',
    position: [-3.5, 7.2, -1.8],
    rotationY: 0,
    role: 'Design & Dynamic Agents',
    status: 'Standby Capacity',
    description: 'Modular expansion workstation for dynamic worker instances.',
  },
  'expansion-bay-4': {
    id: 'expansion-bay-4',
    name: 'Expansion Bay 04',
    roomId: 'AGENT_OPERATIONS',
    position: [2.5, 7.2, -1.8],
    rotationY: 0,
    role: 'Dynamic Worker Slot',
    status: 'Standby Capacity',
    description: 'Modular expansion bay reserved for high-concurrency DAG execution.',
  },

  // ── Floor 3: Verification Cleanroom (Y = 10.8m) ──────────────────────────
  'verifier-console': {
    id: 'verifier-console',
    name: 'Verification Console',
    roomId: 'VERIFICATION_LAB',
    position: [0.0, 10.8, 1.0],
    rotationY: 0,
    role: 'Independent Evidence Gate',
    status: 'Cleanroom Active',
    description: 'Independent verification terminal for deterministic test execution and mutation scope enforcement.',
  },
  'evidence-wall': {
    id: 'evidence-wall',
    name: 'Evidence & Verification Test Wall',
    roomId: 'VERIFICATION_LAB',
    position: [0.0, 10.8, 3.65],
    rotationY: 0,
    role: 'Deterministic Verification Matrix',
    status: 'Cleanroom Armed',
    description: 'Architectural evidence retention and test provenance wall with deterministic check groups and audit cassette rails.',
  },
  'repository-vault': {
    id: 'repository-vault',
    name: 'Repository Vault Dock',
    roomId: 'VERIFICATION_LAB',
    position: [4.5, 10.8, 1.0],
    rotationY: 0,
    role: 'Base Branch Materialization',
    status: 'Git Archive Dock',
    description: 'Sleek terminal dock where verified candidate commits materialize into the primary base branch.',
  },

  // ── Floor 4: Browser QA Lab (Y = 14.4m) ──────────────────────────────────
  'browser-qa-matrix': {
    id: 'browser-qa-matrix',
    name: 'Device Matrix Wall',
    roomId: 'BROWSER_QA_LAB',
    position: [0.0, 14.4, 1.0],
    rotationY: 0,
    role: 'Playwright DOM Validation',
    status: 'Matrix Bench',
    description: 'Deterministic multi-viewport testing bench for real DOM inspection and visual assertions.',
  },
  'browser-qa-station': {
    id: 'browser-qa-station',
    name: 'QA Interaction & Event Capture Console',
    roomId: 'BROWSER_QA_LAB',
    position: [-4.0, 14.4, 0.5],
    rotationY: 0,
    role: 'Interaction Assertion & DOM Event Capture',
    status: 'Active Rig',
    description: 'Dedicated technician console for manual and synthetic DOM interaction capture, gesture verification, and browser session recording.',
  },

  // ── Floor 5: Infrastructure Server Bay (Y = 18.0m) ───────────────────────
  'omniroute-rack': {
    id: 'omniroute-rack',
    name: 'OmniRoute Gateway Rack',
    roomId: 'INFRASTRUCTURE_ROOM',
    position: [-2.5, 18.0, 1.0],
    rotationY: 0,
    role: 'Inference Infrastructure',
    status: 'Gateway Standby',
    description: 'Dual 42U server cabinet routing model invocations. Strictly non-humanoid infrastructure.',
  },
  'dispatch-console': {
    id: 'dispatch-console',
    name: 'Personal OS Dispatch Console',
    roomId: 'INFRASTRUCTURE_ROOM',
    position: [2.0, 18.0, 1.0],
    rotationY: Math.PI / 4,
    role: 'Background Job Dispatch & Kernel Scheduler',
    status: 'Operational Kernel',
    description: 'Deterministic Background Job Execution Console. Dispatches cron, interval, and one-time tasks.',
  },

  // ── Floor 6: Approval Control (Y = 21.6m) ─────────────────────────────────
  'approval-plinth': {
    id: 'approval-plinth',
    name: 'Approval Plinth',
    roomId: 'APPROVAL_MEZZANINE',
    position: [0.0, 21.6, 1.0],
    rotationY: 0,
    role: 'Human Authority Station',
    status: 'Awaiting Candidate',
    description: 'Command plinth where candidate commits halt for explicit human authorization.',
  },
}
