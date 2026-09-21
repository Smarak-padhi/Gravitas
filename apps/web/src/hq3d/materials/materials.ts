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

    // 2. Architectural Stone Floor (Warm mineral slate tone matching Gravitas shell)
    this.limestone = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x242a35,
        map: stoneTex,
        roughness: 0.72,
        metalness: 0.04,
      })
    )

    this.limestoneDark = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x161a22,
        roughness: 0.85,
        metalness: 0.05,
      })
    )

    this.limestonePlinth = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x1c212b,
        roughness: 0.6,
        metalness: 0.08,
      })
    )

    // 3. Natural Solid American Walnut
    this.walnut = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x36251b,
        map: walnutTex,
        roughness: 0.58,
        metalness: 0.02,
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
        color: 0x222630,
        roughness: 0.42,
        metalness: 0.82,
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
