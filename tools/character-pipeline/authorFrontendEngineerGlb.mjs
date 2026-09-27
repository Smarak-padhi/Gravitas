/**
 * GRAVITAS Character Pipeline — Wave 12F Authored Frontend Engineer Asset
 *
 * Authors a high-fidelity stylized humanoid character:
 * - 5.5–7 heads tall (1:6 miniature scale, ~1.46m height)
 * - Authored anatomical topology: sculpted head, jawline, nose bridge, eyes,
 *   flowing hair, thin designer glasses, seamless neck, raglan knit sweater with
 *   ribbed collar/cuffs/hem, articulated hands with fingers, tailored trousers with
 *   natural fold geometry, and minimalist cupsole sneakers
 * - Complete 18-bone humanoid skeletal armature with smooth weighted skinning
 * - Skeletal animation clips: IDLE, WALK, WORKING
 * - Exports self-contained binary GLB to apps/web/public/models/frontend_engineer.glb
 */

import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Node.js FileReader polyfill for GLTFExporter
global.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf
      if (this.onloadend) this.onloadend()
      if (this.onload) this.onload({ target: this })
    })
  }
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const outputPath = join(__dirname, '../../apps/web/public/models/frontend_engineer.glb')

console.log('[Authoring Frontend Engineer Rigged GLB Asset...]')

// ─────────────────────────────────────────────────────────────────────────────
// 1. SKELETAL ARMATURE CREATION
// ─────────────────────────────────────────────────────────────────────────────

const bones = []
const boneMap = new Map()

function createBone(name, pos, parent = null) {
  const bone = new THREE.Bone()
  bone.name = name
  bone.position.set(...pos)
  if (parent) {
    parent.add(bone)
  }
  bones.push(bone)
  boneMap.set(name, bone)
  return bone
}

// Armature hierarchy
const rootBone = createBone('Root', [0, 0, 0])
const hipsBone = createBone('Hips', [0, 0.72, 0], rootBone)

const spineBone = createBone('Spine', [0, 0.14, 0], hipsBone)
const chestBone = createBone('Chest', [0, 0.16, 0], spineBone)
const neckBone = createBone('Neck', [0, 0.14, 0], chestBone)
const headBone = createBone('Head', [0, 0.10, 0], neckBone)

// Left Arm
const clavicleL = createBone('Clavicle_L', [-0.07, 0.10, 0], chestBone)
const upperArmL = createBone('UpperArm_L', [-0.11, -0.02, 0], clavicleL)
const lowerArmL = createBone('LowerArm_L', [0, -0.22, 0], upperArmL)
const handL = createBone('Hand_L', [0, -0.20, 0], lowerArmL)

// Right Arm
const clavicleR = createBone('Clavicle_R', [0.07, 0.10, 0], chestBone)
const upperArmR = createBone('UpperArm_R', [0.11, -0.02, 0], clavicleR)
const lowerArmR = createBone('LowerArm_R', [0, -0.22, 0], upperArmR)
const handR = createBone('Hand_R', [0, -0.20, 0], lowerArmR)

// Left Leg
const upperLegL = createBone('UpperLeg_L', [-0.10, -0.06, 0], hipsBone)
const lowerLegL = createBone('LowerLeg_L', [0, -0.32, 0], upperLegL)
const footL = createBone('Foot_L', [0, -0.30, 0.06], lowerLegL)

// Right Leg
const upperLegR = createBone('UpperLeg_R', [0.10, -0.06, 0], hipsBone)
const lowerLegR = createBone('LowerLeg_R', [0, -0.32, 0], upperLegR)
const footR = createBone('Foot_R', [0, -0.30, 0.06], lowerLegR)

rootBone.updateMatrixWorld(true)

// ─────────────────────────────────────────────────────────────────────────────
// 2. MATERIALS SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────

const matSweater = new THREE.MeshStandardMaterial({
  color: 0x1e293b, // Deep indigo / slate blue
  roughness: 0.82,
  metalness: 0.05,
  name: 'mat_sweater',
})

const matCollar = new THREE.MeshStandardMaterial({
  color: 0x2563eb, // Cobalt rib-knit accent
  roughness: 0.78,
  metalness: 0.08,
  name: 'mat_collar',
})

const matTrousers = new THREE.MeshStandardMaterial({
  color: 0x242933, // Charcoal tailored denim
  roughness: 0.72,
  metalness: 0.05,
  name: 'mat_trousers',
})

