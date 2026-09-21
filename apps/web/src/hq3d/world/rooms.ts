/**
 * Gravitas 3D Headquarters — Architectural Room Definitions & Camera Framing Presets
 */

import type { CameraFramingPreset, RoomDefinition, RoomId } from '../types.js'

export const HQ_OVERVIEW_PRESET: CameraFramingPreset = {
  id: 'HQ_OVERVIEW',
  target: [0.0, 1.2, 3.0],
  position: [-24.0, 18.0, -24.0],
  description: 'Headquarters Full Overview Framing',
}

export const ROOM_DEFINITIONS: Record<RoomId, RoomDefinition> = {
  MISSION_CONTROL: {
    id: 'MISSION_CONTROL',
    name: 'Mission Control',
    numberKey: '1',
    center: [-4.0, 0.85, 7.0],
    size: [8.0, 3.0, 6.0],
    accentColor: '#38bdf8',
    cameraPreset: {
      id: 'ROOM_MISSION_CONTROL',
      target: [-4.0, 0.85, 7.0],
      position: [-10.0, 9.0, -3.0],
      description: 'Mission Control & Planning Table Framing',
    },
  },
  AGENT_OPERATIONS: {
    id: 'AGENT_OPERATIONS',
    name: 'Agent Operations Floor',
    numberKey: '2',
    center: [-4.0, 0.85, 0.0],
    size: [12.0, 3.0, 8.0],
    accentColor: '#2b59c3',
    cameraPreset: {
      id: 'ROOM_AGENT_OPERATIONS',
      target: [-4.0, 0.85, 0.0],
      position: [-12.0, 8.0, -10.0],
      description: 'Agent Operations Desks Framing',
    },
  },
  VERIFICATION_LAB: {
    id: 'VERIFICATION_LAB',
    name: 'Verification Cleanroom',
    numberKey: '3',
    center: [6.0, 1.0, 6.0],
    size: [10.0, 3.0, 6.0],
    accentColor: '#3d7a68',
    cameraPreset: {
      id: 'ROOM_VERIFICATION_LAB',
      target: [6.0, 1.0, 6.0],
      position: [0.0, 8.0, -4.0],
      description: 'Independent Verification Lab Framing',
    },
  },
  BROWSER_QA_LAB: {
    id: 'BROWSER_QA_LAB',
    name: 'Browser QA Lab',
    numberKey: '4',
    center: [6.0, 1.2, 0.0],
    size: [10.0, 3.0, 8.0],
    accentColor: '#0d9488',
    cameraPreset: {
      id: 'ROOM_BROWSER_QA_LAB',
      target: [6.0, 1.2, 0.0],
      position: [0.0, 7.0, -8.0],
      description: 'Device Matrix Wall Framing',
    },
  },
  INFRASTRUCTURE_ROOM: {
    id: 'INFRASTRUCTURE_ROOM',
    name: 'Infrastructure Server Bay',
    numberKey: '5',
    center: [-12.0, 1.5, -9.0],
    size: [6.0, 3.5, 6.0],
    accentColor: '#475569',
    cameraPreset: {
      id: 'ROOM_INFRASTRUCTURE_ROOM',
      target: [-12.0, 1.5, -9.0],
      position: [-6.0, 6.0, -16.0],
      description: 'OmniRoute & Gateway Racks Framing',
    },
  },
  APPROVAL_MEZZANINE: {
    id: 'APPROVAL_MEZZANINE',
    name: 'Approval Control Mezzanine',
    numberKey: '6',
    center: [0.0, 4.0, 12.5],
    size: [20.0, 3.5, 4.0],
    accentColor: '#d97706',
    cameraPreset: {
      id: 'ROOM_APPROVAL_MEZZANINE',
      target: [0.0, 4.0, 12.5],
      position: [-8.0, 10.0, 4.0],
      description: 'Approval Mezzanine Plinth Framing',
    },
  },
}

export function getRoomByKey(key: string): RoomDefinition | undefined {
  return Object.values(ROOM_DEFINITIONS).find((r) => r.numberKey === key)
}
