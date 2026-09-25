/**
 * Gravitas 3D Headquarters — Architectural Room Definitions & Camera Framing Presets
 * Recomposed presets for the 7-level vertical architectural cutaway tower.
 */

import type { CameraFramingPreset, RoomDefinition, RoomId } from '../types.js'

export const HQ_OVERVIEW_PRESET: CameraFramingPreset = {
  id: 'HQ_OVERVIEW',
  target: [0.5, 12.6, 0.0],
  position: [-14.0, 15.0, -44.0],
  description: 'Headquarters Full Vertical Architectural Cutaway Dollhouse Overview',
}

// Focused Workstation & Character Camera Presets
export const WORKSTATION_PRESETS: Record<string, CameraFramingPreset> = {
  WS_FRONTEND: {
    id: 'WS_FRONTEND',
    target: [-3.5, 8.0, 0.6],
    position: [-5.5, 8.8, -2.2],
    description: 'Frontend Engineer Workstation & Design Surface Focus',
  },
  WS_BACKEND: {
    id: 'WS_BACKEND',
    target: [2.5, 8.0, 0.6],
    position: [0.5, 8.8, -2.2],
    description: 'Backend Engineer Workstation & Systems Array Focus',
  },
  WS_PLANNING: {
    id: 'WS_PLANNING',
    target: [-1.5, 4.4, 0.5],
    position: [-3.5, 5.2, -2.2],
    description: 'Mission Control Planning Table Focus',
  },
  WS_VERIFIER: {
    id: 'WS_VERIFIER',
    target: [0.0, 11.6, 0.8],
    position: [-2.8, 12.6, -3.2],
    description: 'Independent Verification Console & Cleanroom Bench',
  },
  WS_DEVICE_BENCH: {
    id: 'WS_DEVICE_BENCH',
    target: [0.0, 15.2, 0.8],
    position: [-2.8, 16.2, -3.2],
    description: 'Browser QA Multi-Device Testing Bench Focus',
  },
  WS_BROWSER_QA: {
    id: 'WS_BROWSER_QA',
    target: [0.0, 15.2, 0.8],
    position: [-2.8, 16.2, -3.2],
    description: 'Browser QA Multi-Device Testing Bench Focus',
  },
}

export const CHARACTER_PRESETS: Record<string, CameraFramingPreset> = {
  CHAR_FRONTEND: {
    id: 'CHAR_FRONTEND',
    target: [-3.5, 8.15, 0.9],
    position: [-4.6, 8.65, -0.6],
    description: 'Frontend Engineer Mascot & Workstation Context Closeup',
  },
  CHAR_BACKEND: {
    id: 'CHAR_BACKEND',
    target: [2.5, 8.15, 0.9],
    position: [1.4, 8.65, -0.6],
    description: 'Backend Engineer Mascot & Workstation Context Closeup',
  },
  CHAR_PLANNER: {
    id: 'CHAR_PLANNER',
    target: [-1.5, 4.35, -0.6],
    position: [-2.6, 4.85, -2.0],
    description: 'Chief Planner Mascot & Drafting Folio Context Focus',
  },
  CHAR_REVIEWER: {
    id: 'CHAR_REVIEWER',
    target: [0.0, 11.6, 0.5],
    position: [-1.8, 12.4, -2.2],
    description: 'Independent Reviewer Mascot & Inspection Loupe Context Focus',
  },
  CHAR_BROWSER_QA: {
    id: 'CHAR_BROWSER_QA',
    target: [0.0, 15.2, 0.4],
    position: [-1.8, 16.0, -2.2],
    description: 'Browser QA Specialist Mascot & Multi-Viewport Testing Context Focus',
  },
}

export const ELEVATOR_PRESET: CameraFramingPreset = {
  id: 'ELEVATOR_VIEW',
  target: [8.4, 12.0, 0.0],
  position: [14.0, 15.0, -10.0],
  description: 'Vertical Architectural Elevator Shaft & Exterior Carriage Transit',
}

export const MEZZANINE_PRESET: CameraFramingPreset = {
  id: 'MEZZANINE_PRESET',
  target: [0.0, 1.2, 0.5],
  position: [-5.5, 2.8, -6.8],
  description: 'Mezzanine Creative Studio & Office Lounge Space',
}

