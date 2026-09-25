/**
 * Scene Graph & Architectural Lighting Assembly for Gravitas 3D Headquarters
 * Features soft architectural-model lighting:
 * - Soft readable directional key with filtered shadow radius (no harsh black voids)
 * - Elevated hemisphere fill illuminating shadow interiors
 * - Dedicated local architectural pools for Mission Control, Operations, Cleanroom, QA, Infrastructure, and Approval Mezzanine
 */

import * as THREE from 'three'
import { MaterialLibrary } from '../materials/materials.js'
import { HqArchitecture } from '../geometry/architecture.js'
import { HqFurniture } from '../geometry/furniture.js'
import { HqInfrastructure } from '../geometry/infrastructure.js'
import { HqCharacters } from '../geometry/characters.js'
import { HqTaskDossiers } from '../geometry/dossiers.js'
import { HandoffConduitManager } from '../geometry/handoffConduits.js'
import { CharacterMotionController } from '../motion/CharacterMotionController.js'
import { deriveCharacterSpatialIntents } from '../motion/spatialIntent.js'
import { ArtifactMotionController } from '../custody/ArtifactMotionController.js'
import { deriveArtifactCustody } from '../custody/artifactCustody.js'
import type { WorldState } from '../world/worldState.js'
import { deriveRolePresentationStates } from '../roles/roleStationMapping.js'

export type AtmosphereMode = 'DAY' | 'EVENING' | 'NIGHT'

export class HqScene {
  public readonly scene: THREE.Scene
  private currentAtmosphere: AtmosphereMode = 'DAY'
  public readonly materials: MaterialLibrary
  public readonly architecture: HqArchitecture
  public readonly furniture: HqFurniture
  public readonly infrastructure: HqInfrastructure
  public readonly characters: HqCharacters
  public readonly dossiers: HqTaskDossiers
  public readonly handoffs: HandoffConduitManager
  public readonly motion: CharacterMotionController
  public readonly custodyMotion: ArtifactMotionController

  // Lights
  private readonly keyLight: THREE.DirectionalLight
  private readonly fillLight: THREE.DirectionalLight
  private readonly ambientLight: THREE.HemisphereLight
  private readonly spotPlanning: THREE.SpotLight
  private readonly spotOperations: THREE.SpotLight
  private readonly spotCleanroom: THREE.SpotLight
  private readonly spotBrowserQa: THREE.SpotLight
  private readonly spotInfrastructure: THREE.SpotLight
  private readonly spotApproval: THREE.SpotLight

  // Floor 1 Dedicated Architectural Lighting Layers (Wave 12J)
  private readonly spotPlanningWash: THREE.SpotLight
  private readonly spotPlanningDispatch: THREE.SpotLight

  // Floor 2 Dedicated Architectural Lighting Layers
  private readonly spotOperationsWash: THREE.SpotLight
  private readonly spotOperationsDeskL: THREE.SpotLight
  private readonly spotOperationsDeskR: THREE.SpotLight
  private readonly spotOperationsReviewer: THREE.SpotLight

  // Floor 3 Dedicated Architectural Lighting Layers (Wave 12K)
  private readonly spotCleanroomWash: THREE.SpotLight
  private readonly spotCleanroomEdge: THREE.SpotLight

  // Floor 4 Dedicated Architectural Lighting Layers (Wave 12K)
  private readonly spotBrowserQaWash: THREE.SpotLight
  private readonly spotBrowserQaInteraction: THREE.SpotLight

