import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export interface ThreeOfficeViewportProps {
  isReducedMotion: boolean
}

export const ThreeOfficeViewport: React.FC<ThreeOfficeViewportProps> = ({ isReducedMotion }) => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 400
    const height = container.clientHeight || 320

    // Setup Three.js scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x101214)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(5, 5, 7)
    camera.lookAt(0, 0.8, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

    // Lighting: Warm creative studio tones
    const ambientLight = new THREE.AmbientLight(0xfff4e6, 0.7)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xf4a261, 1.2)
    dirLight.position.set(6, 10, 5)
    dirLight.castShadow = true
    scene.add(dirLight)

    const accentLight = new THREE.PointLight(0x81b29a, 1.5, 8)
    accentLight.position.set(-2, 3, 2)
    scene.add(accentLight)

    // Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x373d45, 0x1f2327)
    grid.position.y = 0
    scene.add(grid)

    // Studio Objects: Desk
    const deskGroup = new THREE.Group()

    const deskTopGeo = new THREE.BoxGeometry(3, 0.12, 1.6)
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.6 })
    const deskTop = new THREE.Mesh(deskTopGeo, deskMat)
    deskTop.position.set(0, 1.4, 0)
    deskGroup.add(deskTop)

    // Desk Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x4a4f55, metalness: 0.6, roughness: 0.3 })
    const legPositions = [
      [-1.35, 0.7, -0.65],
      [1.35, 0.7, -0.65],
      [-1.35, 0.7, 0.65],
      [1.35, 0.7, 0.65],
    ]
    for (const [x, y, z] of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat)
      leg.position.set(x, y, z)
      deskGroup.add(leg)
    }

    // Monitor
    const screenGeo = new THREE.BoxGeometry(1.2, 0.7, 0.04)
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x121518, roughness: 0.2 })
    const screen = new THREE.Mesh(screenGeo, screenMat)
    screen.position.set(0, 1.9, -0.2)
    deskGroup.add(screen)

    // Glowing screen panel
    const displayGeo = new THREE.PlaneGeometry(1.1, 0.62)
    const displayMat = new THREE.MeshBasicMaterial({ color: 0x81b29a })
    const display = new THREE.Mesh(displayGeo, displayMat)
    display.position.set(0, 1.9, -0.175)
    deskGroup.add(display)

    // Companion Robot on desk
    const buddyGroup = new THREE.Group()
    buddyGroup.position.set(0.9, 1.65, 0.1)

    const buddyHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xf4a261, roughness: 0.3 })
    )
    buddyGroup.add(buddyHead)

    const eyeGeo = new THREE.SphereGeometry(0.04, 16, 16)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x121518 })
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
    leftEye.position.set(-0.08, 0.03, 0.18)
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
    rightEye.position.set(0.08, 0.03, 0.18)
    buddyGroup.add(leftEye, rightEye)

    deskGroup.add(buddyGroup)
    scene.add(deskGroup)

    let animId = 0
    let angle = 0

    const renderStatic = () => {
      camera.position.set(5, 5, 7)
      camera.lookAt(0, 0.8, 0)
      renderer.render(scene, camera)
    }

    const renderLoop = () => {
      angle += 0.005
      camera.position.x = Math.sin(angle) * 7
      camera.position.z = Math.cos(angle) * 7
      camera.lookAt(0, 1.2, 0)

      // Subtle buddy bob
      buddyGroup.position.y = 1.65 + Math.sin(angle * 4) * 0.02

      renderer.render(scene, camera)
      animId = requestAnimationFrame(renderLoop)
    }

    if (isReducedMotion) {
      // Gate B0: When reduced motion is active, render static scene once without continuous rAF loop
      renderStatic()
    } else {
      renderLoop()
    }

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      if (isReducedMotion) {
        renderStatic()
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animId) {
        cancelAnimationFrame(animId)
      }
      window.removeEventListener('resize', handleResize)

      // Gate B0: Thoroughly traverse and dispose all geometries and materials in the scene
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose())
          } else if (obj.material) {
            obj.material.dispose()
          }
        } else if (obj instanceof THREE.GridHelper) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose())
          } else if (obj.material) {
            obj.material.dispose()
          }
        }
      })

      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [isReducedMotion])

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  )
}
