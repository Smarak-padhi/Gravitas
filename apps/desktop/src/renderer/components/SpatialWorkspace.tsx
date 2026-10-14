import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  CheckCircle2,
  Calendar,
  BookOpen,
  Tv,
  Save,
  Clock,
  Sparkles,
  ExternalLink,
  Edit3,
  Eye,
  Check,
  AlertCircle,
  Tag,
  Layers,
} from 'lucide-react'
import type { IdeaRecord, StudyAssignmentRecord } from '../../types.js'

export type SpatialViewMode = 'CLOSED' | 'DUE_TODAY' | 'NOTE_EDITOR' | 'ENTERTAINMENT' | 'OFFICE_3D'

export interface SpatialWorkspaceProps {
  mode: SpatialViewMode
  dueTasks: readonly IdeaRecord[]
  dueAssignments: readonly StudyAssignmentRecord[]
  activeNote: IdeaRecord | null
  entertainmentInfo: { service: string; url: string; displayName: string } | null
  isReducedMotion: boolean
  onClose: () => void
  onTaskCompleted: (taskId: string, completed: boolean) => Promise<void>
  onSaveNote: (noteId: string, title: string, text: string) => Promise<void>
  onOpenExternal: (url: string) => Promise<void>
}

export const SpatialWorkspace: React.FC<SpatialWorkspaceProps> = ({
  mode,
  dueTasks,
  dueAssignments,
  activeNote,
  entertainmentInfo,
  isReducedMotion,
  onClose,
  onTaskCompleted,
  onSaveNote,
  onOpenExternal,
}) => {
  // Note editing state
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editorMode, setEditorMode] = useState<'WRITE' | 'PREVIEW'>('WRITE')

  // Synchronize local note state when activeNote changes
  useEffect(() => {
    if (activeNote) {
      setNoteTitle(activeNote.title || '')
      setNoteText(activeNote.originalText || '')
      setIsDirty(false)
      setSaveSuccess(false)
    }
  }, [activeNote])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value)
    setIsDirty(true)
    setSaveSuccess(false)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNoteTitle(e.target.value)
    setIsDirty(true)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!activeNote || !isDirty) return
    setIsSaving(true)
    try {
      await onSaveNote(activeNote.id, noteTitle, noteText)
      setIsDirty(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } finally {
      setIsSaving(false)
    }
  }

  if (mode === 'CLOSED') {
    return null
  }

  const transitionConfig = isReducedMotion
    ? { duration: 0.05 }
    : { type: 'spring' as const, damping: 26, stiffness: 230 }

  return (
    <motion.aside
      initial={isReducedMotion ? false : { opacity: 0, x: 60, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={isReducedMotion ? {} : { opacity: 0, x: 60, scale: 0.98 }}
      transition={transitionConfig}
      style={{
        width: '480px',
        maxWidth: '45vw',
        minWidth: '380px',
        height: '100%',
        backgroundColor: '#16191D',
        borderLeft: '1px solid #282D34',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.45)',
        zIndex: 20,
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #282D34',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1C2025',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {mode === 'DUE_TODAY' && <Calendar size={16} color="#F4A261" />}
          {mode === 'NOTE_EDITOR' && <BookOpen size={16} color="#81B29A" />}
          {mode === 'ENTERTAINMENT' && <Tv size={16} color="#E07A5F" />}
          {mode === 'OFFICE_3D' && <Layers size={16} color="#F4A261" />}
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#EDEAE3', letterSpacing: '0.01em' }}>
            {mode === 'DUE_TODAY' && "What's Due Today (SQLite)"}
            {mode === 'NOTE_EDITOR' && 'Spatial Note Editor (SQLite)'}
            {mode === 'ENTERTAINMENT' && 'Approved Desktop Launcher'}
            {mode === 'OFFICE_3D' && 'Living 3D Office (On Demand)'}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close spatial panel"
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

      {/* Panel Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', boxSizing: 'border-box' }}>
        {/* ─── 1. DUE TODAY VIEW ────────────────────────────────────────── */}
        {mode === 'DUE_TODAY' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', color: '#9DA3A8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Agenda for {new Date().toISOString().slice(0, 10)}
              </span>
              <span style={{ fontSize: '11px', background: '#252A30', padding: '2px 8px', borderRadius: '10px', color: '#F4A261', fontWeight: 500 }}>
                {dueTasks.length + dueAssignments.length} Items
              </span>
            </div>

            {dueTasks.length === 0 && dueAssignments.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#8E949B' }}>
                <CheckCircle2 size={36} color="#81B29A" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#EDEAE3' }}>Nothing due today!</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Your daily schedule in SQLite is completely clear.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Genuine SQLite tasks */}
                {dueTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '12px 14px',
                      background: t.completed ? 'rgba(28, 32, 37, 0.4)' : '#1C2025',
                      border: '1px solid #2B3036',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      opacity: t.completed ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!t.completed}
                      onChange={(e) => onTaskCompleted(t.id, e.target.checked)}
                      style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#81B29A', width: '15px', height: '15px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#EDEAE3',
                          textDecoration: t.completed ? 'line-through' : 'none',
                        }}
                      >
                        {t.title}
                      </div>
                      {t.originalText && t.originalText !== t.title && (
                        <div style={{ fontSize: '11.5px', color: '#8E949B', marginTop: '2px' }}>
                          {t.originalText}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        {t.subject && (
                          <span style={{ fontSize: '10.5px', background: '#252A30', padding: '1px 6px', borderRadius: '4px', color: '#81B29A' }}>
                            {t.subject}
                          </span>
                        )}
                        <span style={{ fontSize: '10.5px', color: '#F4A261', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} /> Due Today
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Study Assignments */}
                {dueAssignments.map((a) => (
                  <div
                    key={a.assignmentId}
                    style={{
                      padding: '12px 14px',
                      background: '#1C2025',
                      border: '1px solid #2B3036',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#EDEAE3' }}>
                      {a.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span style={{ fontSize: '10.5px', background: '#2B2620', padding: '1px 6px', borderRadius: '4px', color: '#F4A261' }}>
                        {a.subjectCode}
                      </span>
                      <span style={{ fontSize: '10.5px', color: '#9DA3A8' }}>
                        Progress: {a.progressPercent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── 2. NOTE EDITOR VIEW ───────────────────────────────────────── */}
        {mode === 'NOTE_EDITOR' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Note Meta Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', background: '#252A30', padding: '2px 8px', borderRadius: '6px', color: '#81B29A', fontWeight: 500 }}>
                  {activeNote?.subject || 'Engineering Notes'}
                </span>
                {activeNote?.topic && (
                  <span style={{ fontSize: '11px', color: '#8E949B' }}>
                    / {activeNote.topic}
                  </span>
                )}
              </div>

              {/* View / Edit Mode Toggle */}
              <div style={{ display: 'flex', background: '#121518', border: '1px solid #282D34', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => setEditorMode('WRITE')}
                  style={{
                    background: editorMode === 'WRITE' ? '#252A30' : 'transparent',
                    border: 'none',
                    color: editorMode === 'WRITE' ? '#EDEAE3' : '#8E949B',
                    padding: '3px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Edit3 size={11} /> Edit
                </button>
                <button
                  onClick={() => setEditorMode('PREVIEW')}
                  style={{
                    background: editorMode === 'PREVIEW' ? '#252A30' : 'transparent',
                    border: 'none',
                    color: editorMode === 'PREVIEW' ? '#EDEAE3' : '#8E949B',
                    padding: '3px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Eye size={11} /> Read
                </button>
              </div>
            </div>

            {/* Note Title Input */}
            <input
              type="text"
              value={noteTitle}
              onChange={handleTitleChange}
              placeholder="Note title..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #282D34',
                color: '#EDEAE3',
                fontSize: '15px',
                fontWeight: 600,
                padding: '6px 0 10px 0',
                outline: 'none',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
            />

            {/* Editor or Preview Area */}
            {editorMode === 'WRITE' ? (
              <textarea
                value={noteText}
                onChange={handleTextChange}
                placeholder="Write markdown notes here..."
                style={{
                  flex: 1,
                  width: '100%',
                  background: '#121518',
                  border: '1px solid #282D34',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#EDEAE3',
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: '12.5px',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  width: '100%',
                  background: '#121518',
                  border: '1px solid #282D34',
                  borderRadius: '8px',
                  padding: '16px',
                  color: '#EDEAE3',
                  fontSize: '13px',
                  lineHeight: '1.65',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  boxSizing: 'border-box',
                }}
              >
                {noteText}
              </div>
            )}

            {/* Editor Footer / Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px' }}>
                {isDirty ? (
                  <span style={{ color: '#F4A261', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F4A261' }} />
                    Unsaved edits
                  </span>
                ) : saveSuccess ? (
                  <span style={{ color: '#81B29A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} /> Saved to SQLite
                  </span>
                ) : (
                  <span style={{ color: '#686E74' }}>Backed by local SQLite</span>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                style={{
                  background: isDirty ? '#81B29A' : '#252A30',
                  color: isDirty ? '#121518' : '#686E74',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isDirty ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Save size={13} />
                {isSaving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        {/* ─── 3. ENTERTAINMENT VIEW ────────────────────────────────────── */}
        {mode === 'ENTERTAINMENT' && entertainmentInfo && (
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                background: '#1C2025',
                border: '1px solid #2B3036',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#2B2320',
                  color: '#E07A5F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                }}
              >
                <Tv size={24} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#EDEAE3' }}>
                {entertainmentInfo.displayName} Action Executed
              </div>
              <p style={{ fontSize: '12.5px', color: '#9DA3A8', margin: '8px 0 16px 0', lineHeight: 1.5 }}>
                An approved Windows desktop action was invoked to launch{' '}
                <strong style={{ color: '#EDEAE3' }}>{entertainmentInfo.displayName}</strong> in your system browser.
              </p>

              <div
                style={{
                  background: '#121518',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #252A30',
                  fontSize: '11px',
                  fontFamily: 'Geist Mono, monospace',
                  color: '#81B29A',
                  wordBreak: 'break-all',
                  marginBottom: '16px',
                }}
              >
                {entertainmentInfo.url}
              </div>

              <button
                onClick={() => onOpenExternal(entertainmentInfo.url)}
                style={{
                  background: '#E07A5F',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ExternalLink size={14} /> Re-open in Browser
              </button>
            </div>
          </div>
        )}

        {/* ─── 4. LIVING 3D OFFICE VIEW ─────────────────────────────────── */}
        {mode === 'OFFICE_3D' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
            <div style={{ fontSize: '12.5px', color: '#9DA3A8', lineHeight: 1.5 }}>
              On-demand living 3D office viewport. Unlike the previous design, this 3D canvas only runs when
              explicitly opened, conserving battery and GPU cycles during everyday engineering work.
            </div>
            <div
              id="office-3d-canvas-container"
              style={{
                flex: 1,
                width: '100%',
                background: '#101214',
                borderRadius: '8px',
                border: '1px solid #282D34',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Layers size={32} color="#F4A261" style={{ margin: '0 auto 10px auto', opacity: 0.8 }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#EDEAE3' }}>Three.js 3D Office Ready</div>
                <div style={{ fontSize: '11.5px', color: '#8E949B', marginTop: '4px' }}>
                  Isometric multi-agent workroom preserved and isolated from core shell thread.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
