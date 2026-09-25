/**
 * Procedural Texture Generator for Gravitas 3D Headquarters
 * Generates lightweight, deterministic canvas textures for architectural materials:
 * stone tiles with joints, walnut grain, server rack faces, multi-device screens,
 * and dormant mission planning blueprint grids. Zero external downloads.
 */

import * as THREE from 'three'

export class TextureGenerator {
  /**
   * Stone / Terrazzo floor tile texture with subtle surface noise and joint grid
   */
  public static createLimestoneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Base warm mineral slate tone (harmonizes with dark Gravitas shell)
    ctx.fillStyle = '#222731'
    ctx.fillRect(0, 0, 512, 512)

    // Architectural 4x4 paver tile grid (128px per tile)
    ctx.strokeStyle = 'rgba(15, 18, 24, 0.75)'
    ctx.lineWidth = 3

    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 512)
      ctx.stroke()
    }
    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    // Subtle stone specks / mineral grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)'
    for (let i = 0; i < 2400; i++) {
      const px = Math.random() * 512
      const py = Math.random() * 512
      const size = Math.random() * 2 + 0.5
      ctx.fillRect(px, py, size, size)
    }

    // Subtle dark slate aggregate flecks
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
    for (let i = 0; i < 1600; i++) {
      const px = Math.random() * 512
      const py = Math.random() * 512
      const size = Math.random() * 2.5 + 0.5
      ctx.fillRect(px, py, size, size)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(6, 5)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * American Walnut wood texture with rich warm amber-chocolate grain
   */
  public static createWalnutTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Warm natural American walnut base tone (not flat black)
    ctx.fillStyle = '#7a4e32'
    ctx.fillRect(0, 0, 512, 512)

    // Longitudinal heartwood grain bands
    for (let y = 0; y < 512; y += 2) {
      const alpha = Math.sin(y * 0.09) * 0.08 + Math.sin(y * 0.28) * 0.04 + 0.14
      ctx.fillStyle = `rgba(50, 26, 14, ${alpha.toFixed(3)})`
      ctx.fillRect(0, y, 512, 2)
    }

    // Organic wavy heartwood grain flow
    for (let i = 0; i < 32; i++) {
      const yBase = (i * 32) % 512
      ctx.strokeStyle = 'rgba(160, 110, 70, 0.16)'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(0, yBase)
      for (let x = 0; x <= 512; x += 32) {
        const offset = Math.sin(x * 0.02 + i) * 7 + Math.cos(x * 0.01 + i * 2) * 5
        ctx.lineTo(x, yBase + offset)
      }
      ctx.stroke()
    }

    // Fine organic pores
    ctx.fillStyle = 'rgba(35, 18, 10, 0.12)'
    for (let i = 0; i < 2000; i++) {
      const px = Math.random() * 512
      const py = Math.random() * 512
      ctx.fillRect(px, py, Math.random() * 2.5 + 0.5, 1)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2, 2)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Mission Planning Table Blueprint / DAG Grid texture
   */
  public static createPlanningGridTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // Translucent architectural vellum base
    ctx.fillStyle = '#182433'
    ctx.fillRect(0, 0, 512, 256)

    // Fine blueprint grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)'
    ctx.lineWidth = 1
    for (let x = 0; x <= 512; x += 16) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 256)
      ctx.stroke()
    }
    for (let y = 0; y <= 256; y += 16) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    // Major module division lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)'
    ctx.lineWidth = 1.5
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 256)
      ctx.stroke()
    }
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    // Subtle dormant DAG planning node schematic outlines (strictly static schematic)
    const nodes = [
      { x: 96, y: 128 },
      { x: 224, y: 72 },
      { x: 224, y: 184 },
      { x: 352, y: 128 },
      { x: 440, y: 128 },
    ]

    // Connecting dependency vectors
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(nodes[0]!.x, nodes[0]!.y)
    ctx.lineTo(nodes[1]!.x, nodes[1]!.y)
    ctx.lineTo(nodes[3]!.x, nodes[3]!.y)
    ctx.moveTo(nodes[0]!.x, nodes[0]!.y)
    ctx.lineTo(nodes[2]!.x, nodes[2]!.y)
    ctx.lineTo(nodes[3]!.x, nodes[3]!.y)
    ctx.lineTo(nodes[4]!.x, nodes[4]!.y)
    ctx.stroke()
    ctx.setLineDash([])

    // Nodes
    for (const node of nodes) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.4)'
      ctx.beginPath()
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * 42U Server Rack Front texture with equipment unit bays and indicator LEDs
   */
  public static createServerRackTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Dark gunmetal server chassis
    ctx.fillStyle = '#141820'
    ctx.fillRect(0, 0, 256, 512)

    // Vertical mounting rails on left & right
    ctx.fillStyle = '#222834'
    ctx.fillRect(0, 0, 24, 512)
    ctx.fillRect(232, 0, 24, 512)

    // Unit mounting holes
    ctx.fillStyle = '#0a0d12'
    for (let y = 12; y < 512; y += 16) {
      ctx.fillRect(8, y, 6, 4)
      ctx.fillRect(240, y, 6, 4)
    }

    // Horizontal 1U / 2U blade server slots
    for (let y = 10; y < 500; y += 22) {
      // Server faceplate
      ctx.fillStyle = (y % 44 === 0) ? '#181e28' : '#1b222d'
      ctx.fillRect(26, y, 204, 19)

      // Ventilation grille pattern
      ctx.fillStyle = '#0d1017'
      for (let vx = 36; vx < 170; vx += 6) {
        ctx.fillRect(vx, y + 4, 3, 11)
      }

      // Dormant hardware LEDs (standby amber / green / cyan)
      ctx.fillStyle = (y % 66 === 0) ? '#10b981' : (y % 44 === 0) ? '#38bdf8' : '#64748b'
      ctx.fillRect(184, y + 7, 4, 4)
      ctx.fillStyle = '#334155'
      ctx.fillRect(194, y + 7, 4, 4)
      ctx.fillRect(204, y + 7, 4, 4)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Browser QA Multi-Device Matrix screen textures
   */
  public static createDeviceScreenTexture(
    type: 'DESKTOP' | 'LAPTOP' | 'TABLET' | 'PHONE'
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = type === 'PHONE' || type === 'TABLET' ? 256 : 144
    const ctx = canvas.getContext('2d')!

    // Browser dark chrome background
    ctx.fillStyle = '#131822'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Top Browser window header / tab bar
    ctx.fillStyle = '#1c2432'
    ctx.fillRect(0, 0, canvas.width, 18)

    // Window control dots
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(8, 9, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#eab308'
    ctx.beginPath()
    ctx.arc(18, 9, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(28, 9, 3, 0, Math.PI * 2)
    ctx.fill()

    // URL bar
    ctx.fillStyle = '#0f141c'
    ctx.fillRect(40, 4, canvas.width - 50, 10)

    // Wireframe layout blocks representing dormant UI under test
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(12, 26, canvas.width - 24, 20) // Hero header

    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)'
    ctx.fillRect(12, 52, (canvas.width - 28) / 2, 40) // Left card
    ctx.fillRect(16 + (canvas.width - 28) / 2, 52, (canvas.width - 28) / 2, 40) // Right card

    if (canvas.height > 150) {
      ctx.fillStyle = '#1a2333'
      ctx.fillRect(12, 100, canvas.width - 24, 80) // Data table
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Code / Terminal Display Texture for Worker Monitors
   */
  public static createTerminalCodeTexture(accentColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 144
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#0b0f17'
    ctx.fillRect(0, 0, 256, 144)

    // Editor tab header
    ctx.fillStyle = '#161e2a'
    ctx.fillRect(0, 0, 256, 14)
    ctx.fillStyle = accentColor
    ctx.fillRect(8, 2, 48, 10)

    // Code lines wireframe
    const lineColors = ['#475569', '#64748b', accentColor, '#94a3b8', '#334155']
    let y = 24
    for (let i = 0; i < 11; i++) {
      const indent = (i % 4 === 1 || i % 4 === 2) ? 24 : 12
      const length = 40 + ((i * 37) % 150)
      ctx.fillStyle = lineColors[i % lineColors.length]!
      ctx.fillRect(indent, y, length, 5)
      y += 10
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Warm Scandinavian White Oak Hardwood Floor Planks
   * Natural muted architectural oak with subtle grain flow and micro-bevel joints
   */
  public static createOakFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Natural white oak architectural base (muted warm greige-amber, not flat mustard)
    ctx.fillStyle = '#8a7a67'
    ctx.fillRect(0, 0, 512, 512)

    // Staggered plank layout (64px wide planks, 32px height)
    const plankHeight = 32
    for (let y = 0; y < 512; y += plankHeight) {
      const plankOffset = (y / plankHeight) % 2 === 0 ? 0 : 96
      for (let x = -plankOffset; x < 512 + 128; x += 192) {
        const toneShift = ((x + y * 7) % 5) - 2
        ctx.fillStyle = toneShift > 0 ? '#92826f' : toneShift < 0 ? '#82725f' : '#8a7a67'
        ctx.fillRect(Math.max(0, x), y, Math.min(192, 512 - x), plankHeight)

        // Subtle micro-joint shadow & highlight
        ctx.fillStyle = 'rgba(40, 30, 20, 0.35)'
        ctx.fillRect(x, y, 1.5, plankHeight)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
        ctx.fillRect(x + 1.5, y, 1, plankHeight)
      }

      // Horizontal plank seam
      ctx.fillStyle = 'rgba(35, 25, 18, 0.40)'
      ctx.fillRect(0, y + plankHeight - 1, 512, 1.2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.fillRect(0, y + plankHeight, 512, 0.8)
    }

    // Subtle natural linear wood grain lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.lineWidth = 1
    for (let i = 0; i < 36; i++) {
      const gy = (i * 14) % 512
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.bezierCurveTo(170, gy + 2, 340, gy - 2, 512, gy + 1)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Premium Architectural Studio Floor Material (Floor 2 Central Plane)
   * Refined warm neutral architectural acoustic flooring with subtle paver joints,
   * gentle tonal variation, and calibrated specular response (no flat mustard polygon)
   */
  public static createCarpetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Architectural warm neutral greige base
    ctx.fillStyle = '#786c5f'
    ctx.fillRect(0, 0, 512, 512)

    // Staggered architectural flooring slabs (256px wide x 64px high)
    const slabHeight = 64
    const slabWidth = 256
    for (let y = 0; y < 512; y += slabHeight) {
      const rowOffset = ((y / slabHeight) % 2) * (slabWidth / 2)
      for (let x = -rowOffset; x < 512 + slabWidth; x += slabWidth) {
        // Restrained tonal variation between slabs (±2-3%)
        const hash = ((x * 17 + y * 31) % 7) - 3
        ctx.fillStyle = hash > 1 ? '#7e7265' : hash < -1 ? '#726659' : '#786c5f'
        ctx.fillRect(x, y, slabWidth, slabHeight)

        // Micro-fiber texture noise inside the slab
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)'
        for (let i = 0; i < 40; i++) {
          const fx = x + ((i * 19) % slabWidth)
          const fy = y + ((i * 23) % slabHeight)
          ctx.fillRect(fx, fy, 8, 1)
        }

        // Vertical architectural joint seam
        ctx.fillStyle = 'rgba(30, 24, 18, 0.38)'
        ctx.fillRect(x, y, 1.5, slabHeight)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.fillRect(x + 1.5, y, 1, slabHeight)
      }

      // Horizontal architectural joint seam
      ctx.fillStyle = 'rgba(25, 20, 15, 0.42)'
      ctx.fillRect(0, y + slabHeight - 1.5, 512, 1.5)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
      ctx.fillRect(0, y + slabHeight, 512, 1)
    }

    // Very subtle cross-grain weave structure
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'
    for (let x = 0; x < 512; x += 8) {
      ctx.fillRect(x, 0, 1, 512)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 2)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Framed Modern Architectural Art Print
   */
  public static createWallArtTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 384
    const ctx = canvas.getContext('2d')!

    // Heavy watercolor paper background
    ctx.fillStyle = '#f8f4ec'
    ctx.fillRect(0, 0, 256, 384)

    // Clean passe-partout border
    const m = 24
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(m, m, 256 - m * 2, 384 - m * 2)

    // Minimalist composition
    // Warm terracotta arch
    ctx.fillStyle = '#c86446'
    ctx.beginPath()
    ctx.arc(128, 170, 60, Math.PI, 0)
    ctx.lineTo(188, 250)
    ctx.lineTo(68, 250)
    ctx.closePath()
    ctx.fill()

    // Deep teal circle
    ctx.fillStyle = '#264653'
    ctx.beginPath()
    ctx.arc(160, 120, 36, 0, Math.PI * 2)
    ctx.fill()

    // Mustard ochre accent disk
    ctx.fillStyle = '#e9c46a'
    ctx.beginPath()
    ctx.arc(95, 260, 24, 0, Math.PI * 2)
    ctx.fill()

    // Fine structural line
    ctx.strokeStyle = '#2a3b4c'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(68, 290)
    ctx.lineTo(188, 290)
    ctx.stroke()

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Strategy Whiteboard with Architecture Flowchart & Sticky Notes
   */
  public static createWhiteboardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // Clean white gloss enamel surface
    ctx.fillStyle = '#fcfdfe'
    ctx.fillRect(0, 0, 512, 256)

    // Subtle matrix dot grid
    ctx.fillStyle = 'rgba(148, 163, 184, 0.25)'
    for (let x = 16; x < 512; x += 24) {
      for (let y = 16; y < 256; y += 24) {
        ctx.fillRect(x, y, 1.5, 1.5)
      }
    }

    // Architecture flowchart boxes
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2.5
    ctx.strokeRect(32, 40, 88, 48) // Box 1: Core
    ctx.strokeRect(170, 40, 96, 48) // Box 2: Orchestrator
    ctx.strokeRect(320, 40, 96, 48) // Box 3: Verifier

    // Connecting arrows
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(120, 64)
    ctx.lineTo(170, 64)
    ctx.moveTo(266, 64)
    ctx.lineTo(320, 64)
    ctx.stroke()

    // Branch to QA
    ctx.strokeStyle = '#059669'
    ctx.strokeRect(170, 130, 96, 44)
    ctx.beginPath()
    ctx.moveTo(218, 88)
    ctx.lineTo(218, 130)
    ctx.stroke()

    // Sticky Notes
    const stickies = [
      { x: 430, y: 35, color: '#fef08a' }, // yellow
      { x: 455, y: 75, color: '#bbf7d0' }, // mint
      { x: 425, y: 125, color: '#bae6fd' }, // blue
      { x: 340, y: 140, color: '#fbcfe8' }, // pink
    ]
    for (const s of stickies) {
      ctx.fillStyle = s.color
      ctx.fillRect(s.x, s.y, 44, 44)
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.fillRect(s.x, s.y + 42, 44, 2)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(s.x + 6, s.y + 12, 32, 2)
      ctx.fillRect(s.x + 6, s.y + 18, 26, 2)
      ctx.fillRect(s.x + 6, s.y + 24, 20, 2)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Hero Workstation Natural European White Oak Wood Texture
   */
  public static createHeroDeskWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Warm natural honey-oak base tone
    ctx.fillStyle = '#b8895b'
    ctx.fillRect(0, 0, 1024, 512)

    // Wood grain linear striations
    for (let y = 0; y < 512; y += 2) {
      const alpha = Math.sin(y * 0.08) * 0.08 + Math.sin(y * 0.3) * 0.04 + 0.12
      ctx.fillStyle = `rgba(130, 85, 45, ${alpha.toFixed(3)})`
      ctx.fillRect(0, y, 1024, 2)
    }

    // Organic wavy grain flow
    for (let i = 0; i < 40; i++) {
      const yBase = (i * 24) % 512
      ctx.strokeStyle = 'rgba(95, 60, 30, 0.12)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, yBase)
      for (let x = 0; x <= 1024; x += 32) {
        const offset = Math.sin(x * 0.015 + i) * 6 + Math.cos(x * 0.008 + i * 2) * 4
        ctx.lineTo(x, yBase + offset)
      }
      ctx.stroke()
    }

    // Subtle pore flecks
    ctx.fillStyle = 'rgba(75, 45, 20, 0.08)'
    for (let i = 0; i < 3000; i++) {
      const px = Math.random() * 1024
      const py = Math.random() * 512
      ctx.fillRect(px, py, Math.random() * 3 + 1, 1)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Hero Ergonomic Chair Woven Mesh Fabric Texture
   */
  public static createHeroFabricTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // Deep graphite fabric base
    ctx.fillStyle = '#1c2028'
    ctx.fillRect(0, 0, 256, 256)

    // Diagonal twill weave pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
    for (let x = 0; x < 256; x += 4) {
      for (let y = 0; y < 256; y += 4) {
        if ((x + y) % 8 === 0) {
          ctx.fillRect(x, y, 2, 2)
        }
      }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
    for (let x = 0; x < 256; x += 4) {
      for (let y = 0; y < 256; y += 4) {
        if ((x - y + 256) % 8 === 0) {
          ctx.fillRect(x, y, 2, 2)
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Hero Ultrawide 34" Display Texture (Code & Visual Engineering IDE)
   */
  public static createHeroUltrawideScreenTexture(active: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Clean dark matte editor background
    ctx.fillStyle = active ? '#0c1017' : '#080a0e'
    ctx.fillRect(0, 0, 1024, 512)

    // Window top title bar
    ctx.fillStyle = active ? '#161b24' : '#10141a'
    ctx.fillRect(0, 0, 1024, 32)

    // Window control dots
    ctx.fillStyle = active ? '#ef4444' : '#555555'
    ctx.beginPath()
    ctx.arc(20, 16, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = active ? '#eab308' : '#444444'
    ctx.beginPath()
    ctx.arc(36, 16, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = active ? '#22c55e' : '#333333'
    ctx.beginPath()
    ctx.arc(52, 16, 5, 0, Math.PI * 2)
    ctx.fill()

    // Title text
    ctx.fillStyle = active ? '#94a3b8' : '#475569'
    ctx.font = '12px monospace'
    ctx.fillText('gravitas / apps / web / src / components / CanvasView.tsx', 80, 20)

    // Left sidebar (File tree)
    ctx.fillStyle = active ? '#111620' : '#0d1015'
    ctx.fillRect(0, 32, 180, 480)

    // Sidebar items
    const sideItems = ['src/', '  hq3d/', '    geometry/', '    materials/', '    motion/', '  components/', '  hooks/', 'package.json']
    ctx.font = '11px monospace'
    for (let i = 0; i < sideItems.length; i++) {
      ctx.fillStyle = i === 1 ? (active ? '#38bdf8' : '#64748b') : (active ? '#64748b' : '#334155')
      ctx.fillText(sideItems[i]!, 16, 60 + i * 22)
    }

    // Center Main Editor Area (Code lines)
    const codeStartX = 200
    const codeColors = active
      ? ['#38bdf8', '#c084fc', '#4ade80', '#fbbf24', '#f43f5e', '#94a3b8']
      : ['#1e3a5f', '#3b2f5c', '#204a35', '#4a3d1c', '#4a1d28', '#334155']

    for (let row = 0; row < 18; row++) {
      const y = 60 + row * 23
      // Line numbers
      ctx.fillStyle = active ? '#334155' : '#1e293b'
      ctx.font = '11px monospace'
      ctx.fillText(String(row + 1).padStart(2, ' '), codeStartX - 16, y)

      // Indent
      const indent = (row % 4 === 1 ? 24 : row % 4 === 2 ? 48 : row % 4 === 3 ? 24 : 0)
      let curX = codeStartX + 12 + indent

      // Code token segments
      const segCount = (row % 3) + 2
      for (let s = 0; s < segCount; s++) {
        const segWidth = ((row * 17 + s * 37) % 90) + 30
        const color = codeColors[(row + s) % codeColors.length]!
        ctx.fillStyle = color
        ctx.fillRect(curX, y - 9, segWidth, 10)
        curX += segWidth + 8
      }
    }

    // Right Split: Live Component Preview Canvas
    const previewX = 640
    ctx.fillStyle = active ? '#0f172a' : '#0a0e17'
    ctx.fillRect(previewX, 32, 384, 480)
    ctx.strokeStyle = active ? '#1e293b' : '#111827'
    ctx.lineWidth = 1
    ctx.strokeRect(previewX, 32, 384, 480)

    // Preview UI Header
    ctx.fillStyle = active ? '#1e293b' : '#131b2b'
    ctx.fillRect(previewX + 16, 48, 352, 36)
    ctx.fillStyle = active ? '#38bdf8' : '#1e3a5f'
    ctx.fillRect(previewX + 28, 58, 64, 16)

    // Preview Cards
    for (let c = 0; c < 3; c++) {
      const cardY = 100 + c * 105
      ctx.fillStyle = active ? '#1e293b' : '#101726'
      ctx.fillRect(previewX + 16, cardY, 352, 92)
      ctx.fillStyle = active ? '#475569' : '#1e293b'
      ctx.fillRect(previewX + 32, cardY + 16, 120, 14)
      ctx.fillStyle = active ? '#334155' : '#162032'
      ctx.fillRect(previewX + 32, cardY + 38, 280, 8)
      ctx.fillRect(previewX + 32, cardY + 52, 220, 8)

      // Accent button
      ctx.fillStyle = active ? '#2563eb' : '#1d3257'
      ctx.fillRect(previewX + 32, cardY + 68, 64, 14)
    }

    // Bottom Status Bar
    ctx.fillStyle = active ? '#0284c7' : '#0f172a'
    ctx.fillRect(0, 492, 1024, 20)
    ctx.fillStyle = '#ffffff'
    ctx.font = '11px monospace'
    ctx.fillText(active ? '● WORKER_RUNNING — 0 errors — TypeScript 5.8 — Vite HMR' : '○ STANDBY — Idle — Git main (clean)', 16, 506)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Hero Secondary 24" Portrait Display Texture (Mobile Preview & Design Tokens)
   */
  public static createHeroPortraitScreenTexture(active: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Dark slate background
    ctx.fillStyle = active ? '#0b0f17' : '#070a0f'
    ctx.fillRect(0, 0, 256, 512)

    // Mobile Device Frame Outline in preview
    ctx.strokeStyle = active ? '#334155' : '#1e293b'
    ctx.lineWidth = 2
    ctx.strokeRect(16, 24, 224, 464)

    // Top status bar notch
    ctx.fillStyle = active ? '#1e293b' : '#0f172a'
    ctx.fillRect(80, 24, 96, 14)

    // Navigation Header
    ctx.fillStyle = active ? '#1e293b' : '#111827'
    ctx.fillRect(24, 46, 208, 40)
    ctx.fillStyle = active ? '#38bdf8' : '#1e3a5f'
    ctx.fillRect(36, 58, 48, 16)

    // Color Palette Token Swatches
    const tokens = active
      ? ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171']
      : ['#1e3a5f', '#2a3560', '#1c4a35', '#47361a', '#472020']

    ctx.fillStyle = active ? '#94a3b8' : '#475569'
    ctx.font = '10px monospace'
    ctx.fillText('DESIGN TOKENS', 36, 110)

    for (let i = 0; i < tokens.length; i++) {
      ctx.fillStyle = tokens[i]!
      ctx.fillRect(36 + i * 36, 120, 28, 28)
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.strokeRect(36 + i * 36, 120, 28, 28)
    }

    // Component Feed Cards
    for (let c = 0; c < 3; c++) {
      const cardY = 166 + c * 100
      ctx.fillStyle = active ? '#1e293b' : '#101726'
      ctx.fillRect(28, cardY, 200, 88)

      // Avatar circle
      ctx.fillStyle = active ? '#38bdf8' : '#1e3a5f'
      ctx.beginPath()
      ctx.arc(46, cardY + 22, 12, 0, Math.PI * 2)
      ctx.fill()

      // Title & description lines
      ctx.fillStyle = active ? '#e2e8f0' : '#475569'
      ctx.fillRect(66, cardY + 14, 100, 8)
      ctx.fillStyle = active ? '#64748b' : '#1e293b'
      ctx.fillRect(66, cardY + 26, 140, 6)
      ctx.fillRect(40, cardY + 48, 176, 6)
      ctx.fillRect(40, cardY + 60, 130, 6)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Hero Desk Mat with Contrast Stitching
   */
  public static createHeroDeskMatTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // Dark charcoal felt/leather base
    ctx.fillStyle = '#1e222a'
    ctx.fillRect(0, 0, 512, 256)

    // Micro surface texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'
    for (let i = 0; i < 4000; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 256, 1.5, 1.5)
    }

    // Perimeter dashed stitch line
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.strokeRect(10, 10, 492, 236)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /**
   * Hero Creative Tablet Sketch Surface (Wireframe architecture)
   */
  public static createHeroTabletSketchTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // Dark matte glass drafting surface
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 256, 256)

    // Subtle isometric drafting grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'
    ctx.lineWidth = 1
    for (let i = 16; i < 256; i += 16) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 256)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(256, i)
      ctx.stroke()
    }

    // Stylus sketch wireframe lines
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2
    ctx.strokeRect(32, 32, 80, 80)
    ctx.strokeRect(144, 32, 80, 80)
    ctx.strokeRect(88, 144, 80, 80)

    ctx.beginPath()
    ctx.moveTo(72, 112)
    ctx.lineTo(128, 144)
    ctx.moveTo(184, 112)
    ctx.lineTo(128, 144)
    ctx.stroke()

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }
}
