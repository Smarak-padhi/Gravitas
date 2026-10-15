import React, { useState, useRef, useEffect } from 'react'
import { FolioThemeTokens, CODEX_LAYOUT } from './telemetryCodexTokens.js'
import { renderMarkdownWithMath, ChatMessage } from './FloatingPanels.js'
import { MascotId } from './MascotFamily.js'

export interface CompanionDialogueFlapProps {
  readonly isOpen: boolean
  readonly tokens: FolioThemeTokens
  readonly activeCompanion: MascotId
  readonly messages: readonly ChatMessage[]
  readonly onSelectCompanion: (companion: MascotId) => void
  readonly onSendMessage: (text: string) => void
  readonly onCloseFlap: () => void
}

export const CompanionDialogueFlap: React.FC<CompanionDialogueFlapProps> = ({
  isOpen,
  tokens,
  activeCompanion,
  messages,
  onSelectCompanion,
  onSendMessage,
  onCloseFlap,
}) => {
  const [inputText, setInputText] = useState('')
  const streamEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      streamEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  if (!isOpen) return null

  const handleSend = () => {
    if (!inputText.trim()) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside
      id="companion-dialogue-flap"
      aria-label="Companion Dialogue Flap"
      style={{
        width: `${CODEX_LAYOUT.dialogueFlapWidth}px`,
        minWidth: `${CODEX_LAYOUT.dialogueFlapWidth}px`,
        maxWidth: `${CODEX_LAYOUT.dialogueFlapWidth}px`,
        height: '100%',
        backgroundColor: tokens.bgSurface,
        borderLeft: `1px solid ${tokens.borderHairline}`,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        flexShrink: 0,
        zIndex: 40,
        boxShadow: tokens.shadowFlap,
        transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── FLAP HEADER ── */}
      <header
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${tokens.borderHairline}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: tokens.bgElevated,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Companion Switcher Buttons */}
          <button
            id="flap-select-grav"
            onClick={() => onSelectCompanion('grav')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: tokens.fontMono,
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeCompanion === 'grav' ? tokens.accentBrass : 'transparent',
              color: activeCompanion === 'grav' ? (tokens.name === 'slate' ? '#101214' : '#FFFFFF') : tokens.textSecondary,
              cursor: 'pointer',
            }}
          >
            Grav
          </button>
          <button
            id="flap-select-ada"
            onClick={() => onSelectCompanion('ada')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: tokens.fontMono,
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeCompanion === 'ada' ? tokens.accentBrass : 'transparent',
              color: activeCompanion === 'ada' ? (tokens.name === 'slate' ? '#101214' : '#FFFFFF') : tokens.textSecondary,
              cursor: 'pointer',
            }}
          >
            Ada
          </button>
        </div>

        {/* Close / Fold Button */}
        <button
          id="flap-close-btn"
          onClick={onCloseFlap}
          title="Fold Dialogue Flap"
          aria-label="Fold Dialogue Flap"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
            fontSize: '14px',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </header>

      {/* ── COMPANION CONVERSATION STREAM ── */}
      <div
        id="flap-conversation-stream"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                backgroundColor: isUser ? tokens.accentBrassLight : tokens.bgElevated,
                border: `1px solid ${isUser ? tokens.borderFocus : tokens.borderHairline}`,
                borderRadius: isUser ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                padding: '10px 12px',
                fontSize: '12.5px',
                lineHeight: 1.5,
                color: tokens.textPrimary,
                fontFamily: tokens.fontSans,
              }}
            >
              <div
                style={{
                  fontSize: '9.5px',
                  fontFamily: tokens.fontMono,
                  color: tokens.accentBrass,
                  marginBottom: '4px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {isUser ? 'You' : activeCompanion === 'grav' ? 'Grav • Brass Silhouette' : 'Ada • Knowledge Hub'}
              </div>

              <div
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownWithMath(msg.text),
                }}
              />
            </div>
          )
        })}
        <div ref={streamEndRef} />
      </div>

      {/* ── QUICK PROMPTS ── */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: `1px solid ${tokens.borderHairline}`,
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          backgroundColor: tokens.bgElevated,
        }}
      >
        <button
          onClick={() => onSendMessage('Explain Master Theorem Case 2 with an example')}
          style={{
            fontSize: '10px',
            fontFamily: tokens.fontMono,
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: tokens.bgSurface,
            color: tokens.textSecondary,
            border: `1px solid ${tokens.borderHairline}`,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Master Theorem Case 2
        </button>
        <button
          onClick={() => onSendMessage('What is the Akra-Bazzi method for unequal recurrences?')}
          style={{
            fontSize: '10px',
            fontFamily: tokens.fontMono,
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: tokens.bgSurface,
            color: tokens.textSecondary,
            border: `1px solid ${tokens.borderHairline}`,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Akra-Bazzi Formula
        </button>
      </div>

      {/* ── INPUT PROMPT BAR ── */}
      <footer
        style={{
          padding: '12px',
          borderTop: `1px solid ${tokens.borderHairline}`,
          backgroundColor: tokens.bgElevated,
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          id="flap-input-field"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${activeCompanion === 'grav' ? 'Grav' : 'Ada'}...`}
          style={{
            flex: 1,
            backgroundColor: tokens.bgSurface,
            color: tokens.textPrimary,
            border: `1px solid ${tokens.borderHairline}`,
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '12px',
            fontFamily: tokens.fontSans,
            outline: 'none',
          }}
        />
        <button
          id="flap-send-btn"
          onClick={handleSend}
          style={{
            backgroundColor: tokens.accentBrass,
            color: tokens.name === 'slate' ? '#101214' : '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '0 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: tokens.fontMono,
          }}
        >
          Send
        </button>
      </footer>
    </aside>
  )
}
