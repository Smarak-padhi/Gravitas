import React, { useState, useEffect } from 'react'
import { FolioThemeTokens } from './telemetryCodexTokens.js'
import { renderMarkdownWithMath } from './FloatingPanels.js'
import {
  DEFAULT_FLASHCARDS,
  StudyFlashcard,
  exportToObsidianMarkdown,
} from './KnowledgeHubEngine.js'

export interface StudyNote {
  readonly id: string
  readonly title: string
  readonly subject: string
  readonly content: string
  readonly lastModified: string
  readonly tags: readonly string[]
}

export interface AdaStudyFolioProps {
  readonly tokens: FolioThemeTokens
  readonly activeNoteId?: string
  readonly onSaveNote: (note: { id: string; title: string; content: string; subject: string }) => Promise<void>
  readonly onReviewFlashcard?: (cardId: string, rating: 'again' | 'good' | 'easy') => void
  readonly onExportObsidian?: (markdown: string) => void
}

const DEFAULT_FOLIO_NOTES: StudyNote[] = [
  {
    id: 'note_algorithms_core',
    title: 'Algorithms: Master Theorem & Complexity Analysis',
    subject: 'Algorithms',
    lastModified: '2026-10-16 00:15',
    tags: ['algorithms', 'divide-and-conquer', 'asymptotics'],
    content: `# Divide and Conquer Analysis & Recurrence Relations

## 1. Master Theorem Standard Form
For asymptotic recurrence relations dividing work into equal subproblems:
$$T(n) = aT(n/b) + f(n)$$
where $a \\ge 1$ represents the number of subproblems and $b > 1$ is the shrinkage factor:

### Case 1: Subproblem Dominated
If $f(n) = \\mathcal{O}(n^{\\log_b a - \\epsilon})$ for some constant $\\epsilon > 0$:
$$T(n) = \\Theta(n^{\\log_b a})$$

### Case 2: Balanced Work at Each Level
If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ where $k \\ge 0$:
$$T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$$
*Canonical Example*: MergeSort has $a=2, b=2, k=0 \\implies T(n) = \\Theta(n \\log n)$.

### Case 3: Root Dominated
If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ for some constant $\\epsilon > 0$, and the regularity condition $af(n/b) \\le cf(n)$ holds for $c < 1$:
$$T(n) = \\Theta(f(n))$$

---

## 2. Akra-Bazzi Generalization
For unequal partition branches $T(x) = g(x) + \\sum_{i=1}^k a_i T(b_i x + h_i(x))$:
$$\\sum_{i=1}^k a_i b_i^p = 1 \\implies T(x) = \\Theta\\left(x^p \\left(1 + \\int_1^x \\frac{g(u)}{u^{p+1}} du\\right)\\right)$$`,
  },
  {
    id: 'note_databases_wal',
    title: 'Storage Engines: Write-Ahead Logging & B+ Trees',
    subject: 'Databases',
    lastModified: '2026-10-15 21:30',
    tags: ['databases', 'storage', 'wal', 'b-tree'],
    content: `# Storage Engines: WAL Protocol & B+ Tree Invariants

## 1. The Write-Ahead Logging (WAL) Protocol
The fundamental correctness rule of transactional durability:
> **The WAL Invariant**: No modified dirty buffer pool frame may be written to persistent non-volatile disk pages until the corresponding log sequence number (LSN) has been flushed to the append-only log.

$$\\text{LSN}_{\\text{page}} \\le \\text{LSN}_{\\text{flushed\\_log}}$$

### Key Architectural Advantages
1. **Serial Write Throughput**: Fast sequential append of transaction records rather than random page writes.
2. **Concurrent Readers**: SQLite WAL reader snapshots read directly from the main \`.db\` combined with the WAL frame index without blocking concurrent writer appends.

---

## 2. B+ Tree Height Bounds
For an index tree with minimum node fanout $\\lceil M/2 \\rceil$ holding $N$ keys:
$$\\text{Height} \\le \\left\\lceil \\log_{\\lceil M/2 \\rceil} \\left(\\frac{N+1}{2}\\right) \\right\\rceil$$
Search cost is strictly bounded by $\\mathcal{O}(\\log_M N)$ physical page transfers.`,
  },
  {
    id: 'note_os_virtual_memory',
    title: 'Operating Systems: Virtual Memory & Page Translation',
    subject: 'Operating Systems',
    lastModified: '2026-10-15 17:10',
    tags: ['os', 'virtual-memory', 'paging'],
    content: `# Virtual Memory Architecture & Clock Eviction

## 1. Address Translation
For a virtual address $VA$ under page size $P = 2^p$:
$$\\text{VPN} = \\lfloor VA / P \\rfloor = VA \\gg p$$
$$\\text{Offset} = VA \\pmod P = VA \\,\\&\\, (P - 1)$$
Physical address $PA = (\\text{PFN} \\ll p) \\mid \\text{Offset}$.

## 2. Clock (Second Chance) Algorithm
Approximates LRU using a single bit per page frame ($R \\in \\{0, 1\\}$):
1. If $R == 1$, clear $R \\leftarrow 0$ and advance the circular hand.
2. If $R == 0$, evict the page frame immediately.
**Overhead**: Only 1 bit per page frame.`,
  },
]

