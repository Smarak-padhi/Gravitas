import React from 'react'
import { CODEX_LAYOUT, FolioTheme } from './telemetryCodexTokens.js'

export type SurfaceMode = 'SANCTUARY' | 'ADA_FOLIO' | 'STUDIO' | 'GRAV_PROTOTYPE'

export interface InstrumentSpineProps {
  readonly activeSurface: SurfaceMode
  readonly folioTheme: FolioTheme
  readonly isDialogueFlapOpen: boolean
  readonly isWalActive?: boolean
  readonly isIpcConnected?: boolean
  readonly onSelectSurface: (surface: SurfaceMode) => void
  readonly onToggleFolioTheme: () => void
  readonly onToggleDialogueFlap: () => void
}

export const InstrumentSpine: React.FC<InstrumentSpineProps> = ({
  activeSurface,
  folioTheme,
  isDialogueFlapOpen,
  isWalActive = true,
  isIpcConnected = true,
  onSelectSurface,
  onToggleFolioTheme,
  onToggleDialogueFlap,
}) => {
  return (
    <aside
      id="instrument-spine"
      aria-label="Precision Instrument Spine"
      style={{
        width: `${CODEX_LAYOUT.spineWidth}px`,
        minWidth: `${CODEX_LAYOUT.spineWidth}px`,
        maxWidth: `${CODEX_LAYOUT.spineWidth}px`,
        height: '100%',
        backgroundColor: '#0B0D0F',
        borderRight: '1px solid #1F2429',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        zIndex: 50,
        boxSizing: 'border-box',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* ── TOP: GRAVITAS CHASSIS EMBLEM ── */}
      <div
        title="GRAVITAS Telemetry Codex"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #1C2227 0%, #12161A 100%)',
          border: '1px solid #28323A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          cursor: 'pointer',
        }}
        onClick={() => onSelectSurface('SANCTUARY')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <polygon
            points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"
            stroke="#D4A373"
            strokeWidth="1.6"
            fill="#14181B"
          />
          <circle cx="12" cy="12" r="3" fill="#D4A373" />
        </svg>
      </div>

      {/* ── SURFACE MODE SELECTORS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
        {/* Sanctuary Index: Personal Field Journal */}
        <button
          id="spine-nav-sanctuary"
          onClick={() => onSelectSurface('SANCTUARY')}
          title="Sanctuary Index — Personal Field Journal"
          aria-label="Sanctuary Index"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: activeSurface === 'SANCTUARY' ? '1px solid #D4A373' : '1px solid transparent',
            backgroundColor: activeSurface === 'SANCTUARY' ? 'rgba(212, 163, 115, 0.16)' : 'transparent',
            color: activeSurface === 'SANCTUARY' ? '#D4A373' : '#8B949E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {/* Compass / Astrolabe Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={activeSurface === 'SANCTUARY' ? '#D4A373' : 'currentColor'} stroke="none" />
          </svg>
        </button>

        {/* Ada Study Folio */}
        <button
          id="spine-nav-ada-folio"
          onClick={() => onSelectSurface('ADA_FOLIO')}
          title="Ada Study Folio — Full-Height KaTeX Knowledge Hub"
          aria-label="Ada Study Folio"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: activeSurface === 'ADA_FOLIO' ? '1px solid #D4A373' : '1px solid transparent',
            backgroundColor: activeSurface === 'ADA_FOLIO' ? 'rgba(212, 163, 115, 0.16)' : 'transparent',
            color: activeSurface === 'ADA_FOLIO' ? '#D4A373' : '#8B949E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {/* Folio / Manuscript Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="9" y1="7" x2="15" y2="7" />
            <line x1="9" y1="11" x2="13" y2="11" />
          </svg>
        </button>

        {/* Studio Scene */}
        <button
          id="spine-nav-studio"
          onClick={() => onSelectSurface('STUDIO')}
          title="Living Studio — 2D Environment & Mascot Quarters"
          aria-label="Living Studio"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: activeSurface === 'STUDIO' ? '1px solid #D4A373' : '1px solid transparent',
            backgroundColor: activeSurface === 'STUDIO' ? 'rgba(212, 163, 115, 0.16)' : 'transparent',
            color: activeSurface === 'STUDIO' ? '#D4A373' : '#8B949E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {/* Studio Workspace Window Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </button>

        {/* Grav Brass/Basalt Prototype Inspector */}
        <button
          id="spine-nav-grav-prototype"
          onClick={() => onSelectSurface('GRAV_PROTOTYPE')}
          title="Grav Character Prototype — Brass & Basalt Precision Silhouette"
          aria-label="Grav Character Prototype"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: activeSurface === 'GRAV_PROTOTYPE' ? '1px solid #D4A373' : '1px solid transparent',
            backgroundColor: activeSurface === 'GRAV_PROTOTYPE' ? 'rgba(212, 163, 115, 0.16)' : 'transparent',
            color: activeSurface === 'GRAV_PROTOTYPE' ? '#D4A373' : '#8B949E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {/* Robot / Droid Head Silhouette Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="6" width="16" height="14" rx="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <circle cx="12" cy="2" r="1.5" fill="currentColor" />
            <circle cx="9" cy="12" r="1.5" fill="currentColor" />
            <circle cx="15" cy="12" r="1.5" fill="currentColor" />
            <path d="M9 16h6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── TELEMETRY BEZEL (COMPACT INSTRUMENT DISPLAY) ── */}
      <div
        id="compact-telemetry-bezel"
        style={{
          margin: 'auto 0 16px 0',
          width: '36px',
          padding: '6px 2px',
          backgroundColor: '#12161A',
          border: '1px solid #232A31',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
        title={`Telemetry Bezel\nWAL: ${isWalActive ? 'Active' : 'Offline'}\nIPC: ${isIpcConnected ? 'Linked' : 'Down'}\nACL: Verified Windows Authority`}
      >
        {/* Heartbeat Status Dot */}
        <div style={{ position: 'relative', width: '8px', height: '8px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: '#56B6C2',
              opacity: 0.75,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#56B6C2',
            }}
          />
        </div>

        {/* Micro Telemetry Metric */}
        <span
          style={{
            fontSize: '8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: '#56B6C2',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          WAL
        </span>
        <div
          style={{
            width: '18px',
            height: '2px',
            backgroundColor: '#28323A',
            borderRadius: '1px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '85%',
              height: '100%',
              backgroundColor: '#56B6C2',
            }}
          />
        </div>
      </div>

      {/* ── BOTTOM CONTROLS & TOGGLES ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
        {/* Slate / Vellum Folio Theme Toggle */}
        <button
          id="spine-toggle-folio-theme"
          onClick={onToggleFolioTheme}
          title={`Switch Theme (Current: ${folioTheme.toUpperCase()})`}
          aria-label={`Switch Theme from ${folioTheme}`}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #28323A',
            backgroundColor: folioTheme === 'slate' ? '#14181B' : '#EFE9DC',
            color: folioTheme === 'slate' ? '#D4A373' : '#8F4E29',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {folioTheme === 'slate' ? (
            /* Obsidian / Moon icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            /* Vellum / Sun-Parchment icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            </svg>
          )}
        </button>

        {/* 300px Companion Dialogue Flap Toggle */}
        <button
          id="spine-toggle-dialogue-flap"
          onClick={onToggleDialogueFlap}
          title={isDialogueFlapOpen ? 'Fold Companion Dialogue Flap' : 'Open 300px Companion Dialogue Flap'}
          aria-label="Toggle Companion Dialogue Flap"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: isDialogueFlapOpen ? '1px solid #D4A373' : '1px solid #28323A',
            backgroundColor: isDialogueFlapOpen ? 'rgba(212, 163, 115, 0.18)' : '#14181B',
            color: isDialogueFlapOpen ? '#D4A373' : '#8B949E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {/* Chat / Dialogue Flap Icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Locked Security Authority Status */}
        <div
          title="Windows ACL Protected Authority Key Verified"
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#81B29A',
            marginTop: '4px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>
    </aside>
  )
}
