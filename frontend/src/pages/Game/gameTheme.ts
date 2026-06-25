import type { CSSProperties } from 'react'
import type { GameConfig } from '../../games/types'

export type GameTheme = {
  // 新字段：公告页风格
  bg: string
  text: string
  textMuted: string
  textFaint: string

  card: string
  cardStrong: string
  cardBorder: string

  line: string
  lineStrong: string

  accent: string
  accentSoft: string
  accentBorder: string
  accentText: string

  warning: string
  warningSoft: string
  warningBorder: string

  danger: string
  dangerSoft: string
  dangerBorder: string

  success: string
  successSoft: string
  successBorder: string

  inputBg: string
  inputBorder: string

  buttonBg: string
  buttonText: string
  ghostBg: string
  ghostText: string

  // 旧字段：兼容 MainSets / Search / Community / Editor 现在已经写好的代码
  page: string
  bar: string
  line2: string
  label: string
  muted: string
  ink: string
  inkSoft: string
  inkBorder: string
}

export function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '').trim()

  const full =
    clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean

  const n = parseInt(full, 16)

  if (Number.isNaN(n)) {
    return '94,139,255'
  }

  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

/**
 * Inline CSS variables for the `.game-theme` wrapper (see gameTheme.css).
 * Only the per-game accent varies; everything else is constant in CSS.
 */
export function themeVars(game: GameConfig): CSSProperties {
  const accent = game.accent ?? '#5E8BFF'
  return {
    '--g-accent': accent,
    '--g-accent-rgb': hexToRgb(accent),
  } as CSSProperties
}

export function getGameTheme(game: GameConfig): GameTheme {
  const accent = game.accent ?? '#5E8BFF'
  const rgb = hexToRgb(accent)

  const bg = '#0A0E18'
  const text = '#EAEEF7'
  const textMuted = 'rgba(230,236,250,0.72)'
  const textFaint = 'rgba(200,220,255,0.5)'

  const card = 'rgba(255,255,255,0.03)'
  const cardStrong = 'rgba(255,255,255,0.05)'
  const cardBorder = 'rgba(255,255,255,0.08)'

  const line = 'rgba(255,255,255,0.08)'
  const lineStrong = 'rgba(255,255,255,0.14)'

  const accentSoft = `rgba(${rgb},0.15)`
  const accentBorder = `rgba(${rgb},0.22)`

  const warning = '#F0B84A'
  const danger = '#F0888A'
  const success = '#2D8C50'

  return {
    // 新字段
    bg,
    text,
    textMuted,
    textFaint,

    card,
    cardStrong,
    cardBorder,

    line,
    lineStrong,

    accent,
    accentSoft,
    accentBorder,
    accentText: accent,

    warning,
    warningSoft: 'rgba(255,180,60,0.06)',
    warningBorder: 'rgba(255,180,60,0.22)',

    danger,
    dangerSoft: 'rgba(248,81,73,0.05)',
    dangerBorder: 'rgba(248,81,73,0.2)',

    success,
    successSoft: 'rgba(45,140,80,0.12)',
    successBorder: 'rgba(45,140,80,0.28)',

    inputBg: 'rgba(255,255,255,0.04)',
    inputBorder: 'rgba(255,255,255,0.12)',

    buttonBg: accent,
    buttonText: bg,
    ghostBg: 'rgba(255,255,255,0.05)',
    ghostText: text,

    // 旧字段兼容层
    page: bg,
    bar: bg,
    line2: cardBorder,
    label: textFaint,
    muted: textMuted,
    ink: text,
    inkSoft: cardStrong,
    inkBorder: lineStrong,
  }
}