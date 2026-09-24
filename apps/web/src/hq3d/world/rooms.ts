/**
 * Gravitas 3D Headquarters — Architectural Room Definitions & Camera Framing Presets
 * Recomposed presets focused tightly on hero subjects with rich contextual depth.
 */

import type { CameraFramingPreset, RoomDefinition, RoomId } from '../types.js'

export const HQ_OVERVIEW_PRESET: CameraFramingPreset = {
  id: 'HQ_OVERVIEW',
  target: [0.0, 2.6, 1.2],
  position: [-18.5, 13.0, -17.5],
  description: 'Headquarters Full Vertical Cutaway Overview',
}

// Wave 12K Focused Workstation & Character Camera Presets
export const WORKSTATION_PRESETS: Record<string, CameraFramingPreset> = {
  WS_FRONTEND: {
    id: 'WS_FRONTEND',
    target: [-6.5, 1.0, 1.2],
    position: [-8.4, 2.2, 3.2],
    description: 'Frontend Engineer Workstation & Laptop Focus',
  },
  WS_BACKEND: {
    id: 'WS_BACKEND',
    target: [-1.8, 1.0, 1.2],
    position: [-3.8, 2.2, 3.2],
    description: 'Backend Engineer Workstation & Telemetry Focus',
  },
  WS_PLANNING: {
    id: 'WS_PLANNING',
    target: [-4.5, 0.9, 5.5],
    position: [-6.5, 2.5, 7.5],
    description: 'Mission Control Planning Table Focus',
  },
  WS_VERIFIER: {
    id: 'WS_VERIFIER',
    target: [6.0, 1.1, 6.5],
    position: [4.0, 2.4, 4.5],
    description: 'Independent Verification Console & Cleanroom Bench',
  },
}

export const CHARACTER_PRESETS: Record<string, CameraFramingPreset> = {
  CHAR_FRONTEND: {
    id: 'CHAR_FRONTEND',
    target: [-6.5, 1.05, 1.2],
    position: [-7.8, 1.8, 2.6],
    description: 'Frontend Engineer Mascot & Stylized Ponytail Focus',
  },
  CHAR_BACKEND: {
    id: 'CHAR_BACKEND',
    target: [-1.8, 1.05, 1.2],
    position: [-3.1, 1.8, 2.6],
    description: 'Backend Engineer Mascot & Headset Focus',
  },
  CHAR_PLANNER: {
    id: 'CHAR_PLANNER',
    target: [-4.5, 1.1, 4.6],
    position: [-6.0, 1.9, 6.2],
    description: 'Chief Planner Mascot & Drafting Folio Focus',
  },
  CHAR_REVIEWER: {
    id: 'CHAR_REVIEWER',
    target: [6.0, 1.1, 6.0],
    position: [4.2, 2.0, 4.8],
    description: 'Independent Reviewer Mascot & Inspection Loupe Focus',
  },
}

export const ELEVATOR_PRESET: CameraFramingPreset = {
  id: 'ELEVATOR_VIEW',
  target: [0.0, 2.4, 9.8],
  position: [0.0, 3.2, 4.2],
  description: 'Vertical Elevator Shaft & Articulated Carriage Transit',
}

export const ROOM_DEFINITIONS: Record<RoomId, RoomDefinition> = {
  MISSION_CONTROL: {
    id: 'MISSION_CONTROL',
    name: 'Mission Control',
    numberKey: '1',
    center: [-4.5, 0.85, 5.5],
    size: [6.5, 3.0, 5.5],
    accentColor: '#38bdf8',
    cameraPreset: {
      id: 'ROOM_MISSION_CONTROL',
      target: [-4.5, 0.85, 5.5],
      position: [-7.8, 3.8, 1.8],
      description: 'Mission Control Planning Table & Blueprint DAG Surface',
    },
  },
  AGENT_OPERATIONS: {
    id: 'AGENT_OPERATIONS',
    name: 'Agent Operations Floor',
    numberKey: '2',
    center: [-4.2, 0.85, 0.5],
    size: [10.0, 3.0, 7.5],
    accentColor: '#2b59c3',
    cameraPreset: {
      id: 'ROOM_AGENT_OPERATIONS',
      target: [-4.5, 1.0, 1.2],
      position: [-9.2, 3.4, 4.2],
      description: 'Agent Operations Workstations & Seated Prototypes (Codex & FCC)',
    },
  },
  VERIFICATION_LAB: {
    id: 'VERIFICATION_LAB',
    name: 'Verification Cleanroom',
    numberKey: '3',
    center: [6.0, 1.1, 6.2],
    size: [8.5, 3.0, 5.5],
    accentColor: '#3d7a68',
    cameraPreset: {
      id: 'ROOM_VERIFICATION_LAB',
      target: [6.0, 1.1, 6.2],
      position: [2.2, 3.2, 2.5],
      description: 'Independent Verification Console, Verifier Figure & Cleanroom Glass',
    },
  },
  BROWSER_QA_LAB: {
    id: 'BROWSER_QA_LAB',
    name: 'Browser QA Lab',
    numberKey: '4',
    center: [6.2, 1.2, -0.5],
    size: [8.5, 3.0, 6.5],
    accentColor: '#0d9488',
    cameraPreset: {
      id: 'ROOM_BROWSER_QA_LAB',
      target: [6.2, 1.2, -1.2],
      position: [4.2, 3.2, 2.4],
      description: 'Multi-Device Testing Matrix Rig & Observation Bench',
    },
  },
  INFRASTRUCTURE_ROOM: {
    id: 'INFRASTRUCTURE_ROOM',
    name: 'Infrastructure Server Bay',
    numberKey: '5',
    center: [-8.8, 1.4, -5.8],
    size: [5.5, 3.5, 5.0],
    accentColor: '#475569',
    cameraPreset: {
      id: 'ROOM_INFRASTRUCTURE_ROOM',
      target: [-8.8, 1.4, -5.6],
      position: [-5.6, 3.4, -1.2],
      description: '42U OmniRoute Gateway & Compute Server Racks with Cable Trays',
    },
  },
  APPROVAL_MEZZANINE: {
    id: 'APPROVAL_MEZZANINE',
    name: 'Approval Control Mezzanine',
    numberKey: '6',
    center: [0.0, 3.2, 8.5],
    size: [18.0, 3.5, 3.6],
    accentColor: '#d97706',
    cameraPreset: {
      id: 'ROOM_APPROVAL_MEZZANINE',
      target: [0.0, 3.1, 8.5],
      position: [0.0, 4.6, 2.2],
      description: 'Elevated Human Governance Console & Operations Sightline',
    },
  },
}

export function getRoomByKey(key: string): RoomDefinition | undefined {
  const norm = key.toUpperCase()
  if (norm === 'M') {
    return ROOM_DEFINITIONS.APPROVAL_MEZZANINE
  }
  return Object.values(ROOM_DEFINITIONS).find((r) => r.numberKey === norm)
}
