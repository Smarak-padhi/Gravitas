/**
 * Unit Tests for Gravitas 3D Headquarters Scene Foundation (Wave 12B)
 * Validates room presets, geometry generation, camera bounds, picking, and teardown.
 */

import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  ROOM_DEFINITIONS,
  getRoomByKey,
  HQ_OVERVIEW_PRESET,
} from '../world/rooms.js'
import { STATION_DEFINITIONS } from '../world/stations.js'
import { MaterialLibrary } from '../materials/materials.js'
import { HqArchitecture } from '../geometry/architecture.js'
import { HqFurniture } from '../geometry/furniture.js'
import { HqInfrastructure } from '../geometry/infrastructure.js'
import { HqCharacters } from '../geometry/characters.js'
import { HqCameraRig } from '../engine/HqCamera.js'
import { HqPicking } from '../engine/HqPicking.js'
import { HqScene } from '../engine/HqScene.js'

describe('3D Headquarters — Architectural World & Stations', () => {
  it('defines all 6 primary architectural rooms with Keys 1 through 6', () => {
    const roomKeys = Object.keys(ROOM_DEFINITIONS)
    expect(roomKeys).toHaveLength(6)

    expect(getRoomByKey('1')?.name).toBe('Mission Control')
    expect(getRoomByKey('2')?.name).toBe('Agent Operations Floor')
    expect(getRoomByKey('3')?.name).toBe('Verification Cleanroom')
    expect(getRoomByKey('4')?.name).toBe('Browser QA Lab')
    expect(getRoomByKey('5')?.name).toBe('Infrastructure Server Bay')
    expect(getRoomByKey('6')?.name).toBe('Approval Control Mezzanine')
    expect(getRoomByKey('7')).toBeUndefined()
  })

  it('defines valid camera framing presets for all rooms and overview', () => {
    expect(HQ_OVERVIEW_PRESET.id).toBe('HQ_OVERVIEW')
    expect(HQ_OVERVIEW_PRESET.position).toHaveLength(3)
    expect(HQ_OVERVIEW_PRESET.target).toHaveLength(3)

    for (const room of Object.values(ROOM_DEFINITIONS)) {
      expect(room.cameraPreset.target).toHaveLength(3)
      expect(room.cameraPreset.position).toHaveLength(3)
      expect(room.cameraPreset.description).toBeTruthy()
    }
  })

  it('defines 10 authoritative prototype stations mapped to rooms', () => {
    const stations = Object.values(STATION_DEFINITIONS)
    expect(stations).toHaveLength(10)

    for (const st of stations) {
      expect(ROOM_DEFINITIONS[st.roomId]).toBeDefined()
      expect(st.position).toHaveLength(3)
      expect(st.status).toBeTruthy()
      expect(st.description).toBeTruthy()
    }

    // Crucial check: OmniRoute and server racks are infrastructure, not humanoids
    expect(STATION_DEFINITIONS['omniroute-rack'].roomId).toBe('INFRASTRUCTURE_ROOM')
    expect(STATION_DEFINITIONS['omniroute-rack'].role).toBe('Inference Infrastructure')
  })
})

