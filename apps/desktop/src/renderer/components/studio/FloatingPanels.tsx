import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Send,
  Mic,
  BookOpen,
  CheckCircle,
  Clock,
  Disc3,
  Layers,
  Save,
  Volume2,
  ExternalLink,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { ThreeOfficeViewport } from '../ThreeOfficeViewport.js'

export type ActivePanel =
  | 'NONE'
  | 'GRAV_CONVERSATION'
  | 'ADA_NOTES'
  | 'CIPHER_TASKS'
  | 'MUSIC_CORNER'
  | 'OFFICE_3D'

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  actionReceipt?: { title: string; details: string } | undefined
}

export interface FloatingPanelsProps {
  activePanel: ActivePanel
  messages: readonly ChatMessage[]
  dueTasks: readonly any[]
  dueAssignments: readonly any[]
  activeNote: { id?: string; title: string; content: string; subject: string } | null
  isListening: boolean
  isExecuting: boolean
  isReducedMotion: boolean
  onClose: () => void
  onSendMessage: (text: string) => void
  onVoiceToggle: () => void
  onSaveNote: (note: { id?: string; title: string; content: string; subject: string }) => Promise<void>
  onTaskCompleted: (taskId: string, completed: boolean) => Promise<void>
  onOpenExternal: (url: string) => Promise<void>
}

