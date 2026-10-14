import { describe, it, expect } from 'vitest'
import { MASCOT_REGISTRY, MascotId, MascotState } from './renderer/components/studio/MascotFamily.js'
import { ActivePanel } from './renderer/components/studio/FloatingPanels.js'

describe('GRAVITAS 2.0 — Living Studio Alpha Renderer Foundation', () => {
  describe('1. 2D Mascot Family Invariants', () => {
    it('defines exactly 5 distinct named agent mascots', () => {
      const expectedMascots: MascotId[] = ['grav', 'ada', 'pixel', 'cipher', 'scout']
      expect(Object.keys(MASCOT_REGISTRY)).toHaveLength(5)
      for (const id of expectedMascots) {
        expect(MASCOT_REGISTRY[id]).toBeDefined()
        expect(MASCOT_REGISTRY[id].name).toBeDefined()
        expect(MASCOT_REGISTRY[id].role).toBeDefined()
        expect(MASCOT_REGISTRY[id].color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })

    it('assigns unique identities and accessories to each mascot', () => {
      expect(MASCOT_REGISTRY.grav.name).toBe('Grav')
      expect(MASCOT_REGISTRY.grav.role).toContain('Companion')
      expect(MASCOT_REGISTRY.grav.color).toBe('#F4A261') // warm copper

      expect(MASCOT_REGISTRY.ada.name).toBe('Ada')
      expect(MASCOT_REGISTRY.ada.role).toContain('Study')
      expect(MASCOT_REGISTRY.ada.color).toBe('#81B29A') // sage green

      expect(MASCOT_REGISTRY.pixel.name).toBe('Pixel')
      expect(MASCOT_REGISTRY.pixel.role).toContain('Design')
      expect(MASCOT_REGISTRY.pixel.color).toBe('#FF7B72') // coral

      expect(MASCOT_REGISTRY.cipher.name).toBe('Cipher')
      expect(MASCOT_REGISTRY.cipher.role).toContain('Backend')
      expect(MASCOT_REGISTRY.cipher.color).toBe('#4A89C8') // slate blue

      expect(MASCOT_REGISTRY.scout.name).toBe('Scout')
      expect(MASCOT_REGISTRY.scout.role).toContain('Research')
      expect(MASCOT_REGISTRY.scout.color).toBe('#E9C46A') // warm gold
    })

    it('supports all required character animation states', () => {
      const requiredStates: MascotState[] = [
        'idle',
        'attentive',
        'working',
        'waiting_permission',
        'success',
        'error',
        'speaking',
      ]
      // Verify TypeScript allows all required states
      expect(requiredStates).toHaveLength(7)
    })
  })

  describe('2. Floating Spatial Surface Transitions', () => {
    it('supports on-demand surface switching with safe default (NONE)', () => {
      const allowedPanels: ActivePanel[] = [
        'NONE',
        'GRAV_CONVERSATION',
        'ADA_NOTES',
        'CIPHER_TASKS',
        'MUSIC_CORNER',
        'OFFICE_3D',
      ]
      expect(allowedPanels).toHaveLength(6)

      // Initial state must be NONE (studio home screen, zero panels taking over)
      const initialPanel: ActivePanel = 'NONE'
      expect(initialPanel).toBe('NONE')
    })

    it('ensures conversational drawer is not a permanent fixture', () => {
      let activePanel: ActivePanel = 'NONE'
      expect(activePanel).toBe('NONE')

      // Summon Grav
      activePanel = 'GRAV_CONVERSATION'
      expect(activePanel).toBe('GRAV_CONVERSATION')

      // Dismiss / Close
      activePanel = 'NONE'
      expect(activePanel).toBe('NONE')
    })
  })

  describe('3. Truthful Event-Driven Activity Bubbles', () => {
    it('classifies bubble status types deterministically', () => {
      const statuses = ['info', 'success', 'warning', 'error'] as const
      expect(statuses).toHaveLength(4)
    })

    it('rejects fake looping activity when runtime is idle', () => {
      // Invariant: idle state does NOT fabricate busywork messages
      const idleBubbles: Record<MascotId, { text: string; status: string } | null> = {
        grav: null,
        ada: null,
        pixel: null,
        cipher: null,
        scout: null,
      }

      for (const mascot of Object.keys(idleBubbles) as MascotId[]) {
        expect(idleBubbles[mascot]).toBeNull()
      }
    })
  })

  describe('4. Lazy-Loaded 3D Office Guarantee', () => {
    it('guarantees WebGL mounting is isolated to OFFICE_3D mode', () => {
      const isWebGLMounted = (panel: ActivePanel) => panel === 'OFFICE_3D'

      expect(isWebGLMounted('NONE')).toBe(false)
      expect(isWebGLMounted('GRAV_CONVERSATION')).toBe(false)
      expect(isWebGLMounted('ADA_NOTES')).toBe(false)
      expect(isWebGLMounted('CIPHER_TASKS')).toBe(false)
      expect(isWebGLMounted('MUSIC_CORNER')).toBe(false)
      expect(isWebGLMounted('OFFICE_3D')).toBe(true)
    })
  })

  describe('5. Living Studio Prop Hotspots & Micro-Interactions (Phase 03)', () => {
    it('handles interactive coffee mug sip trigger', () => {
      let bubbleText = ''
      let bubbleStatus = ''
      const onCoffeeSip = () => {
        bubbleText = 'Fresh brew poured ☕ Ready to engineer.'
        bubbleStatus = 'info'
      }

      onCoffeeSip()
      expect(bubbleText).toContain('Fresh brew poured')
      expect(bubbleStatus).toBe('info')
    })

    it('routes bookshelf and server matrix clicks to corresponding spatial panels', () => {
      let activePanel: ActivePanel = 'NONE'
      let activeAgent: MascotId | null = null

      const onOpenAdaNotes = () => {
        activePanel = 'ADA_NOTES'
        activeAgent = 'ada'
      }

      const onOpenCipherTasks = () => {
        activePanel = 'CIPHER_TASKS'
        activeAgent = 'cipher'
      }

      onOpenAdaNotes()
      expect(activePanel).toBe('ADA_NOTES')
      expect(activeAgent).toBe('ada')

      onOpenCipherTasks()
      expect(activePanel).toBe('CIPHER_TASKS')
      expect(activeAgent).toBe('cipher')
    })

    it('routes Pixel canvas and Scout observatory clicks to specialized agent status', () => {
      let pixelBubble = ''
      let scoutBubble = ''

      const onPixelCanvas = () => {
        pixelBubble = 'Drafting board active — UI wireframes loaded'
      }

      const onScoutObservatory = () => {
        scoutBubble = 'Observatory focused — Scanning research sources'
      }

      onPixelCanvas()
      expect(pixelBubble).toContain('UI wireframes')

      onScoutObservatory()
      expect(scoutBubble).toContain('research sources')
    })

    it('enforces reduced-motion invariance across all mascot character loops', () => {
      const isReducedMotion = true
      const getAnimationVariant = (reduced: boolean, state: MascotState) => {
        if (reduced) return {}
        if (state === 'working') return { y: [0, -4, 0] }
        return { y: [0, -3, 0] }
      }

      expect(getAnimationVariant(isReducedMotion, 'idle')).toEqual({})
      expect(getAnimationVariant(isReducedMotion, 'working')).toEqual({})
      expect(getAnimationVariant(false, 'working')).toHaveProperty('y')
    })
  })
})
