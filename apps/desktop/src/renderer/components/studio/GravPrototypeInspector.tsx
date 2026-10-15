import React, { useState } from 'react'
import { FolioThemeTokens } from './telemetryCodexTokens.js'
import { MascotState } from './MascotFamily.js'

export interface GravPrototypeInspectorProps {
  readonly tokens: FolioThemeTokens
  readonly onOpenDialogueFlap: () => void
}

export const GravPrototypeInspector: React.FC<GravPrototypeInspectorProps> = ({
  tokens,
  onOpenDialogueFlap,
}) => {
  const [activeState, setActiveState] = useState<MascotState>('idle')
  const [zoomLevel, setZoomLevel] = useState<number>(1.4)

  return (
    <div
      id="grav-prototype-inspector"
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
      {/* ── INSPECTOR HEADER ── */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: tokens.fontMono,
                color: tokens.accentBrass,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Character Prototype Inspection
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: tokens.fontMono,
                padding: '1px 6px',
                borderRadius: '3px',
                backgroundColor: tokens.tagBg,
                color: tokens.tagText,
              }}
            >
              Mark-I Precision Chassis
            </span>
          </div>
          <h1
            style={{
              margin: '4px 0 0 0',
              fontSize: '20px',
              fontFamily: tokens.fontFolio,
              fontWeight: 600,
              color: tokens.textPrimary,
            }}
          >
            Grav: Brass & Basalt Silhouette Specification
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={onOpenDialogueFlap}
            style={{
              backgroundColor: tokens.accentBrass,
              color: tokens.name === 'slate' ? '#101214' : '#FFFFFF',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: tokens.fontMono,
              cursor: 'pointer',
            }}
          >
            Summon Dialogue Flap 💬
          </button>
        </div>
      </header>

      {/* ── MAIN INSPECTOR STAGE ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflowY: 'auto',
          padding: '24px 28px',
          gap: '28px',
        }}
      >
        {/* Left: High-Resolution Visual Silhouette Stage */}
        <div
          style={{
            flex: '0 0 460px',
            backgroundColor: tokens.bgSurface,
            border: `1px solid ${tokens.borderHairline}`,
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: tokens.shadowSubtle,
          }}
        >
          {/* Engineering Blueprint Grid Background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.12,
              backgroundImage:
                'linear-gradient(to right, #56B6C2 1px, transparent 1px), linear-gradient(to bottom, #56B6C2 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              borderRadius: '12px',
              pointerEvents: 'none',
            }}
          />

          {/* Silhouette Rendering Scale Container */}
          <div
            id="grav-silhouette-render"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
              margin: '30px 0',
            }}
          >
            <svg width="180" height="220" viewBox="0 0 180 220" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Gradients */}
              <defs>
                {/* Basalt Carbon Core Gradient */}
                <linearGradient id="basaltCoreGrad" x1="20" y1="20" x2="160" y2="200" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#252C33" />
                  <stop offset="45%" stopColor="#14181B" />
                  <stop offset="100%" stopColor="#0B0D0F" />
                </linearGradient>

                {/* Machine Burnished Brass Gradient */}
                <linearGradient id="burnishedBrassGrad" x1="0" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#C8963E" />
                  <stop offset="25%" stopColor="#E8C07D" />
                  <stop offset="50%" stopColor="#D4A373" />
                  <stop offset="80%" stopColor="#B37C2C" />
                  <stop offset="100%" stopColor="#7E5316" />
                </linearGradient>

                {/* Dark Visor Shadow */}
                <radialGradient id="visorApertureGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#56B6C2" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#080A0C" stopOpacity="1" />
                </radialGradient>
              </defs>

              {/* Floor Shadow */}
              <ellipse cx="90" cy="205" rx="55" ry="10" fill="#000000" fillOpacity="0.4" />

              {/* 1. Precision Floating Repulsor Ring with Calibrated Brass Bevels */}
              <g id="grav-repulsor-ring">
                <ellipse cx="90" cy="180" rx="46" ry="12" stroke="url(#burnishedBrassGrad)" strokeWidth="3" fill="#14181B" />
                <ellipse cx="90" cy="180" rx="38" ry="9" stroke="#56B6C2" strokeWidth="1.5" strokeDasharray="6 3" strokeOpacity="0.85" />
                {/* Repulsor Emitter Core */}
                <ellipse cx="90" cy="180" rx="14" ry="4" fill="#56B6C2" fillOpacity="0.75" />
              </g>

              {/* 2. Basalt Armor Shoulders & Couplers */}
              <g id="grav-shoulder-couplers">
                {/* Left Brass Gimbal */}
                <rect x="22" y="74" width="16" height="34" rx="8" fill="#14181B" stroke="url(#burnishedBrassGrad)" strokeWidth="2" />
                <circle cx="30" cy="91" r="4" fill="#D4A373" />
                <circle cx="30" cy="91" r="1.5" fill="#0B0D0F" />

                {/* Right Brass Gimbal */}
                <rect x="142" y="74" width="16" height="34" rx="8" fill="#14181B" stroke="url(#burnishedBrassGrad)" strokeWidth="2" />
                <circle cx="150" cy="91" r="4" fill="#D4A373" />
                <circle cx="150" cy="91" r="1.5" fill="#0B0D0F" />
              </g>

              {/* 3. Main Basalt Carbon Monocoque Capsule */}
              <rect
                x="38"
                y="36"
                width="104"
                height="134"
                rx="52"
                fill="url(#basaltCoreGrad)"
                stroke="url(#burnishedBrassGrad)"
                strokeWidth="2.5"
              />

              {/* Precision Chamfered Panel Insets */}
              <path
                d="M56 120 L70 145 L110 145 L124 120"
                stroke="#D4A373"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                fill="none"
              />

              {/* Machined Brass Breastplate Trim */}
              <path
                d="M58 108 C74 116, 106 116, 122 108 L118 132 C104 140, 76 140, 62 132 Z"
                fill="#1C2227"
                stroke="url(#burnishedBrassGrad)"
                strokeWidth="1.8"
              />
              <circle cx="90" cy="124" r="5" fill="#D4A373" stroke="#8F5F20" strokeWidth="1" />
              <circle cx="90" cy="124" r="2.5" fill="#56B6C2" />

              {/* 4. Optical Telemetry Visor Screen */}
              <rect
                x="48"
                y="52"
                width="84"
                height="46"
                rx="20"
                fill="#080A0C"
                stroke="url(#burnishedBrassGrad)"
                strokeWidth="1.6"
              />

              {/* Visor State Aperture & Pupil */}
              {activeState === 'attentive' ? (
                /* Focused telemetry aperture */
                <g>
                  <circle cx="72" cy="74" r="8" fill="#14181B" stroke="#D4A373" strokeWidth="1.5" />
                  <circle cx="72" cy="74" r="4.5" fill="#56B6C2" />
                  <circle cx="74" cy="72" r="1.5" fill="#FFFFFF" />

                  <circle cx="108" cy="74" r="8" fill="#14181B" stroke="#D4A373" strokeWidth="1.5" />
                  <circle cx="108" cy="74" r="4.5" fill="#56B6C2" />
                  <circle cx="110" cy="72" r="1.5" fill="#FFFFFF" />
                </g>
              ) : activeState === 'working' ? (
                /* Calculating telemetry oscillations */
                <g>
                  <circle cx="72" cy="74" r="8" fill="#14181B" stroke="#56B6C2" strokeWidth="1.5" />
                  <line x1="66" y1="74" x2="78" y2="74" stroke="#56B6C2" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="108" cy="74" r="8" fill="#14181B" stroke="#56B6C2" strokeWidth="1.5" />
                  <line x1="102" y1="74" x2="114" y2="74" stroke="#56B6C2" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              ) : activeState === 'speaking' ? (
                /* Vocal modulation waveform */
                <g>
                  <circle cx="72" cy="72" r="6" fill="#D4A373" />
                  <circle cx="108" cy="72" r="6" fill="#D4A373" />
                  <path d="M78 84 Q90 92 102 84" stroke="#56B6C2" strokeWidth="2" strokeLinecap="round" fill="none" />
                </g>
              ) : activeState === 'success' ? (
                /* Verified telemetry halos */
                <g>
                  <path d="M64 74 Q72 66 80 74" stroke="#81B29A" strokeWidth="3" strokeLinecap="round" />
                  <path d="M100 74 Q108 66 116 74" stroke="#81B29A" strokeWidth="3" strokeLinecap="round" />
                </g>
              ) : (
                /* Resting idle aperture */
                <g>
                  <circle cx="72" cy="74" r="6" fill="#D4A373">
                    <animate attributeName="opacity" values="0.85;1;0.85" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="72" cy="74" r="2.5" fill="#0B0D0F" />

                  <circle cx="108" cy="74" r="6" fill="#D4A373">
                    <animate attributeName="opacity" values="0.85;1;0.85" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="108" cy="74" r="2.5" fill="#0B0D0F" />
                </g>
              )}

              {/* 5. Precision Mast Crown Antenna */}
              <line x1="90" y1="36" x2="90" y2="20" stroke="url(#burnishedBrassGrad)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="90" cy="18" r="5" fill="#D4A373" stroke="#8F5F20" strokeWidth="1" />
              <circle cx="90" cy="18" r="2" fill="#56B6C2" />
            </svg>
          </div>

          {/* Stage Controls */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              width: '100%',
              justifyContent: 'center',
              borderTop: `1px solid ${tokens.borderHairline}`,
              paddingTop: '16px',
            }}
          >
            {(['idle', 'attentive', 'working', 'speaking', 'success'] as MascotState[]).map((st) => (
              <button
                key={st}
                onClick={() => setActiveState(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: tokens.fontMono,
                  textTransform: 'uppercase',
                  border: `1px solid ${activeState === st ? tokens.accentBrass : tokens.borderHairline}`,
                  backgroundColor: activeState === st ? tokens.tagBg : 'transparent',
                  color: activeState === st ? tokens.tagText : tokens.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Zoom Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <span style={{ fontSize: '10px', fontFamily: tokens.fontMono, color: tokens.textMuted }}>Zoom:</span>
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.2))}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${tokens.borderHairline}`,
                backgroundColor: tokens.bgElevated,
                color: tokens.textSecondary,
                cursor: 'pointer',
              }}
            >
              -
            </button>
            <span style={{ fontSize: '11px', fontFamily: tokens.fontMono, color: tokens.accentBrass }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${tokens.borderHairline}`,
                backgroundColor: tokens.bgElevated,
                color: tokens.textSecondary,
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Right: Technical Blueprint & Material Specification Breakdown */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Spec Section 1 */}
          <div
            style={{
              backgroundColor: tokens.bgSurface,
              border: `1px solid ${tokens.borderHairline}`,
              borderRadius: '8px',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '11px', fontFamily: tokens.fontMono, color: tokens.accentBrass, fontWeight: 700 }}>
              MATERIAL & SILHOUETTE BLUEPRINT
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontFamily: tokens.fontFolio, color: tokens.textPrimary }}>
              Basalt Obsidian Monocoque & Burnished Brass Trim
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: tokens.textSecondary, lineHeight: 1.6 }}>
              The Grav prototype silhouette departs deliberately from generic spherical mascot designs. It incorporates
              an elongated capsule monocoque clad in matte obsidian basalt with hairline chamfers, offset by high-tensile
              burnished brass breastplate fittings, articulated magnetic shoulder gimbals, and an active magnetic repulsor ring.
            </p>
          </div>

          {/* Spec Section 2: Technical Callouts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: tokens.bgSurface,
                border: `1px solid ${tokens.borderHairline}`,
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '10px', fontFamily: tokens.fontMono, color: '#D4A373', fontWeight: 700 }}>
                CALIBRATED RECESSED VISOR
              </div>
              <div style={{ fontSize: '12.5px', color: tokens.textPrimary, marginTop: '4px', lineHeight: 1.4 }}>
                Sub-millimeter black glass visor housing multi-state dual telemetry apertures with optical focus rings.
              </div>
            </div>

            <div
              style={{
                backgroundColor: tokens.bgSurface,
                border: `1px solid ${tokens.borderHairline}`,
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '10px', fontFamily: tokens.fontMono, color: '#56B6C2', fontWeight: 700 }}>
                MAGNETIC REPULSOR LEVITATION
              </div>
              <div style={{ fontSize: '12.5px', color: tokens.textPrimary, marginTop: '4px', lineHeight: 1.4 }}>
                Segmented brass repulsor armature with 4-phase cyan pulse ring providing stable floating clearance.
              </div>
            </div>

            <div
              style={{
                backgroundColor: tokens.bgSurface,
                border: `1px solid ${tokens.borderHairline}`,
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '10px', fontFamily: tokens.fontMono, color: '#81B29A', fontWeight: 700 }}>
                PROCESS AUTHORITY LOCK
              </div>
              <div style={{ fontSize: '12.5px', color: tokens.textPrimary, marginTop: '4px', lineHeight: 1.4 }}>
                Embedded hardware telemetry node bound to application-owned Windows ACL authorization authority.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