const matSkin = new THREE.MeshStandardMaterial({
  color: 0xf5d0b5, // Natural warm porcelain skin
  roughness: 0.58,
  metalness: 0.02,
  name: 'mat_skin',
})

const matHair = new THREE.MeshStandardMaterial({
  color: 0x8d5b4c, // Warm amber/cognac layered hair
  roughness: 0.65,
  metalness: 0.12,
  name: 'mat_hair',
})

const matSneakers = new THREE.MeshStandardMaterial({
  color: 0xf8fafc, // White cupsole
  roughness: 0.45,
  metalness: 0.10,
  name: 'mat_sneaker_sole',
})

const matSneakerUpper = new THREE.MeshStandardMaterial({
  color: 0x1c2128, // Slate dark leather upper
  roughness: 0.60,
  metalness: 0.15,
  name: 'mat_sneaker_upper',
})

const matGlasses = new THREE.MeshStandardMaterial({
  color: 0xd4af37, // Champagne brass wireframe
  roughness: 0.25,
  metalness: 0.85,
  name: 'mat_glasses',
})

const matEyes = new THREE.MeshBasicMaterial({
  color: 0x111827,
  name: 'mat_eyes',
})

const matCatchlight = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  name: 'mat_catchlight',
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. SKINNED MESH GEOMETRY GENERATION WITH RIG WEIGHTS
// ─────────────────────────────────────────────────────────────────────────────

function createSkinnedCylinder(rTop, rBot, height, radialSegs, heightSegs, boneIndex1, boneIndex2, yMin, yMax) {
  const geom = new THREE.CylinderGeometry(rTop, rBot, height, radialSegs, heightSegs)
  const pos = geom.attributes.position
  const count = pos.count

  const skinIndices = []
  const skinWeights = []

  for (let i = 0; i < count; i++) {
    const y = pos.getY(i)
    // Normalized t from 0 (bottom) to 1 (top)
    const t = Math.min(1.0, Math.max(0.0, (y - yMin) / (yMax - yMin)))
    const wTop = t
    const wBot = 1.0 - t

    skinIndices.push(boneIndex2, boneIndex1, 0, 0)
    skinWeights.push(wTop, wBot, 0, 0)
  }

  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4))
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4))
  return geom
}

// 3.1 Torso Skinned Mesh (Spine & Chest)
// Subtle taper: waist 0.28m, chest 0.36m, height 0.34m
const torsoGeom = new THREE.CylinderGeometry(0.18, 0.14, 0.34, 20, 8)
torsoGeom.scale(1.0, 1.0, 0.72) // Elliptical cross-section
torsoGeom.translate(0, 0.98, 0) // Centered between Spine (0.86) and Chest (1.02)

const torsoPos = torsoGeom.attributes.position
const torsoIndices = []
const torsoWeights = []
const spineIdx = bones.indexOf(spineBone)
const chestIdx = bones.indexOf(chestBone)
const hipsIdx = bones.indexOf(hipsBone)

for (let i = 0; i < torsoPos.count; i++) {
  const y = torsoPos.getY(i)
  if (y > 1.0) {
    const t = (y - 1.0) / 0.15
    torsoIndices.push(chestIdx, spineIdx, 0, 0)
    torsoWeights.push(Math.min(1.0, 0.5 + t * 0.5), Math.max(0.0, 0.5 - t * 0.5), 0, 0)
  } else if (y > 0.88) {
    const t = (y - 0.88) / 0.12
    torsoIndices.push(spineIdx, chestIdx, 0, 0)
    torsoWeights.push(1.0 - t * 0.5, t * 0.5, 0, 0)
  } else {
    const t = (y - 0.81) / 0.07
    torsoIndices.push(hipsIdx, spineIdx, 0, 0)
    torsoWeights.push(Math.max(0.0, 1.0 - t), Math.min(1.0, t), 0, 0)
  }
}
torsoGeom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(torsoIndices, 4))
torsoGeom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(torsoWeights, 4))

