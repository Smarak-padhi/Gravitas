/**
 * GRAVITAS 2.0 — Telemetry Codex Design Tokens & Typography
 *
 * Implements:
 * - Permanent dark precision chassis specifications (44px spine, hairline borders)
 * - Slate mode: Deep obsidian basalt precision theme for deep technical work
 * - Vellum mode: Warm archival parchment theme for reading, study, and contemplation
 * - Precision monospace and editorial serif typography tokens
 * - Non-occluding companion dialogue flap dimensions (300px docked width)
 */

export type FolioTheme = 'slate' | 'vellum'

export interface FolioThemeTokens {
  readonly name: FolioTheme
  readonly bgMain: string
  readonly bgSurface: string
  readonly bgElevated: string
  readonly bgSpine: string
  readonly bgTelemetryBezel: string
  readonly borderHairline: string
  readonly borderMuted: string
  readonly borderFocus: string
  readonly textPrimary: string
  readonly textSecondary: string
  readonly textMuted: string
  readonly accentBrass: string
  readonly accentBrassHover: string
  readonly accentBrassLight: string
  readonly accentTelemetry: string
  readonly accentTelemetryBg: string
  readonly codeBg: string
  readonly codeBorder: string
  readonly mathDisplayBg: string
  readonly mathDisplayBorder: string
  readonly fontFolio: string
  readonly fontMono: string
  readonly fontSans: string
  readonly shadowSubtle: string
  readonly shadowFlap: string
  readonly tagBg: string
  readonly tagText: string
}

export const SLATE_TOKENS: FolioThemeTokens = {
  name: 'slate',
  bgMain: '#0D0F11',
  bgSurface: '#14181B',
  bgElevated: '#1C2227',
  bgSpine: '#0B0D0F',
  bgTelemetryBezel: '#12161A',
  borderHairline: 'rgba(255, 255, 255, 0.08)',
  borderMuted: '#242C33',
  borderFocus: '#D4A373',
  textPrimary: '#E6EDF3',
  textSecondary: '#9AA7B3',
  textMuted: '#5F6B76',
  accentBrass: '#D4A373',
  accentBrassHover: '#E8B98A',
  accentBrassLight: 'rgba(212, 163, 115, 0.12)',
  accentTelemetry: '#56B6C2',
  accentTelemetryBg: 'rgba(86, 182, 194, 0.12)',
  codeBg: '#090B0D',
  codeBorder: '#232A31',
  mathDisplayBg: '#111417',
  mathDisplayBorder: '#28323A',
  fontFolio: "'Newsreader', 'Georgia', 'Iowan Old Style', serif",
  fontMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
  fontSans: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  shadowSubtle: '0 2px 8px rgba(0, 0, 0, 0.35)',
  shadowFlap: '-4px 0 16px rgba(0, 0, 0, 0.45)',
  tagBg: 'rgba(212, 163, 115, 0.12)',
  tagText: '#E0A96D',
}

export const VELLUM_TOKENS: FolioThemeTokens = {
  name: 'vellum',
  bgMain: '#F7F4EB',
  bgSurface: '#EDE7D9',
  bgElevated: '#DFD6C3',
  bgSpine: '#0B0D0F', // Spine remains permanent dark precision chassis
  bgTelemetryBezel: '#12161A',
  borderHairline: 'rgba(0, 0, 0, 0.09)',
  borderMuted: '#D5CCA8',
  borderFocus: '#A8623B',
  textPrimary: '#2A2723',
  textSecondary: '#595147',
  textMuted: '#8A8072',
  accentBrass: '#A8623B', // Warm cinnabar / burnished copper
  accentBrassHover: '#C47749',
  accentBrassLight: 'rgba(168, 98, 59, 0.12)',
  accentTelemetry: '#2C7A7B',
  accentTelemetryBg: 'rgba(44, 122, 123, 0.12)',
  codeBg: '#E8E1CF',
  codeBorder: '#D0C6AF',
  mathDisplayBg: '#EFE9DC',
  mathDisplayBorder: '#D8CFBA',
  fontFolio: "'Newsreader', 'Georgia', 'Iowan Old Style', serif",
  fontMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
  fontSans: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  shadowSubtle: '0 2px 8px rgba(42, 39, 35, 0.08)',
  shadowFlap: '-4px 0 16px rgba(42, 39, 35, 0.12)',
  tagBg: 'rgba(168, 98, 59, 0.12)',
  tagText: '#8F4E29',
}

export const CODEX_LAYOUT = {
  spineWidth: 44, // Permanent 44px instrument spine
  dialogueFlapWidth: 300, // 300px fold-out companion dialogue flap
  telemetryBezelHeight: 74,
  headerHeight: 48,
  minWidth: 1024,
  minHeight: 640,
} as const