  constructor() {
    this.scene = new THREE.Scene()
    // Architectural dark slate environment matching Gravitas application shell
    this.scene.background = new THREE.Color(0x0e1219)

    // Instantiate Material Library
    this.materials = new MaterialLibrary()

    // 1. Soft Architectural Museum Key Directional Light (calibrated shadow camera frustum)
    this.keyLight = new THREE.DirectionalLight(0xfff6ec, 1.35)
    this.keyLight.position.set(-18.0, 36.0, -28.0)
    this.keyLight.castShadow = true
    this.keyLight.shadow.mapSize.width = 1024
    this.keyLight.shadow.mapSize.height = 1024
    this.keyLight.shadow.camera.near = 5.0
    this.keyLight.shadow.camera.far = 80.0
    this.keyLight.shadow.camera.left = -12.0
    this.keyLight.shadow.camera.right = 12.0
    this.keyLight.shadow.camera.top = 28.0
    this.keyLight.shadow.camera.bottom = -2.0
    this.keyLight.shadow.bias = -0.0003
    this.keyLight.shadow.radius = 1.5
    this.scene.add(this.keyLight)

    // 2. Opposing Soft Architectural Fill Light (illuminates shadow faces, prevents black voids)
    this.fillLight = new THREE.DirectionalLight(0x8faec7, 0.8)
    this.fillLight.position.set(20.0, 26.0, -20.0)
    this.fillLight.target.position.set(0.0, 12.6, 0.0)
    this.scene.add(this.fillLight)
    this.scene.add(this.fillLight.target)

    // 3. High-Ambiance Natural Skylight Fill
    this.ambientLight = new THREE.HemisphereLight(0xb8d2ec, 0x2b3442, 0.95)
    this.scene.add(this.ambientLight)

    // 4. Dedicated Architectural Spotlight Pools per floor level
    // Floor 1 (Y = 3.6m): Mission Control Planning Table, Strategy Wall & Dispatch Edge
    // 4a. Central Planning Table Downlight Pool
    this.spotPlanning = new THREE.SpotLight(0xffeedb, 2.2, 16.0, Math.PI / 3.4, 0.5, 1.1)
    this.spotPlanning.position.set(-1.2, 6.8, -0.6)
    this.spotPlanning.target.position.set(-1.2, 3.6, 0.4)
    this.scene.add(this.spotPlanning)
    this.scene.add(this.spotPlanning.target)

    // 4b. Strategy & Dependency Wall Wash Grazing Light
    this.spotPlanningWash = new THREE.SpotLight(0xffedd5, 2.0, 16.0, Math.PI / 3.2, 0.6, 1.1)
    this.spotPlanningWash.position.set(-1.0, 6.6, -0.8)
    this.spotPlanningWash.target.position.set(-1.0, 5.2, 3.6)
    this.scene.add(this.spotPlanningWash)
    this.scene.add(this.spotPlanningWash.target)

    // 4c. Dispatch & Transition Threshold Pool (East corridor toward elevator)
    this.spotPlanningDispatch = new THREE.SpotLight(0xffe4b5, 1.8, 12.0, Math.PI / 4.0, 0.5, 1.1)
    this.spotPlanningDispatch.position.set(3.2, 6.4, 0.0)
    this.spotPlanningDispatch.target.position.set(3.2, 3.6, 0.5)
    this.scene.add(this.spotPlanningDispatch)
    this.scene.add(this.spotPlanningDispatch.target)

    // Floor 2 (Y = 7.2m): Agent Operations Hero Room Architectural Light Rig
    // 4a. Central Operations Downlight Pool
    this.spotOperations = new THREE.SpotLight(0xfff4e6, 2.6, 16.0, Math.PI / 3.2, 0.6, 1.1)
    this.spotOperations.position.set(0.0, 10.4, 0.4)
    this.spotOperations.target.position.set(0.0, 7.2, 0.4)
    this.scene.add(this.spotOperations)
    this.scene.add(this.spotOperations.target)

    // 4b. Rear Wall Wash & Acoustic Slat Grazing Light
    this.spotOperationsWash = new THREE.SpotLight(0xfef3c7, 2.2, 16.0, Math.PI / 3.0, 0.7, 1.1)
    this.spotOperationsWash.position.set(0.0, 10.2, -1.2)
    this.spotOperationsWash.target.position.set(0.0, 8.6, 3.6)
    this.scene.add(this.spotOperationsWash)
    this.scene.add(this.spotOperationsWash.target)

    // 4c. Backend Workstation Task Light (Screen Left: X = 2.6)
    this.spotOperationsDeskL = new THREE.SpotLight(0xfffbeb, 1.4, 8.0, Math.PI / 4.2, 0.5, 1.1)
    this.spotOperationsDeskL.position.set(2.6, 9.8, 0.8)
    this.spotOperationsDeskL.target.position.set(2.6, 7.4, 1.0)
    this.scene.add(this.spotOperationsDeskL)
    this.scene.add(this.spotOperationsDeskL.target)

    // 4d. Frontend Workstation Task Light (Screen Right: X = -2.6)
    this.spotOperationsDeskR = new THREE.SpotLight(0xfffbeb, 1.4, 8.0, Math.PI / 4.2, 0.5, 1.1)
    this.spotOperationsDeskR.position.set(-2.6, 9.8, 0.8)
    this.spotOperationsDeskR.target.position.set(-2.6, 7.4, 1.0)
    this.scene.add(this.spotOperationsDeskR)
    this.scene.add(this.spotOperationsDeskR.target)

    // 4e. Reviewer Verification Station Task Light (Screen Center Forward: X = 0.0, Z = -0.1)
    this.spotOperationsReviewer = new THREE.SpotLight(0xffeedb, 1.6, 8.0, Math.PI / 4.2, 0.5, 1.1)
    this.spotOperationsReviewer.position.set(0.0, 9.8, -0.3)
    this.spotOperationsReviewer.target.position.set(0.0, 7.6, -0.1)
    this.scene.add(this.spotOperationsReviewer)
    this.scene.add(this.spotOperationsReviewer.target)

    // Floor 3 (Y = 10.8m): Verification Cleanroom
    // 4a. Central Verification Bench Downlight Pool
    this.spotCleanroom = new THREE.SpotLight(0xe6f4f8, 2.2, 16.0, Math.PI / 3.4, 0.5, 1.1)
    this.spotCleanroom.position.set(0.0, 14.0, 0.4)
    this.spotCleanroom.target.position.set(0.0, 10.8, 0.8)
    this.scene.add(this.spotCleanroom)
    this.scene.add(this.spotCleanroom.target)

    // 4b. Evidence Wall Grazing Wash Light
    this.spotCleanroomWash = new THREE.SpotLight(0xdbeafe, 1.8, 16.0, Math.PI / 3.2, 0.6, 1.1)
    this.spotCleanroomWash.position.set(0.0, 13.8, 1.2)
    this.spotCleanroomWash.target.position.set(0.0, 12.2, 3.65)
    this.scene.add(this.spotCleanroomWash)
    this.scene.add(this.spotCleanroomWash.target)

    // 4c. Candidate Circulation & Elevator Transition Edge
    this.spotCleanroomEdge = new THREE.SpotLight(0xf1f5f9, 1.6, 12.0, Math.PI / 4.0, 0.5, 1.1)
    this.spotCleanroomEdge.position.set(3.6, 13.6, 0.2)
    this.spotCleanroomEdge.target.position.set(3.6, 10.8, 0.4)
    this.scene.add(this.spotCleanroomEdge)
    this.scene.add(this.spotCleanroomEdge.target)

    // Floor 4 (Y = 14.4m): Browser QA Lab Matrix
    // 4a. Device Test Bench Downlight Pool
    this.spotBrowserQa = new THREE.SpotLight(0xe0f2fe, 2.2, 16.0, Math.PI / 3.4, 0.5, 1.1)
    this.spotBrowserQa.position.set(0.0, 17.6, 0.4)
    this.spotBrowserQa.target.position.set(0.0, 14.4, 0.8)
    this.scene.add(this.spotBrowserQa)
    this.scene.add(this.spotBrowserQa.target)

    // 4b. Viewport Observation Wall Grazing Light
    this.spotBrowserQaWash = new THREE.SpotLight(0xccfbf1, 1.8, 16.0, Math.PI / 3.2, 0.6, 1.1)
    this.spotBrowserQaWash.position.set(0.0, 17.4, 1.2)
    this.spotBrowserQaWash.target.position.set(0.0, 15.8, 3.65)
    this.scene.add(this.spotBrowserQaWash)
    this.scene.add(this.spotBrowserQaWash.target)

    // 4c. Interaction Test Zone & Device Rack Pool
    this.spotBrowserQaInteraction = new THREE.SpotLight(0xf0fdf4, 1.6, 12.0, Math.PI / 4.0, 0.5, 1.1)
    this.spotBrowserQaInteraction.position.set(-3.8, 17.2, 0.4)
    this.spotBrowserQaInteraction.target.position.set(-3.8, 14.4, 0.8)
    this.scene.add(this.spotBrowserQaInteraction)
    this.scene.add(this.spotBrowserQaInteraction.target)

    // Floor 5 (Y = 18.0m): Infrastructure Server Bay
    this.spotInfrastructure = new THREE.SpotLight(0xa5c6e8, 2.0, 16.0, Math.PI / 3.5, 0.5, 1.1)
    this.spotInfrastructure.position.set(-2.0, 21.2, -1.0)
    this.spotInfrastructure.target.position.set(-2.5, 18.0, 1.0)
    this.scene.add(this.spotInfrastructure)
    this.scene.add(this.spotInfrastructure.target)

    // Floor 6 (Y = 21.6m): Approval Control Mezzanine Plinth
    this.spotApproval = new THREE.SpotLight(0xffdfa8, 2.0, 16.0, Math.PI / 3.8, 0.5, 1.1)
    this.spotApproval.position.set(0.0, 24.8, -1.0)
    this.spotApproval.target.position.set(0.0, 21.6, 0.5)
    this.scene.add(this.spotApproval)
    this.scene.add(this.spotApproval.target)

    // 4. Build World Geometries
    this.architecture = new HqArchitecture(this.materials)
    this.scene.add(this.architecture.group)

    this.furniture = new HqFurniture(this.materials)
    this.scene.add(this.furniture.group)

    this.infrastructure = new HqInfrastructure(this.materials)
    this.scene.add(this.infrastructure.group)

    this.characters = new HqCharacters(this.materials)
    this.scene.add(this.characters.group)

    this.dossiers = new HqTaskDossiers(this.materials)
    this.scene.add(this.dossiers.group)

    this.handoffs = new HandoffConduitManager()
    this.scene.add(this.handoffs.getGroup())

    this.motion = new CharacterMotionController(this.characters)

    this.custodyMotion = new ArtifactMotionController()
    this.scene.add(this.custodyMotion.getGroup())

    // Freeze static matrices to prevent per-frame CPU matrix recomputation
    this.freezeStaticMatrices()
  }