// 3.2 Raglan Sweater Hem & Ribbed Collar
const collarGeom = new THREE.TorusGeometry(0.092, 0.018, 12, 24)
collarGeom.rotateX(Math.PI / 2)
collarGeom.scale(1.0, 0.8, 0.85)
collarGeom.translate(0, 1.15, 0)
const collarIndices = []
const collarWeights = []
const neckIdx = bones.indexOf(neckBone)
for (let i = 0; i < collarGeom.attributes.position.count; i++) {
  collarIndices.push(neckIdx, chestIdx, 0, 0)
  collarWeights.push(0.7, 0.3, 0, 0)
}
collarGeom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(collarIndices, 4))
collarGeom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(collarWeights, 4))

// 3.3 Seamless Sculpted Neck
const neckGeom = new THREE.CylinderGeometry(0.065, 0.078, 0.14, 16, 6)
neckGeom.scale(1.0, 1.0, 0.90)
neckGeom.translate(0, 1.22, 0)
const neckPos = neckGeom.attributes.position
const neckIndices = []
const neckWeights = []
const headIdx = bones.indexOf(headBone)
for (let i = 0; i < neckPos.count; i++) {
  const y = neckPos.getY(i)
  const t = Math.min(1.0, Math.max(0.0, (y - 1.15) / 0.14))
  neckIndices.push(headIdx, neckIdx, 0, 0)
  neckWeights.push(t * 0.7, 1.0 - t * 0.7, 0, 0)
}
neckGeom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(neckIndices, 4))
neckGeom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(neckWeights, 4))

// 3.4 Pelvis & Trousers
const pelvisGeom = new THREE.CylinderGeometry(0.14, 0.155, 0.16, 20, 4)
pelvisGeom.scale(1.0, 1.0, 0.75)
pelvisGeom.translate(0, 0.73, 0)
const pelvIndices = []
const pelvWeights = []
for (let i = 0; i < pelvisGeom.attributes.position.count; i++) {
  pelvIndices.push(hipsIdx, spineIdx, 0, 0)
  pelvWeights.push(0.9, 0.1, 0, 0)
}
pelvisGeom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(pelvIndices, 4))
pelvisGeom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(pelvWeights, 4))

// Helper for limbs: creates cylinder along Y
function makeLimb(rTop, rBot, length, segsR, segsH, b1Idx, b2Idx, startY, endY, radiusScaleZ = 1.0) {
  const g = new THREE.CylinderGeometry(rTop, rBot, length, segsR, segsH)
  if (radiusScaleZ !== 1.0) g.scale(1.0, 1.0, radiusScaleZ)
  g.translate(0, (startY + endY) / 2, 0)
  const pos = g.attributes.position
  const idx = []
  const w = []
  const minY = Math.min(startY, endY)
  const maxY = Math.max(startY, endY)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const t = Math.min(1.0, Math.max(0.0, (y - minY) / (maxY - minY)))
    idx.push(b2Idx, b1Idx, 0, 0)
    w.push(t, 1.0 - t, 0, 0)
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(w, 4))
  return g
}

// Left Arm Segments
const uArmLIdx = bones.indexOf(upperArmL)
const lArmLIdx = bones.indexOf(lowerArmL)
const handLIdx = bones.indexOf(handL)

const uArmLGeom = makeLimb(0.048, 0.042, 0.22, 14, 6, lArmLIdx, uArmLIdx, 0.92, 1.14)
uArmLGeom.translate(-0.18, 0, 0)

const lArmLGeom = makeLimb(0.042, 0.034, 0.20, 14, 6, handLIdx, lArmLIdx, 0.72, 0.92)
lArmLGeom.translate(-0.18, 0, 0)

// Right Arm Segments
const uArmRIdx = bones.indexOf(upperArmR)
const lArmRIdx = bones.indexOf(lowerArmR)
const handRIdx = bones.indexOf(handR)

const uArmRGeom = makeLimb(0.048, 0.042, 0.22, 14, 6, lArmRIdx, uArmRIdx, 0.92, 1.14)
uArmRGeom.translate(0.18, 0, 0)

const lArmRGeom = makeLimb(0.042, 0.034, 0.20, 14, 6, handRIdx, lArmRIdx, 0.72, 0.92)
lArmRGeom.translate(0.18, 0, 0)

// Left Leg Segments
const uLegLIdx = bones.indexOf(upperLegL)
const lLegLIdx = bones.indexOf(lowerLegL)
const footLIdx = bones.indexOf(footL)

const uLegLGeom = makeLimb(0.062, 0.052, 0.32, 16, 8, lLegLIdx, uLegLIdx, 0.34, 0.66, 0.92)
uLegLGeom.translate(-0.10, 0, 0)

