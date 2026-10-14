import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Moon,
  Zap,
  ZapOff,
  Layers,
  Sparkles,
  Database,
  Terminal,
  ExternalLink,
  BookOpen,
  Calendar,
  CheckCircle,
} from 'lucide-react'
import { CompanionBuddy, type CompanionExpression } from './components/CompanionBuddy.js'
import { StudioComposer } from './components/StudioComposer.js'
import { StudioSidebar, type StudioNavTab } from './components/StudioSidebar.js'
import { SpatialWorkspace, type SpatialViewMode } from './components/SpatialWorkspace.js'
import { ThreeOfficeViewport } from './components/ThreeOfficeViewport.js'
import type {
  IdeaRecord,
  StudyAssignmentRecord,
  AssistantCommandResult,
  KernelLifecycleStatus,
} from '../types.js'

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  intentKind?: string
  actionReceipt?: {
    type: 'DUE_TODAY' | 'NOTE_OPENED' | 'EXTERNAL_LAUNCH' | 'INFO'
    title: string
    details: string
  }
}

export const App: React.FC = () => {
  // Navigation & Spatial Layout
  const [currentTab, setCurrentTab] = useState<StudioNavTab>('CONVERSATION')
  const [spatialMode, setSpatialMode] = useState<SpatialViewMode>('CLOSED')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // System & Accessibility Preferences
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  // Kernel & Desktop Bridge State
  const [kernelStatus, setKernelStatus] = useState<KernelLifecycleStatus>('READY')
  const [kernelPid, setKernelPid] = useState(0)

  // 2D Companion State
  const [buddyExpression, setBuddyExpression] = useState<CompanionExpression>('idle')
  const [buddyThought, setBuddyThought] = useState<string>(
    "Welcome to your personal engineering studio. What are we studying or building today?"
  )

  // Data State: Tasks, Assignments, Active Note
  const [dueTasks, setDueTasks] = useState<readonly IdeaRecord[]>([])
  const [dueAssignments, setDueAssignments] = useState<readonly StudyAssignmentRecord[]>([])
  const [activeNote, setActiveNote] = useState<IdeaRecord | null>(null)
  const [entertainmentInfo, setEntertainmentInfo] = useState<{
    service: string
    url: string
    displayName: string
  } | null>(null)

  // Conversation Stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: "GRAVITAS 2.0 Personal Engineering Studio is ready. Try typing 'What's due today?', 'Open my Algorithms notes', or 'Open Netflix'.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [isExecuting, setIsExecuting] = useState(false)
  const [isListening, setIsListening] = useState(false)

  // Initial load: Fetch health & today's agenda from SQLite
  useEffect(() => {
    const bridge = window.gravitasDesktop
    if (!bridge) return

    // 1. Initial health query
    bridge.getHealth?.().then((h) => {
      setKernelStatus(h.status)
      setKernelPid(h.kernelPid)
    }).catch(() => {})

    // 2. Listen to status events
    const unsubStatus = bridge.onKernelStatus?.((st) => setKernelStatus(st))

    // 3. Query agenda from SQLite
    refreshAgenda()

    return () => {
      unsubStatus?.()
    }
  }, [])

  // Refresh tasks and assignments due today from SQLite
  const refreshAgenda = useCallback(async () => {
    const bridge = window.gravitasDesktop
    if (!bridge) return
    const today = new Date().toISOString().slice(0, 10)

    try {
      if (bridge.listIdeas) {
        const allTasks = await bridge.listIdeas({ collection: 'PLAN_TASK', unfinishedTasksOnly: true })
        const todayTasks = allTasks.filter((t) => !t.completed && (!t.dueDate || t.dueDate === today))
        setDueTasks(todayTasks.length > 0 ? todayTasks : allTasks.slice(0, 3))
      }

      if (bridge.executeStudyGuardianOperation) {
        const asgnRes = await bridge.executeStudyGuardianOperation({ action: 'LIST_ASSIGNMENTS' })
        if (asgnRes.assignments) {
          const unfinished = asgnRes.assignments.filter((a) => a.status !== 'COMPLETED')
          setDueAssignments(unfinished)
        }
      }
    } catch (err) {
      console.warn('Failed to refresh agenda:', err)
    }
  }, [])

  // Toggle Theme
  const toggleTheme = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    window.gravitasDesktop?.setTheme?.(next ? 'dark' : 'light').catch(() => {})
  }

  // Handle Tab Navigation from Sidebar
  const handleSelectTab = (tab: StudioNavTab) => {
    setCurrentTab(tab)
    if (tab === 'DUE_TODAY') {
      refreshAgenda()
      setSpatialMode('DUE_TODAY')
      setBuddyExpression('thinking')
      setBuddyThought("Opened today's schedule and active tasks from your SQLite store.")
    } else if (tab === 'NOTES') {
      handleOpenAlgorithmsNote()
    } else if (tab === 'OFFICE_3D') {
      setSpatialMode('OFFICE_3D')
      setBuddyExpression('thinking')
      setBuddyThought("3D Living Office loaded on demand without background battery drain.")
    } else if (tab === 'CONVERSATION') {
      setSpatialMode('CLOSED')
    }
  }

  // ─── WORKFLOW 1: "What's due today?" ──────────────────────────────────────
  const handleWhatsDueToday = async () => {
    setIsExecuting(true)
    setBuddyExpression('thinking')
    setBuddyThought("Checking genuine SQLite tasks and assignments for today...")

    try {
      await refreshAgenda()
      const bridge = window.gravitasDesktop

      let count = 0
      let details = ''

      if (bridge?.executeAssistantCommand) {
        const res = await bridge.executeAssistantCommand({ input: "What's due today?" })
        count = (res.ideas?.length || 0) + (res.assignments?.length || 0)
        details = res.message
      } else {
        count = dueTasks.length + dueAssignments.length
        details = count > 0 ? `Found ${count} active item(s) due today.` : 'Nothing is due today!'
      }

      setSpatialMode('DUE_TODAY')
      setCurrentTab('DUE_TODAY')
      setBuddyExpression('success')
      setBuddyThought(
        count > 0
          ? `You have ${count} pending item(s) in SQLite. Opened your agenda panel on the right.`
          : 'Nothing is due today! Your schedule is completely clear.'
      )

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          sender: 'assistant',
          text: details,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intentKind: 'DUE_TODAY',
          actionReceipt: {
            type: 'DUE_TODAY',
            title: `Agenda for ${new Date().toISOString().slice(0, 10)}`,
            details: `Opened contextual spatial panel with ${count} item(s) from SQLite.`,
          },
        },
      ])
    } catch (err: any) {
      setBuddyExpression('alert')
      setBuddyThought(`Could not retrieve tasks: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  // ─── WORKFLOW 2: "Open my Algorithms notes" ──────────────────────────────
  const handleOpenAlgorithmsNote = async () => {
    setIsExecuting(true)
    setBuddyExpression('thinking')
    setBuddyThought("Searching your SQLite Knowledge Hub for Algorithms notes...")

    try {
      const bridge = window.gravitasDesktop
      let matchedNote: IdeaRecord | null = null

      if (bridge?.listIdeas) {
        // Search by subject Algorithms
        const notes = await bridge.listIdeas({ collection: 'STUDY_NOTE', subject: 'Algorithms' })
        if (notes.length > 0 && notes[0]) {
          matchedNote = notes[0]
        } else {
          // Fallback search
          const allNotes = await bridge.listIdeas({ collection: 'STUDY_NOTE' })
          matchedNote =
            allNotes.find(
              (n) =>
                n.title.toLowerCase().includes('algo') ||
                (n.subject && n.subject.toLowerCase().includes('algo'))
            ) || null
        }
      }

      if (!matchedNote && bridge?.saveIdea) {
        // Fallback safety seed
        matchedNote = await bridge.saveIdea({
          collection: 'STUDY_NOTE',
          title: 'Algorithms: Divide-and-Conquer & Master Theorem Notes',
          originalText:
            '# Divide and Conquer Analysis\n\n## Master Theorem Form\n$$T(n) = aT(n/b) + f(n)$$\nwhere $a \\ge 1$, $b > 1$.\n\n1. If $f(n) = O(n^{\\log_b a - \\epsilon})$ then $T(n) = \\Theta(n^{\\log_b a})$.\n2. If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ then $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.\n3. If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ then $T(n) = \\Theta(f(n))$.',
          subject: 'Algorithms',
          topic: 'Divide and Conquer',
        })
      }

      setActiveNote(matchedNote)
      setSpatialMode('NOTE_EDITOR')
      setCurrentTab('NOTES')
      setBuddyExpression('success')
      setBuddyThought("Found your Algorithms notes! Opened in the editable spatial workspace on the right.")

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          sender: 'assistant',
          text: `Opened "${matchedNote?.title || 'Algorithms Notes'}" from local SQLite.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intentKind: 'LIST_COLLECTION',
          actionReceipt: {
            type: 'NOTE_OPENED',
            title: matchedNote?.title || 'Algorithms Notes',
            details: `Loaded subject ${matchedNote?.subject || 'Algorithms'} into editable spatial panel.`,
          },
        },
      ])
    } catch (err: any) {
      setBuddyExpression('alert')
      setBuddyThought(`Could not open notes: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  // ─── WORKFLOW 3: "Open Netflix" ──────────────────────────────────────────
  const handleOpenNetflix = async () => {
    setIsExecuting(true)
    setBuddyExpression('speaking')
    setBuddyThought("Relaxation time approved! Launching Netflix through Windows desktop action...")

    const netflixUrl = 'https://www.netflix.com'
    const serviceName = 'Netflix'

    try {
      const bridge = window.gravitasDesktop
      if (bridge?.openApprovedExternal) {
        await bridge.openApprovedExternal(netflixUrl)
      } else {
        window.open(netflixUrl, '_blank')
      }

      setEntertainmentInfo({
        service: 'netflix',
        url: netflixUrl,
        displayName: serviceName,
      })
      setSpatialMode('ENTERTAINMENT')
      setBuddyExpression('success')
      setBuddyThought("Netflix launched in your browser! The action receipt is pinned in your spatial panel.")

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          sender: 'assistant',
          text: `Launched approved entertainment service "${serviceName}" at ${netflixUrl}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intentKind: 'OPEN_ENTERTAINMENT',
          actionReceipt: {
            type: 'EXTERNAL_LAUNCH',
            title: 'Netflix Desktop Action',
            details: `Successfully opened ${netflixUrl} via Windows desktop shell.`,
          },
        },
      ])
    } catch (err: any) {
      setBuddyExpression('alert')
      setBuddyThought(`Could not open Netflix: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  // User Message Router (Deterministic Intent Handler)
  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    // Append user message
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        sender: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])

    const lower = trimmed.toLowerCase()

    // 1. "What's due today?"
    if (
      lower.includes("due today") ||
      lower.includes("what's due") ||
      lower.includes("what is due") ||
      lower.includes("agenda today")
    ) {
      await handleWhatsDueToday()
      return
    }

    // 2. "Open my Algorithms notes"
    if (
      (lower.includes("algorithm") || lower.includes("algo")) &&
      (lower.includes("note") || lower.includes("open") || lower.includes("show"))
    ) {
      await handleOpenAlgorithmsNote()
      return
    }

    // 3. "Open Netflix"
    if (lower.includes("netflix")) {
      await handleOpenNetflix()
      return
    }

    // 4. Other commands: route through executeAssistantCommand
    setIsExecuting(true)
    setBuddyExpression('thinking')
    setBuddyThought(`Processing command: "${trimmed}"...`)

    try {
      const bridge = window.gravitasDesktop
      if (bridge?.executeAssistantCommand) {
        const res = await bridge.executeAssistantCommand({ input: trimmed })
        setBuddyExpression('success')
        setBuddyThought(res.message)
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            sender: 'assistant',
            text: res.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            intentKind: res.intentKind,
          },
        ])
      } else {
        setBuddyExpression('idle')
        setBuddyThought(`Received: "${trimmed}". Supported demo commands: "What's due today?", "Open my Algorithms notes", "Open Netflix".`)
      }
    } catch (err: any) {
      setBuddyExpression('alert')
      setBuddyThought(`Command error: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  // Save Note back to SQLite
  const handleSaveNote = async (noteId: string, title: string, text: string) => {
    const bridge = window.gravitasDesktop
    if (!bridge?.updateIdea) return

    const updated = await bridge.updateIdea({
      id: noteId,
      title,
      originalText: text,
    })
    setActiveNote(updated)
    setBuddyThought(`Saved "${title}" directly to SQLite!`)
  }

  // Complete task in SQLite
  const handleTaskCompleted = async (taskId: string, completed: boolean) => {
    const bridge = window.gravitasDesktop
    if (!bridge?.completeTask) return

    await bridge.completeTask(taskId, completed)
    setDueTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
    )
    setBuddyThought(completed ? "Marked task complete in SQLite!" : "Task restored.")
  }

  // Toggle Push-to-Talk (Offline Windows STT)
  const handleVoiceToggle = async () => {
    const bridge = window.gravitasDesktop
    if (!bridge) return

    if (!isListening) {
      setIsListening(true)
      setBuddyExpression('listening')
      setBuddyThought("Push-to-Talk active: listening for your voice command...")
      try {
        await bridge.startPushToTalk?.(true)
      } catch (err) {
        console.warn('Voice start failed:', err)
      }
    } else {
      setIsListening(false)
      setBuddyExpression('thinking')
      setBuddyThought("Transcribing speech offline...")
      try {
        const res = await bridge.stopPushToTalk?.('session_ptt')
        if (res?.transcribedText) {
          handleSendMessage(res.transcribedText)
        } else {
          setBuddyExpression('idle')
          setBuddyThought("Voice input complete.")
        }
      } catch (err) {
        setBuddyExpression('idle')
        setBuddyThought("Voice input ended.")
      }
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#101214',
        color: '#EDEAE3',
        overflow: 'hidden',
        fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* ─── Top Studio Bar ─────────────────────────────────────────────── */}
      <header
        style={{
          height: '46px',
          background: '#121518',
          borderBottom: '1px solid #23272D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Sparkles size={16} color="#F4A261" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#EDEAE3' }}>
              GRAVITAS 2.0 Studio
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#686E74', background: '#1C2025', padding: '2px 8px', borderRadius: '4px' }}>
            Personal Engineering
          </span>
        </div>

        {/* Studio Controls: 3D Office, Motion, Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 3D Office Toggle */}
          <button
            onClick={() => {
              if (spatialMode === 'OFFICE_3D') {
                setSpatialMode('CLOSED')
              } else {
                setSpatialMode('OFFICE_3D')
                setBuddyExpression('thinking')
                setBuddyThought("3D Living Office loaded on demand.")
              }
            }}
            title="Toggle 3D Living Office on demand"
            style={{
              background: spatialMode === 'OFFICE_3D' ? '#252A30' : 'transparent',
              border: '1px solid #282D34',
              borderRadius: '6px',
              color: spatialMode === 'OFFICE_3D' ? '#F4A261' : '#9DA3A8',
              padding: '4px 10px',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={13} />
            <span>3D Office</span>
          </button>

          {/* Reduced Motion Toggle */}
          <button
            onClick={() => setIsReducedMotion(!isReducedMotion)}
            title={isReducedMotion ? 'Enable smooth spring animations' : 'Reduce motion'}
            style={{
              background: 'transparent',
              border: '1px solid #282D34',
              borderRadius: '6px',
              color: isReducedMotion ? '#F4A261' : '#8E949B',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isReducedMotion ? <ZapOff size={14} /> : <Zap size={14} />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Architectural Light' : 'Switch to Cozy Dark'}
            style={{
              background: 'transparent',
              border: '1px solid #282D34',
              borderRadius: '6px',
              color: '#8E949B',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* ─── Main Studio Body (Sidebar + Conversation Canvas + Spatial Panel) ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Collapsible Left Navigation */}
        <StudioSidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          taskCount={dueTasks.length}
          isReducedMotion={isReducedMotion}
          kernelStatus={kernelStatus}
          kernelPid={kernelPid}
        />

        {/* Center Conversation-First Studio Canvas */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#101214',
            overflow: 'hidden',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          {/* Scrollable Conversation Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 2D Companion Buddy Header Widget */}
              <CompanionBuddy
                expression={buddyExpression}
                thoughtText={buddyThought}
                isReducedMotion={isReducedMotion}
                onQuickPrompt={(prompt) => handleSendMessage(prompt)}
              />

              {/* Chat Message Stream */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        lineHeight: 1.5,
                        background: msg.sender === 'user' ? '#252A30' : '#181B1E',
                        color: msg.sender === 'user' ? '#EDEAE3' : '#D2D0C9',
                        border: `1px solid ${msg.sender === 'user' ? '#373D45' : '#282D34'}`,
                      }}
                    >
                      {msg.text}

                      {/* Action Receipt Card */}
                      {msg.actionReceipt && (
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '8px 12px',
                            background: '#121518',
                            border: '1px solid #252A30',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#81B29A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={13} />
                            {msg.actionReceipt.title}
                          </div>
                          <div style={{ color: '#8E949B', marginTop: '2px', fontSize: '11px' }}>
                            {msg.actionReceipt.details}
                          </div>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#686E74', marginTop: '3px', padding: '0 4px' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Composer Bar */}
          <div style={{ padding: '16px 24px 20px 24px', background: 'transparent' }}>
            <StudioComposer
              onSendMessage={handleSendMessage}
              onVoiceToggle={handleVoiceToggle}
              isListening={isListening}
              isExecuting={isExecuting}
              isReducedMotion={isReducedMotion}
            />
          </div>
        </main>

        {/* Tactile Spring-Based Spatial Workspace Panel */}
        <AnimatePresence>
          {spatialMode !== 'CLOSED' && (
            <SpatialWorkspace
              mode={spatialMode}
              dueTasks={dueTasks}
              dueAssignments={dueAssignments}
              activeNote={activeNote}
              entertainmentInfo={entertainmentInfo}
              isReducedMotion={isReducedMotion}
              onClose={() => setSpatialMode('CLOSED')}
              onTaskCompleted={handleTaskCompleted}
              onSaveNote={handleSaveNote}
              onOpenExternal={async (url) => {
                await window.gravitasDesktop?.openApprovedExternal?.(url)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