export const AdaStudyFolio: React.FC<AdaStudyFolioProps> = ({
  tokens,
  activeNoteId,
  onSaveNote,
  onReviewFlashcard,
  onExportObsidian,
}) => {
  const [notes, setNotes] = useState<StudyNote[]>(DEFAULT_FOLIO_NOTES)
  const [selectedNoteId, setSelectedNoteId] = useState<string>(activeNoteId || 'note_algorithms_core')
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'split'>('preview')
  const [isRailCollapsed, setIsRailCollapsed] = useState<boolean>(false)
  const [isStudyingFlashcards, setIsStudyingFlashcards] = useState<boolean>(false)
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false)

  // Current note being inspected
  const currentNote = notes.find((n) => n.id === selectedNoteId) || notes[0]
  const [editTitle, setEditTitle] = useState<string>(currentNote.title)
  const [editContent, setEditContent] = useState<string>(currentNote.content)
  const [saveStatus, setSaveStatus] = useState<string>('Saved to WAL')

  useEffect(() => {
    if (activeNoteId && notes.some((n) => n.id === activeNoteId)) {
      setSelectedNoteId(activeNoteId)
    }
  }, [activeNoteId, notes])

  useEffect(() => {
    setEditTitle(currentNote.title)
    setEditContent(currentNote.content)
    setSaveStatus('Saved to WAL')
  }, [currentNote.id])

  const handleContentChange = (newContent: string) => {
    setEditContent(newContent)
    setSaveStatus('Unsaved edits...')
  }

  const handleManualSave = async () => {
    setSaveStatus('Writing to WAL...')
    const updatedNotes = notes.map((n) =>
      n.id === currentNote.id ? { ...n, title: editTitle, content: editContent, lastModified: 'Just now' } : n
    )
    setNotes(updatedNotes)
    await onSaveNote({
      id: currentNote.id,
      title: editTitle,
      content: editContent,
      subject: currentNote.subject,
    })
    setSaveStatus('Saved to WAL')
  }

  const handleExport = () => {
    const rawMarkdown = exportToObsidianMarkdown(
      {
        id: currentNote.id,
        title: editTitle,
        subject: currentNote.subject,
        content: editContent,
      },
      ['Algorithms Review', 'WAL Durable Storage']
    )
    if (onExportObsidian) {
      onExportObsidian(rawMarkdown)
    } else {
      navigator.clipboard?.writeText(rawMarkdown)
      setSaveStatus('Obsidian Markdown Copied')
    }
  }

  // Active flashcard deck
  const activeDeck: StudyFlashcard[] = DEFAULT_FLASHCARDS[currentNote.subject] || DEFAULT_FLASHCARDS.Algorithms
  const currentCard = activeDeck[flashcardIndex] || activeDeck[0]

  const handleCardRating = (rating: 'again' | 'good' | 'easy') => {
    if (onReviewFlashcard) {
      onReviewFlashcard(currentCard.id, rating)
    }
    setIsAnswerRevealed(false)
    if (flashcardIndex + 1 < activeDeck.length) {
      setFlashcardIndex(flashcardIndex + 1)
    } else {
      setIsStudyingFlashcards(false)
      setFlashcardIndex(0)
    }
  }

  return (
    <div
      id="ada-study-folio"
      style={{
        flex: 1,
        height: '100%',
        backgroundColor: tokens.bgMain,
        color: tokens.textPrimary,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: tokens.fontSans,
      }}
    >
      {/* ── LEFT INDEX & CHAPTER RAIL (230px) ── */}
      {!isRailCollapsed && (
        <aside
          id="ada-folio-rail"
          style={{
            width: '240px',
            minWidth: '240px',
            maxWidth: '240px',
            height: '100%',
            backgroundColor: tokens.bgSurface,
            borderRight: `1px solid ${tokens.borderHairline}`,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          {/* Rail Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: `1px solid ${tokens.borderHairline}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontFamily: tokens.fontMono, color: tokens.accentBrass, fontWeight: 700 }}>
                ADA STUDY FOLIO
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: tokens.textPrimary }}>
                Curriculum Index
              </div>
            </div>
            <button
              onClick={() => setIsRailCollapsed(true)}
              title="Collapse Index Rail"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: tokens.textMuted,
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px',
              }}
            >
              ◀
            </button>
          </div>

          {/* Flashcard Study Launcher Button */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${tokens.borderHairline}` }}>
            <button
              id="ada-flashcard-deck-btn"
              onClick={() => {
                setIsStudyingFlashcards(!isStudyingFlashcards)
                setIsAnswerRevealed(false)
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: isStudyingFlashcards ? tokens.accentBrass : tokens.bgElevated,
                color: isStudyingFlashcards ? (tokens.name === 'slate' ? '#101214' : '#FFFFFF') : tokens.textPrimary,
                border: `1px solid ${tokens.borderHairline}`,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: tokens.fontMono,
              }}
            >
              <span>🗂 {isStudyingFlashcards ? 'Exit Flashcards' : 'Active Recall Deck'}</span>
              <span
                style={{
                  backgroundColor: tokens.accentTelemetryBg,
                  color: tokens.accentTelemetry,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                }}
              >
                {activeDeck.length} due
              </span>
            </button>
          </div>

          {/* Notes by Chapter */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            <div style={{ fontSize: '10px', fontFamily: tokens.fontMono, color: tokens.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>
              Persisted Manuscripts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {notes.map((note) => {
                const isSelected = note.id === currentNote.id && !isStudyingFlashcards
                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      setSelectedNoteId(note.id)
                      setIsStudyingFlashcards(false)
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? tokens.bgElevated : 'transparent',
                      border: `1px solid ${isSelected ? tokens.borderFocus : 'transparent'}`,
                      color: isSelected ? tokens.textPrimary : tokens.textSecondary,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontFamily: tokens.fontMono, color: tokens.accentBrass }}>
                        {note.subject}
                      </span>
                      <span style={{ fontSize: '9.5px', color: tokens.textMuted }}>{note.lastModified.slice(11)}</span>
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, lineHeight: 1.3 }}>
                      {note.title.replace(/^[^:]+:\s*/, '')}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      )}

      {/* ── EXPAND RAIL BUTTON (WHEN COLLAPSED) ── */}
      {isRailCollapsed && (
        <button
          onClick={() => setIsRailCollapsed(false)}
          title="Expand Curriculum Index Rail"
          style={{
            width: '24px',
            height: '100%',
            backgroundColor: tokens.bgSurface,
            borderRight: `1px solid ${tokens.borderHairline}`,
            borderLeft: 'none',
            borderTop: 'none',
            borderBottom: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            padding: 0,
          }}
        >
          ▶
        </button>
      )}

      {/* ── MAIN READING FOLIO OR FLASHCARD SURFACE ── */}
      <main
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: tokens.bgMain,
        }}
      >
        {isStudyingFlashcards ? (
          /* ── ACTIVE RECALL FLASHCARD DECK INTERFACE ── */
          <div
            id="ada-flashcard-stage"
            style={{
              flex: 1,
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '680px',
                backgroundColor: tokens.bgSurface,
                border: `1px solid ${tokens.borderHairline}`,
                borderRadius: '12px',
                padding: '32px',
                boxShadow: tokens.shadowSubtle,
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontFamily: tokens.fontMono, color: tokens.accentBrass, fontWeight: 700 }}>
                  ACTIVE RECALL • CARD {flashcardIndex + 1} OF {activeDeck.length} ({currentCard.subject})
                </span>
                <span style={{ fontSize: '11px', fontFamily: tokens.fontMono, color: tokens.textMuted }}>
                  Interval: {currentCard.intervalDays}d
                </span>
              </div>

              {/* Question with KaTeX Math Rendering */}
              <div
                style={{
                  fontSize: '17px',
                  fontFamily: tokens.fontFolio,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  color: tokens.textPrimary,
                }}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownWithMath(currentCard.question),
                }}
              />

              {/* Flip / Reveal Solution Area */}
              {isAnswerRevealed ? (
                <div
                  style={{
                    borderTop: `1px solid ${tokens.borderHairline}`,
                    paddingTop: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14.5px',
                      fontFamily: tokens.fontFolio,
                      lineHeight: 1.6,
                      color: tokens.textPrimary,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownWithMath(currentCard.solution),
                    }}
                  />

                  {/* SM-2 Spaced Repetition Buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      onClick={() => handleCardRating('again')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #E76F51',
                        backgroundColor: 'rgba(231, 111, 81, 0.12)',
                        color: '#E76F51',
                        fontFamily: tokens.fontMono,
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Again (1d)
                    </button>
                    <button
                      onClick={() => handleCardRating('good')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #56B6C2',
                        backgroundColor: 'rgba(86, 182, 194, 0.12)',
                        color: '#56B6C2',
                        fontFamily: tokens.fontMono,
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Good (3d)
                    </button>
                    <button
                      onClick={() => handleCardRating('easy')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #81B29A',
                        backgroundColor: 'rgba(129, 178, 154, 0.12)',
                        color: '#81B29A',
                        fontFamily: tokens.fontMono,
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Easy (7d)
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  id="ada-reveal-card-btn"
                  onClick={() => setIsAnswerRevealed(true)}
                  style={{
                    margin: '16px auto 0 auto',
                    padding: '10px 24px',
                    borderRadius: '6px',
                    backgroundColor: tokens.accentBrass,
                    color: tokens.name === 'slate' ? '#101214' : '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: tokens.fontSans,
                  }}
                >
                  Reveal Solution (KaTeX Math)
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── FULL-HEIGHT STUDY FOLIO READING/EDIT SURFACE ── */
          <>
            {/* Folio Control Bar */}
            <div
              style={{
                padding: '12px 28px',
                borderBottom: `1px solid ${tokens.borderHairline}`,
                backgroundColor: tokens.bgSurface,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: tokens.fontMono,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: tokens.tagBg,
                    color: tokens.tagText,
                    fontWeight: 600,
                  }}
                >
                  {currentNote.subject}
                </span>
                <span style={{ fontSize: '11px', fontFamily: tokens.fontMono, color: tokens.textMuted }}>
                  {saveStatus}
                </span>
              </div>

              {/* View Mode & Export Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: tokens.bgElevated,
                    borderRadius: '6px',
                    padding: '2px',
                    border: `1px solid ${tokens.borderHairline}`,
                  }}
                >
                  <button
                    id="ada-viewmode-preview"
                    onClick={() => setViewMode('preview')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontFamily: tokens.fontMono,
                      border: 'none',
                      backgroundColor: viewMode === 'preview' ? tokens.accentBrass : 'transparent',
                      color: viewMode === 'preview' ? (tokens.name === 'slate' ? '#101214' : '#FFFFFF') : tokens.textSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    Read
                  </button>
                  <button
                    id="ada-viewmode-edit"
                    onClick={() => setViewMode('edit')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontFamily: tokens.fontMono,
                      border: 'none',
                      backgroundColor: viewMode === 'edit' ? tokens.accentBrass : 'transparent',
                      color: viewMode === 'edit' ? (tokens.name === 'slate' ? '#101214' : '#FFFFFF') : tokens.textSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    id="ada-viewmode-split"
                    onClick={() => setViewMode('split')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontFamily: tokens.fontMono,
                      border: 'none',
                      backgroundColor: viewMode === 'split' ? tokens.accentBrass : 'transparent',
                      color: viewMode === 'split' ? (tokens.name === 'slate' ? '#101214' : '#FFFFFF') : tokens.textSecondary,
                      cursor: 'pointer',
                    }}
                  >
                    Split
                  </button>
                </div>

                <button
                  id="ada-save-wal-btn"
                  onClick={handleManualSave}
                  title="Persist changes to SQLite WAL"
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${tokens.borderHairline}`,
                    backgroundColor: tokens.bgElevated,
                    color: tokens.accentBrass,
                    fontSize: '11.5px',
                    fontFamily: tokens.fontMono,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save WAL
                </button>

                <button
                  id="ada-export-obsidian-btn"
                  onClick={handleExport}
                  title="Export Obsidian-compatible Markdown with YAML frontmatter"
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${tokens.borderHairline}`,
                    backgroundColor: tokens.bgElevated,
                    color: tokens.textSecondary,
                    fontSize: '11.5px',
                    fontFamily: tokens.fontMono,
                    cursor: 'pointer',
                  }}
                >
                  Obsidian ↗
                </button>
              </div>
            </div>

            {/* Folio Document Content Area */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                overflow: 'hidden',
              }}
            >
              {/* Editor Pane (Edit or Split) */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div
                  style={{
                    flex: 1,
                    height: '100%',
                    padding: '24px',
                    borderRight: viewMode === 'split' ? `1px solid ${tokens.borderHairline}` : 'none',
                    backgroundColor: tokens.codeBg,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value)
                      setSaveStatus('Unsaved edits...')
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      color: tokens.textPrimary,
                      fontSize: '18px',
                      fontFamily: tokens.fontFolio,
                      fontWeight: 600,
                      border: 'none',
                      borderBottom: `1px solid ${tokens.borderHairline}`,
                      paddingBottom: '8px',
                      outline: 'none',
                    }}
                  />
                  <textarea
                    id="ada-folio-editor"
                    value={editContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    style={{
                      flex: 1,
                      width: '100%',
                      backgroundColor: 'transparent',
                      color: tokens.textPrimary,
                      fontFamily: tokens.fontMono,
                      fontSize: '13px',
                      lineHeight: 1.6,
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>
              )}

              {/* Reading / Preview Pane (Preview or Split) */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div
                  id="ada-folio-reading-surface"
                  style={{
                    flex: 1,
                    height: '100%',
                    overflowY: 'auto',
                    padding: '36px 44px',
                    boxSizing: 'border-box',
                    backgroundColor: tokens.bgMain,
                  }}
                >
                  <div
                    style={{
                      maxWidth: '740px',
                      margin: '0 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    {/* Rendered Markdown with KaTeX math */}
                    <div
                      className="folio-reading-content"
                      style={{
                        fontFamily: tokens.fontFolio,
                        fontSize: '15.5px',
                        lineHeight: 1.75,
                        color: tokens.textPrimary,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownWithMath(editContent),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