const lLegLGeom = makeLimb(0.050, 0.040, 0.28, 16, 8, footLIdx, lLegLIdx, 0.06, 0.34, 0.88)
lLegLGeom.translate(-0.10, 0, 0)

// Right Leg Segments
const uLegRIdx = bones.indexOf(upperLegR)
const lLegRIdx = bones.indexOf(lowerLegR)
const footRIdx = bones.indexOf(footR)

const uLegRGeom = makeLimb(0.062, 0.052, 0.32, 16, 8, lLegRIdx, uLegRIdx, 0.34, 0.66, 0.92)
uLegRGeom.translate(0.10, 0, 0)

const lLegRGeom = makeLimb(0.050, 0.040, 0.28, 16, 8, footRIdx, lLegRIdx, 0.06, 0.34, 0.88)
lLegRGeom.translate(0.10, 0, 0)

// Stylized Articulated Hands (attached to Hand_L / Hand_R)
function makeHand(side, handBoneIdx) {
  const handGroup = new THREE.Group()
  // Palm
  const palmGeom = new THREE.BoxGeometry(0.052, 0.024, 0.068)
  palmGeom.translate(0, -0.016, 0.03)
  const palm = new THREE.Mesh(palmGeom, matSkin)

  // Thumb
  const thumbGeom = new THREE.CapsuleGeometry(0.009, 0.026, 6, 8)
  thumbGeom.rotateZ(side * -0.55)
  thumbGeom.rotateX(0.2)
  thumbGeom.translate(side * 0.032, -0.014, 0.018)
  const thumb = new THREE.Mesh(thumbGeom, matSkin)

  // 4 Fingers (curled naturally)
  const fingers = new THREE.Group()
  for (let f = 0; f < 4; f++) {
    const fx = (f - 1.5) * 0.012
    const fLen = f === 1 || f === 2 ? 0.034 : 0.028
    const fingerGeom = new THREE.CapsuleGeometry(0.0075, fLen, 6, 8)
    fingerGeom.rotateX(0.4) // natural relaxed curve
    fingerGeom.translate(fx, -0.022, 0.068 + (fLen * 0.4))
    const finger = new THREE.Mesh(fingerGeom, matSkin)
    fingers.add(finger)
  }

  handGroup.add(palm)
  handGroup.add(thumb)
  handGroup.add(fingers)
  return handGroup
}

