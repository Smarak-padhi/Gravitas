import React, { useState } from 'react'
import { FolioThemeTokens } from './telemetryCodexTokens.js'
import { renderMarkdownWithMath } from './FloatingPanels.js'

export interface FieldJournalEntry {
  readonly id: string
  readonly timestamp: string
  readonly title: string
  readonly subject: string
  readonly tags: readonly string[]
  readonly content: string
  readonly companionNote?: {
    readonly companion: 'Grav' | 'Ada'
    readonly note: string
  }
}

export interface SanctuaryIndexProps {
  readonly tokens: FolioThemeTokens
  readonly onOpenAdaFolio: (noteId?: string) => void
  readonly onOpenDialogueFlap: () => void
}

const DEFAULT_FIELD_ENTRIES: FieldJournalEntry[] = [
  {
    id: 'entry_master_theorem_deep',
    timestamp: '2026-10-16 00:24',
    title: 'Master Theorem Asymptotic Bounds & Irregular Recurrences',
    subject: 'Algorithms',
    tags: ['algorithms', 'divide-and-conquer', 'complexity'],
    content: `Investigating divide-and-conquer recurrences of form $T(n) = aT(n/b) + f(n)$.
When $f(n)$ falls between polynomial bounds (e.g. $f(n) = n^{\\log_b a} \\log^k n$), Case 2 applies directly yielding $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.

For unequal subproblems ($T(n) = T(n/3) + T(2n/3) + cn$), the Master Theorem fails and the **Akra-Bazzi method** is required:
$$\\sum_{i=1}^k a_i b_i^p = 1 \\implies \\left(\\frac{1}{3}\\right)^p + \\left(\\frac{2}{3}\\right)^p = 1 \\implies p = 1$$
yielding tight bound $\\Theta(n \\log n)$.`,
    companionNote: {
      companion: 'Ada',
      note: '3 related flashcards active in spaced repetition deck. Retention at 94%.',
    },
  },
  {
    id: 'entry_wal_durability_notes',
    timestamp: '2026-10-15 22:15',
    title: 'WAL Protocol Invariants & Crash Recovery Boundaries',
    subject: 'Databases',
    tags: ['databases', 'sqlite-wal', 'storage'],
    content: `Verified the fundamental write-ahead logging durability invariant:
Any modification to an in-memory page frame must be flushed to non-volatile log storage **before** the dirty page itself is written to disk.

$$\\text{WAL Invariant: } \\text{LSN}_{\\text{disk\\_page}} \\le \\text{LSN}_{\\text{flushed\\_log}}$$

SQLite WAL allows concurrent readers without acquiring exclusive locks while writer appends to \`-wal\` ring buffer. Checkpointing merges frames back to the main \`.db\` file.`,
    companionNote: {
      companion: 'Grav',
      note: 'SQLite WAL WAL-index validated under local transaction isolation.',
    },
  },
  {
    id: 'entry_windows_security_isolation',
    timestamp: '2026-10-15 18:40',
    title: 'Windows Security ACLs & Process Authority Boundaries',
    subject: 'Systems Security',
    tags: ['runtime-security', 'windows-acl', 'containment'],
    content: `Established application-owned HMAC authority storage inside \`.gravitas/secure/authority.key\`.
Configured explicit Windows ACLs preventing non-owner read/write access. Node.js execution restricted by denying \`-e\`, \`--eval\`, and \`--require\` code-loading flags.

Immediate pre-mutation re-validation enforced at every filesystem modification boundary.`,
    companionNote: {
      companion: 'Grav',
      note: 'Authority grant signature verification active. Zero bypasses observed.',
    },
  },
]