describe('3D Headquarters — Materials & Geometry Assembly', () => {
  it('instantiates MaterialLibrary and disposes cleanly', () => {
    const materials = new MaterialLibrary()
    expect(materials.walnut).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(materials.brass).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(materials.limestone).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(materials.glass.transparent).toBe(true)

    // Should dispose without error
    expect(() => materials.dispose()).not.toThrow()
  })

  it('constructs architectural geometry with cleanroom glass and mezzanine', () => {
    const materials = new MaterialLibrary()
    const arch = new HqArchitecture(materials)

    expect(arch.group.children.length).toBeGreaterThan(0)
    const glassMesh = arch.group.getObjectByName('cleanroom-glass-wall')
    expect(glassMesh).toBeDefined()

    expect(() => arch.dispose()).not.toThrow()
    materials.dispose()
  })

  it('constructs workstations and stations with valid userData tags', () => {
    const materials = new MaterialLibrary()
    const furniture = new HqFurniture(materials)

    const planningTable = furniture.group.getObjectByName('station:planning-table')
    expect(planningTable).toBeDefined()
    expect(planningTable?.userData.type).toBe('station')
    expect(planningTable?.userData.id).toBe('planning-table')

    const verifierConsole = furniture.group.getObjectByName('station:verifier-console')
    expect(verifierConsole).toBeDefined()
    expect(verifierConsole?.userData.type).toBe('station')

    expect(() => furniture.dispose()).not.toThrow()
    materials.dispose()
  })

  it('constructs infrastructure server cabinets with userData tags', () => {
    const materials = new MaterialLibrary()
    const infra = new HqInfrastructure(materials)

    const rack = infra.group.getObjectByName('station:omniroute-rack')
    expect(rack).toBeDefined()
    expect(rack?.userData.type).toBe('station')
    expect(rack?.userData.id).toBe('omniroute-rack')

    expect(() => infra.dispose()).not.toThrow()
    materials.dispose()
  })

  it('constructs static scale reference figures (Codex, FCC, Verifier)', () => {
    const materials = new MaterialLibrary()
    const chars = new HqCharacters(materials)

    const codex = chars.group.getObjectByName('character:char-codex')
    expect(codex).toBeDefined()
    expect(codex?.userData.type).toBe('character')

    const fcc = chars.group.getObjectByName('character:char-fcc')
    expect(fcc).toBeDefined()

    const verifier = chars.group.getObjectByName('character:char-verifier')
    expect(verifier).toBeDefined()

    expect(() => chars.dispose()).not.toThrow()
    materials.dispose()
  })
})

describe('3D Headquarters — Camera Rig & Bounds', () => {
  it('initializes camera with architectural 30° FOV and overview coordinates', () => {
    const rig = new HqCameraRig(16 / 9)
    expect(rig.camera.fov).toBe(30)
    expect(rig.camera.position.x).toBeCloseTo(HQ_OVERVIEW_PRESET.position[0])
    expect(rig.camera.position.y).toBeCloseTo(HQ_OVERVIEW_PRESET.position[1])
    expect(rig.camera.position.z).toBeCloseTo(HQ_OVERVIEW_PRESET.position[2])
  })

  it('snaps camera instantly when prefers-reduced-motion is true', () => {
    const rig = new HqCameraRig(16 / 9)
    const room = ROOM_DEFINITIONS.VERIFICATION_LAB

    rig.setFraming(room.cameraPreset, true /* reducedMotion */)
    // Instant snap should match immediately without needing update() ticks
    expect(rig.camera.position.x).toBeCloseTo(room.cameraPreset.position[0])
    expect(rig.camera.position.y).toBeCloseTo(room.cameraPreset.position[1])
    expect(rig.camera.position.z).toBeCloseTo(room.cameraPreset.position[2])
  })

  it('smoothly interpolates camera position over frames when reduced-motion is false', () => {
    const rig = new HqCameraRig(16 / 9)
    const room = ROOM_DEFINITIONS.INFRASTRUCTURE_ROOM

    rig.setFraming(room.cameraPreset, false /* smooth motion */)
    // Before update, position should still be at overview
    expect(rig.camera.position.x).toBeCloseTo(HQ_OVERVIEW_PRESET.position[0])

    // After several update ticks, should interpolate towards target
    for (let i = 0; i < 60; i++) {
      rig.update()
    }
    expect(rig.camera.position.x).toBeCloseTo(room.cameraPreset.position[0], 0.1)
  })

  it('bounds zoom distance within [4.0, 45.0] meters', () => {
    const rig = new HqCameraRig(16 / 9)
    const target = new THREE.Vector3(...HQ_OVERVIEW_PRESET.target)

    // Extreme zoom in
    for (let i = 0; i < 50; i++) {
      rig.onWheel(-1000)
    }
    const distIn = rig.camera.position.distanceTo(target)
    expect(distIn).toBeGreaterThanOrEqual(HqCameraRig.MIN_DISTANCE - 0.01)

    // Extreme zoom out
    for (let i = 0; i < 50; i++) {
      rig.onWheel(1000)
    }
    const distOut = rig.camera.position.distanceTo(target)
    expect(distOut).toBeLessThanOrEqual(HqCameraRig.MAX_DISTANCE + 0.01)
  })
})