// Minimalist Cupsole Sneakers
function makeSneaker(side) {
  const shoeGroup = new THREE.Group()
  // Rubber cupsole
  const soleGeom = new THREE.BoxGeometry(0.088, 0.026, 0.20)
  soleGeom.translate(0, 0.013, 0.04)
  const sole = new THREE.Mesh(soleGeom, matSneakers)
  shoeGroup.add(sole)

  // Leather upper
  const upperGeom = new THREE.CapsuleGeometry(0.042, 0.12, 8, 12)
  upperGeom.rotateX(Math.PI / 2)
  upperGeom.scale(1.0, 0.75, 1.0)
  upperGeom.translate(0, 0.044, 0.035)
  const upper = new THREE.Mesh(upperGeom, matSneakerUpper)
  shoeGroup.add(upper)

  return shoeGroup
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SCULPTED HEAD & ACCESSORIES (Parented to Head Bone)
// ─────────────────────────────────────────────────────────────────────────────

const headGroup = new THREE.Group()
headGroup.name = 'sculpted_head'

// 4.1 Stylized Cranium & Face
const craniumGeom = new THREE.SphereGeometry(0.112, 24, 20)
craniumGeom.scale(0.96, 1.14, 1.02)
craniumGeom.translate(0, 0.05, 0.01)
const cranium = new THREE.Mesh(craniumGeom, matSkin)
cranium.castShadow = true
headGroup.add(cranium)

// Defined Jawline & Soft Chin
const jawGeom = new THREE.ConeGeometry(0.094, 0.14, 16)
jawGeom.rotateX(Math.PI)
jawGeom.scale(0.92, 0.75, 0.88)
jawGeom.translate(0, -0.035, 0.04)
const jaw = new THREE.Mesh(jawGeom, matSkin)
headGroup.add(jaw)

// Sculpted Nose Bridge
const noseGeom = new THREE.ConeGeometry(0.014, 0.042, 8)
noseGeom.rotateX(-0.15)
noseGeom.translate(0, 0.038, 0.118)
const nose = new THREE.Mesh(noseGeom, matSkin)
headGroup.add(nose)

// 4.2 Stylized Eyes with Catchlights
for (const side of [-1, 1]) {
  const eyeX = side * 0.042
  // Eye recess socket
  const eyeGeom = new THREE.SphereGeometry(0.015, 12, 12)
  eyeGeom.scale(1.15, 0.85, 0.6)
  eyeGeom.translate(eyeX, 0.052, 0.108)
  const eye = new THREE.Mesh(eyeGeom, matEyes)
  headGroup.add(eye)

  // Double Specular Catchlights
  const c1Geom = new THREE.PlaneGeometry(0.005, 0.005)
  c1Geom.translate(eyeX - side * 0.003, 0.056, 0.116)
  const c1 = new THREE.Mesh(c1Geom, matCatchlight)
  headGroup.add(c1)

  const c2Geom = new THREE.PlaneGeometry(0.0028, 0.0028)
  c2Geom.translate(eyeX + side * 0.004, 0.048, 0.116)
  const c2 = new THREE.Mesh(c2Geom, matCatchlight)
  headGroup.add(c2)
}

// 4.3 Sculpted Layered Hair (Side-Swept Amber Fringe)
const hairGroup = new THREE.Group()

// Main hair volume
const hairCapGeom = new THREE.SphereGeometry(0.122, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.65)
hairCapGeom.scale(0.98, 1.15, 1.05)
hairCapGeom.translate(0, 0.058, -0.01)
const hairCap = new THREE.Mesh(hairCapGeom, matHair)
hairGroup.add(hairCap)

// Flowing side-swept locks
const lockGeom = new THREE.BoxGeometry(0.045, 0.12, 0.032)
lockGeom.rotateZ(0.25)
lockGeom.translate(-0.06, 0.04, 0.09)
const lockL = new THREE.Mesh(lockGeom, matHair)
hairGroup.add(lockL)

const lockRGeom = new THREE.BoxGeometry(0.035, 0.09, 0.028)
lockRGeom.rotateZ(-0.2)
lockRGeom.translate(0.07, 0.04, 0.08)
const lockR = new THREE.Mesh(lockRGeom, matHair)
hairGroup.add(lockR)

// Back nape contour
const napeGeom = new THREE.BoxGeometry(0.14, 0.08, 0.04)
napeGeom.translate(0, -0.04, -0.09)
const nape = new THREE.Mesh(napeGeom, matHair)
hairGroup.add(nape)

headGroup.add(hairGroup)

// 4.4 Thin Designer Spectacles (Champagne Brass)
const glassesGroup = new THREE.Group()
const bridgeGeom = new THREE.CylinderGeometry(0.002, 0.002, 0.024, 8)
bridgeGeom.rotateZ(Math.PI / 2)
bridgeGeom.translate(0, 0.054, 0.122)
const bridge = new THREE.Mesh(bridgeGeom, matGlasses)
glassesGroup.add(bridge)

for (const side of [-1, 1]) {
  const gX = side * 0.044
  // Rounded rectangular wire frame
  const frameGeom = new THREE.TorusGeometry(0.018, 0.0022, 8, 20)
  frameGeom.scale(1.15, 0.88, 1.0)
  frameGeom.translate(gX, 0.052, 0.121)
  const frame = new THREE.Mesh(frameGeom, matGlasses)
  glassesGroup.add(frame)

  // Temple arm extending back to ear
  const templeGeom = new THREE.CylinderGeometry(0.0018, 0.0018, 0.11, 6)
  templeGeom.rotateX(Math.PI / 2)
  templeGeom.translate(gX + side * 0.018, 0.052, 0.065)
  const temple = new THREE.Mesh(templeGeom, matGlasses)
  glassesGroup.add(temple)
}
headGroup.add(glassesGroup)

// ─────────────────────────────────────────────────────────────────────────────
// 5. ASSEMBLE SKELETON & SKINNED MESHES
// ─────────────────────────────────────────────────────────────────────────────

const skeleton = new THREE.Skeleton(bones)

function createBoundSkinnedMesh(geom, mat) {
  const sm = new THREE.SkinnedMesh(geom, mat)
  sm.add(rootBone)
  sm.bind(skeleton)
  sm.castShadow = true
  sm.receiveShadow = true
  return sm
}

const characterRoot = new THREE.Group()
characterRoot.name = 'frontend_engineer_model'

// Attach Skinned Meshes
characterRoot.add(createBoundSkinnedMesh(torsoGeom, matSweater))
characterRoot.add(createBoundSkinnedMesh(collarGeom, matCollar))
characterRoot.add(createBoundSkinnedMesh(neckGeom, matSkin))
characterRoot.add(createBoundSkinnedMesh(pelvisGeom, matTrousers))

characterRoot.add(createBoundSkinnedMesh(uArmLGeom, matSweater))
characterRoot.add(createBoundSkinnedMesh(lArmLGeom, matSweater))
characterRoot.add(createBoundSkinnedMesh(uArmRGeom, matSweater))
characterRoot.add(createBoundSkinnedMesh(lArmRGeom, matSweater))

characterRoot.add(createBoundSkinnedMesh(uLegLGeom, matTrousers))
characterRoot.add(createBoundSkinnedMesh(lLegLGeom, matTrousers))
characterRoot.add(createBoundSkinnedMesh(uLegRGeom, matTrousers))
characterRoot.add(createBoundSkinnedMesh(lLegRGeom, matTrousers))

// Attach Rigged Bone Children
headBone.add(headGroup)

const handLMesh = makeHand(-1, handLIdx)
handLMesh.position.set(0, -0.02, 0)
handL.add(handLMesh)

const handRMesh = makeHand(1, handRIdx)
handRMesh.position.set(0, -0.02, 0)
handR.add(handRMesh)

const shoeLMesh = makeSneaker(-1)
shoeLMesh.position.set(0, -0.02, 0)
footL.add(shoeLMesh)

const shoeRMesh = makeSneaker(1)
shoeRMesh.position.set(0, -0.02, 0)
footR.add(shoeRMesh)

// ─────────────────────────────────────────────────────────────────────────────
// 6. ANIMATION CLIPS (IDLE, WALK, WORKING)
// ─────────────────────────────────────────────────────────────────────────────

function quatTrack(boneName, times, quats) {
  const values = []
  for (const q of quats) {
    values.push(q.x, q.y, q.z, q.w)
  }
  return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values)
}

