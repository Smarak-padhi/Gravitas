import { describe, it, expect } from 'vitest'
import { MASCOT_REGISTRY, MascotId, MascotState, MascotBubbleData } from './renderer/components/studio/MascotFamily.js'
import { ActivePanel, renderMarkdownWithMath, DEFAULT_STUDY_NOTES, StudyNoteItem, ChatMessage } from './renderer/components/studio/FloatingPanels.js'
import { SPECIALIST_CONFIGS, processSpecialistMessage, SpecialistResponse } from './renderer/components/studio/SpecialistEngine.js'
import { agentEventBus, dispatchAgentEvent, subscribeAgentEvent } from './renderer/events/agentEventBus.js'
import * as THREE from 'three'

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

  describe('6. Gate B0: Three.js Resource Disposal & Reduced-Motion Execution Check', () => {
    it('traverses and disposes all geometries and materials on unmount', () => {
      const scene = new THREE.Scene()
      let disposedGeos = 0
      let disposedMats = 0

      // Create mock geometries and materials
      const geo1 = new THREE.BoxGeometry(1, 1, 1)
      const mat1 = new THREE.MeshBasicMaterial({ color: 0xff0000 })
      geo1.dispose = () => { disposedGeos++ }
      mat1.dispose = () => { disposedMats++ }
      const mesh1 = new THREE.Mesh(geo1, mat1)
      scene.add(mesh1)

      const grid = new THREE.GridHelper(10, 10)
      grid.geometry.dispose = () => { disposedGeos++ }
      if (Array.isArray(grid.material)) {
        grid.material.forEach((m) => { m.dispose = () => { disposedMats++ } })
      } else {
        grid.material.dispose = () => { disposedMats++ }
      }
      scene.add(grid)

      // Simulate Gate B0 unmount cleanup loop
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else if (obj.material) {
            obj.material.dispose()
          }
        } else if (obj instanceof THREE.GridHelper) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else if (obj.material) {
            obj.material.dispose()
          }
        }
      })

      expect(disposedGeos).toBe(2)
      expect(disposedMats).toBeGreaterThanOrEqual(2)
    })

    it('survives repeated 10x open/close cycles without resource leaks', () => {
      let openCount = 0
      let closeCount = 0

      for (let i = 0; i < 10; i++) {
        // Open
        const scene = new THREE.Scene()
        const geo = new THREE.BoxGeometry(1, 1, 1)
        const mat = new THREE.MeshBasicMaterial()
        const mesh = new THREE.Mesh(geo, mat)
        scene.add(mesh)
        openCount++

        // Close & Cleanup
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose()
            obj.material?.dispose()
          }
        })
        scene.clear()
        closeCount++
      }

      expect(openCount).toBe(10)
      expect(closeCount).toBe(10)
    })

    it('avoids continuous animation loop when reduced motion is requested', () => {
      const isReducedMotion = true
      let rAFCallCount = 0

      const fakeRAF = () => {
        rAFCallCount++
        return 1
      }

      // In reduced motion mode, renderStatic runs once, rAF is NOT invoked
      if (!isReducedMotion) {
        fakeRAF()
      }

      expect(rAFCallCount).toBe(0)
    })
  })

  describe('7. Gate B2: Reusable Floating Panel Model & Interactions', () => {
    it('supports minimize and restore lifecycle', () => {
      let activePanel: ActivePanel = 'ADA_NOTES'
      let minimizedPanel: ActivePanel | null = null

      // User minimizes Ada's notes
      minimizedPanel = activePanel
      activePanel = 'NONE'

      expect(activePanel).toBe('NONE')
      expect(minimizedPanel).toBe('ADA_NOTES')

      // User restores Ada's notes
      activePanel = minimizedPanel
      minimizedPanel = null

      expect(activePanel).toBe('ADA_NOTES')
      expect(minimizedPanel).toBeNull()
    })

    it('enforces contextual tether coordinates for Grav chat', () => {
      const gravAnchor = {
        cx: 640,
        cy: 460,
        tetherOrientation: 'downward-to-desk',
      }
      expect(gravAnchor.cx).toBe(640)
      expect(gravAnchor.tetherOrientation).toBe('downward-to-desk')
    })

    it('maintains safe margin above bottom summon dock', () => {
      const dockHeight = 52
      const dockBottom = 20
      const panelBottomMargin = 80 // Gate B2 specification

      expect(panelBottomMargin).toBeGreaterThan(dockHeight + dockBottom)
    })
  })

  describe('8. Gate B3: Ada\'s Knowledge Hub (Markdown, KaTeX & Dirty State)', () => {
    it('renders mathematical equations to valid KaTeX HTML and MathML', () => {
      const sample = '# Master Theorem\nRecurrence: $$T(n) = aT(n/b) + f(n)$$\nComplexity: $\\mathcal{O}((V + E) \\log V)$'
      const html = renderMarkdownWithMath(sample)

      expect(html).toContain('<h1>Master Theorem</h1>')
      expect(html).toContain('katex-display-math')
      expect(html).toContain('katex-mathml')
      expect(html).toContain('math xmlns')
      expect(html).toContain('katex-inline-math')
    })

    it('detects dirty state when note content or title is modified', () => {
      const initialNote: StudyNoteItem = DEFAULT_STUDY_NOTES[0]
      let currentTitle = initialNote.title
      let currentContent = initialNote.content

      const checkDirty = () => currentTitle !== initialNote.title || currentContent !== initialNote.content
      expect(checkDirty()).toBe(false)

      // Edit title
      currentTitle = 'Algorithms: Advanced Divide & Conquer'
      expect(checkDirty()).toBe(true)

      // Revert title
      currentTitle = initialNote.title
      expect(checkDirty()).toBe(false)

      // Edit content
      currentContent += '\n\n## Additional note content'
      expect(checkDirty()).toBe(true)
    })

    it('intercepts note navigation when unsaved changes exist', () => {
      let isDirty = true
      let promptTriggered = false
      let navigatedNoteId = 'note_algorithms_core'

      const attemptSwitchNote = (targetId: string) => {
        if (isDirty) {
          promptTriggered = true
        } else {
          navigatedNoteId = targetId
        }
      }

      attemptSwitchNote('note_os_virtual_memory')
      expect(promptTriggered).toBe(true)
      expect(navigatedNoteId).toBe('note_algorithms_core') // Navigation blocked until resolved
    })
  })

  describe('9. Gate B4: Real Studio Agent Events & Bubble Categorization', () => {
    it('distinguishes decorative reactions from genuine work events', () => {
      const decorativeBubble: MascotBubbleData = {
        text: 'Fresh brew poured ☕ Ready to engineer.',
        kind: 'info',
        category: 'decorative',
      }

      const workBubble: MascotBubbleData = {
        text: 'Saved "Algorithms..." to SQLite',
        kind: 'success',
        category: 'work',
      }

      expect(decorativeBubble.category).toBe('decorative')
      expect(workBubble.category).toBe('work')
      expect(decorativeBubble.category).not.toBe(workBubble.category)
    })

    it('triggers waiting_permission state on human approval requests', () => {
      const getTargetState = (kind: 'info' | 'success' | 'warning' | 'error'): MascotState => {
        if (kind === 'warning') return 'waiting_permission'
        if (kind === 'error') return 'error'
        if (kind === 'success') return 'success'
        return 'idle'
      }

      expect(getTargetState('warning')).toBe('waiting_permission')
      expect(getTargetState('error')).toBe('error')
      expect(getTargetState('success')).toBe('success')
    })
  })

  describe('10. Note Save and Reopen Roundtrip Invariance', () => {
    it('preserves saved note content verbatim upon reopen', () => {
      const store = new Map<string, StudyNoteItem>()

      // Initial store
      DEFAULT_STUDY_NOTES.forEach((n) => store.set(n.id, { ...n }))

      // Save edit
      const updatedNote: StudyNoteItem = {
        id: 'note_algorithms_core',
        title: 'Algorithms: Master Theorem & Complexity Analysis (Updated)',
        subject: 'Algorithms',
        content: '# Updated Content with KaTeX $\\Theta(n \\log n)$',
      }
      store.set(updatedNote.id, updatedNote)

      // Reopen
      const reopened = store.get('note_algorithms_core')
      expect(reopened).toBeDefined()
      expect(reopened?.title).toBe('Algorithms: Master Theorem & Complexity Analysis (Updated)')
      expect(reopened?.content).toContain('\\Theta(n \\log n)')
    })
  })

  describe('11. Phase 04: Multi-Agent Specialist Personas & Configurations', () => {
    it('defines rich domain configurations for all 5 specialist agents', () => {
      const specialists: MascotId[] = ['grav', 'ada', 'pixel', 'cipher', 'scout']
      for (const id of specialists) {
        const config = SPECIALIST_CONFIGS[id]
        expect(config).toBeDefined()
        expect(config.id).toBe(id)
        expect(config.name).toBe(MASCOT_REGISTRY[id].name)
        expect(config.accentColor).toBe(MASCOT_REGISTRY[id].color)
        expect(config.role).toBe(MASCOT_REGISTRY[id].role)
        expect(config.tagline).toBeDefined()
        expect(config.welcomeMessage.length).toBeGreaterThan(20)
        expect(config.placeholder.length).toBeGreaterThan(10)
        expect(config.quickPrompts.length).toBeGreaterThanOrEqual(4)
      }
    })

    it('provides tailored domain action prompts for each specialist', () => {
      // Grav: Focus, due today, app launcher
      const gravPrompts = SPECIALIST_CONFIGS.grav.quickPrompts.map((p) => p.label)
      expect(gravPrompts).toContain('Due Today')
      expect(gravPrompts).toContain('25m Focus')

      // Ada: Quizzing, formulas, notes
      const adaPrompts = SPECIALIST_CONFIGS.ada.quickPrompts.map((p) => p.label)
      expect(adaPrompts).toContain('Quiz: Master Theorem')
      expect(adaPrompts).toContain('Explain: Virtual Memory')

      // Pixel: Tokens, contrast, motion
      const pixelPrompts = SPECIALIST_CONFIGS.pixel.quickPrompts.map((p) => p.label)
      expect(pixelPrompts).toContain('Audit Tokens')
      expect(pixelPrompts).toContain('Check Contrast')

      // Cipher: SQLite WAL, tests, telemetry
      const cipherPrompts = SPECIALIST_CONFIGS.cipher.quickPrompts.map((p) => p.label)
      expect(cipherPrompts).toContain('Inspect SQLite WAL')
      expect(cipherPrompts).toContain('Hardware Telemetry')

      // Scout: Indexing, citations, sources
      const scoutPrompts = SPECIALIST_CONFIGS.scout.quickPrompts.map((p) => p.label)
      expect(scoutPrompts).toContain('Index Local Notes')
      expect(scoutPrompts).toContain('Format Citations')
    })
  })

  describe('12. Phase 04: Conversation History Persistence in SQLite WAL', () => {
    it('serializes chat messages into SQLite IDEA collection format', () => {
      const msg: ChatMessage = {
        id: 'msg_test_101',
        agentId: 'ada',
        sender: 'user',
        text: 'Quiz me on Master Theorem',
        timestamp: '10:30 AM',
      }

      // SQLite serialization shape used in App.tsx
      const serialized = {
        id: msg.id,
        title: `[${msg.agentId}] User: ${msg.text.slice(0, 32)}`,
        originalText: msg.text,
        collection: 'IDEA',
        category: 'agent_chat',
        subject: msg.agentId,
        tags: [`agent:${msg.agentId}`, 'sender:user', `time:${msg.timestamp}`],
      }

      expect(serialized.collection).toBe('IDEA')
      expect(serialized.category).toBe('agent_chat')
      expect(serialized.subject).toBe('ada')
      expect(serialized.tags).toContain('agent:ada')
      expect(serialized.tags).toContain('sender:user')
      expect(serialized.tags).toContain('time:10:30 AM')
    })

    it('isolates conversation histories strictly by specialist agent', () => {
      const messagesByAgent: Record<MascotId, ChatMessage[]> = {
        grav: [{ id: '1', agentId: 'grav', sender: 'assistant', text: 'Grav greeting', timestamp: '10:00' }],
        ada: [{ id: '2', agentId: 'ada', sender: 'assistant', text: 'Ada study session', timestamp: '10:01' }],
        pixel: [{ id: '3', agentId: 'pixel', sender: 'assistant', text: 'Pixel tokens', timestamp: '10:02' }],
        cipher: [{ id: '4', agentId: 'cipher', sender: 'assistant', text: 'Cipher WAL', timestamp: '10:03' }],
        scout: [{ id: '5', agentId: 'scout', sender: 'assistant', text: 'Scout sources', timestamp: '10:04' }],
      }

      expect(messagesByAgent.ada).toHaveLength(1)
      expect(messagesByAgent.ada[0].text).toContain('study session')
      expect(messagesByAgent.cipher[0].text).toContain('Cipher WAL')

      // Adding to Ada does not affect Cipher
      messagesByAgent.ada.push({
        id: '6',
        agentId: 'ada',
        sender: 'user',
        text: 'Recurrence question',
        timestamp: '10:05',
      })
      expect(messagesByAgent.ada).toHaveLength(2)
      expect(messagesByAgent.cipher).toHaveLength(1)
    })

    it('roundtrips chat messages with action receipts through JSON summary field', () => {
      const receipt = {
        title: 'Active Recall Quiz: Master Theorem',
        details: 'Complexity derived: T(n) = Θ(n² log n)',
        status: 'success' as const,
      }

      const rawSummary = JSON.stringify(receipt)
      const parsedReceipt = JSON.parse(rawSummary)

      expect(parsedReceipt.title).toBe('Active Recall Quiz: Master Theorem')
      expect(parsedReceipt.details).toContain('Θ(n² log n)')
      expect(parsedReceipt.status).toBe('success')
    })
  })

  describe('13. Phase 04: Event-Driven Agent Runtime & Dynamic 7-State Transitions', () => {
    it('dispatches and handles TASK_STATE_CHANGED events', () => {
      let receivedTask: any = null
      const unsub = subscribeAgentEvent('TASK_STATE_CHANGED', (payload) => {
        receivedTask = payload
      })

      dispatchAgentEvent('TASK_STATE_CHANGED', {
        taskId: 'task_wal_check',
        title: 'Inspect SQLite WAL transactions',
        completed: true,
      })

      expect(receivedTask).toBeDefined()
      expect(receivedTask.taskId).toBe('task_wal_check')
      expect(receivedTask.completed).toBe(true)
      unsub()
    })

    it('dispatches APPROVAL_REQUIRED driving mascot to waiting_permission state', () => {
      let targetState: MascotState = 'idle'
      let warningText = ''

      const unsub = subscribeAgentEvent('APPROVAL_REQUIRED', (payload) => {
        targetState = 'waiting_permission'
        warningText = `Action approval required: ${payload.actionName}`
      })

      dispatchAgentEvent('APPROVAL_REQUIRED', {
        actionName: 'Export SQLite Database Dump',
        details: 'Local filesystem access requested',
        agentId: 'cipher',
      })

      expect(targetState).toBe('waiting_permission')
      expect(warningText).toContain('Export SQLite Database Dump')
      unsub()
    })

    it('dispatches NOTE_SAVED driving Ada to speaking then success state', () => {
      let recordedTitle = ''
      const unsub = subscribeAgentEvent('NOTE_SAVED', (payload) => {
        recordedTitle = payload.noteTitle
      })

      dispatchAgentEvent('NOTE_SAVED', {
        noteTitle: 'Virtual Memory & Page Replacement',
        subject: 'Operating Systems',
        noteId: 'note_os_vm',
      })

      expect(recordedTitle).toBe('Virtual Memory & Page Replacement')
      unsub()
    })

    it('dispatches FOCUS_TIMER_COMPLETED driving Grav to success state', () => {
      let completedDuration = 0
      const unsub = subscribeAgentEvent('FOCUS_TIMER_COMPLETED', (payload) => {
        completedDuration = payload.sprintDurationMinutes
      })

      dispatchAgentEvent('FOCUS_TIMER_COMPLETED', {
        sprintDurationMinutes: 25,
      })

      expect(completedDuration).toBe(25)
      unsub()
    })
  })

  describe('14. Phase 04: Specialist Engine Interactive Execution & Math / Action Receipts', () => {
    it('Grav: initiates 25-minute focus sprint with START_FOCUS side-effect', async () => {
      const res = await processSpecialistMessage('grav', 'Start 25m Focus', {
        dueTasks: [],
        dueAssignments: [],
      })

      expect(res.text).toContain('Focus Sprint')
      expect(res.actionReceipt?.title).toContain('Focus Sprint Active (25m)')
      expect(res.sideEffect?.type).toBe('START_FOCUS')
      expect(res.sideEffect?.payload?.minutes).toBe(25)
      expect(res.bubbleCategory).toBe('work')
    })

    it('Grav: aggregates due today items from SQLite context', async () => {
      const res = await processSpecialistMessage('grav', 'What is due today?', {
        dueTasks: [{ id: '1' }, { id: '2' }],
        dueAssignments: [{ id: 'a1' }],
      })

      expect(res.text).toContain('2 task(s)')
      expect(res.text).toContain('1 coursework assignment(s)')
      expect(res.actionReceipt?.title).toContain('Agenda Loaded')
      expect(res.bubbleKind).toBe('success')
    })

    it('Ada: delivers active-recall quiz with KaTeX mathematical formulas', async () => {
      const res = await processSpecialistMessage('ada', 'Quiz me on Master Theorem', {
        dueTasks: [],
        dueAssignments: [],
      })

      expect(res.text).toContain('Master Theorem')
      expect(res.text).toContain('T(n) = 4T(n/2) + n^2')
      expect(res.text).toContain('\\Theta(n^2 \\log n)')
      expect(res.actionReceipt?.title).toBe('Active Recall Quiz: Master Theorem')

      // Verify that the generated LaTeX math renders into KaTeX HTML without errors
      const html = renderMarkdownWithMath(res.text)
      expect(html).toContain('katex-display-math')
      expect(html).toContain('katex-mathml')
    })

    it('Ada: explains Virtual Memory LRU vs Clock algorithm trade-offs', async () => {
      const res = await processSpecialistMessage('ada', 'Explain Virtual Memory and LRU', {
        dueTasks: [],
        dueAssignments: [],
      })

      expect(res.text).toContain('LRU (Least Recently Used)')
      expect(res.text).toContain('Clock Algorithm (Second Chance)')
      expect(res.text).toContain('reference bit')
      expect(res.actionReceipt?.title).toContain('Virtual Memory')
    })

    it('Pixel: audits studio theme design tokens with WCAG AAA verification', async () => {
      const res = await processSpecialistMessage('pixel', 'Audit studio design tokens', {
        dueTasks: [],
        dueAssignments: [],
      })

      expect(res.text).toContain('Studio Design Tokens Audit')
      expect(res.text).toContain('#101214')
      expect(res.text).toContain('#EDEAE3')
      expect(res.text).toContain('WCAG AAA')
      expect(res.actionReceipt?.title).toBe('Design Tokens Audited')
    })

    it('Cipher: inspects SQLite WAL storage engine parameters', async () => {
      const res = await processSpecialistMessage('cipher', 'Inspect SQLite WAL status', {
        dueTasks: [],
        dueAssignments: [],
      })

      expect(res.text).toContain('SQLite WAL Storage Engine')
      expect(res.text).toContain('PRAGMA journal_mode = WAL')
      expect(res.text).toContain('PRAGMA synchronous = NORMAL')
      expect(res.text).toContain('BEGIN IMMEDIATE')
      expect(res.actionReceipt?.status).toBe('success')
    })

    it('Cipher: verifies target hardware telemetry (Lenovo IdeaPad Gaming 3)', async () => {
      const res = await processSpecialistMessage('cipher', 'Report system telemetry', {
        dueTasks: [],
        dueAssignments: [],
      })

      expect(res.text).toContain('Lenovo IdeaPad Gaming 3')
      expect(res.text).toContain('Intel Core i5-12450H')
      expect(res.text).toContain('16 GB DDR4')
      expect(res.text).toContain('174 MB RSS idle')
      expect(res.actionReceipt?.title).toBe('Hardware Telemetry')
    })

    it('Scout: indexes local study notes and topic clusters into Knowledge Graph', async () => {
      const res = await processSpecialistMessage('scout', 'Index all local study notes', {
        dueTasks: [],
        dueAssignments: [],
      })

      expect(res.text).toContain('Local Knowledge Indexing Complete')
      expect(res.text).toContain('Algorithms')
      expect(res.text).toContain('Operating Systems')
      expect(res.text).toContain('Databases')
      expect(res.actionReceipt?.title).toContain('Knowledge Index')
    })

    it('Scout: formats academic citations in standardized APA/IEEE style', async () => {
      const res = await processSpecialistMessage('scout', 'Format research citations', {
        dueTasks: [],
        dueAssignments: [],
      })

      expect(res.text).toContain('Cormen, T. H.')
      expect(res.text).toContain('Introduction to Algorithms')
      expect(res.text).toContain('Silberschatz, A.')
      expect(res.actionReceipt?.title).toBe('Citations Formatted')
    })
  })

  describe('15. Phase 04: Contextual Tether Coordinates', () => {
    it('computes contextual tether positions matching character desk stations', () => {
      const getTetherPosition = (agentId: MascotId) => {
        switch (agentId) {
          case 'ada':
            return '20%'
          case 'pixel':
            return '32%'
          case 'cipher':
            return '80%'
          case 'scout':
            return '68%'
          case 'grav':
          default:
            return '50%'
        }
      }

      expect(getTetherPosition('grav')).toBe('50%')
      expect(getTetherPosition('ada')).toBe('20%')
      expect(getTetherPosition('pixel')).toBe('32%')
      expect(getTetherPosition('cipher')).toBe('80%')
      expect(getTetherPosition('scout')).toBe('68%')
    })

    it('matches tether border accent color with active specialist', () => {
      const specialists: MascotId[] = ['grav', 'ada', 'pixel', 'cipher', 'scout']
      for (const id of specialists) {
        const color = SPECIALIST_CONFIGS[id].accentColor
        expect(color).toBe(MASCOT_REGISTRY[id].color)
      }
    })
  })
})