describe('3D Headquarters — Interactive Raycasting & Picking', () => {
  it('picks station objects and renders selection indicator ring', () => {
    const materials = new MaterialLibrary()
    const scene = new THREE.Scene()
    const picking = new HqPicking(materials)

    // Create a mock station object with userData
    const stationGroup = new THREE.Group()
    stationGroup.name = 'station:planning-table'
    stationGroup.userData = { type: 'station', id: 'planning-table' }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), materials.walnut)
    stationGroup.add(mesh)
    stationGroup.position.set(0, 0, 0)
    scene.add(stationGroup)

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)

    // Direct center pick (NDC: 0, 0)
    const picked = picking.pick(0, 0, camera, scene)
    expect(picked).not.toBeNull()
    expect(picked?.id).toBe('planning-table')
    expect(picked?.type).toBe('station')
    expect(picked?.room).toBe('Mission Control')

    // Indicator ring should now be visible
    expect(picking.getSelectionMesh().visible).toBe(true)

    // Clear selection
    picking.clearSelection()
    expect(picking.getSelectionMesh().visible).toBe(false)
    expect(picking.getSelectedEntity()).toBeNull()

    picking.dispose()
    materials.dispose()
  })
})

describe('3D Headquarters — Scene Graph & Lighting Assembly', () => {
  it('assembles complete scene graph and disposes without memory leaks', () => {
    const hqScene = new HqScene()
    expect(hqScene.scene.children.length).toBeGreaterThan(4)

    // Lights must be present
    const lights = hqScene.scene.children.filter((c) => c instanceof THREE.Light)
    expect(lights.length).toBeGreaterThanOrEqual(3)

    // All geometry groups attached
    expect(hqScene.scene.getObjectByName('hq-architecture')).toBeDefined()
    expect(hqScene.scene.getObjectByName('hq-furniture')).toBeDefined()
    expect(hqScene.scene.getObjectByName('hq-infrastructure')).toBeDefined()
    expect(hqScene.scene.getObjectByName('hq-characters')).toBeDefined()
    expect(hqScene.scene.getObjectByName('hq-task-dossiers')).toBeDefined()

    expect(() => hqScene.dispose()).not.toThrow()
    expect(hqScene.scene.children).toHaveLength(0)
  })

  it('reconciles authoritative world state into scene objects and station indicators', async () => {
    const hqScene = new HqScene()
    const { deriveWorldState } = await import('../world/worldState.js')
    const { FIXTURE_E_WORKER_RUNNING_GATEWAY_ACTIVE, FIXTURE_A_EMPTY } = await import('../world/fixtures.js')

    const stateE = deriveWorldState(FIXTURE_E_WORKER_RUNNING_GATEWAY_ACTIVE)
    hqScene.reconcileWorld(stateE)

    // Omniroute rack must be active
    const rackLed = hqScene.scene.getObjectByName('omniroute-activity-led') as THREE.Mesh
    expect(rackLed).toBeDefined()
    expect(rackLed.material).toBe(hqScene.materials.statusRunning)

    // FCC figure should be visible
    const fccFig = hqScene.characters.figureMap.get('char-fcc')
    expect(fccFig?.visible).toBe(true)

    // Empty state should clear activity
    const stateA = deriveWorldState(FIXTURE_A_EMPTY)
    hqScene.reconcileWorld(stateA)
    expect(rackLed.material).toBe(hqScene.materials.gunmetal)
    expect(fccFig?.visible).toBe(false)

    hqScene.dispose()
  })
})