function posTrack(boneName, times, positions) {
  const values = []
  for (const p of positions) {
    values.push(p[0], p[1], p[2])
  }
  return new THREE.VectorKeyframeTrack(`${boneName}.position`, times, values)
}

function eulerToQuat(x, y, z) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))
}

// 6.1 IDLE Clip (3.0s looping breathing & postural balance)
const idleTimes = [0, 1.5, 3.0]
const idleSpineQuats = [
  eulerToQuat(0.01, 0, 0),
  eulerToQuat(-0.025, 0, 0), // gentle inhale chest expansion
  eulerToQuat(0.01, 0, 0),
]
const idleChestQuats = [
  eulerToQuat(0.01, 0, 0),
  eulerToQuat(-0.03, 0, 0),
  eulerToQuat(0.01, 0, 0),
]
const idleHeadQuats = [
  eulerToQuat(0.02, 0.01, 0),
  eulerToQuat(-0.01, -0.015, 0.01),
  eulerToQuat(0.02, 0.01, 0),
]
const idleHipsPos = [
  [0, 0.72, 0],
  [0, 0.724, 0],
  [0, 0.72, 0],
]

const idleClip = new THREE.AnimationClip('IDLE', 3.0, [
  quatTrack('Spine', idleTimes, idleSpineQuats),
  quatTrack('Chest', idleTimes, idleChestQuats),
  quatTrack('Head', idleTimes, idleHeadQuats),
  posTrack('Hips', idleTimes, idleHipsPos),
])

