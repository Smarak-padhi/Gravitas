/**
 * Reusable PBR Material Library for Gravitas 3D Headquarters
 * Adheres strictly to the "Modern Architectural Miniature" aesthetic.
 * All materials are shared instances; disposed cleanly on teardown.
 */

import * as THREE from 'three'

export class MaterialLibrary {
  public readonly walnut: THREE.MeshStandardMaterial
  public readonly brass: THREE.MeshStandardMaterial
  public readonly limestone: THREE.MeshStandardMaterial
  public readonly limestoneDark: THREE.MeshStandardMaterial
  public readonly gunmetal: THREE.MeshStandardMaterial
  public readonly glass: THREE.MeshStandardMaterial
  public readonly vellum: THREE.MeshStandardMaterial
  public readonly terminalScreen: THREE.MeshStandardMaterial

  // Character Silhouettes
  public readonly charMannequin: THREE.MeshStandardMaterial
  public readonly charCodex: THREE.MeshStandardMaterial
  public readonly charFcc: THREE.MeshStandardMaterial
  public readonly charVerifier: THREE.MeshStandardMaterial

  // Interactive / Selection
  public readonly selectionRing: THREE.MeshBasicMaterial
  public readonly hoverHighlight: THREE.MeshStandardMaterial

  // Status Accents
  public readonly statusReady: THREE.MeshStandardMaterial
  public readonly statusRunning: THREE.MeshStandardMaterial
  public readonly statusVerifying: THREE.MeshStandardMaterial
  public readonly statusWaiting: THREE.MeshStandardMaterial
  public readonly statusSuccess: THREE.MeshStandardMaterial
  public readonly statusFailure: THREE.MeshStandardMaterial

  private readonly allMaterials: THREE.Material[] = []

  constructor() {
    // 1. Natural Solid American Walnut (Workstations, partitions)
    this.walnut = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x3d2e24,
        roughness: 0.65,
        metalness: 0.05,
      })
    )

    // 2. Brushed Architectural Brass (Recessed conduits, plinths, frames)
    this.brass = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc29b38,
        roughness: 0.35,
        metalness: 0.8,
      })
    )

    // 3. Honed Limestone (Ground floor operations pavers)
    this.limestone = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xe8e4da,
        roughness: 0.88,
        metalness: 0.0,
      })
    )

    // Darker perimeter limestone / boundary border
    this.limestoneDark = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xd2cdc2,
        roughness: 0.85,
        metalness: 0.0,
      })
    )

    // 4. Powder-coated Gunmetal Steel (Racks, chassis)
    this.gunmetal = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x242831,
        roughness: 0.45,
        metalness: 0.7,
      })
    )

    // 5. Low-Iron Clear Cleanroom Glass
    this.glass = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xf0fdf8,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      })
    )

    // 6. Archival Vellum Tablet
    this.vellum = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xfaf7ee,
        roughness: 0.7,
        metalness: 0.0,
      })
    )

    // 7. Neutral Workstation Terminal Screen (Off / Standby grid)
    this.terminalScreen = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x091428,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.2,
      })
    )

    // 8. Static Prototype Characters
    this.charMannequin = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.6,
        metalness: 0.1,
      })
    )
    this.charCodex = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x2b59c3, // Indigo sapphire
        roughness: 0.55,
        metalness: 0.1,
      })
    )
    this.charFcc = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xb45309, // Ochre
        roughness: 0.6,
        metalness: 0.1,
      })
    )
    this.charVerifier = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x3d7a68, // Cleanroom sage
        roughness: 0.5,
        metalness: 0.15,
      })
    )

    // 9. Interactive Selection Ring
    this.selectionRing = this.track(
      new THREE.MeshBasicMaterial({
        color: 0xc29b38,
        wireframe: false,
      })
    )
    this.hoverHighlight = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.25,
        roughness: 0.4,
      })
    )

    // 10. Status Colors
    this.statusReady = this.track(new THREE.MeshStandardMaterial({ color: 0x94a3b8, emissive: 0x475569, emissiveIntensity: 0.2 }))
    this.statusRunning = this.track(new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 }))
    this.statusVerifying = this.track(new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.4 }))
    this.statusWaiting = this.track(new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xeab308, emissiveIntensity: 0.5 }))
    this.statusSuccess = this.track(new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 0.4 }))
    this.statusFailure = this.track(new THREE.MeshStandardMaterial({ color: 0xf87171, emissive: 0xdc2626, emissiveIntensity: 0.5 }))
  }

  private track<T extends THREE.Material>(material: T): T {
    this.allMaterials.push(material)
    return material
  }

  public dispose(): void {
    for (const mat of this.allMaterials) {
      mat.dispose()
    }
    this.allMaterials.length = 0
  }
}
