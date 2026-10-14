import React from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Calendar,
  BookOpen,
  Layers,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Database,
  ShieldCheck,
  Cpu,
} from 'lucide-react'

export type StudioNavTab = 'CONVERSATION' | 'DUE_TODAY' | 'NOTES' | 'OFFICE_3D' | 'SETTINGS'

export interface StudioSidebarProps {
  currentTab: StudioNavTab
  onSelectTab: (tab: StudioNavTab) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  taskCount: number
  isReducedMotion: boolean
  kernelStatus: string
  kernelPid: number
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  taskCount,
  isReducedMotion,
  kernelStatus,
  kernelPid,
}) => {
  const navItems: Array<{ id: StudioNavTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'CONVERSATION', label: 'Studio Chat', icon: <MessageSquare size={16} /> },
    { id: 'DUE_TODAY', label: "What's Due", icon: <Calendar size={16} />, badge: taskCount },
    { id: 'NOTES', label: 'Algorithms & Notes', icon: <BookOpen size={16} /> },
    { id: 'OFFICE_3D', label: '3D Living Office', icon: <Layers size={16} /> },
    { id: 'SETTINGS', label: 'Studio Settings', icon: <Sliders size={16} /> },
  ]

  const sidebarWidth = isCollapsed ? 64 : 210

  return (
    <motion.nav
      animate={{ width: sidebarWidth }}
      transition={isReducedMotion ? { duration: 0.05 } : { type: 'spring', damping: 24, stiffness: 240 }}
      style={{
        height: '100%',
        background: '#121518',
        borderRight: '1px solid #23272D',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Brand & Collapse Header */}
      <div
        style={{
          padding: isCollapsed ? '16px 0' : '16px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #20242A',
        }}
      >
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#F4A261',
                boxShadow: '0 0 8px #F4A261',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#EDEAE3', letterSpacing: '0.04em' }}>
              GRAVITAS 2.0
            </span>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8E949B',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav List */}
      <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: isCollapsed ? '10px 0' : '9px 12px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                width: '100%',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#1C2025' : 'transparent',
                color: isActive ? '#F4A261' : '#9DA3A8',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <span style={{ color: isActive ? '#F4A261' : '#8E949B', display: 'flex' }}>
                {item.icon}
              </span>

              {!isCollapsed && (
                <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
              )}

              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    background: '#2B2620',
                    color: '#F4A261',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {item.badge}
                </span>
              )}

              {/* Active Indicator Bar */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: '0px',
                    top: '6px',
                    bottom: '6px',
                    width: '3px',
                    background: '#F4A261',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Footer System Status Pill */}
      <div
        style={{
          padding: isCollapsed ? '12px 4px' : '12px 14px',
          borderTop: '1px solid #20242A',
          fontSize: '11px',
          color: '#686E74',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCollapsed ? 'center' : 'flex-start',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={12} color="#81B29A" />
          {!isCollapsed && <span>SQLite Local-First</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={12} color={kernelStatus === 'READY' ? '#81B29A' : '#E07A5F'} />
          {!isCollapsed && <span>Kernel PID: {kernelPid || 'active'}</span>}
        </div>
      </div>
    </motion.nav>
  )
}