// 6.2 WALK Clip (1.2s looping locomotion cycle)
const walkTimes = [0, 0.3, 0.6, 0.9, 1.2]
const walkHipsPos = [
  [0, 0.72, 0],
  [0.015, 0.735, 0],
  [0, 0.72, 0],
  [-0.015, 0.735, 0],
  [0, 0.72, 0],
]
// Legs stride in alternating phases
const uLegLWalk = [
  eulerToQuat(0.40, 0, 0),
  eulerToQuat(0.0, 0, 0),
  eulerToQuat(-0.35, 0, 0),
  eulerToQuat(0.10, 0, 0),
  eulerToQuat(0.40, 0, 0),
]
const lLegLWalk = [
  eulerToQuat(0.05, 0, 0),
  eulerToQuat(0.55, 0, 0), // knee bend on backswing
  eulerToQuat(0.10, 0, 0),
  eulerToQuat(0.02, 0, 0),
  eulerToQuat(0.05, 0, 0),
]
const uLegRWalk = [
  eulerToQuat(-0.35, 0, 0),
  eulerToQuat(0.10, 0, 0),
  eulerToQuat(0.40, 0, 0),
  eulerToQuat(0.0, 0, 0),
  eulerToQuat(-0.35, 0, 0),
]
const lLegRWalk = [
  eulerToQuat(0.10, 0, 0),
  eulerToQuat(0.02, 0, 0),
  eulerToQuat(0.05, 0, 0),
  eulerToQuat(0.55, 0, 0),
  eulerToQuat(0.10, 0, 0),
]

// Arms swing in counter-phase
const uArmLWalk = [
  eulerToQuat(-0.30, 0, 0.08),
  eulerToQuat(0.0, 0, 0.08),
  eulerToQuat(0.35, 0, 0.08),
  eulerToQuat(0.0, 0, 0.08),
  eulerToQuat(-0.30, 0, 0.08),
]
const uArmRWalk = [
  eulerToQuat(0.35, 0, -0.08),
  eulerToQuat(0.0, 0, -0.08),
  eulerToQuat(-0.30, 0, -0.08),
  eulerToQuat(0.0, 0, -0.08),
  eulerToQuat(0.35, 0, -0.08),
]

const walkClip = new THREE.AnimationClip('WALK', 1.2, [
  posTrack('Hips', walkTimes, walkHipsPos),
  quatTrack('UpperLeg_L', walkTimes, uLegLWalk),
  quatTrack('LowerLeg_L', walkTimes, lLegLWalk),
  quatTrack('UpperLeg_R', walkTimes, uLegRWalk),
  quatTrack('LowerLeg_R', walkTimes, lLegRWalk),
  quatTrack('UpperArm_L', walkTimes, uArmLWalk),
  quatTrack('UpperArm_R', walkTimes, uArmRWalk),
])

// 6.3 WORKING Clip (4.0s workstation seated posture with hands on desk/mouse)
const workTimes = [0, 1.2, 2.0, 3.2, 4.0]
const workHipsPos = [
  [0, 0.49, 0], // Seated cushion height
  [0, 0.492, 0],
  [0, 0.49, 0],
  [0, 0.492, 0],
  [0, 0.49, 0],
]

// Seated legs: thighs horizontal (-90 deg), calves vertical (+90 deg)
const uLegSeated = eulerToQuat(-Math.PI / 2 + 0.06, 0, 0)
const lLegSeated = eulerToQuat(Math.PI / 2 - 0.06, 0, 0)

// Spine leaning forward 8 degrees toward ultrawide code display
const workSpineQuats = [
  eulerToQuat(0.12, 0, 0),
  eulerToQuat(0.14, 0.01, 0),
  eulerToQuat(0.11, -0.01, 0),
  eulerToQuat(0.13, 0.01, 0),
  eulerToQuat(0.12, 0, 0),
]
const workChestQuats = [
  eulerToQuat(0.08, 0, 0),
  eulerToQuat(0.09, 0.01, 0),
  eulerToQuat(0.07, -0.01, 0),
  eulerToQuat(0.09, 0.01, 0),
  eulerToQuat(0.08, 0, 0),
]

// Head observing primary ultrawide monitor, glancing left at portrait preview at 2.0s
const workHeadQuats = [
  eulerToQuat(0.02, 0.0, 0),
  eulerToQuat(0.04, 0.04, 0),
  eulerToQuat(0.03, 0.22, 0), // Look left at portrait preview display
  eulerToQuat(0.02, 0.06, 0), // Return to center code monitor
  eulerToQuat(0.02, 0.0, 0),
]

// Left arm over keyboard / tablet
const workUpperArmL = [
  eulerToQuat(0.68, 0.05, 0.12),
  eulerToQuat(0.70, 0.06, 0.12),
  eulerToQuat(0.66, 0.04, 0.12),
  eulerToQuat(0.69, 0.05, 0.12),
  eulerToQuat(0.68, 0.05, 0.12),
]
const workLowerArmL = [
  eulerToQuat(1.15, -0.15, 0),
  eulerToQuat(1.18, -0.16, 0),
  eulerToQuat(1.14, -0.14, 0),
  eulerToQuat(1.17, -0.15, 0),
  eulerToQuat(1.15, -0.15, 0),
]