  /**
   * Freezes static scene graph node matrices to eliminate continuous CPU matrix recalculation.
   * Dynamic parts (elevator car, elevator doors, characters, dossiers) remain dynamic.
   */
  public freezeStaticMatrices(): void {
    const freeze = (obj: THREE.Object3D) => {
      if (
        obj.name?.startsWith('elevator-cab') ||
        obj.name?.startsWith('elevator-door')
      ) {
        return
      }
      obj.updateMatrix()
      obj.updateMatrixWorld(true)
      obj.matrixAutoUpdate = false
      for (const child of obj.children) {
        freeze(child)
      }
    }
    freeze(this.architecture.group)
    freeze(this.furniture.group)
    freeze(this.infrastructure.group)
  }

  /**
   * Gated Floor Spotlight & Distant Geometry Visibility (Wave 12I).
   * When closely focused on Floor 2, prunes out-of-view spotlights from the WebGL forward lighting
   * loop and culls distant architectural levels.
   * Overview / multi-floor transitions immediately restore all lighting pools and geometry.
   */
  public setFocusedRoom(roomId: string | null): void {
    const isFloor1 =
      roomId === 'MISSION_CONTROL' ||
      roomId === 'ROOM_MISSION_CONTROL' ||
      roomId === 'WS_PLANNING' ||
      roomId === 'CHAR_PLANNER'

    const isFloor2 =
      roomId === 'AGENT_OPERATIONS' ||
      roomId === 'ROOM_AGENT_OPERATIONS' ||
      roomId === 'WS_FRONTEND' ||
      roomId === 'WS_BACKEND' ||
      roomId === 'CHAR_FRONTEND' ||
      roomId === 'CHAR_BACKEND'

    const isFloor3 =
      roomId === 'VERIFICATION_LAB' ||
      roomId === 'ROOM_VERIFICATION_LAB' ||
      roomId === 'WS_VERIFIER' ||
      roomId === 'CHAR_REVIEWER'

    const isFloor4 =
      roomId === 'BROWSER_QA_LAB' ||
      roomId === 'ROOM_BROWSER_QA_LAB' ||
      roomId === 'WS_DEVICE_BENCH' ||
      roomId === 'WS_BROWSER_QA' ||
      roomId === 'CHAR_BROWSER_QA'

    if (isFloor1) {
      // Deactivate non-Floor-1 spotlights from WebGL forward lighting pass
      this.spotOperations.visible = false
      this.spotOperationsWash.visible = false
      this.spotOperationsDeskL.visible = false
      this.spotOperationsDeskR.visible = false
      this.spotOperationsReviewer.visible = false
      this.spotCleanroom.visible = false
      this.spotCleanroomWash.visible = false
      this.spotCleanroomEdge.visible = false
      this.spotBrowserQa.visible = false
      this.spotBrowserQaWash.visible = false
      this.spotBrowserQaInteraction.visible = false
      this.spotInfrastructure.visible = false
      this.spotApproval.visible = false

      // Floor 1 dedicated fixtures remain active
      this.spotPlanning.visible = true
      this.spotPlanningWash.visible = true
      this.spotPlanningDispatch.visible = true

      this.infrastructure.group.visible = false
      this.furniture.setFloorVisibility(1)
    } else if (isFloor2) {
      // Deactivate non-Floor-2 spotlights from WebGL forward lighting pass
      this.spotPlanning.visible = false
      this.spotPlanningWash.visible = false
      this.spotPlanningDispatch.visible = false
      this.spotCleanroom.visible = false
      this.spotCleanroomWash.visible = false
      this.spotCleanroomEdge.visible = false
      this.spotBrowserQa.visible = false
      this.spotBrowserQaWash.visible = false
      this.spotBrowserQaInteraction.visible = false
      this.spotInfrastructure.visible = false
      this.spotApproval.visible = false

      // Floor 2 dedicated fixtures remain active
      this.spotOperations.visible = true
      this.spotOperationsWash.visible = true
      this.spotOperationsDeskL.visible = true
      this.spotOperationsDeskR.visible = true
      this.spotOperationsReviewer.visible = true

      this.infrastructure.group.visible = false
      this.furniture.setFloorVisibility(2)
    } else if (isFloor3) {
      // Focus on Floor 3 Verification Cleanroom
      this.spotPlanning.visible = false
      this.spotPlanningWash.visible = false
      this.spotPlanningDispatch.visible = false
      this.spotOperations.visible = false
      this.spotOperationsWash.visible = false
      this.spotOperationsDeskL.visible = false
      this.spotOperationsDeskR.visible = false
      this.spotOperationsReviewer.visible = false
      this.spotBrowserQa.visible = false
      this.spotBrowserQaWash.visible = false
      this.spotBrowserQaInteraction.visible = false
      this.spotInfrastructure.visible = false
      this.spotApproval.visible = false

      // Floor 3 dedicated fixtures active
      this.spotCleanroom.visible = true
      this.spotCleanroomWash.visible = true
      this.spotCleanroomEdge.visible = true

      this.infrastructure.group.visible = false
      this.furniture.setFloorVisibility(3)
    } else if (isFloor4) {
      // Focus on Floor 4 Browser QA Lab
      this.spotPlanning.visible = false
      this.spotPlanningWash.visible = false
      this.spotPlanningDispatch.visible = false
      this.spotOperations.visible = false
      this.spotOperationsWash.visible = false
      this.spotOperationsDeskL.visible = false
      this.spotOperationsDeskR.visible = false
      this.spotOperationsReviewer.visible = false
      this.spotCleanroom.visible = false
      this.spotCleanroomWash.visible = false
      this.spotCleanroomEdge.visible = false
      this.spotInfrastructure.visible = false
      this.spotApproval.visible = false

      // Floor 4 dedicated fixtures active
      this.spotBrowserQa.visible = true
      this.spotBrowserQaWash.visible = true
      this.spotBrowserQaInteraction.visible = true

      this.infrastructure.group.visible = false
      this.furniture.setFloorVisibility(4)
    } else {
      // Full overview / other rooms: restore all lights, furniture, and infrastructure
      this.spotPlanning.visible = true
      this.spotPlanningWash.visible = true
      this.spotPlanningDispatch.visible = true
      this.spotCleanroom.visible = true
      this.spotCleanroomWash.visible = true
      this.spotCleanroomEdge.visible = true
      this.spotBrowserQa.visible = true
      this.spotBrowserQaWash.visible = true
      this.spotBrowserQaInteraction.visible = true
      this.spotInfrastructure.visible = true
      this.spotApproval.visible = true

      this.spotOperations.visible = true
      this.spotOperationsWash.visible = true
      this.spotOperationsDeskL.visible = true
      this.spotOperationsDeskR.visible = true
      this.spotOperationsReviewer.visible = true

      this.infrastructure.group.visible = true
      this.furniture.setFloorVisibility(null)
    }
  }

