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

  constructor() {
    this.scene = new THREE.Scene()
    // Architectural dark slate environment matching Gravitas application shell
    this.scene.background = new THREE.Color(0x0e1219)

    // Instantiate Material Library
    this.materials = new MaterialLibrary()

    // 1. Soft Museum Key Directional Light
    this.keyLight = new THREE.DirectionalLight(0xfff6ec, 1.35)
    this.keyLight.position.set(-14.0, 22.0, -10.0)
    this.keyLight.castShadow = true
    this.keyLight.shadow.mapSize.width = 2048
    this.keyLight.shadow.mapSize.height = 2048
    this.keyLight.shadow.camera.near = 5.0
    this.keyLight.shadow.camera.far = 55.0
    this.keyLight.shadow.camera.left = -16.0
    this.keyLight.shadow.camera.right = 16.0
    this.keyLight.shadow.camera.top = 16.0
    this.keyLight.shadow.camera.bottom = -16.0
    this.keyLight.shadow.bias = -0.0003
    this.keyLight.shadow.radius = 2.0
    this.scene.add(this.keyLight)

    // 2. Opposing Soft Architectural Fill Light (illuminates shadow faces, prevents unreadable silhouettes)
    this.fillLight = new THREE.DirectionalLight(0x8faec7, 0.8)
    this.fillLight.position.set(16.0, 18.0, 14.0)
    this.fillLight.target.position.set(0, 0, 0)
    this.scene.add(this.fillLight)

    // 3. High-Ambiance Natural Skylight Fill
    this.ambientLight = new THREE.HemisphereLight(0xb8d2ec, 0x2b3442, 0.95)
    this.scene.add(this.ambientLight)

    // 4. Dedicated Architectural Spotlight Pools
    // Zone A: Mission Planning Table
    this.spotPlanning = new THREE.SpotLight(0xffeedb, 2.0, 14.0, Math.PI / 4, 0.5, 1.1)
    this.spotPlanning.position.set(-4.5, 6.5, 5.5)
    this.spotPlanning.target.position.set(-4.5, 0.85, 5.5)
    this.scene.add(this.spotPlanning)
    this.scene.add(this.spotPlanning.target)

    // Zone B: Agent Operations Desk Pods
    this.spotOperations = new THREE.SpotLight(0xe2eeff, 1.8, 14.0, Math.PI / 3.5, 0.5, 1.1)
    this.spotOperations.position.set(-4.2, 6.8, 1.2)
    this.spotOperations.target.position.set(-4.2, 0.85, 1.2)
    this.scene.add(this.spotOperations)
    this.scene.add(this.spotOperations.target)

    // Zone C: Verification Cleanroom
    this.spotCleanroom = new THREE.SpotLight(0xd4f4ff, 2.2, 12.0, Math.PI / 3.8, 0.5, 1.1)
    this.spotCleanroom.position.set(6.0, 6.5, 6.2)
    this.spotCleanroom.target.position.set(6.0, 1.1, 6.2)
    this.scene.add(this.spotCleanroom)
    this.scene.add(this.spotCleanroom.target)

    // Zone D: Browser QA Lab Matrix (aimed forward onto device screens and bench)
    this.spotBrowserQa = new THREE.SpotLight(0xc2f0e8, 2.0, 12.0, Math.PI / 3.8, 0.5, 1.1)
    this.spotBrowserQa.position.set(5.5, 6.0, 0.8)
    this.spotBrowserQa.target.position.set(6.2, 1.2, -1.2)
    this.scene.add(this.spotBrowserQa)
    this.scene.add(this.spotBrowserQa.target)

    // Zone E: Infrastructure Server Bay (aimed at front cabinet faceplates)
    this.spotInfrastructure = new THREE.SpotLight(0xa5c6e8, 2.0, 12.0, Math.PI / 3.5, 0.5, 1.1)
    this.spotInfrastructure.position.set(-7.5, 5.5, -3.2)
    this.spotInfrastructure.target.position.set(-8.8, 1.3, -5.8)
    this.scene.add(this.spotInfrastructure)
    this.scene.add(this.spotInfrastructure.target)

    // Zone F: Approval Control Mezzanine Plinth
    this.spotApproval = new THREE.SpotLight(0xffdfa8, 2.0, 12.0, Math.PI / 3.8, 0.5, 1.1)
    this.spotApproval.position.set(0.0, 7.0, 7.5)
    this.spotApproval.target.position.set(0.0, 3.1, 8.5)
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

  public setAtmosphere(mode: AtmosphereMode): void {
    this.currentAtmosphere = mode

    switch (mode) {
      case 'DAY':
        this.scene.background = new THREE.Color(0x1e2530) // Soft architectural slate
        this.keyLight.color.setHex(0xfff8ee)
        this.keyLight.intensity = 1.45
        this.keyLight.position.set(-14.0, 22.0, -10.0)
        this.fillLight.color.setHex(0x9fc2e0)
        this.fillLight.intensity = 0.95
        this.ambientLight.color.setHex(0xcfdbe8)
        this.ambientLight.groundColor.setHex(0x333d4d)
        this.ambientLight.intensity = 1.1

        // Balanced daylight spot fill
        this.spotPlanning.color.setHex(0xffeedb)
        this.spotPlanning.intensity = 2.0
        this.spotOperations.color.setHex(0xe2eeff)
        this.spotOperations.intensity = 2.0
        this.spotCleanroom.color.setHex(0xd4f4ff)
        this.spotCleanroom.intensity = 2.2
        this.spotBrowserQa.color.setHex(0xc2f0e8)
        this.spotBrowserQa.intensity = 2.0
        this.spotInfrastructure.color.setHex(0xa5c6e8)
        this.spotInfrastructure.intensity = 2.0
        this.spotApproval.color.setHex(0xffdfa8)
        this.spotApproval.intensity = 2.0
        break

      case 'EVENING':
        this.scene.background = new THREE.Color(0x161b26) // Deep twilight slate
        this.keyLight.color.setHex(0xfbbf24) // Warm low-angle golden light
        this.keyLight.intensity = 1.25
        this.keyLight.position.set(-18.0, 16.0, -12.0)
        this.fillLight.color.setHex(0x6366f1) // Indigo ambient fill
        this.fillLight.intensity = 0.75
        this.ambientLight.color.setHex(0x94a3b8)
        this.ambientLight.groundColor.setHex(0x1e293b)
        this.ambientLight.intensity = 0.85

        // Warm cozy interior pools
        this.spotPlanning.color.setHex(0xffedd5)
        this.spotPlanning.intensity = 2.6
        this.spotOperations.color.setHex(0xfef08a)
        this.spotOperations.intensity = 2.6
        this.spotCleanroom.color.setHex(0xdbeafe)
        this.spotCleanroom.intensity = 2.5
        this.spotBrowserQa.color.setHex(0xccfbf1)
        this.spotBrowserQa.intensity = 2.4
        this.spotInfrastructure.color.setHex(0x93c5fd)
        this.spotInfrastructure.intensity = 2.4
        this.spotApproval.color.setHex(0xfef08a)
        this.spotApproval.intensity = 2.8
        break

      case 'NIGHT':
        // Atmospheric Night: deep desaturated indigo exterior + warm inhabited interiors
        this.scene.background = new THREE.Color(0x0f172a) // Deep slate midnight navy (never pitch black)
        this.keyLight.color.setHex(0x93c5fd) // Soft cool moonbeam key
        this.keyLight.intensity = 0.75
        this.keyLight.position.set(-12.0, 22.0, -8.0)
        this.fillLight.color.setHex(0x38bdf8) // Cool cyan-blue ambient fill
        this.fillLight.intensity = 0.65
        this.ambientLight.color.setHex(0x475569) // Luminous cool exterior ambient
        this.ambientLight.groundColor.setHex(0x1e293b)
        this.ambientLight.intensity = 0.85 // High enough that whole building & furniture remain readable!

        // Rich warm glowing lantern pools inside the building
        this.spotPlanning.color.setHex(0xffedd5)
        this.spotPlanning.intensity = 3.2
        this.spotOperations.color.setHex(0xfef08a)
        this.spotOperations.intensity = 3.4
        this.spotCleanroom.color.setHex(0xbae6fd)
        this.spotCleanroom.intensity = 3.0
        this.spotBrowserQa.color.setHex(0x99f6e4)
        this.spotBrowserQa.intensity = 2.8
        this.spotInfrastructure.color.setHex(0x7dd3fc)
        this.spotInfrastructure.intensity = 2.8
        this.spotApproval.color.setHex(0xfde047)
        this.spotApproval.intensity = 3.6
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