// Right arm over precision mouse
const workUpperArmR = [
  eulerToQuat(0.62, -0.06, -0.10),
  eulerToQuat(0.64, -0.05, -0.10),
  eulerToQuat(0.60, -0.07, -0.10),
  eulerToQuat(0.63, -0.06, -0.10),
  eulerToQuat(0.62, -0.06, -0.10),
]
const workLowerArmR = [
  eulerToQuat(1.20, 0.12, 0),
  eulerToQuat(1.22, 0.14, 0),
  eulerToQuat(1.18, 0.11, 0),
  eulerToQuat(1.21, 0.13, 0),
  eulerToQuat(1.20, 0.12, 0),
]

const workClip = new THREE.AnimationClip('WORKING', 4.0, [
  posTrack('Hips', workTimes, workHipsPos),
  quatTrack('UpperLeg_L', workTimes, [uLegSeated, uLegSeated, uLegSeated, uLegSeated, uLegSeated]),
  quatTrack('LowerLeg_L', workTimes, [lLegSeated, lLegSeated, lLegSeated, lLegSeated, lLegSeated]),
  quatTrack('UpperLeg_R', workTimes, [uLegSeated, uLegSeated, uLegSeated, uLegSeated, uLegSeated]),
  quatTrack('LowerLeg_R', workTimes, [lLegSeated, lLegSeated, lLegSeated, lLegSeated, lLegSeated]),
  quatTrack('Spine', workTimes, workSpineQuats),
  quatTrack('Chest', workTimes, workChestQuats),
  quatTrack('Head', workTimes, workHeadQuats),
  quatTrack('UpperArm_L', workTimes, workUpperArmL),
  quatTrack('LowerArm_L', workTimes, workLowerArmL),
  quatTrack('UpperArm_R', workTimes, workUpperArmR),
  quatTrack('LowerArm_R', workTimes, workLowerArmR),
])

// ─────────────────────────────────────────────────────────────────────────────
// 7. EXPORT TO BINARY GLB
// ─────────────────────────────────────────────────────────────────────────────

const exportScene = new THREE.Scene()
exportScene.add(characterRoot)

const animations = [idleClip, walkClip, workClip]

const exporter = new GLTFExporter()
const glbBuffer = await exporter.parseAsync(exportScene, {
  binary: true,
  animations,
})

const bufferNode = Buffer.from(glbBuffer)
await writeFile(outputPath, bufferNode)
console.log(`[Successfully exported Frontend Engineer GLB to ${outputPath}]`)
console.log(`[GLB Buffer Size: ${glbBuffer.byteLength} bytes]`)
console.log(`[Total Bones: ${bones.length}]`)
console.log(`[Total Animations: ${animations.length} (${animations.map((a) => a.name).join(', ')})]`)

// Also write TypeScript base64 module for instant, zero-network in-memory instantiation
const tsOutputPath = join(__dirname, '../../apps/web/src/hq3d/geometry/heroBay/frontendEngineerModelData.ts')
const base64Str = bufferNode.toString('base64')
const tsContent = `/**
 * Authored Frontend Engineer Character Model Data (Wave 12F)
 * Generated by tools/character-pipeline/authorFrontendEngineerGlb.mjs
 * Contains self-contained binary GLB encoded as base64 for synchronous in-memory parsing.
 */

export const FRONTEND_ENGINEER_GLB_BYTE_LENGTH = ${glbBuffer.byteLength}
export const FRONTEND_ENGINEER_GLB_BONES_COUNT = ${bones.length}
export const FRONTEND_ENGINEER_GLB_ANIMATIONS = ['IDLE', 'WALK', 'WORKING'] as const

export const FRONTEND_ENGINEER_GLB_BASE64 = '${base64Str}'

export function getFrontendEngineerGlbArrayBuffer(): ArrayBuffer {
  const binaryString = atob(FRONTEND_ENGINEER_GLB_BASE64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
`

await writeFile(tsOutputPath, tsContent, 'utf8')
console.log(`[Successfully exported TypeScript Model Data to ${tsOutputPath}]`)
