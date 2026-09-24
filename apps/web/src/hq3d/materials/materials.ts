/**
 * Reusable Architectural PBR Material Library for Gravitas 3D Headquarters
 * Features procedural stone pavers, American walnut grain, server rack faces,
 * multi-device screens, and tailored miniature character palettes.
 */

import * as THREE from 'three'
import { TextureGenerator } from './textures.js'

export class MaterialLibrary {
  // Architectural Surfaces
  public readonly limestone: THREE.MeshStandardMaterial
  public readonly limestoneDark: THREE.MeshStandardMaterial
  public readonly limestonePlinth: THREE.MeshStandardMaterial
  public readonly walnut: THREE.MeshStandardMaterial
  public readonly brass: THREE.MeshStandardMaterial
  public readonly gunmetal: THREE.MeshStandardMaterial
  public readonly glass: THREE.MeshStandardMaterial
  public readonly glassDark: THREE.MeshStandardMaterial
  public readonly vellum: THREE.MeshStandardMaterial

  // Wave 12K Long-Session Architectural Cutaway Materials
  public readonly structureGraphite: THREE.MeshStandardMaterial
  public readonly facadeCharcoal: THREE.MeshStandardMaterial
  public readonly cutawaySlabEdge: THREE.MeshStandardMaterial
  public readonly wallPlaster: THREE.MeshStandardMaterial
  public readonly wallPlasterWarm: THREE.MeshStandardMaterial
  public readonly ceilingPanel: THREE.MeshStandardMaterial
  public readonly architecturalGlass: THREE.MeshStandardMaterial
  public readonly champagneBrass: THREE.MeshStandardMaterial

  // Wave 12K Office Life & Props Materials
  public readonly foliageGreen: THREE.MeshStandardMaterial
  public readonly foliageDark: THREE.MeshStandardMaterial
  public readonly planterTerracotta: THREE.MeshStandardMaterial
  public readonly planterCeramic: THREE.MeshStandardMaterial
  public readonly couchFabricWarm: THREE.MeshStandardMaterial
  public readonly couchCushion: THREE.MeshStandardMaterial
  public readonly chairMeshDark: THREE.MeshStandardMaterial
  public readonly lampWarmGlow: THREE.MeshStandardMaterial
  public readonly whiteboardSurface: THREE.MeshStandardMaterial
  public readonly bookSpineNavy: THREE.MeshStandardMaterial
  public readonly bookSpineAmber: THREE.MeshStandardMaterial
  public readonly bookSpineTeal: THREE.MeshStandardMaterial

  // Wave 12K-R Dollhouse Interior Materials
  public readonly woodOakFloor: THREE.MeshStandardMaterial
  public readonly carpetWarm: THREE.MeshStandardMaterial
  public readonly wallArtAbstract: THREE.MeshStandardMaterial
  public readonly coffeeMugTeal: THREE.MeshStandardMaterial
  public readonly coffeeMugTerracotta: THREE.MeshStandardMaterial
  public readonly laptopAluminum: THREE.MeshStandardMaterial
  public readonly elevatorGuideRail: THREE.MeshStandardMaterial
  public readonly elevatorCabInterior: THREE.MeshStandardMaterial

  // Wave 12K-R Stylized Mascot Character Kit Materials
  public readonly charEyes: THREE.MeshStandardMaterial
  public readonly charEyeSpec: THREE.MeshStandardMaterial
  public readonly charSneakerWhite: THREE.MeshStandardMaterial
  public readonly charDenim: THREE.MeshStandardMaterial
  public readonly charSweaterOat: THREE.MeshStandardMaterial
  public readonly charSweaterLavender: THREE.MeshStandardMaterial
  public readonly charSweaterSlate: THREE.MeshStandardMaterial
  public readonly charTunicSage: THREE.MeshStandardMaterial

  // Wave 12K Mascot Character Hair & Accessories
  public readonly hairPonytail: THREE.MeshStandardMaterial
  public readonly hairPlanner: THREE.MeshStandardMaterial
  public readonly hairBackend: THREE.MeshStandardMaterial
  public readonly hairReviewer: THREE.MeshStandardMaterial

