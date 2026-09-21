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
   * American Walnut wood texture with subtle grain lines
   */
  public static createWalnutTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // Warm deep walnut base
    ctx.fillStyle = '#2c1e16'
    ctx.fillRect(0, 0, 256, 256)

    // Organic longitudinal grain bands
    for (let y = 0; y < 256; y += 3) {
      const alpha = 0.04 + Math.sin(y * 0.12) * 0.03 + Math.random() * 0.03
      ctx.fillStyle = `rgba(20, 12, 8, ${alpha})`
      ctx.fillRect(0, y, 256, 2)
    }

    // Subtle lighter heartwood streaks
    for (let y = 10; y < 256; y += 24) {
      ctx.fillStyle = 'rgba(64, 44, 32, 0.08)'
      ctx.fillRect(0, y, 256, 4)
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
}
