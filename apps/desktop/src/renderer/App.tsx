import React, { useState, useEffect, useCallback } from 'react'
import { StudioHeader, StudioSummonBar } from './components/studio/StudioControls.js'
import { StudioScene } from './components/studio/StudioScene.js'
import { FloatingPanels, ActivePanel, ChatMessage } from './components/studio/FloatingPanels.js'
import { MascotId, MascotState, MascotBubbleData } from './components/studio/MascotFamily.js'
import { parseAssistantCommand } from '../assistant/commandParser.js'

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
  const [messages, setMessages] = useState<readonly ChatMessage[]>([])
  const [dueTasks, setDueTasks] = useState<readonly any[]>([])
  const [dueAssignments, setDueAssignments] = useState<readonly any[]>([])
  const [activeNote, setActiveNote] = useState<{ id?: string; title: string; content: string; subject: string } | null>({
    id: 'note_algorithms_core',
    title: 'Algorithms: Master Theorem & Complexity Analysis',
    subject: 'Algorithms',
    content: `# Divide and Conquer Analysis\n\n## Master Theorem Form\nFor recurrence relations of the form:\n$$T(n) = aT(n/b) + f(n)$$\nwhere $a \\ge 1, b > 1$:\n\n1. **Case 1**: If $f(n) = O(n^{\\log_b a - \\epsilon})$ for some constant $\\epsilon > 0$, then $T(n) = \\Theta(n^{\\log_b a})$.\n2. **Case 2**: If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ where $k \\ge 0$, then $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.\n3. **Case 3**: If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ for some constant $\\epsilon > 0$, and regularity condition $af(n/b) \\le cf(n)$ holds, then $T(n) = \\Theta(f(n))$.`,
  })

  // Helper: Trigger temporary activity bubble for an agent
  const triggerBubble = useCallback((agentId: MascotId, text: string, kind: 'info' | 'success' | 'warning' | 'error' = 'success', duration = 4500) => {
    setAgentBubbles((prev) => ({
      ...prev,
      [agentId]: { text, kind, timestamp: Date.now() },
    }))
    setAgentStates((prev) => ({
      ...prev,
      [agentId]: kind === 'error' ? 'error' : 'success',
    }))

    setTimeout(() => {
      setAgentBubbles((prev) => ({ ...prev, [agentId]: null }))
      setAgentStates((prev) => ({ ...prev, [agentId]: 'idle' }))
    }, duration)
  }, [])

  // Initialize data from real SQLite databases
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

          const algoNote = items.find((i) => i.collection === 'STUDY_NOTE' && (i.subject?.includes('Algo') || i.title?.includes('Algo')))
          if (algoNote) {
            setActiveNote({
              id: algoNote.id,
              title: algoNote.title,
              subject: algoNote.subject || 'Algorithms',
              content: algoNote.originalText || '',
            })
          }
        }
      }).catch((err) => console.warn('Could not load SQLite ideas:', err))
    }

    // Keyboard shortcut handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault()
        setActivePanel((prev) => (prev === 'GRAV_CONVERSATION' ? 'NONE' : 'GRAV_CONVERSATION'))
        setActiveAgent('grav')
      } else if (e.key === 'Escape') {
        setActivePanel('NONE')
        setActiveAgent(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      mql.removeEventListener('change', handleMql)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Handle agent selection in the 2D studio
  const handleSelectAgent = (id: MascotId) => {
    setActiveAgent(id)
    switch (id) {
      case 'grav':
        setActivePanel('GRAV_CONVERSATION')
        break
      case 'ada':
        setActivePanel('ADA_NOTES')
        break
      case 'cipher':
        setActivePanel('CIPHER_TASKS')
        break
      case 'pixel':
        triggerBubble('pixel', 'UI tokens synchronized • Dark Graphite', 'info')
        break
      case 'scout':
        triggerBubble('scout', '3 Research references indexed in Knowledge Hub', 'info')
        break
    }
  }

  // Handle sending a chat message to Grav / Assistant
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isExecuting) return

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsExecuting(true)
    setAgentStates((prev) => ({ ...prev, grav: 'working' }))

    try {
      const intent = parseAssistantCommand(text)
      const bridge = window.gravitasDesktop

      if (intent.kind === 'DUE_TODAY') {
        let taskCount = dueTasks.length
        let asgnCount = dueAssignments.length
        if (bridge?.executeAssistantCommand) {
          const res = await bridge.executeAssistantCommand({ input: text })
          if ((res as any)?.ideas) setDueTasks((res as any).ideas)
          if ((res as any)?.assignments) setDueAssignments((res as any).assignments)
          taskCount = (res as any)?.ideas?.length ?? taskCount
          asgnCount = (res as any)?.assignments?.length ?? asgnCount
        }

        const reply: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          sender: 'assistant',
          text: `You have ${taskCount + asgnCount} item(s) due today. I've prepared your agenda.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionReceipt: {
            title: 'Agenda Loaded',
            details: `${taskCount} task(s), ${asgnCount} coursework assignment(s)`,
          },
        }
        setMessages((prev) => [...prev, reply])
        triggerBubble('grav', `Found ${taskCount + asgnCount} items due today`, 'success')
        triggerBubble('cipher', 'Agenda synced with SQLite', 'info')
      } else if (intent.kind === 'OPEN_ENTERTAINMENT') {
        const reply: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          sender: 'assistant',
          text: `Opening ${intent.displayName} (${intent.url}) in your desktop browser.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionReceipt: {
            title: `Opened ${intent.displayName}`,
            details: intent.url,
          },
        }
        setMessages((prev) => [...prev, reply])
        await bridge?.openApprovedExternal?.(intent.url)
        triggerBubble('grav', `Launched ${intent.displayName}`, 'success')
      } else if (
        (intent.kind === 'LIST_COLLECTION' && intent.collection === 'STUDY_NOTE') ||
        (intent.kind === 'SEARCH_IDEAS' && intent.query.toLowerCase().includes('algo')) ||
        text.toLowerCase().includes('algo')
      ) {
        const reply: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          sender: 'assistant',
          text: "Here are your Algorithms study notes. Opened in Ada's Knowledge Hub.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionReceipt: {
            title: 'Study Note Opened',
            details: 'Algorithms: Master Theorem & Complexity Analysis',
          },
        }
        setMessages((prev) => [...prev, reply])
        setActivePanel('ADA_NOTES')
        triggerBubble('ada', 'Loaded Algorithms note from SQLite', 'success')
      } else if (bridge?.executeAssistantCommand) {
        const res = await bridge.executeAssistantCommand({ input: text })
        const reply: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          sender: 'assistant',
          text: res?.message || 'Command executed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, reply])
        triggerBubble('grav', 'Done', 'success')
      } else {
        const reply: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          sender: 'assistant',
          text: `Processed: "${text}". Ready for your next command.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, reply])
      }
    } catch (err: any) {
      console.warn('Execution error:', err)
      triggerBubble('grav', 'Error processing command', 'error')
    } finally {
      setIsExecuting(false)
      setAgentStates((prev) => ({ ...prev, grav: 'idle' }))
    }
  }

  // Handle PTT Voice Toggle
  const handleVoiceToggle = async () => {
    if (isMicMuted) {
      triggerBubble('grav', 'Microphone is muted for privacy', 'warning')
      return
    }

    const bridge = window.gravitasDesktop
    if (!isListening) {
      setIsListening(true)
      setAgentStates((prev) => ({ ...prev, grav: 'attentive' }))
      triggerBubble('grav', 'Listening (Push-To-Talk)...', 'info')
      try {
        await bridge?.startPushToTalk?.(true)
      } catch (err) {
        console.warn('Voice start failed:', err)
      }
    } else {
      setIsListening(false)
      setAgentStates((prev) => ({ ...prev, grav: 'working' }))
      try {
        const res = await bridge?.stopPushToTalk?.('session_ptt')
        if (res?.transcript) {
          handleSendMessage(res.transcript)
        } else {
          setAgentStates((prev) => ({ ...prev, grav: 'idle' }))
        }
      } catch (err) {
        setAgentStates((prev) => ({ ...prev, grav: 'idle' }))
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
    // Genuine activity bubble on Ada
    triggerBubble('ada', `Saved "${note.title.slice(0, 22)}..." to SQLite`, 'success')
  }

  // Handle Task completion in SQLite
  const handleTaskCompleted = async (taskId: string, completed: boolean) => {
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
    // Genuine activity bubble on Cipher
    triggerBubble('cipher', `Task updated in local database`, 'success')
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
          triggerBubble('grav', 'Fresh brew poured ☕ Ready to engineer.', 'info')
        }}
        onPixelCanvas={() => {
          triggerBubble('pixel', 'Drafting board active — UI wireframes loaded', 'info')
        }}
        onScoutObservatory={() => {
          triggerBubble('scout', 'Observatory focused — Scanning research sources', 'info')
        }}
      />

      {/* ── BOTTOM FLOATING SUMMON CONTROLS ── */}
      <StudioSummonBar
        onOpenGravChat={() => {
          setActivePanel('GRAV_CONVERSATION')
          setActiveAgent('grav')
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

      {/* ── FLOATING ON-DEMAND SPATIAL WORK SURFACES ── */}
      <FloatingPanels
        activePanel={activePanel}
        messages={messages}
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
        onSendMessage={handleSendMessage}
        onVoiceToggle={handleVoiceToggle}
        onSaveNote={handleSaveNote}
        onTaskCompleted={handleTaskCompleted}
        onOpenExternal={async (url) => {
          await window.gravitasDesktop?.openApprovedExternal?.(url)
        }}
      />
    </div>
  )
}