export const FloatingPanels: React.FC<FloatingPanelsProps> = ({
  activePanel,
  messages,
  dueTasks,
  dueAssignments,
  activeNote,
  isListening,
  isExecuting,
  isReducedMotion,
  onClose,
  onSendMessage,
  onVoiceToggle,
  onSaveNote,
  onTaskCompleted,
  onOpenExternal,
}) => {
  const [inputText, setInputText] = useState('')
  const [noteTitle, setNoteTitle] = useState(activeNote?.title || 'Algorithms: Master Theorem & Complexity')
  const [noteSubject, setNoteSubject] = useState(activeNote?.subject || 'Algorithms')
  const [noteContent, setNoteContent] = useState(
    activeNote?.content ||
      `# Divide and Conquer Analysis\n\n## Master Theorem Form\nFor recurrence relations:\n$$T(n) = aT(n/b) + f(n)$$\nwhere $a \\ge 1, b > 1$:\n\n1. If $f(n) = O(n^{\\log_b a - \\epsilon})$, then $T(n) = \\Theta(n^{\\log_b a})$.\n2. If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$, then $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.\n3. If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$, then $T(n) = \\Theta(f(n))$.`
  )
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(true)

  if (activePanel === 'NONE') return null

  const handleSend = () => {
    if (!inputText.trim() || isExecuting) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleSaveCurrentNote = async () => {
    await onSaveNote({
      id: activeNote?.id || 'note_algorithms_core',
      title: noteTitle,
      subject: noteSubject,
      content: noteContent,
    })
    setNoteSavedFeedback(true)
    setTimeout(() => setNoteSavedFeedback(false), 2500)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* ── 1. GRAV FLOATING CONVERSATION SURFACE ── */}
      {activePanel === 'GRAV_CONVERSATION' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            width: '560px',
            maxWidth: '92vw',
            height: '520px',
            background: 'rgba(20, 23, 27, 0.96)',
            border: '1px solid #323A44',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(244, 162, 97, 0.15)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #282F37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(24, 28, 33, 0.9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#F4A261',
                  boxShadow: '0 0 8px #F4A261',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#EDEAE3' }}>
                Conversation with Grav
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: '#23282F',
                  color: '#9DA3A8',
                }}
              >
                On-Demand
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8E949B',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Conversation Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7E858D',
                  fontSize: '12.5px',
                  textAlign: 'center',
                  padding: '0 24px',
                }}
              >
                <Sparkles size={24} color="#F4A261" style={{ marginBottom: '8px', opacity: 0.7 }} />
                <span>Ask Grav to check what's due, take study notes, or launch an approved desktop tool.</span>
              </div>
            ) : (
              messages.map((msg) => (
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
                      padding: '9px 13px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      background: msg.sender === 'user' ? '#262D35' : '#171B20',
                      color: msg.sender === 'user' ? '#EDEAE3' : '#D6D4CE',
                      border: `1px solid ${msg.sender === 'user' ? '#3B4450' : '#262D35'}`,
                    }}
                  >
                    {msg.text}
                    {msg.actionReceipt && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '6px 10px',
                          background: '#101316',
                          border: '1px solid #252B32',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                        }}
                      >
                        <div style={{ color: '#81B29A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle size={12} />
                          {msg.actionReceipt.title}
                        </div>
                        <div style={{ color: '#8E949B', marginTop: '2px', fontSize: '11px' }}>
                          {msg.actionReceipt.details}
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '10px', color: '#686E74', marginTop: '2px', padding: '0 4px' }}>
                    {msg.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Compact Composer Input Bar */}
          <div
            style={{
              padding: '12px 14px',
              borderTop: '1px solid #282F37',
              background: 'rgba(20, 24, 29, 0.95)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <button
              onClick={onVoiceToggle}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: isListening ? '#E76F51' : '#23282F',
                border: `1px solid ${isListening ? '#E76F51' : '#343B45'}`,
                color: isListening ? '#FFF' : '#9DA3A8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isListening ? 'Stop Push-To-Talk' : 'Hold or click to speak (Offline STT)'}
            >
              <Mic size={15} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Grav something, or type 'Due today'..."
              style={{
                flex: 1,
                background: '#13161A',
                border: '1px solid #2B333D',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#EDEAE3',
                fontSize: '13px',
                outline: 'none',
              }}
            />

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isExecuting}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#F4A261',
                border: 'none',
                color: '#101214',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() && !isExecuting ? 'pointer' : 'not-allowed',
                opacity: inputText.trim() && !isExecuting ? 1 : 0.4,
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── 2. ADA KNOWLEDGE HUB & STUDY NOTES PANEL ── */}
      {activePanel === 'ADA_NOTES' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            width: '680px',
            maxWidth: '94vw',
            height: '560px',
            background: 'rgba(20, 25, 23, 0.97)',
            border: '1px solid #2D3A32',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 24px rgba(129, 178, 154, 0.15)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #243028',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(22, 29, 25, 0.9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} color="#81B29A" />
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#EDEAE3' }}>
                Ada's Knowledge Hub — Course Notes
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: '#233028',
                  color: '#81B29A',
                  fontWeight: 600,
                }}
              >
                SQLite WAL
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleSaveCurrentNote}
                style={{
                  background: '#81B29A',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#101713',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
              >
                <Save size={13} />
                <span>{noteSavedFeedback ? 'Saved ✓' : 'Save to SQLite'}</span>
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8E949B',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Note Metadata Bar */}
          <div
            style={{
              padding: '10px 20px',
              background: 'rgba(18, 24, 20, 0.8)',
              borderBottom: '1px solid #222C25',
              display: 'flex',
              gap: '12px',
            }}
          >
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title..."
              style={{
                flex: 2,
                background: '#141A16',
                border: '1px solid #2B372F',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#EDEAE3',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
              }}
            />
            <input
              type="text"
              value={noteSubject}
              onChange={(e) => setNoteSubject(e.target.value)}
              placeholder="Subject (e.g. Algorithms)..."
              style={{
                flex: 1,
                background: '#141A16',
                border: '1px solid #2B372F',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#81B29A',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
          </div>

          {/* Note Markdown Textarea */}
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              style={{
                flex: 1,
                width: '100%',
                background: '#121714',
                border: '1px solid #243027',
                borderRadius: '8px',
                padding: '14px',
                color: '#EDEAE3',
                fontSize: '13px',
                fontFamily: 'Geist Mono, Cascadia Code, monospace',
                lineHeight: 1.6,
                resize: 'none',
                outline: 'none',
              }}
            />
            <div style={{ fontSize: '11px', color: '#73857B', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Markdown and KaTeX LaTeX math supported. Preserved verbatim in local SQLite.</span>
              <span>Subject: {noteSubject}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 3. CIPHER TASKS & SYSTEMS AGENDA PANEL ── */}
      {activePanel === 'CIPHER_TASKS' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            width: '620px',
            maxWidth: '92vw',
            height: '520px',
            background: 'rgba(18, 22, 28, 0.97)',
            border: '1px solid #2A3644',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 24px rgba(74, 137, 200, 0.15)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #222C38',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(20, 26, 33, 0.9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#4A89C8" />
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#EDEAE3' }}>
                What's Due Today — Tasks & Assignments
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8E949B',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Agenda Items List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {dueTasks.length === 0 && dueAssignments.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7B8490',
                  fontSize: '13px',
                }}
              >
                <CheckCircle size={32} color="#81B29A" style={{ marginBottom: '10px' }} />
                <span style={{ fontWeight: 600, color: '#EDEAE3' }}>Zero overdue items</span>
                <span style={{ fontSize: '12px', marginTop: '4px' }}>Your daily schedule is clean.</span>
              </div>
            ) : (
              <>
                {dueTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: '#14181F',
                      border: '1px solid #242E3B',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={(e) => onTaskCompleted(t.id, e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: '#4A89C8' }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: t.completed ? '#75808C' : '#EDEAE3',
                            textDecoration: t.completed ? 'line-through' : 'none',
                          }}
                        >
                          {t.title}
                        </div>
                        {t.subject && (
                          <div style={{ fontSize: '11px', color: '#4A89C8', marginTop: '2px' }}>
                            {t.subject}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#1F2732',
                        color: '#9AA6B4',
                      }}
                    >
                      Task
                    </span>
                  </div>
                ))}

                {dueAssignments.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      background: '#14181F',
                      border: '1px solid #242E3B',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={14} color="#F4A261" />
                      <div>
                        <div style={{ fontSize: '13px', color: '#EDEAE3' }}>{a.title}</div>
                        <div style={{ fontSize: '11px', color: '#81B29A', marginTop: '2px' }}>
                          {a.subjectCode} • Due {a.dueDate?.slice(0, 10)}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#2B231D',
                        color: '#F4A261',
                      }}
                    >
                      Coursework
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ── 4. CHILL CORNER / MUSIC CONCEPT PLAYER ── */}
      {activePanel === 'MUSIC_CORNER' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            width: '420px',
            maxWidth: '90vw',
            background: 'rgba(22, 25, 29, 0.96)',
            border: '1px solid #373E47',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 20px rgba(217, 119, 54, 0.2)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #282E36',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Disc3 size={16} color="#D97736" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#EDEAE3' }}>
                Chill Lounge & Focus Audio
              </span>
              <span
                style={{
                  fontSize: '9px',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  background: '#2D2319',
                  color: '#F4A261',
                  fontWeight: 600,
                }}
              >
                PROTOTYPE CONCEPT
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8E949B', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {/* Vinyl Visualizer Card */}
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div
              animate={isReducedMotion || !musicPlaying ? {} : { rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #252A30 0%, #101214 70%)',
                border: '3px solid #2F3741',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Disc3 size={90} color="#D97736" style={{ opacity: 0.85 }} />
              <div
                style={{
                  position: 'absolute',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#F4A261',
                  border: '2px solid #101214',
                }}
              />
            </motion.div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#EDEAE3' }}>
                Engineering Focus Session #4
              </div>
              <div style={{ fontSize: '12px', color: '#8E949B', marginTop: '3px' }}>
                Ambient Lo-Fi Beats • 64 BPM
              </div>
            </div>

            {/* Clearly labeled concept banner */}
            <div
              style={{
                marginTop: '16px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#191D22',
                border: '1px solid #29313A',
                fontSize: '11px',
                color: '#9DA3A8',
                lineHeight: 1.45,
                textAlign: 'center',
              }}
            >
              Non-functional visual concept for Spotify/Media integration. Real Spotify API authorization and playback hooks are scheduled for Phase 07.
            </div>

            {/* Quick External Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%' }}>
              <button
                onClick={() => onOpenExternal('https://open.spotify.com')}
                style={{
                  flex: 1,
                  background: '#1DB954',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <ExternalLink size={13} />
                <span>Open Spotify App</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 5. THREE.JS LIVING 3D OFFICE VIEWPORT ── */}
      {activePanel === 'OFFICE_3D' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          style={{
            width: '840px',
            maxWidth: '94vw',
            height: '620px',
            background: 'rgba(16, 18, 20, 0.98)',
            border: '1px solid #323A44',
            borderRadius: '16px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 24px rgba(244, 162, 97, 0.2)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #242A31',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(20, 24, 28, 0.9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#F4A261" />
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#EDEAE3' }}>
                Three.js Living 3D Office Viewport
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#2B231A',
                  color: '#F4A261',
                  fontWeight: 600,
                }}
              >
                LAZY-LOADED WEBGL
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8E949B', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {/* 3D Canvas Container */}
          <div style={{ flex: 1, position: 'relative', background: '#0D0F11', overflow: 'hidden' }}>
            <ThreeOfficeViewport isReducedMotion={isReducedMotion} />
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(16, 18, 20, 0.85)',
                border: '1px solid #252A30',
                fontSize: '11px',
                color: '#8E949B',
                pointerEvents: 'none',
              }}
            >
              Real-time WebGL isometric studio view. Disposed on close to prevent background GPU consumption.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