  private lastTimeSeconds: number | null = null

  /**
   * Authoritative Scene Reconciliation (Wave 12C / 12G / 12H)
   * Pure deterministic WorldState -> 3D Headquarters in-place updates.
   */
  public reconcileWorld(worldState: WorldState, reducedMotion: boolean = false): void {
    // 1. Reconcile tangible physical task dossiers
    this.dossiers.reconcileTasks(worldState.tasks)

    // 2. Reconcile architectural station indicators
    for (const [stationId, stState] of Object.entries(worldState.stations)) {
      if (stationId === 'omniroute-rack') {
        const omni = worldState.infrastructure.gateways['omniroute-local']
        this.infrastructure.setGatewayActivity(stState.status === 'ACTIVE', omni?.warningState)
      } else if (stationId === 'dispatch-console') {
        this.infrastructure.setDispatchActivity(stState.status)
      } else {
        this.furniture.setStationStatus(stationId as any, stState.status)
      }
    }

    // 2b. Reconcile external service connector capability indicator
    const connectorMap = worldState.infrastructure.connectors
    if (connectorMap && Object.keys(connectorMap).length > 0) {
      const anyActive = Object.values(connectorMap).some((c) => c.status === 'AVAILABLE')
      const anyError = Object.values(connectorMap).some((c) => c.status === 'ERROR')
      const isSyncing = worldState.stations['dispatch-console']?.status === 'ACTIVE' && anyActive
      if (isSyncing) {
        this.infrastructure.setConnectorActivity('SYNCING')
      } else if (anyError) {
        this.infrastructure.setConnectorActivity('ERROR')
      } else if (anyActive) {
        this.infrastructure.setConnectorActivity('CONNECTED')
      } else {
        this.infrastructure.setConnectorActivity('DISCONNECTED')
      }
    }

    // 3. Reconcile role presentation states & characters (Wave 12D)
    const roleStates = deriveRolePresentationStates(worldState)
    this.characters.reconcileRoles(roleStates)

    // 4. Reconcile architectural handoffs & custody markers (Wave 12F)
    this.handoffs.updateHandoffs(worldState.handoffs)

    // 5. Reconcile authoritative spatial intents & locomotion (Wave 12G)
    const spatialIntents = deriveCharacterSpatialIntents(worldState)
    this.motion.reconcileIntents(spatialIntents, reducedMotion)

    // 6. Reconcile authoritative artifact custody & visual transit (Wave 12H)
    const custodyStates = deriveArtifactCustody({
      projection: {
        schemaVersion: '1.0.0',
        epoch: worldState.revisionIdentity.projectionEpoch,
        revision: worldState.revisionIdentity.projectionRevision,
        activeTasks: [],
        handoffs: worldState.handoffs as any,
      },
      worldState,
    })
    this.custodyMotion.reconcileCustody(custodyStates, reducedMotion)
  }