  // Technical Displays & Server Enclosures
  public readonly serverRackFace: THREE.MeshStandardMaterial
  public readonly terminalScreen: THREE.MeshStandardMaterial
  public readonly terminalScreenAmber: THREE.MeshStandardMaterial
  public readonly terminalScreenEmerald: THREE.MeshStandardMaterial
  public readonly deviceDesktop: THREE.MeshStandardMaterial
  public readonly deviceLaptop: THREE.MeshStandardMaterial
  public readonly deviceTablet: THREE.MeshStandardMaterial
  public readonly devicePhone: THREE.MeshStandardMaterial

  // Character Mannequin Tailored Materials
  public readonly charSuitDark: THREE.MeshStandardMaterial
  public readonly charSkin: THREE.MeshStandardMaterial
  public readonly charCodex: THREE.MeshStandardMaterial
  public readonly charFcc: THREE.MeshStandardMaterial
  public readonly charVerifier: THREE.MeshStandardMaterial

  // Wave 12D Role-Based Tailored Materials
  public readonly charPlannerSuit: THREE.MeshStandardMaterial
  public readonly charPlannerAccent: THREE.MeshStandardMaterial
  public readonly charFrontendSuit: THREE.MeshStandardMaterial
  public readonly charFrontendAccent: THREE.MeshStandardMaterial
  public readonly charBackendSuit: THREE.MeshStandardMaterial
  public readonly charBackendAccent: THREE.MeshStandardMaterial
  public readonly charReviewerSuit: THREE.MeshStandardMaterial
  public readonly charReviewerAccent: THREE.MeshStandardMaterial

  // Interactive / Selection
  public readonly selectionRing: THREE.MeshBasicMaterial
  public readonly selectionBracket: THREE.MeshStandardMaterial

  // Status Accents (Restrained Architectural Emissive)
  public readonly statusReady: THREE.MeshStandardMaterial
  public readonly statusRunning: THREE.MeshStandardMaterial
  public readonly statusVerifying: THREE.MeshStandardMaterial
  public readonly statusWaiting: THREE.MeshStandardMaterial
  public readonly statusSuccess: THREE.MeshStandardMaterial
  public readonly statusFailure: THREE.MeshStandardMaterial

  // Wave 12F Hero Fidelity Materials (Frontend Bay)
  public readonly heroDeskWood: THREE.MeshStandardMaterial
  public readonly heroSteel: THREE.MeshStandardMaterial
  public readonly heroBrass: THREE.MeshStandardMaterial
  public readonly heroFabric: THREE.MeshStandardMaterial
  public readonly heroPlastic: THREE.MeshStandardMaterial
  public readonly heroScreenIdle: THREE.MeshStandardMaterial
  public readonly heroScreenActive: THREE.MeshStandardMaterial
  public readonly heroScreenPortrait: THREE.MeshStandardMaterial
  public readonly heroScreenPortraitActive: THREE.MeshStandardMaterial
  public readonly heroDeskMat: THREE.MeshStandardMaterial
  public readonly heroTablet: THREE.MeshStandardMaterial
  public readonly heroCeramic: THREE.MeshStandardMaterial
  public readonly heroLampGlow: THREE.MeshStandardMaterial
  public readonly heroCharSkin: THREE.MeshStandardMaterial
  public readonly heroCharHair: THREE.MeshStandardMaterial
  public readonly heroCharSweater: THREE.MeshStandardMaterial
  public readonly heroCharDenim: THREE.MeshStandardMaterial
  public readonly heroCharSneaker: THREE.MeshStandardMaterial
  public readonly heroAcousticWood: THREE.MeshStandardMaterial
  public readonly heroAcousticFelt: THREE.MeshStandardMaterial

  private readonly allMaterials: THREE.Material[] = []
  private readonly allTextures: THREE.Texture[] = []