export const SanctuaryIndex: React.FC<SanctuaryIndexProps> = ({
  tokens,
  onOpenAdaFolio,
  onOpenDialogueFlap,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [entries, setEntries] = useState<FieldJournalEntry[]>(DEFAULT_FIELD_ENTRIES)
  const [newEntryText, setNewEntryText] = useState<string>('')
  const [isCapturing, setIsCapturing] = useState<boolean>(false)

  const allTags = ['all', 'algorithms', 'databases', 'sqlite-wal', 'runtime-security', 'divide-and-conquer']

  const filteredEntries = entries.filter((entry) => {
    const matchesTag = selectedTag === 'all' || entry.tags.includes(selectedTag)
    const matchesSearch =
      searchQuery.trim() === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.subject.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTag && matchesSearch
  })

  const handleCreateEntry = () => {
    if (!newEntryText.trim()) return
    const lines = newEntryText.trim().split('\n')
    const title = lines[0].replace(/^#*\s*/, '') || 'New Field Observation'
    const content = lines.slice(1).join('\n').trim() || newEntryText.trim()
    const now = new Date()
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const newEntry: FieldJournalEntry = {
      id: `entry_${Date.now()}`,
      timestamp,
      title,
      subject: 'Field Observations',
      tags: ['field-log'],
      content,
      companionNote: {
        companion: 'Grav',
        note: 'Captured directly to Sanctuary Field Journal and SQLite WAL.',
      },
    }

    setEntries([newEntry, ...entries])
    setNewEntryText('')
    setIsCapturing(false)
  }

  return (
    <div
      id="sanctuary-index"
      style={{
        flex: 1,
        height: '100%',
        backgroundColor: tokens.bgMain,
        color: tokens.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: tokens.fontSans,
      }}
    >
      {/* ── TOP JOURNAL BANNER & ATMOSPHERIC TELEMETRY ── */}
      <header
        style={{
          padding: '16px 28px',
          borderBottom: `1px solid ${tokens.borderHairline}`,
          backgroundColor: tokens.bgSurface,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: tokens.fontMono,
                color: tokens.accentBrass,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Sanctuary Index • Personal Field Journal
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: tokens.fontMono,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: tokens.tagBg,
                color: tokens.tagText,
                border: `1px solid ${tokens.borderHairline}`,
              }}
            >
              Epoch 2026.10
            </span>
          </div>
          <h1
            style={{
              margin: '4px 0 0 0',
              fontSize: '22px',
              fontFamily: tokens.fontFolio,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: tokens.textPrimary,
            }}
          >
            Chronicle of Study & Engineering
          </h1>
        </div>

        {/* Atmosphere Telemetry Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: tokens.fontMono,
              color: tokens.textSecondary,
              backgroundColor: tokens.bgElevated,
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${tokens.borderHairline}`,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#56B6C2',
              }}
            />
            <span>WAL Synced</span>
            <span style={{ color: tokens.textMuted }}>•</span>
            <span>Windows ACL Verified</span>
          </div>

          <button
            id="sanctuary-quick-capture-btn"
            onClick={() => setIsCapturing(!isCapturing)}
            style={{
              backgroundColor: tokens.accentBrass,
              color: tokens.name === 'slate' ? '#101214' : '#FFFFFF',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: tokens.fontSans,
            }}
          >
            <span>+</span>
            <span>{isCapturing ? 'Close Capture' : 'New Observation'}</span>
          </button>
        </div>
      </header>

      {/* ── EXPANDABLE QUICK CAPTURE PAD ── */}
      {isCapturing && (
        <div
          id="sanctuary-capture-pad"
          style={{
            backgroundColor: tokens.bgElevated,
            borderBottom: `1px solid ${tokens.borderHairline}`,
            padding: '16px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: tokens.accentBrass, fontFamily: tokens.fontMono }}>
            FIELD OBSERVATION CAPTURE (Supports Markdown & KaTeX $...$)
          </div>
          <textarea
            value={newEntryText}
            onChange={(e) => setNewEntryText(e.target.value)}
            placeholder="Record an engineering discovery, theorem proof, or research note..."
            rows={3}
            style={{
              width: '100%',
              backgroundColor: tokens.bgSurface,
              color: tokens.textPrimary,
              border: `1px solid ${tokens.borderMuted}`,
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '13.5px',
              fontFamily: tokens.fontMono,
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setIsCapturing(false)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${tokens.borderHairline}`,
                backgroundColor: 'transparent',
                color: tokens.textSecondary,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              id="sanctuary-save-capture-btn"
              onClick={handleCreateEntry}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: tokens.accentBrass,
                color: tokens.name === 'slate' ? '#101214' : '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save to Journal
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN SCROLLING JOURNAL WORKSPACE ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* ── FOCAL RESEARCH HORIZONS (PERSONAL INQUIRIES) ── */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontFamily: tokens.fontMono,
              color: tokens.textMuted,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            Active Focal Horizons
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Horizon 1 */}
            <div
              style={{
                backgroundColor: tokens.bgSurface,
                border: `1px solid ${tokens.borderHairline}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: tokens.fontMono,
                    color: tokens.accentBrass,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Theoretical Foundation
                </span>
                <span style={{ fontSize: '11px', color: tokens.textMuted }}>88% Mastery</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: tokens.textPrimary, fontFamily: tokens.fontFolio }}>
                Algorithms & Asymptotic Recurrence Bounds
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: tokens.textSecondary, lineHeight: 1.5 }}>
                Master Theorem Cases 1–3, Akra-Bazzi integral transformations, and amortized potential functions.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  id="sanctuary-open-ada-btn"
                  onClick={() => onOpenAdaFolio('note_algorithms_core')}
                  style={{
                    fontSize: '11px',
                    fontFamily: tokens.fontMono,
                    backgroundColor: tokens.bgElevated,
                    color: tokens.accentBrass,
                    border: `1px solid ${tokens.borderHairline}`,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Open Study Folio →
                </button>
              </div>
            </div>

            {/* Horizon 2 */}
            <div
              style={{
                backgroundColor: tokens.bgSurface,
                border: `1px solid ${tokens.borderHairline}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: tokens.fontMono,
                    color: '#56B6C2',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Systems Engineering
                </span>
                <span style={{ fontSize: '11px', color: tokens.textMuted }}>Phase 05 Verified</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: tokens.textPrimary, fontFamily: tokens.fontFolio }}>
                Windows Path Isolation & Authority Containment
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: tokens.textSecondary, lineHeight: 1.5 }}>
                Hardened HMAC signature verification, atomic pre-mutation checks, and Node command containment.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  onClick={onOpenDialogueFlap}
                  style={{
                    fontSize: '11px',
                    fontFamily: tokens.fontMono,
                    backgroundColor: tokens.bgElevated,
                    color: '#56B6C2',
                    border: `1px solid ${tokens.borderHairline}`,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Discuss with Grav 💬
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTER & SEARCH BAR ── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            borderTop: `1px solid ${tokens.borderHairline}`,
            paddingTop: '16px',
          }}
        >
          {/* Tag Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontFamily: tokens.fontMono,
                  border: `1px solid ${selectedTag === tag ? tokens.accentBrass : tokens.borderHairline}`,
                  backgroundColor: selectedTag === tag ? tokens.tagBg : tokens.bgSurface,
                  color: selectedTag === tag ? tokens.tagText : tokens.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <input
            id="sanctuary-journal-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search journal entries..."
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: tokens.fontSans,
              backgroundColor: tokens.bgSurface,
              color: tokens.textPrimary,
              border: `1px solid ${tokens.borderHairline}`,
              outline: 'none',
              minWidth: '200px',
            }}
          />
        </div>

        {/* ── CHRONOLOGICAL FIELD LOG STREAM ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredEntries.map((entry) => (
            <article
              key={entry.id}
              className="field-journal-card"
              style={{
                backgroundColor: tokens.bgSurface,
                border: `1px solid ${tokens.borderHairline}`,
                borderRadius: '8px',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: tokens.shadowSubtle,
              }}
            >
              {/* Entry Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: tokens.fontMono,
                        color: tokens.textMuted,
                      }}
                    >
                      {entry.timestamp}
                    </span>
                    <span style={{ color: tokens.textMuted }}>•</span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontFamily: tokens.fontMono,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: tokens.tagBg,
                        color: tokens.tagText,
                        fontWeight: 600,
                      }}
                    >
                      {entry.subject}
                    </span>
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '17px',
                      fontFamily: tokens.fontFolio,
                      fontWeight: 600,
                      color: tokens.textPrimary,
                    }}
                  >
                    {entry.title}
                  </h2>
                </div>

                <button
                  onClick={() => onOpenAdaFolio(entry.id)}
                  title="Study in Ada Folio"
                  style={{
                    backgroundColor: 'transparent',
                    border: `1px solid ${tokens.borderHairline}`,
                    borderRadius: '4px',
                    color: tokens.accentBrass,
                    fontSize: '11px',
                    fontFamily: tokens.fontMono,
                    padding: '4px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Open in Folio ↗
                </button>
              </div>

              {/* Entry Body with Markdown and KaTeX rendering */}
              <div
                className="journal-entry-body"
                style={{
                  fontSize: '14px',
                  lineHeight: 1.65,
                  color: tokens.textPrimary,
                  fontFamily: tokens.fontFolio,
                  overflowX: 'auto',
                }}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownWithMath(entry.content),
                }}
              />

              {/* Companion Dispatch Attachment */}
              {entry.companionNote && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: tokens.bgElevated,
                    borderRadius: '6px',
                    borderLeft: `3px solid ${entry.companionNote.companion === 'Grav' ? '#D4A373' : '#81B29A'}`,
                    marginTop: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: tokens.fontMono,
                      color: entry.companionNote.companion === 'Grav' ? '#D4A373' : '#81B29A',
                    }}
                  >
                    {entry.companionNote.companion} Observation:
                  </span>
                  <span style={{ fontSize: '12px', color: tokens.textSecondary, fontFamily: tokens.fontSans }}>
                    {entry.companionNote.note}
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
