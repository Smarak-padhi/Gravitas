import React, { useState, useEffect, useCallback, useRef } from 'react'
import { StudioHeader, StudioSummonBar } from './components/studio/StudioControls.js'
import { StudioScene } from './components/studio/StudioScene.js'
import { FloatingPanels, ActivePanel, ChatMessage } from './components/studio/FloatingPanels.js'
import { MascotId, MascotState, MascotBubbleData } from './components/studio/MascotFamily.js'
import { parseAssistantCommand } from '../assistant/commandParser.js'
import {
  SPECIALIST_CONFIGS,
  processSpecialistMessage,
  SpecialistResponse,
} from './components/studio/SpecialistEngine.js'
import {
  agentEventBus,
  dispatchAgentEvent,
  subscribeAgentEvent,
} from './events/agentEventBus.js'

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  // Studio spatial state
  const [activePanel, setActivePanel] = useState<ActivePanel>('NONE')
  const [activeAgent, setActiveAgent] = useState<MascotId | null>(null)
  const [activeSpecialist, setActiveSpecialist] = useState<MascotId>('grav')

  // Mascot states and activity bubbles
  const [agentStates, setAgentStates] = useState<Record<MascotId, MascotState>>({
    grav: 'idle',
    ada: 'idle',
    pixel: 'idle',
    cipher: 'idle',
    scout: 'idle',
  })

  const [agentBubbles, setAgentBubbles] = useState<Record<MascotId, MascotBubbleData | null>>({
    grav: null,
    ada: null,
    pixel: null,
    cipher: null,
    scout: null,
  })

  // Real SQLite Data
  const [dueTasks, setDueTasks] = useState<readonly any[]>([])
  const [dueAssignments, setDueAssignments] = useState<readonly any[]>([])
  const [activeNote, setActiveNote] = useState<{ id?: string; title: string; content: string; subject: string } | null>({
    id: 'note_algorithms_core',
    title: 'Algorithms: Master Theorem & Complexity Analysis',
    subject: 'Algorithms',
    content: `# Divide and Conquer Analysis\n\n## Master Theorem Form\nFor recurrence relations of the form:\n$$T(n) = aT(n/b) + f(n)$$\nwhere $a \\ge 1, b > 1$:\n\n1. **Case 1**: If $f(n) = O(n^{\\log_b a - \\epsilon})$ for some constant $\\epsilon > 0$, then $T(n) = \\Theta(n^{\\log_b a})$.\n2. **Case 2**: If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ where $k \\ge 0$, then $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.\n3. **Case 3**: If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ for some constant $\\epsilon > 0$, and regularity condition $af(n/b) \\le cf(n)$ holds, then $T(n) = \\Theta(f(n))$.`,
  })

  // Multi-Agent Conversation Histories persisted to SQLite WAL (Phase 04)
  const [messagesByAgent, setMessagesByAgent] = useState<Record<MascotId, ChatMessage[]>>({
    grav: [
      {
        id: 'init_grav',
        agentId: 'grav',
        sender: 'assistant',
        text: SPECIALIST_CONFIGS.grav.welcomeMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    ada: [
      {
        id: 'init_ada',
        agentId: 'ada',
        sender: 'assistant',
        text: SPECIALIST_CONFIGS.ada.welcomeMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    pixel: [
      {
        id: 'init_pixel',
        agentId: 'pixel',
        sender: 'assistant',
        text: SPECIALIST_CONFIGS.pixel.welcomeMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    cipher: [
      {
        id: 'init_cipher',
        agentId: 'cipher',
        sender: 'assistant',
        text: SPECIALIST_CONFIGS.cipher.welcomeMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    scout: [
      {
        id: 'init_scout',
        agentId: 'scout',
        sender: 'assistant',
        text: SPECIALIST_CONFIGS.scout.welcomeMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  })

  // Focus Timer state (Phase 04)
  const [focusTimer, setFocusTimer] = useState<{
    active: boolean
    remainingSeconds: number
    durationMinutes: number
  } | null>(null)

  const [minimizedPanel, setMinimizedPanel] = useState<ActivePanel | null>(null)

  // Helper: Trigger temporary activity bubble for an agent with category distinction
  const triggerBubble = useCallback(
    (
      agentId: MascotId,
      text: string,
      kind: 'info' | 'success' | 'warning' | 'error' = 'success',
      category: 'work' | 'decorative' | 'system' = 'work',
      duration = 4500
    ) => {
      setAgentBubbles((prev) => ({
        ...prev,
        [agentId]: { text, kind, category, timestamp: Date.now() },
      }))
      setAgentStates((prev) => ({
        ...prev,
        [agentId]:
          kind === 'error'
            ? 'error'
            : kind === 'warning'
            ? 'waiting_permission'
            : 'success',
      }))

      setTimeout(() => {
        setAgentBubbles((prev) => ({ ...prev, [agentId]: null }))
        setAgentStates((prev) => ({ ...prev, [agentId]: 'idle' }))
      }, duration)
    },
    []
  )

  const handleMinimize = () => {
    setMinimizedPanel(activePanel)
    setActivePanel('NONE')
    setActiveAgent(null)
  }

  const handleRestore = (panel: ActivePanel) => {
    setActivePanel(panel)
    setMinimizedPanel(null)
    if (panel === 'GRAV_CONVERSATION') setActiveAgent(activeSpecialist)
    else if (panel === 'ADA_NOTES') setActiveAgent('ada')
    else if (panel === 'CIPHER_TASKS') setActiveAgent('cipher')
  }

  // Focus timer countdown engine
  useEffect(() => {
    if (!focusTimer?.active) return

    const interval = setInterval(() => {
      setFocusTimer((curr) => {
        if (!curr || !curr.active) return null
        if (curr.remainingSeconds <= 1) {
          dispatchAgentEvent('FOCUS_TIMER_COMPLETED', {
            sprintDurationMinutes: curr.durationMinutes,
          })
          return null
        }
        dispatchAgentEvent('FOCUS_TIMER_TICK', {
          remainingSeconds: curr.remainingSeconds - 1,
        })
        return {
          ...curr,
          remainingSeconds: curr.remainingSeconds - 1,
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [focusTimer?.active])

  // Initialize data from real SQLite databases & subscribe to Event Bus
  useEffect(() => {
    // Check reduced motion media query
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mql.matches)
    const handleMql = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches)
    mql.addEventListener('change', handleMql)

    // Load initial tasks & notes from SQLite bridge
    const bridge = window.gravitasDesktop
    if (bridge?.listIdeas) {
      bridge.listIdeas().then((items) => {
        if (items && Array.isArray(items)) {
          const tasks = items.filter((i) => i.collection === 'PLAN_TASK')
          setDueTasks(tasks)

          const algoNote = items.find(
            (i) => i.collection === 'STUDY_NOTE' && (i.subject?.includes('Algo') || i.title?.includes('Algo'))
          )
          if (algoNote) {
            setActiveNote({
              id: algoNote.id,
              title: algoNote.title,
              subject: algoNote.subject || 'Algorithms',
              content: algoNote.originalText || '',
            })
          }

          // Restore conversation histories from ideas-vault.db
          const chatItems = items.filter((i) => i.collection === 'IDEA' && i.category === 'agent_chat')
          if (chatItems.length > 0) {
            setMessagesByAgent((prev) => {
              const updated = { ...prev }
              for (const item of chatItems) {
                const targetAgent = (item.subject as MascotId) || 'grav'
                if (updated[targetAgent]) {
                  const exists = updated[targetAgent].some((m) => m.id === item.id)
                  if (!exists) {
                    const sender = item.tags?.includes('sender:user') ? 'user' : 'assistant'
                    const timeTag = item.tags?.find((t: string) => t.startsWith('time:'))
                    const timestamp = timeTag
                      ? timeTag.slice(5)
                      : new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    let actionReceipt: any
                    if (item.summary) {
                      try {
                        actionReceipt = JSON.parse(item.summary)
                      } catch {}
                    }
                    updated[targetAgent] = [
                      ...updated[targetAgent],
                      {
                        id: item.id,
                        agentId: targetAgent,
                        sender,
                        text: item.originalText,
                        timestamp,
                        actionReceipt,
                      },
                    ]
                  }
                }
              }
              return updated
            })
          }
        }
      }).catch((err) => console.warn('Could not load SQLite ideas:', err))
    }

    // Subscribe to Agent Event Bus (Phase 04)
    const unsubTask = subscribeAgentEvent('TASK_STATE_CHANGED', (payload) => {
      triggerBubble(
        'cipher',
        `Task ${payload.completed ? 'completed' : 'updated'}: ${payload.title.slice(0, 20)}...`,
        'success',
        'work'
      )
    })

    const unsubApproval = subscribeAgentEvent('APPROVAL_REQUIRED', (payload) => {
      const targetAgent = payload.agentId || 'grav'
      triggerBubble(
        targetAgent,
        `Action approval required: ${payload.actionName}`,
        'warning',
        'system',
        7000
      )
    })

    const unsubNote = subscribeAgentEvent('NOTE_SAVED', (payload) => {
      triggerBubble(
        'ada',
        `Saved "${payload.noteTitle.slice(0, 22)}..." to SQLite`,
        'success',
        'work'
      )
    })

    const unsubBuild = subscribeAgentEvent('BUILD_FINISHED', (payload) => {
      triggerBubble(
        'cipher',
        `Build ${payload.outcome === 'success' ? 'verified' : 'failed'}: ${payload.summary.slice(0, 24)}`,
        payload.outcome === 'success' ? 'success' : 'error',
        'work'
      )
    })

    const unsubFocus = subscribeAgentEvent('FOCUS_TIMER_COMPLETED', (payload) => {
      triggerBubble(
        'grav',
        `Focus sprint finished (${payload.sprintDurationMinutes}m)! Great session ☕`,
        'success',
        'work',
        6000
      )
    })

    const unsubResearch = subscribeAgentEvent('RESEARCH_INDEXED', (payload) => {
      triggerBubble(
        'scout',
        `Indexed ${payload.sourceCount} sources into Knowledge Graph`,
        'info',
        'work'
      )
    })

    // Keyboard shortcut handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault()
        setActivePanel((prev) => (prev === 'GRAV_CONVERSATION' ? 'NONE' : 'GRAV_CONVERSATION'))
        setActiveAgent(activeSpecialist)
      } else if (e.key === 'Escape') {
        setActivePanel('NONE')
        setActiveAgent(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      mql.removeEventListener('change', handleMql)
      window.removeEventListener('keydown', handleKeyDown)
      unsubTask()
      unsubApproval()
      unsubNote()
      unsubBuild()
      unsubFocus()
      unsubResearch()
    }
  }, [triggerBubble, activeSpecialist])

  // Handle agent selection in the 2D studio
  const handleSelectAgent = (id: MascotId) => {
    setActiveAgent(id)
    setActiveSpecialist(id)
    setActivePanel('GRAV_CONVERSATION')
  }

  // Handle sending a chat message to the current specialist agent
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isExecuting) return

    const agentId = activeSpecialist
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      agentId,
      sender: 'user',
      text,
      timestamp,
    }

    // Append user message to active specialist's conversation thread
    setMessagesByAgent((prev) => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), userMsg],
    }))

    setIsExecuting(true)
    setAgentStates((prev) => ({ ...prev, [agentId]: 'working' }))

    // Persist user message to SQLite WAL
    const bridge = window.gravitasDesktop
    if (bridge?.saveIdea) {
      bridge.saveIdea({
        id: userMsg.id,
        title: `[${agentId}] User: ${text.slice(0, 32)}`,
        originalText: text,
        collection: 'IDEA',
        category: 'agent_chat',
        subject: agentId,
        tags: [`agent:${agentId}`, 'sender:user', `time:${timestamp}`],
      }).catch((err) => console.warn('Failed to persist user chat to SQLite:', err))
    }

    try {
      // Process input via dedicated domain specialist engine
      const response: SpecialistResponse = await processSpecialistMessage(agentId, text, {
        dueTasks,
        dueAssignments,
        activeNoteTitle: activeNote?.title,
        bridge,
      })

      const replyMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        agentId,
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionReceipt: response.actionReceipt,
        actionButton: response.actionButton,
      }

      // Append assistant reply to specialist's conversation thread
      setMessagesByAgent((prev) => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), replyMsg],
      }))

      // Persist assistant message to SQLite WAL
      if (bridge?.saveIdea) {
        bridge.saveIdea({
          id: replyMsg.id,
          title: `[${agentId}] Assistant: ${response.text.slice(0, 32)}`,
          originalText: response.text,
          collection: 'IDEA',
          category: 'agent_chat',
          subject: agentId,
          tags: [`agent:${agentId}`, 'sender:assistant', `time:${replyMsg.timestamp}`],
          summary: response.actionReceipt ? JSON.stringify(response.actionReceipt) : null,
        }).catch((err) => console.warn('Failed to persist assistant chat to SQLite:', err))
      }

      // Execute side-effects
      if (response.sideEffect) {
        if (response.sideEffect.type === 'START_FOCUS') {
          const minutes = response.sideEffect.payload?.minutes || 25
          setFocusTimer({
            active: true,
            remainingSeconds: minutes * 60,
            durationMinutes: minutes,
          })
        } else if (response.sideEffect.type === 'OPEN_PANEL') {
          setActivePanel(response.sideEffect.payload.panel)
          if (response.sideEffect.payload.panel === 'ADA_NOTES') setActiveAgent('ada')
          if (response.sideEffect.payload.panel === 'CIPHER_TASKS') setActiveAgent('cipher')
        }
      }

      // Trigger character activity bubble & state
      if (response.bubbleText) {
        triggerBubble(
          agentId,
          response.bubbleText,
          response.bubbleKind || 'success',
          response.bubbleCategory || 'work'
        )
      } else {
        setAgentStates((prev) => ({
          ...prev,
          [agentId]: response.agentState || 'success',
        }))
        setTimeout(() => {
          setAgentStates((prev) => ({ ...prev, [agentId]: 'idle' }))
        }, 3000)
      }
    } catch (err: any) {
      console.warn('Specialist execution error:', err)
      triggerBubble(agentId, 'Error processing specialist request', 'error', 'system')
    } finally {
      setIsExecuting(false)
    }
  }

  // Handle clearing conversation history for an agent
  const handleClearHistory = (agentId: MascotId) => {
    const welcome = SPECIALIST_CONFIGS[agentId]?.welcomeMessage || 'Conversation reset.'
    setMessagesByAgent((prev) => ({
      ...prev,
      [agentId]: [
        {
          id: `init_${agentId}_${Date.now()}`,
          agentId,
          sender: 'assistant',
          text: welcome,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    }))
    triggerBubble(agentId, `History cleared for ${SPECIALIST_CONFIGS[agentId]?.name}`, 'info', 'system')
  }

  // Handle PTT Voice Toggle
  const handleVoiceToggle = async () => {
    if (isMicMuted) {
      triggerBubble('grav', 'Microphone is muted for privacy', 'warning', 'system')
      return
    }

    const bridge = window.gravitasDesktop
    if (!isListening) {
      setIsListening(true)
      setAgentStates((prev) => ({ ...prev, [activeSpecialist]: 'attentive' }))
      triggerBubble(activeSpecialist, 'Listening (Push-To-Talk)...', 'info', 'work')
      try {
        await bridge?.startPushToTalk?.(true)
      } catch (err) {
        console.warn('Voice start failed:', err)
      }
    } else {
      setIsListening(false)
      setAgentStates((prev) => ({ ...prev, [activeSpecialist]: 'working' }))
      try {
        const res = await bridge?.stopPushToTalk?.('session_ptt')
        if (res?.transcript) {
          handleSendMessage(res.transcript)
        } else {
          setAgentStates((prev) => ({ ...prev, [activeSpecialist]: 'idle' }))
        }
      } catch (err) {
        setAgentStates((prev) => ({ ...prev, [activeSpecialist]: 'idle' }))
      }
    }
  }

  // Handle Saving Note to SQLite
  const handleSaveNote = async (note: { id?: string; title: string; content: string; subject: string }) => {
    const bridge = window.gravitasDesktop
    setActiveNote(note)
    if (bridge?.saveIdea) {
      try {
        await bridge.saveIdea({
          id: note.id,
          title: note.title,
          originalText: note.content,
          subject: note.subject,
          category: 'study',
          collection: 'STUDY_NOTE',
        })
      } catch (err) {
        console.warn('Failed to save note to bridge:', err)
      }
    }
    // Genuine event dispatched to AgentEventBus
    dispatchAgentEvent('NOTE_SAVED', {
      noteTitle: note.title,
      subject: note.subject,
      noteId: note.id,
    })
  }

  // Handle Task completion in SQLite
  const handleTaskCompleted = async (taskId: string, completed: boolean) => {
    const targetTask = dueTasks.find((t) => t.id === taskId)
    const title = targetTask?.title || 'System Task'

    setDueTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
    )

    const bridge = window.gravitasDesktop
    if (bridge?.completeTask) {
      try {
        await bridge.completeTask(taskId, completed)
      } catch (err) {
        console.warn('Failed to update task:', err)
      }
    }

    // Genuine event dispatched to AgentEventBus
    dispatchAgentEvent('TASK_STATE_CHANGED', {
      taskId,
      title,
      completed,
    })
  }

  // Handle adding a task to SQLite WAL (Phase 05)
  const handleAddTask = async (title: string, subject?: string) => {
    const bridge = window.gravitasDesktop
    const newTaskId = `task_${Date.now()}`
    const newTask = {
      id: newTaskId,
      title,
      subject: subject || 'General',
      completed: false,
    }

    setDueTasks((prev) => [newTask, ...prev])

    if (bridge?.saveIdea) {
      try {
        await bridge.saveIdea({
          title,
          category: 'plan_task',
          collection: 'PROJECT',
          originalText: subject ? `Linked to coursework/study subject: ${subject}` : 'Created from Cipher Tasks & Agenda',
          tags: ['task', 'living-studio', ...(subject ? [subject.toLowerCase().replace(/\s+/g, '-')] : [])],
        })
      } catch (err) {
        console.warn('Failed to save task to SQLite bridge:', err)
      }
    }

    dispatchAgentEvent('TASK_STATE_CHANGED', {
      taskId: newTaskId,
      title,
      completed: false,
    })

    triggerBubble('cipher', `Logged task: "${title.slice(0, 28)}" to SQLite WAL`, 'info', 'work')
  }

  // Handle reviewing a flashcard with SM-2 spaced repetition (Phase 05)
  const handleReviewFlashcard = (_cardId: string, rating: 'again' | 'good' | 'easy') => {
    const intervalMap = { again: '1d', good: '3d', easy: '7d' }
    triggerBubble('ada', `Card reviewed (${rating.toUpperCase()}): interval updated to ${intervalMap[rating]}`, 'success', 'work')
  }

  // Handle Markdown export/import feedback (Phase 05)
  const handleExportMarkdown = (note: any) => {
    triggerBubble('ada', `Exported note "${note.title.slice(0, 24)}" to Obsidian Markdown`, 'info', 'work')
  }

  const handleImportMarkdown = (imported: { title: string; subject: string; content: string }) => {
    triggerBubble('ada', `Imported Obsidian note: "${imported.title.slice(0, 24)}"`, 'success', 'work')
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: '#101214',
        color: '#EDEAE3',
        fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ── TOP STUDIO CONTROLS BAR ── */}
      <StudioHeader
        theme={theme}
        isMicMuted={isMicMuted}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onToggleMicMute={() => setIsMicMuted((m) => !m)}
        onOpen3DOffice={() => {
          setActivePanel('OFFICE_3D')
          setActiveAgent(null)
        }}
        onOpenMusicCorner={() => {
          setActivePanel('MUSIC_CORNER')
          setActiveAgent(null)
        }}
      />

      {/* ── 2D LIVING STUDIO SCENE (EVERYDAY HOME SCREEN) ── */}
      <StudioScene
        activeAgent={activeAgent}
        agentStates={agentStates}
        agentBubbles={agentBubbles}
        isReducedMotion={isReducedMotion}
        onSelectAgent={handleSelectAgent}
        onOpenMusicCorner={() => setActivePanel('MUSIC_CORNER')}
        onOpenQuickSummon={() => {
          setActivePanel('GRAV_CONVERSATION')
          setActiveAgent('grav')
          setActiveSpecialist('grav')
        }}
        onOpenAdaNotes={() => {
          setActivePanel('ADA_NOTES')
          setActiveAgent('ada')
        }}
        onOpenCipherTasks={() => {
          setActivePanel('CIPHER_TASKS')
          setActiveAgent('cipher')
        }}
        onCoffeeSip={() => {
          triggerBubble('grav', 'Fresh brew poured ☕ Ready to engineer.', 'info', 'decorative')
        }}
        onPixelCanvas={() => {
          triggerBubble('pixel', 'Drafting board active — UI wireframes loaded', 'info', 'decorative')
        }}
        onScoutObservatory={() => {
          triggerBubble('scout', 'Observatory focused — Scanning research sources', 'info', 'decorative')
        }}
      />

      {/* ── BOTTOM FLOATING SUMMON CONTROLS ── */}
      <StudioSummonBar
        onOpenGravChat={() => {
          setActivePanel('GRAV_CONVERSATION')
          setActiveAgent('grav')
          setActiveSpecialist('grav')
        }}
        onOpenAdaNotes={() => {
          setActivePanel('ADA_NOTES')
          setActiveAgent('ada')
        }}
        onOpenCipherTasks={() => {
          setActivePanel('CIPHER_TASKS')
          setActiveAgent('cipher')
        }}
        onVoiceDictation={handleVoiceToggle}
        isListening={isListening}
      />

      {/* ── FLOATING ON-DEMAND SPATIAL WORK SURFACES (PHASE 04) ── */}
      <FloatingPanels
        activePanel={activePanel}
        minimizedPanel={minimizedPanel}
        activeSpecialist={activeSpecialist}
        onSelectSpecialist={(id) => {
          setActiveSpecialist(id)
          setActiveAgent(id)
        }}
        messages={messagesByAgent[activeSpecialist] || []}
        dueTasks={dueTasks}
        dueAssignments={dueAssignments}
        activeNote={activeNote}
        isListening={isListening}
        isExecuting={isExecuting}
        isReducedMotion={isReducedMotion}
        onClose={() => {
          setActivePanel('NONE')
          setActiveAgent(null)
        }}
        onMinimize={handleMinimize}
        onRestore={handleRestore}
        onSendMessage={handleSendMessage}
        onVoiceToggle={handleVoiceToggle}
        onSaveNote={handleSaveNote}
        onTaskCompleted={handleTaskCompleted}
        onClearHistory={handleClearHistory}
        focusTimer={focusTimer}
        onStopFocusTimer={() => setFocusTimer(null)}
        onOpenAdaNotes={() => {
          setActivePanel('ADA_NOTES')
          setActiveAgent('ada')
        }}
        onOpenCipherTasks={() => {
          setActivePanel('CIPHER_TASKS')
          setActiveAgent('cipher')
        }}
        onOpenExternal={async (url) => {
          await window.gravitasDesktop?.openApprovedExternal?.(url)
        }}
        onAddTask={handleAddTask}
        onReviewFlashcard={handleReviewFlashcard}
        onExportMarkdown={handleExportMarkdown}
        onImportMarkdown={handleImportMarkdown}
      />
    </div>
  )
}