  public update(timeSeconds: number, reducedMotion: boolean): void {
    const deltaTime = this.lastTimeSeconds !== null ? Math.max(timeSeconds - this.lastTimeSeconds, 0.0) : 0.016
    this.lastTimeSeconds = timeSeconds

    this.motion.update(deltaTime, reducedMotion)
    this.characters.update(timeSeconds, reducedMotion)
    this.custodyMotion.update(deltaTime, reducedMotion)
  }

  public getAtmosphere(): AtmosphereMode {
    return this.currentAtmosphere
  }

  /**
   * DEPARTMENT LIGHTING GRAMMAR (Architectural Language for Future Tower Expansion):
   * - Strategy / Mission Control (Floor 1): Warm Ivory / Brushed Brass (0xffeedb / 0xffedd5)
   * - Agent Operations (Floor 2): Warm Neutral + restrained Lavender & Teal accents (0xfff4e6 / 0xfef3c7)
   * - Verification Lab (Floor 3): Clean Neutral + restrained Sage (0xd4f4ff / 0xdbeafe)
   * - Browser QA Lab (Floor 4): Crisp Neutral with screen-oriented accents (0xc2f0e8 / 0xccfbf1)
   * - Infrastructure (Floor 5): Cooler Technical Slate / Cyan (0xa5c6e8 / 0x7dd3fc)
   * - Approval Mezzanine (Floor 6): Quiet Warm Gold / Champagne (0xffdfa8 / 0xfde047)
   * NOTE: Saturated RGB gamer setups are strictly forbidden. Lighting must reveal material hierarchy.
   */
  public setAtmosphere(mode: AtmosphereMode): void {
    this.currentAtmosphere = mode

    switch (mode) {
      case 'DAY':
        // Fresh architectural daylight: warm sunlight + open sky ambient
        this.scene.background = new THREE.Color(0x242e3f) // Clean architectural sky-slate
        this.keyLight.color.setHex(0xfff8ee) // Warm direct sunlight
        this.keyLight.intensity = 1.65
        this.keyLight.position.set(-18.0, 36.0, -28.0)
        this.fillLight.color.setHex(0xb4d4f0) // Soft daylight fill
        this.fillLight.intensity = 1.10
        this.ambientLight.color.setHex(0xdde8f5) // Skylight dome
        this.ambientLight.groundColor.setHex(0x3e4c5e)
        this.ambientLight.intensity = 1.25

        // Floor 2 Agent Operations: warm welcoming layered architectural daylight
        this.spotOperations.color.setHex(0xfff7ed)
        this.spotOperations.intensity = 2.0
        this.spotOperationsWash.color.setHex(0xfef3c7)
        this.spotOperationsWash.intensity = 1.2
        this.spotOperationsDeskL.color.setHex(0xfffbeb)
        this.spotOperationsDeskL.intensity = 1.2
        this.spotOperationsDeskR.color.setHex(0xfffbeb)
        this.spotOperationsDeskR.intensity = 1.2
        this.spotOperationsReviewer.color.setHex(0xffeedb)
        this.spotOperationsReviewer.intensity = 1.4

        // Floor 1 Mission Control: layered warm daylight
        this.spotPlanning.color.setHex(0xffeedb)
        this.spotPlanning.intensity = 2.2
        this.spotPlanningWash.color.setHex(0xffedd5)
        this.spotPlanningWash.intensity = 1.8
        this.spotPlanningDispatch.color.setHex(0xffe4b5)
        this.spotPlanningDispatch.intensity = 1.6

        // Floor 3 Verification Cleanroom: crisp cool-white daylight
        this.spotCleanroom.color.setHex(0xe6f4f8)
        this.spotCleanroom.intensity = 2.2
        this.spotCleanroomWash.color.setHex(0xdbeafe)
        this.spotCleanroomWash.intensity = 1.8
        this.spotCleanroomEdge.color.setHex(0xf1f5f9)
        this.spotCleanroomEdge.intensity = 1.6

        // Floor 4 Browser QA Lab: high-clarity neutral daylight
        this.spotBrowserQa.color.setHex(0xe0f2fe)
        this.spotBrowserQa.intensity = 2.2
        this.spotBrowserQaWash.color.setHex(0xccfbf1)
        this.spotBrowserQaWash.intensity = 1.8
        this.spotBrowserQaInteraction.color.setHex(0xf0fdf4)
        this.spotBrowserQaInteraction.intensity = 1.6

        this.spotInfrastructure.color.setHex(0xa5c6e8)
        this.spotInfrastructure.intensity = 1.6
        this.spotApproval.color.setHex(0xffdfa8)
        this.spotApproval.intensity = 1.8
        break

      case 'EVENING':
        // Cozy architectural twilight: golden low-angle sun + rich indigo fill
        this.scene.background = new THREE.Color(0x111722) // Deep twilight slate
        this.keyLight.color.setHex(0xf59e0b) // Rich amber golden-hour sun
        this.keyLight.intensity = 1.45
        this.keyLight.position.set(-22.0, 24.0, -24.0)
        this.fillLight.color.setHex(0x6366f1) // Indigo ambient fill
        this.fillLight.intensity = 0.85
        this.ambientLight.color.setHex(0xa1a1aa)
        this.ambientLight.groundColor.setHex(0x27272a)
        this.ambientLight.intensity = 1.0

        // Floor 2 Agent Operations: warm golden twilight interior pools
        this.spotOperations.color.setHex(0xfef08a)
        this.spotOperations.intensity = 2.8
        this.spotOperationsWash.color.setHex(0xf59e0b)
        this.spotOperationsWash.intensity = 1.8
        this.spotOperationsDeskL.color.setHex(0xfef08a)
        this.spotOperationsDeskL.intensity = 1.8
        this.spotOperationsDeskR.color.setHex(0xfef08a)
        this.spotOperationsDeskR.intensity = 1.8
        this.spotOperationsReviewer.color.setHex(0xfef08a)
        this.spotOperationsReviewer.intensity = 2.0

        // Floor 1 Mission Control: rich amber golden-hour pools
        this.spotPlanning.color.setHex(0xffedd5)
        this.spotPlanning.intensity = 2.4
        this.spotPlanningWash.color.setHex(0xf59e0b)
        this.spotPlanningWash.intensity = 2.0
        this.spotPlanningDispatch.color.setHex(0xfef08a)
        this.spotPlanningDispatch.intensity = 1.8

        // Floor 3 Cleanroom twilight
        this.spotCleanroom.color.setHex(0xdbeafe)
        this.spotCleanroom.intensity = 2.2
        this.spotCleanroomWash.color.setHex(0x93c5fd)
        this.spotCleanroomWash.intensity = 1.8
        this.spotCleanroomEdge.color.setHex(0xfef08a)
        this.spotCleanroomEdge.intensity = 1.6

        // Floor 4 Browser QA twilight
        this.spotBrowserQa.color.setHex(0xccfbf1)
        this.spotBrowserQa.intensity = 2.2
        this.spotBrowserQaWash.color.setHex(0x5eead4)
        this.spotBrowserQaWash.intensity = 1.8
        this.spotBrowserQaInteraction.color.setHex(0xfef08a)
        this.spotBrowserQaInteraction.intensity = 1.6

        this.spotInfrastructure.color.setHex(0x93c5fd)
        this.spotInfrastructure.intensity = 1.8
        this.spotApproval.color.setHex(0xfef08a)
        this.spotApproval.intensity = 2.2
        break

      case 'NIGHT':
        // Inhabited Miniature Engineering Studio at Night:
        // Deep exterior night contrast + intentional architectural lighting pools (wall wash, task pools, dormant monitors)
        // High architectural readability: room depth, rear circulation, timber slats, and floor plane remain clear
        this.scene.background = new THREE.Color(0x090d16) // Deep architectural midnight slate
        this.keyLight.color.setHex(0x64748b) // Subtle cool moonbeam rim
        this.keyLight.intensity = 0.38
        this.keyLight.position.set(-16.0, 32.0, -22.0)
        this.fillLight.color.setHex(0x334155) // Soft indirect architectural fill (separates floor & window planes)
        this.fillLight.intensity = 0.40
        this.ambientLight.color.setHex(0x1e293b) // Exterior night dome
        this.ambientLight.groundColor.setHex(0x101726) // Soft architectural floor bounce
        this.ambientLight.intensity = 0.45

        // Floor 1 Mission Control: restrained warm architectural pools (wall wash & table pool)
        this.spotPlanning.color.setHex(0xffedd5)
        this.spotPlanning.intensity = 2.0
        this.spotPlanningWash.color.setHex(0xfbbf24)
        this.spotPlanningWash.intensity = 2.2
        this.spotPlanningDispatch.color.setHex(0xffeedb)
        this.spotPlanningDispatch.intensity = 1.6

        // Floor 2 Agent Operations: Intentional architectural light pools & timber slat cove grazing
        // 1. Central circulation safety pathway downlight pool (illuminates floor plane & Reviewer zone)
        this.spotOperations.color.setHex(0xffedd5)
        this.spotOperations.intensity = 2.2
        // 2. Wall-wash cove light grazing the acoustic timber battens & rear circulation
        this.spotOperationsWash.color.setHex(0xfbbf24)
        this.spotOperationsWash.intensity = 2.4
        // 3. Workstation architectural task pools (illuminates walnut/oak surfaces; monitors strictly dormant)
        this.spotOperationsDeskL.color.setHex(0xffeedb)
        this.spotOperationsDeskL.intensity = 2.0
        this.spotOperationsDeskR.color.setHex(0xffeedb)
        this.spotOperationsDeskR.intensity = 2.0
        // 4. Reviewer verification console inspection downlight pool
        this.spotOperationsReviewer.color.setHex(0xffedd5)
        this.spotOperationsReviewer.intensity = 2.2

        // Floor 3 Verification Cleanroom: precise cool-white night inspection pool
        this.spotCleanroom.color.setHex(0x93c5fd)
        this.spotCleanroom.intensity = 1.8
        this.spotCleanroomWash.color.setHex(0x60a5fa)
        this.spotCleanroomWash.intensity = 1.6
        this.spotCleanroomEdge.color.setHex(0xa5b4fc)
        this.spotCleanroomEdge.intensity = 1.4

        // Floor 4 Browser QA Lab: cyan/teal night testing pools
        this.spotBrowserQa.color.setHex(0x5eead4)
        this.spotBrowserQa.intensity = 1.8
        this.spotBrowserQaWash.color.setHex(0x2dd4bf)
        this.spotBrowserQaWash.intensity = 1.6
        this.spotBrowserQaInteraction.color.setHex(0x14b8a6)
        this.spotBrowserQaInteraction.intensity = 1.4

        this.spotInfrastructure.color.setHex(0x38bdf8)
        this.spotInfrastructure.intensity = 1.0
        this.spotApproval.color.setHex(0xfde047)
        this.spotApproval.intensity = 1.2
        break
    }
  }

  public dispose(): void {
    this.architecture.dispose()
    this.furniture.dispose()
    this.infrastructure.dispose()
    this.characters.dispose()
    this.dossiers.dispose()
    this.handoffs.dispose()
    this.custodyMotion.dispose()
    this.materials.dispose()

    this.scene.clear()
  }
}
