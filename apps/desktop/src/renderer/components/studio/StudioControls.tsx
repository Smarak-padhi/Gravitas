import React from 'react'
import {
  Layers,
  Disc3,
  Mic,
  MicOff,
  Sun,
  Moon,
  MessageSquare,
  BookOpen,
  CheckSquare,
  Sparkles,
} from 'lucide-react'
import { MascotId } from './MascotFamily.js'

export interface StudioHeaderProps {
  theme: 'dark' | 'light'
  isMicMuted: boolean
  onToggleTheme: () => void
  onToggleMicMute: () => void
  onOpen3DOffice: () => void
  onOpenMusicCorner: () => void
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  theme,
  isMicMuted,
  onToggleTheme,
  onToggleMicMute,
  onOpen3DOffice,
  onOpenMusicCorner,
}) => {
  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '48px',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(16, 18, 20, 0.75)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #1E2328',
        zIndex: 20,
      }}
    >
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: '#F4A261',
            boxShadow: '0 0 10px #F4A261',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 650, letterSpacing: '0.04em', color: '#EDEAE3' }}>
            GRAVITAS 2.0
          </span>
          <span style={{ fontSize: '11px', color: '#8E949B' }}>Living Studio</span>
        </div>
      </div>

      {/* Atmospheric Calm Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#7E858E' }}>
        <Sparkles size={12} color="#81B29A" />
        <span>Private Engineering Workspace • Single-Owner Local-First</span>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* On-demand 3D Office Button */}
        <button
          onClick={onOpen3DOffice}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: '#181C20',
            border: '1px solid #2B333C',
            color: '#EDEAE3',
            fontSize: '11.5px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          title="Open optional on-demand 3D multi-room office viewport"
        >
          <Layers size={13} color="#F4A261" />
          <span>3D Office</span>
        </button>

        {/* Music Lounge Concept Button */}
        <button
          onClick={onOpenMusicCorner}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: '#181C20',
            border: '1px solid #2B333C',
            color: '#EDEAE3',
            fontSize: '11.5px',
            cursor: 'pointer',
          }}
          title="Open Chill Lounge and Music player concept"
        >
          <Disc3 size={13} color="#D97736" />
          <span>Music Concept</span>
        </button>

        {/* Microphone Mute Toggle */}
        <button
          onClick={onToggleMicMute}
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '7px',
            background: isMicMuted ? '#251E1A' : '#181C20',
            border: `1px solid ${isMicMuted ? '#D97736' : '#2B333C'}`,
            color: isMicMuted ? '#F4A261' : '#9DA3A8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isMicMuted ? 'Microphone Muted (Privacy Safe)' : 'Microphone Active (PTT Ready)'}
        >
          {isMicMuted ? <MicOff size={13} /> : <Mic size={13} />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '7px',
            background: '#181C20',
            border: '1px solid #2B333C',
            color: '#9DA3A8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Toggle Studio Theme"
        >
          {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
        </button>
      </div>
    </header>
  )
}

export interface StudioSummonBarProps {
  onOpenGravChat: () => void
  onOpenAdaNotes: () => void
  onOpenCipherTasks: () => void
  onVoiceDictation: () => void
  isListening: boolean
}

export const StudioSummonBar: React.FC<StudioSummonBarProps> = ({
  onOpenGravChat,
  onOpenAdaNotes,
  onOpenCipherTasks,
  onVoiceDictation,
  isListening,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Primary Floating Summon Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 14px',
          borderRadius: '24px',
          background: 'rgba(22, 26, 31, 0.92)',
          border: '1px solid #333C47',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 16px rgba(244, 162, 97, 0.1)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={onOpenGravChat}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#EDEAE3',
            fontSize: '12.5px',
            fontWeight: 550,
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            cursor: 'pointer',
            padding: '4px 6px',
          }}
        >
          <MessageSquare size={14} color="#F4A261" />
          <span>Summon Grav</span>
          <kbd
            style={{
              fontSize: '10px',
              padding: '2px 5px',
              borderRadius: '4px',
              background: '#15191D',
              border: '1px solid #2B333C',
              color: '#8E949B',
              fontFamily: 'Geist Mono, monospace',
            }}
          >
            Alt+Space
          </kbd>
        </button>

        <div style={{ width: '1px', height: '18px', background: '#2D353F' }} />

        {/* Quick Dictate */}
        <button
          onClick={onVoiceDictation}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: isListening ? '#E76F51' : '#2A313A',
            border: 'none',
            color: isListening ? '#FFF' : '#EDEAE3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Push to talk (Offline STT)"
        >
          <Mic size={13} />
        </button>

        <div style={{ width: '1px', height: '18px', background: '#2D353F' }} />

        {/* Fast Action Shortcuts */}
        <button
          onClick={onOpenAdaNotes}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#81B29A',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
          title="Open Ada's Course Notes"
        >
          <BookOpen size={12} />
          <span>Notes</span>
        </button>

        <button
          onClick={onOpenCipherTasks}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#4A89C8',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
          title="Open Cipher's Tasks & Agenda"
        >
          <CheckSquare size={12} />
          <span>Agenda</span>
        </button>
      </div>
    </div>
  )
}