  constructor() {
    const hasCanvas = typeof document !== 'undefined' && !!document.createElement('canvas').getContext

    // 1. Procedural Textures
    const stoneTex = hasCanvas ? this.trackTex(TextureGenerator.createLimestoneTexture()) : null
    const walnutTex = hasCanvas ? this.trackTex(TextureGenerator.createWalnutTexture()) : null
    const planningTex = hasCanvas ? this.trackTex(TextureGenerator.createPlanningGridTexture()) : null
    const rackTex = hasCanvas ? this.trackTex(TextureGenerator.createServerRackTexture()) : null
    const codeBlueTex = hasCanvas ? this.trackTex(TextureGenerator.createTerminalCodeTexture('#38bdf8')) : null
    const codeAmberTex = hasCanvas ? this.trackTex(TextureGenerator.createTerminalCodeTexture('#f59e0b')) : null
    const codeEmeraldTex = hasCanvas ? this.trackTex(TextureGenerator.createTerminalCodeTexture('#10b981')) : null
    const desktopTex = hasCanvas ? this.trackTex(TextureGenerator.createDeviceScreenTexture('DESKTOP')) : null
    const laptopTex = hasCanvas ? this.trackTex(TextureGenerator.createDeviceScreenTexture('LAPTOP')) : null
    const tabletTex = hasCanvas ? this.trackTex(TextureGenerator.createDeviceScreenTexture('TABLET')) : null
    const phoneTex = hasCanvas ? this.trackTex(TextureGenerator.createDeviceScreenTexture('PHONE')) : null
    const oakFloorTex = hasCanvas ? this.trackTex(TextureGenerator.createOakFloorTexture()) : null
    const carpetTex = hasCanvas ? this.trackTex(TextureGenerator.createCarpetTexture()) : null
    const wallArtTex = hasCanvas ? this.trackTex(TextureGenerator.createWallArtTexture()) : null
    const whiteboardTex = hasCanvas ? this.trackTex(TextureGenerator.createWhiteboardTexture()) : null
    const heroDeskTex = hasCanvas ? this.trackTex(TextureGenerator.createHeroDeskWoodTexture()) : null
    const heroFabricTex = hasCanvas ? this.trackTex(TextureGenerator.createHeroFabricTexture()) : null
    const heroScreenIdleTex = hasCanvas ? this.trackTex(TextureGenerator.createHeroUltrawideScreenTexture(false)) : null
    const heroScreenActiveTex = hasCanvas ? this.trackTex(TextureGenerator.createHeroUltrawideScreenTexture(true)) : null
    const heroScreenPortraitTex = hasCanvas ? this.trackTex(TextureGenerator.createHeroPortraitScreenTexture(false)) : null
    const heroScreenPortraitActiveTex = hasCanvas ? this.trackTex(TextureGenerator.createHeroPortraitScreenTexture(true)) : null
    const heroDeskMatTex = hasCanvas ? this.trackTex(TextureGenerator.createHeroDeskMatTexture()) : null
    const heroTabletTex = hasCanvas ? this.trackTex(TextureGenerator.createHeroTabletSketchTexture()) : null

    // 2. Architectural Stone Floor (Warm mineral slate tone matching Gravitas shell)
    this.limestone = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2a303c,
        map: stoneTex,
        roughness: 0.72,
        metalness: 0.04,
      })
    )

    this.limestoneDark = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1c202a,
        roughness: 0.85,
        metalness: 0.05,
      })
    )

    this.limestonePlinth = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x222733,
        roughness: 0.6,
        metalness: 0.08,
      })
    )

    // Wave 12K Architectural Cutaway Materials
    this.structureGraphite = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x3b4252,
        roughness: 0.52,
        metalness: 0.35,
      })
    )

    this.facadeCharcoal = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2e3544,
        roughness: 0.65,
        metalness: 0.22,
      })
    )

    this.cutawaySlabEdge = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x8a725d,
        roughness: 0.75,
        metalness: 0.08,
      })
    )

    this.wallPlaster = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xd9d3c7,
        roughness: 0.92,
        metalness: 0.0,
      })
    )

    this.wallPlasterWarm = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xe8e3d8,
        roughness: 0.90,
        metalness: 0.0,
      })
    )

    this.ceilingPanel = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2d3340,
        roughness: 0.80,
        metalness: 0.05,
      })
    )

    this.architecturalGlass = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc2d9e8,
        roughness: 0.08,
        metalness: 0.12,
        transparent: true,
        opacity: 0.24,
      })
    )

    this.champagneBrass = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xbfa366,
        roughness: 0.36,
        metalness: 0.74,
      })
    )

    // Wave 12K Office Life Props Materials
    this.foliageGreen = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2a593a,
        roughness: 0.65,
        metalness: 0.0,
      })
    )

    this.foliageDark = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1d432b,
        roughness: 0.6,
        metalness: 0.0,
      })
    )

    this.planterTerracotta = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xa84e2a,
        roughness: 0.86,
        metalness: 0.0,
      })
    )

    this.planterCeramic = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xe9e5dc,
        roughness: 0.42,
        metalness: 0.05,
      })
    )

    this.couchFabricWarm = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2e3544,
        roughness: 0.88,
        metalness: 0.0,
      })
    )

    this.couchCushion = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xcfc5b4,
        roughness: 0.92,
        metalness: 0.0,
      })
    )

    this.chairMeshDark = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1b1f28,
        roughness: 0.72,
        metalness: 0.25,
      })
    )

    this.lampWarmGlow = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xfff7ed,
        emissive: 0xfde68a,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    )

    this.whiteboardSurface = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: whiteboardTex,
        roughness: 0.18,
        metalness: 0.04,
      })
    )

    this.woodOakFloor = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: oakFloorTex,
        roughness: 0.65,
        metalness: 0.05,
      })
    )

    this.carpetWarm = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: carpetTex,
        roughness: 0.95,
        metalness: 0.0,
      })
    )

    this.wallArtAbstract = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: wallArtTex,
        roughness: 0.75,
        metalness: 0.05,
      })
    )

    this.coffeeMugTeal = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x0d9488,
        roughness: 0.15,
        metalness: 0.1,
      })
    )

    this.coffeeMugTerracotta = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc25e38,
        roughness: 0.28,
        metalness: 0.05,
      })
    )

    this.laptopAluminum = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.35,
        metalness: 0.85,
      })
    )

    this.charEyes = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.15,
        metalness: 0.1,
      })
    )

    this.charEyeSpec = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.85,
        roughness: 0.1,
      })
    )

    this.charSneakerWhite = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.35,
        metalness: 0.05,
      })
    )

    this.charDenim = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x27364b,
        roughness: 0.82,
        metalness: 0.04,
      })
    )

    this.charSweaterOat = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xded5c8,
        roughness: 0.85,
        metalness: 0.02,
      })
    )

    this.charSweaterLavender = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xb4a4eb,
        roughness: 0.8,
        metalness: 0.02,
      })
    )

    this.charSweaterSlate = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.8,
        metalness: 0.04,
      })
    )

    this.charTunicSage = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x5eead4,
        roughness: 0.72,
        metalness: 0.02,
      })
    )

    this.bookSpineNavy = this.track(
      new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.7 })
    )

    this.bookSpineAmber = this.track(
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 })
    )

    this.bookSpineTeal = this.track(
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.7 })
    )

    // Wave 12K Elevator Materials
    this.elevatorGuideRail = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x828b9a,
        roughness: 0.22,
        metalness: 0.88,
      })
    )

    this.elevatorCabInterior = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        roughness: 0.35,
        metalness: 0.5,
        emissive: 0x1e293b,
        emissiveIntensity: 0.2,
      })
    )

    // Wave 12K Mascot Character Hair & Accessories
    this.hairPonytail = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2b1c14,
        roughness: 0.52,
        metalness: 0.08,
      })
    )

    this.hairPlanner = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x363d49,
        roughness: 0.62,
        metalness: 0.05,
      })
    )

    this.hairBackend = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x211a18,
        roughness: 0.55,
        metalness: 0.05,
      })
    )

    this.hairReviewer = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x32404d,
        roughness: 0.58,
        metalness: 0.05,
      })
    )

    // 3. Natural Solid American Walnut
    this.walnut = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x8a5d3b,
        map: walnutTex,
        roughness: 0.48,
        metalness: 0.04,
      })
    )

    // 4. Brushed Architectural Satin Brass
    this.brass = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc8a958,
        roughness: 0.32,
        metalness: 0.78,
      })
    )

    // 5. Dark Brushed Gunmetal / Graphite
    this.gunmetal = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x3d4352,
        roughness: 0.40,
        metalness: 0.75,
      })
    )

    // 6. Smoked Frameless Architectural Glass
    this.glass = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x94b4cf,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.38,
      })
    )

    this.glassDark = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.18,
        metalness: 0.2,
        transparent: true,
        opacity: 0.28,
      })
    )

    // 7. Translucent Illuminated Planning Vellum
    this.vellum = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: planningTex,
        roughness: 0.4,
        metalness: 0.05,
        emissive: 0x0f2942,
        emissiveIntensity: 0.45,
      })
    )

    // 8. Server Enclosure Face
    this.serverRackFace = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: rackTex,
        roughness: 0.5,
        metalness: 0.4,
        emissive: 0x0f172a,
        emissiveIntensity: 0.25,
      })
    )

    // 9. Displays & Device Matrix Viewports
    this.terminalScreen = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: codeBlueTex,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x071e33,
        emissiveIntensity: 0.3,
      })
    )

    this.terminalScreenAmber = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: codeAmberTex,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x2d1a04,
        emissiveIntensity: 0.3,
      })
    )

    this.terminalScreenEmerald = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: codeEmeraldTex,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x062b1a,
        emissiveIntensity: 0.3,
      })
    )

    this.deviceDesktop = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: desktopTex,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x091424,
        emissiveIntensity: 0.35,
      })
    )

    this.deviceLaptop = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: laptopTex,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x091424,
        emissiveIntensity: 0.35,
      })
    )

    this.deviceTablet = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tabletTex,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x091424,
        emissiveIntensity: 0.35,
      })
    )

    this.devicePhone = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: phoneTex,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x091424,
        emissiveIntensity: 0.35,
      })
    )

    // 10. Architectural Character Palettes (Muted Tailored Suiting)
    this.charSuitDark = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1f242e,
        roughness: 0.82,
        metalness: 0.05,
      })
    )

    this.charSkin = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xd4c4b2,
        roughness: 0.65,
        metalness: 0.0,
      })
    )

    // Codex: Muted architectural slate-teal tailoring
    this.charCodex = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2a527c,
        roughness: 0.75,
        metalness: 0.05,
      })
    )

    // FCC: Muted warm ochre terracotta tailoring
    this.charFcc = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x995730,
        roughness: 0.75,
        metalness: 0.05,
      })
    )

    // Verifier: Muted sage / deep spruce gate authority tailoring
    this.charVerifier = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x275246,
        roughness: 0.75,
        metalness: 0.05,
      })
    )

    // Wave 12D Role Tailored Materials:
    // Chief Planner: Dark graphite tailoring with warm brass / vellum accent
    this.charPlannerSuit = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x22262d,
        roughness: 0.8,
        metalness: 0.08,
      })
    )
    this.charPlannerAccent = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.35,
        metalness: 0.7,
      })
    )

    // Frontend Engineer: Deep indigo workwear with vibrant cobalt / cyan accent
    this.charFrontendSuit = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.75,
        metalness: 0.05,
      })
    )
    this.charFrontendAccent = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.4,
        metalness: 0.2,
      })
    )

    // Backend Engineer: Charcoal / forest-neutral workwear with emerald terminal accent
    this.charBackendSuit = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x242d28,
        roughness: 0.78,
        metalness: 0.05,
      })
    )
    this.charBackendAccent = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        roughness: 0.4,
        metalness: 0.2,
      })
    )

    // Independent Reviewer: Cleanroom dark spruce coat with pale sage accent
    this.charReviewerSuit = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2c3e38,
        roughness: 0.75,
        metalness: 0.05,
      })
    )
    this.charReviewerAccent = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xa7f3d0,
        roughness: 0.5,
        metalness: 0.1,
      })
    )

    // 11. Architectural Selection Indicators (Subtle Cyan / Brass)
    this.selectionRing = this.track(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: false,
        transparent: true,
        opacity: 0.85,
      })
    )

    this.selectionBracket = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0e4468,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.6,
      })
    )

    // 12. Status Accents
    this.statusReady = this.track(
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3, metalness: 0.2 })
    )
    this.statusRunning = this.track(
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.2 })
    )
    this.statusVerifying = this.track(
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.2 })
    )
    this.statusWaiting = this.track(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.2 })
    )
    this.statusSuccess = this.track(
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3, metalness: 0.2 })
    )
    this.statusFailure = this.track(
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.2 })
    )

    // Wave 12F Hero Fidelity Materials (Frontend Bay)
    this.heroDeskWood = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: heroDeskTex,
        roughness: 0.44,
        metalness: 0.02,
      })
    )

    this.heroSteel = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2b303c,
        roughness: 0.52,
        metalness: 0.42,
      })
    )

    this.heroBrass = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.32,
        metalness: 0.85,
      })
    )

    this.heroFabric = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: heroFabricTex,
        roughness: 0.88,
        metalness: 0.0,
      })
    )

    this.heroPlastic = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1e2229,
        roughness: 0.48,
        metalness: 0.08,
      })
    )

    this.heroScreenIdle = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: heroScreenIdleTex,
        roughness: 0.35,
        metalness: 0.02,
        emissive: 0x000000,
      })
    )

    this.heroScreenActive = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: heroScreenActiveTex,
        roughness: 0.35,
        metalness: 0.02,
        emissive: 0x0c2540,
        emissiveIntensity: 0.65,
      })
    )

    this.heroScreenPortrait = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: heroScreenPortraitTex,
        roughness: 0.35,
        metalness: 0.02,
        emissive: 0x000000,
      })
    )

    this.heroScreenPortraitActive = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: heroScreenPortraitActiveTex,
        roughness: 0.35,
        metalness: 0.02,
        emissive: 0x0c2540,
        emissiveIntensity: 0.65,
      })
    )

    this.heroDeskMat = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: heroDeskMatTex,
        roughness: 0.82,
        metalness: 0.02,
      })
    )

    this.heroTablet = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: heroTabletTex,
        roughness: 0.18,
        metalness: 0.1,
      })
    )

    this.heroCeramic = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x0d9488,
        roughness: 0.15,
        metalness: 0.05,
      })
    )

    this.heroLampGlow = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xfffcf0,
        emissive: 0xffeed5,
        emissiveIntensity: 0.85,
      })
    )

    this.heroCharSkin = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xf3cca8,
        roughness: 0.62,
        metalness: 0.0,
      })
    )

    this.heroCharHair = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x3d271d,
        roughness: 0.38,
        metalness: 0.05,
      })
    )

    this.heroCharSweater = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xb4a4d9,
        roughness: 0.82,
        metalness: 0.0,
      })
    )

    this.heroCharDenim = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x24324f,
        roughness: 0.78,
        metalness: 0.02,
      })
    )

    this.heroCharSneaker = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xedebe8,
        roughness: 0.48,
        metalness: 0.05,
      })
    )

    this.heroAcousticWood = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc89d66,
        roughness: 0.48,
        metalness: 0.02,
      })
    )

    this.heroAcousticFelt = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x161a22,
        roughness: 0.95,
        metalness: 0.0,
      })
    )
  }

  private track<T extends THREE.Material>(mat: T): T {
    this.allMaterials.push(mat)
    return mat
  }

  private trackTex<T extends THREE.Texture>(tex: T): T {
    this.allTextures.push(tex)
    return tex
  }

  public dispose(): void {
    for (const mat of this.allMaterials) {
      mat.dispose()
    }
    this.allMaterials.length = 0

    for (const tex of this.allTextures) {
      tex.dispose()
    }
    this.allTextures.length = 0
  }
}