export const ROOM_DEFINITIONS: Record<RoomId, RoomDefinition> = {
  MISSION_CONTROL: {
    id: 'MISSION_CONTROL',
    name: 'Mission Control',
    numberKey: '1',
    center: [0.0, 3.6, 0.0],
    size: [14.0, 3.4, 8.0],
    accentColor: '#38bdf8',
    cameraPreset: {
      id: 'ROOM_MISSION_CONTROL',
      target: [0.0, 4.8, 0.5],
      position: [-5.5, 6.4, -6.8],
      description: 'Mission Control Planning Table & Blueprint DAG Surface',
    },
  },
  AGENT_OPERATIONS: {
    id: 'AGENT_OPERATIONS',
    name: 'Agent Operations Floor',
    numberKey: '2',
    center: [0.0, 7.2, 0.0],
    size: [14.0, 3.4, 8.0],
    accentColor: '#2b59c3',
    cameraPreset: {
      id: 'ROOM_AGENT_OPERATIONS',
      target: [0.0, 7.8, 0.5],
      position: [0.0, 11.0, -6.8],
      description: 'Agent Operations Dollhouse View: Balanced Frontend, Reviewer & Backend Hero Staging',
    },
  },
  VERIFICATION_LAB: {
    id: 'VERIFICATION_LAB',
    name: 'Verification Cleanroom',
    numberKey: '3',
    center: [0.0, 10.8, 0.0],
    size: [14.0, 3.4, 8.0],
    accentColor: '#3d7a68',
    cameraPreset: {
      id: 'ROOM_VERIFICATION_LAB',
      target: [0.0, 12.0, 0.5],
      position: [-5.5, 13.6, -6.8],
      description: 'Independent Verification Console, Verifier Figure & Cleanroom Glass',
    },
  },
  BROWSER_QA_LAB: {
    id: 'BROWSER_QA_LAB',
    name: 'Browser QA Lab',
    numberKey: '4',
    center: [0.0, 14.4, 0.0],
    size: [14.0, 3.4, 8.0],
    accentColor: '#0d9488',
    cameraPreset: {
      id: 'ROOM_BROWSER_QA_LAB',
      target: [0.0, 15.6, 0.5],
      position: [-5.5, 17.2, -6.8],
      description: 'Multi-Device Testing Matrix Rig & Observation Bench',
    },
  },
  INFRASTRUCTURE_ROOM: {
    id: 'INFRASTRUCTURE_ROOM',
    name: 'Infrastructure Server Bay',
    numberKey: '5',
    center: [0.0, 18.0, 0.0],
    size: [14.0, 3.4, 8.0],
    accentColor: '#475569',
    cameraPreset: {
      id: 'ROOM_INFRASTRUCTURE_ROOM',
      target: [0.0, 19.2, 0.5],
      position: [-5.5, 20.8, -6.8],
      description: '42U OmniRoute Gateway & Compute Server Racks with Cable Trays',
    },
  },
  APPROVAL_MEZZANINE: {
    id: 'APPROVAL_MEZZANINE',
    name: 'Approval Control Mezzanine',
    numberKey: '6',
    center: [0.0, 21.6, 0.0],
    size: [14.0, 3.4, 8.0],
    accentColor: '#d97706',
    cameraPreset: {
      id: 'ROOM_APPROVAL_MEZZANINE',
      target: [0.0, 22.8, 0.5],
      position: [-5.5, 24.4, -6.8],
      description: 'Elevated Human Governance Console & Operations Sightline',
    },
  },
}

export function getRoomByKey(key: string): RoomDefinition | undefined {
  const norm = key.toUpperCase()
  if (norm === 'M' || norm === '0') {
    return {
      id: 'APPROVAL_MEZZANINE' as RoomId,
      name: 'Creative Studio Mezzanine',
      numberKey: 'M',
      center: [0.0, 0.0, 0.0],
      size: [14.0, 3.4, 8.0],
      accentColor: '#f59e0b',
      cameraPreset: MEZZANINE_PRESET,
    }
  }
  return Object.values(ROOM_DEFINITIONS).find((r) => r.numberKey === norm)
}
