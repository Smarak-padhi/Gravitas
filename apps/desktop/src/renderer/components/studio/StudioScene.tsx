import React from 'react'
import { motion } from 'framer-motion'
import {
  GravMascot,
  AdaMascot,
  PixelMascot,
  CipherMascot,
  ScoutMascot,
  MascotId,
  MascotState,
  MascotBubbleData,
} from './MascotFamily.js'
import { Disc3, BookOpen, Terminal, Palette, Compass, MessageSquare } from 'lucide-react'

export interface StudioSceneProps {
  activeAgent: MascotId | null
  agentStates: Record<MascotId, MascotState>
  agentBubbles: Record<MascotId, MascotBubbleData | null>
  isReducedMotion: boolean
  onSelectAgent: (id: MascotId) => void
  onOpenMusicCorner: () => void
  onOpenQuickSummon: () => void
}

export const StudioScene: React.FC<StudioSceneProps> = ({
  activeAgent,
  agentStates,
  agentBubbles,
  isReducedMotion,
  onSelectAgent,
  onOpenMusicCorner,
  onOpenQuickSummon,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#101214',
        userSelect: 'none',
      }}
    >
      {/* ── 1. ARCHITECTURAL STUDIO BACKGROUND (SVG ILLUSTRATION) ── */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1280 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <defs>
          {/* Sky Gradient through Arched Loft Windows */}
          <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B0D11" />
            <stop offset="60%" stopColor="#141A24" />
            <stop offset="100%" stopColor="#1E2838" />
          </linearGradient>

          {/* Warm Studio Wall Gradient */}
          <linearGradient id="studioWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16191D" />
            <stop offset="70%" stopColor="#14171A" />
            <stop offset="100%" stopColor="#101214" />
          </linearGradient>

          {/* Polished Walnut Timber Floor Gradient */}
          <linearGradient id="studioFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#181B1F" />
            <stop offset="40%" stopColor="#141619" />
            <stop offset="100%" stopColor="#0E1012" />
          </linearGradient>

          {/* Soft Ambient Light Cones */}
          <radialGradient id="deskLampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F4A261" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#D97736" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#101214" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="studyLampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#81B29A" stopOpacity="0.2" />
            <stop offset="60%" stopColor="#6B9080" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#101214" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="serverRackGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4A89C8" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#101214" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="designGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF7B72" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#E76F51" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#101214" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Studio Wall ── */}
        <rect x="0" y="0" width="1280" height="510" fill="url(#studioWall)" />

        {/* ── Floor Surface (Perspective Base) ── */}
        <polygon points="0,510 1280,510 1280,800 0,800" fill="url(#studioFloor)" />
        {/* Subtle Horizontal Floor Planks */}
        <line x1="0" y1="560" x2="1280" y2="560" stroke="#22262B" strokeWidth="1" />
        <line x1="0" y1="620" x2="1280" y2="620" stroke="#1D2125" strokeWidth="1" />
        <line x1="0" y1="690" x2="1280" y2="690" stroke="#181B1E" strokeWidth="1" />
        <line x1="0" y1="770" x2="1280" y2="770" stroke="#141618" strokeWidth="1" />

        {/* ── Loft Arched Windows (Night Sky with City/Stars) ── */}
        <g opacity="0.85">
          {/* Center Left Window */}
          <path
            d="M 360 80 Q 480 30 600 80 L 600 380 L 360 380 Z"
            fill="url(#nightSky)"
            stroke="#262C34"
            strokeWidth="3"
          />
          {/* Window Mullions */}
          <line x1="480" y1="55" x2="480" y2="380" stroke="#262C34" strokeWidth="2.5" />
          <line x1="360" y1="180" x2="600" y2="180" stroke="#262C34" strokeWidth="2" />
          <line x1="360" y1="280" x2="600" y2="280" stroke="#262C34" strokeWidth="2" />

          {/* Center Right Window */}
          <path
            d="M 680 80 Q 800 30 920 80 L 920 380 L 680 380 Z"
            fill="url(#nightSky)"
            stroke="#262C34"
            strokeWidth="3"
          />
          <line x1="800" y1="55" x2="800" y2="380" stroke="#262C34" strokeWidth="2.5" />
          <line x1="680" y1="180" x2="920" y2="180" stroke="#262C34" strokeWidth="2" />
          <line x1="680" y1="280" x2="920" y2="280" stroke="#262C34" strokeWidth="2" />

          {/* Distant Stars & Soft City Horizon */}
          <circle cx="430" cy="110" r="1.5" fill="#EDEAE3" opacity="0.8" />
          <circle cx="530" cy="90" r="1.2" fill="#EDEAE3" opacity="0.6" />
          <circle cx="400" cy="150" r="1" fill="#EDEAE3" opacity="0.5" />
          <circle cx="560" cy="140" r="1.5" fill="#EDEAE3" opacity="0.7" />
          <circle cx="740" cy="100" r="1.5" fill="#EDEAE3" opacity="0.8" />
          <circle cx="850" cy="120" r="1.2" fill="#EDEAE3" opacity="0.6" />
          <circle cx="880" cy="70" r="1" fill="#EDEAE3" opacity="0.5" />

          {/* Crescent Moon */}
          <path d="M 860 110 A 10 10 0 0 0 870 120 A 12 12 0 0 1 860 110 Z" fill="#FFE8A3" opacity="0.85" />

          {/* Distant Architectural Skyline Silhouette */}
          <rect x="380" y="320" width="30" height="60" fill="#0E1217" />
          <rect x="420" y="300" width="45" height="80" fill="#0A0E13" />
          <rect x="480" y="330" width="35" height="50" fill="#0E1217" />
          <rect x="530" y="310" width="40" height="70" fill="#0B0F14" />
          <rect x="700" y="310" width="45" height="70" fill="#0B0F14" />
          <rect x="760" y="295" width="38" height="85" fill="#090D11" />
          <rect x="815" y="325" width="42" height="55" fill="#0D1116" />
          <rect x="870" y="315" width="30" height="65" fill="#0B0F14" />
        </g>

        {/* ── ZONE 2: STUDY NOOK BOOKSHELF (LEFT WALL) ── */}
        <g>
          {/* Bookshelf Framework */}
          <rect x="30" y="90" width="180" height="430" rx="4" fill="#1A1E24" stroke="#2B323C" strokeWidth="2" />
          {/* Shelves */}
          <rect x="34" y="160" width="172" height="8" fill="#242B34" />
          <rect x="34" y="240" width="172" height="8" fill="#242B34" />
          <rect x="34" y="320" width="172" height="8" fill="#242B34" />
          <rect x="34" y="410" width="172" height="8" fill="#242B34" />

          {/* Shelf 1 Books (Algorithms & Computer Science) */}
          <rect x="42" y="105" width="14" height="55" fill="#D97736" rx="1.5" />
          <rect x="58" y="112" width="18" height="48" fill="#81B29A" rx="1.5" />
          <rect x="78" y="108" width="12" height="52" fill="#4A89C8" rx="1.5" />
          <rect x="92" y="118" width="16" height="42" fill="#E76F51" rx="1.5" />
          <rect x="110" y="104" width="22" height="56" fill="#F4A261" rx="1.5" />
          {/* Small Potted Succulent on Shelf 1 */}
          <rect x="156" y="136" width="18" height="24" rx="2" fill="#8A6240" />
          <circle cx="165" cy="132" r="8" fill="#6B9080" />

          {/* Shelf 2 Books (Systems & Linear Algebra) */}
          <rect x="42" y="180" width="20" height="60" fill="#3B82F6" rx="1.5" />
          <rect x="64" y="190" width="16" height="50" fill="#2E3844" rx="1.5" />
          <rect x="82" y="184" width="14" height="56" fill="#E9C46A" rx="1.5" />
          <rect x="98" y="178" width="24" height="62" fill="#4A89C8" rx="1.5" />
          <rect x="124" y="188" width="15" height="52" fill="#81B29A" rx="1.5" />
          <circle cx="168" cy="216" r="12" fill="#373D45" />

          {/* Shelf 3 (Rolled Scrolls & Reference Folders) */}
          <rect x="42" y="270" width="16" height="50" fill="#E08E58" rx="1.5" />
          <rect x="60" y="262" width="22" height="58" fill="#5A6772" rx="1.5" />
          <rect x="84" y="274" width="18" height="46" fill="#81B29A" rx="1.5" />
          <rect x="104" y="268" width="30" height="52" fill="#2A333E" rx="1.5" />

          {/* Study Lamp Ambient Glow Cone */}
          <ellipse cx="230" cy="460" rx="150" ry="100" fill="url(#studyLampGlow)" />
        </g>

        {/* ── ZONE 4: SERVER MATRIX & TERMINAL (RIGHT WALL) ── */}
        <g>
          {/* Server Rack Cabinet */}
          <rect x="1070" y="120" width="170" height="420" rx="6" fill="#14181D" stroke="#252C34" strokeWidth="2.5" />
          {/* Server Unit 1 */}
          <rect x="1080" y="140" width="150" height="36" rx="3" fill="#1C2229" stroke="#2B343F" strokeWidth="1" />
          <circle cx="1096" cy="158" r="3" fill="#81B29A" />
          <circle cx="1108" cy="158" r="3" fill="#4A89C8" />
          <line x1="1130" y1="158" x2="1210" y2="158" stroke="#323C47" strokeWidth="2" strokeDasharray="4 2" />

          {/* Server Unit 2 */}
          <rect x="1080" y="188" width="150" height="36" rx="3" fill="#1C2229" stroke="#2B343F" strokeWidth="1" />
          <circle cx="1096" cy="206" r="3" fill="#81B29A" />
          <circle cx="1108" cy="206" r="3" fill="#E9C46A" />
          <line x1="1130" y1="206" x2="1210" y2="206" stroke="#323C47" strokeWidth="2" strokeDasharray="4 2" />

          {/* Server Unit 3 (Storage Array) */}
          <rect x="1080" y="236" width="150" height="54" rx="3" fill="#181D23" stroke="#2B343F" strokeWidth="1" />
          <rect x="1092" y="248" width="20" height="30" rx="1.5" fill="#252D37" />
          <rect x="1118" y="248" width="20" height="30" rx="1.5" fill="#252D37" />
          <rect x="1144" y="248" width="20" height="30" rx="1.5" fill="#252D37" />
          <rect x="1170" y="248" width="20" height="30" rx="1.5" fill="#252D37" />
          <circle cx="1210" cy="255" r="2.5" fill="#4A89C8" />
          <circle cx="1210" cy="265" r="2.5" fill="#81B29A" />

          {/* Server Unit 4 (Telemetry Monitor) */}
          <rect x="1080" y="302" width="150" height="42" rx="3" fill="#0F1318" stroke="#2B343F" strokeWidth="1" />
          <path d="M 1095 323 L 1120 323 L 1128 313 L 1136 333 L 1144 323 L 1210 323" stroke="#4A89C8" strokeWidth="1.5" fill="none" />

          {/* Cable Conduit Bundle descending to floor */}
          <path d="M 1120 450 C 1120 540 1060 560 1020 580" stroke="#1D2228" strokeWidth="6" fill="none" />
          <path d="M 1140 450 C 1140 550 1080 570 1040 590" stroke="#2A313A" strokeWidth="4" fill="none" />

          {/* Server Glow Cone */}
          <ellipse cx="1060" cy="460" rx="160" ry="110" fill="url(#serverRackGlow)" />
        </g>

        {/* ── CENTRAL ERGONOMIC STUDIO DESK (GRAV'S WORKSTATION) ── */}
        <g>
          {/* Main Walnut Desk Surface */}
          <polygon
            points="460,520 820,520 880,630 400,630"
            fill="#232930"
            stroke="#343D48"
            strokeWidth="2.5"
          />
          {/* Desk Bevel Edge */}
          <polygon points="400,630 880,630 880,642 400,642" fill="#191E24" />

          {/* Sturdy Steel Desk Legs */}
          <rect x="420" y="642" width="14" height="110" fill="#14171A" stroke="#252A30" strokeWidth="1.5" />
          <rect x="846" y="642" width="14" height="110" fill="#14171A" stroke="#252A30" strokeWidth="1.5" />

          {/* Center Desk Ultrawide Curved Monitor */}
          <path
            d="M 520 440 Q 640 430 760 440 L 760 520 Q 640 514 520 520 Z"
            fill="#0E1114"
            stroke="#2E3640"
            strokeWidth="2"
          />
          {/* Curved Screen Display Glow (Code / Studio Interface) */}
          <path
            d="M 526 445 Q 640 436 754 445 L 754 513 Q 640 508 526 513 Z"
            fill="#14181D"
          />
          {/* Subtle Code Lines on Monitor */}
          <line x1="540" y1="460" x2="620" y2="460" stroke="#81B29A" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <line x1="550" y1="472" x2="660" y2="472" stroke="#F4A261" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <line x1="550" y1="484" x2="600" y2="484" stroke="#4A89C8" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <line x1="540" y1="496" x2="640" y2="496" stroke="#9DA3A8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

          {/* Monitor Stand Base */}
          <polygon points="620,520 660,520 670,545 610,545" fill="#1A1E24" stroke="#283039" strokeWidth="1.5" />

          {/* Mechanical Keyboard with Key Grid */}
          <polygon points="560,560 720,560 730,595 550,595" fill="#191D22" stroke="#2C343E" strokeWidth="1.5" />
          <rect x="570" y="566" width="140" height="22" rx="2" fill="#242B33" />

          {/* Desk Lamp on Left Side */}
          <path d="M 460 540 L 470 480 L 495 480" stroke="#D97736" strokeWidth="3" strokeLinecap="round" fill="none" />
          <polygon points="490,470 515,465 520,490 495,490" fill="#F4A261" />
          {/* Steaming Ceramic Coffee Mug on Right Side */}
          <rect x="790" y="565" width="20" height="24" rx="3" fill="#EDEAE3" />
          <path d="M 810 570 C 816 570 816 582 810 582" stroke="#EDEAE3" strokeWidth="2" fill="none" />
          {/* Subtle Rising Steam */}
          <path d="M 796 558 Q 798 550 795 544" stroke="#9DA3A8" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M 804 558 Q 806 548 803 540" stroke="#9DA3A8" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />

          {/* Central Desk Lamp Radial Glow */}
          <ellipse cx="640" cy="530" rx="220" ry="120" fill="url(#deskLampGlow)" />
        </g>
      </svg>

      {/* ── 2. INTERACTIVE MASCOT STATIONS & CLICKABLE ZONES ── */}

      {/* ── ZONE 1: GRAV (CENTRAL DESK & SUMMON ANCHOR) ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '49%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <GravMascot
          state={agentStates.grav}
          bubble={agentBubbles.grav}
          isSelected={activeAgent === 'grav'}
          isReducedMotion={isReducedMotion}
          onClick={() => onSelectAgent('grav')}
        />
        <button
          onClick={onOpenQuickSummon}
          className="studio-zone-btn"
          title="Talk with Grav (Alt+Space)"
          style={{
            marginTop: '6px',
            background: 'rgba(28, 32, 37, 0.85)',
            border: '1px solid rgba(244, 162, 97, 0.4)',
            borderRadius: '16px',
            padding: '4px 10px',
            fontSize: '11px',
            color: '#F4A261',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.15s ease',
          }}
        >
          <MessageSquare size={12} />
          <span>Talk with Grav</span>
        </button>
      </div>

      {/* ── ZONE 2: ADA (STUDY & KNOWLEDGE NOOK - LOWER LEFT) ── */}
      <div
        style={{
          position: 'absolute',
          left: '18%',
          top: '58%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <AdaMascot
          state={agentStates.ada}
          bubble={agentBubbles.ada}
          isSelected={activeAgent === 'ada'}
          isReducedMotion={isReducedMotion}
          onClick={() => onSelectAgent('ada')}
        />
        <div
          onClick={() => onSelectAgent('ada')}
          style={{
            marginTop: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            background: 'rgba(20, 26, 22, 0.85)',
            border: '1px solid rgba(129, 178, 154, 0.35)',
            fontSize: '10.5px',
            color: '#81B29A',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <BookOpen size={11} />
          <span>Study & Notes</span>
        </div>
      </div>

      {/* ── ZONE 3: PIXEL (DESIGN & UI BOARD - UPPER LEFT) ── */}
      <div
        style={{
          position: 'absolute',
          left: '25%',
          top: '26%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <PixelMascot
          state={agentStates.pixel}
          bubble={agentBubbles.pixel}
          isSelected={activeAgent === 'pixel'}
          isReducedMotion={isReducedMotion}
          onClick={() => onSelectAgent('pixel')}
        />
        <div
          onClick={() => onSelectAgent('pixel')}
          style={{
            marginTop: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            background: 'rgba(30, 20, 25, 0.85)',
            border: '1px solid rgba(255, 123, 114, 0.35)',
            fontSize: '10.5px',
            color: '#FF7B72',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <Palette size={11} />
          <span>Visual & UI</span>
        </div>
      </div>

      {/* ── ZONE 4: CIPHER (SERVER & TERMINAL - LOWER RIGHT) ── */}
      <div
        style={{
          position: 'absolute',
          right: '18%',
          top: '58%',
          transform: 'translate(50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <CipherMascot
          state={agentStates.cipher}
          bubble={agentBubbles.cipher}
          isSelected={activeAgent === 'cipher'}
          isReducedMotion={isReducedMotion}
          onClick={() => onSelectAgent('cipher')}
        />
        <div
          onClick={() => onSelectAgent('cipher')}
          style={{
            marginTop: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            background: 'rgba(18, 25, 34, 0.85)',
            border: '1px solid rgba(74, 137, 200, 0.35)',
            fontSize: '10.5px',
            color: '#4A89C8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <Terminal size={11} />
          <span>Backend & DB</span>
        </div>
      </div>

      {/* ── ZONE 5: SCOUT (RESEARCH & ARCHIVE - UPPER RIGHT) ── */}
      <div
        style={{
          position: 'absolute',
          right: '25%',
          top: '26%',
          transform: 'translate(50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <ScoutMascot
          state={agentStates.scout}
          bubble={agentBubbles.scout}
          isSelected={activeAgent === 'scout'}
          isReducedMotion={isReducedMotion}
          onClick={() => onSelectAgent('scout')}
        />
        <div
          onClick={() => onSelectAgent('scout')}
          style={{
            marginTop: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            background: 'rgba(30, 26, 18, 0.85)',
            border: '1px solid rgba(233, 196, 106, 0.35)',
            fontSize: '10.5px',
            color: '#E9C46A',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <Compass size={11} />
          <span>Research</span>
        </div>
      </div>

      {/* ── ZONE 6: CHILL & MUSIC CORNER (BOTTOM RIGHT) ── */}
      <div
        onClick={onOpenMusicCorner}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenMusicCorner()
          }
        }}
        aria-label="Chill Lounge and Vinyl Music Player Concept"
        style={{
          position: 'absolute',
          right: '32px',
          bottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          background: 'rgba(24, 27, 31, 0.88)',
          border: '1px solid #2B323B',
          borderRadius: '14px',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          zIndex: 15,
          transition: 'transform 0.15s ease, border-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.borderColor = '#F4A261'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.borderColor = '#2B323B'
        }}
      >
        {/* Animated Vinyl Record Graphic */}
        <motion.div
          animate={isReducedMotion ? {} : { rotate: 360 }}
          transition={isReducedMotion ? {} : { repeat: Infinity, duration: 6, ease: 'linear' }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#0F1215',
            border: '2px solid #242930',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Disc3 size={28} color="#D97736" />
          <div
            style={{
              position: 'absolute',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#F4A261',
            }}
          />
        </motion.div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#EDEAE3', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Lo-Fi Engineering Session</span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '4px',
                background: '#252A30',
                color: '#F4A261',
                fontWeight: 600,
              }}
            >
              CONCEPT
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#8E949B', marginTop: '2px' }}>
            Chill Corner • Click to inspect player
          </div>
        </div>
      </div>
    </div>
  )
}
