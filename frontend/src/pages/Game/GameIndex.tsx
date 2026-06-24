import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { games } from '../../games/registry'
import type { GameConfig } from '../../games/types'
import TopNav from '../Home/TopNav'

const mono = "'Space Mono', monospace"
const cn = "'Noto Sans SC', sans-serif"

const statusLabels: Record<string, string> = {
  planning: '计划中',
  in_progress: '进行中',
  translated: '初翻完成 · 校对中',
  released: '已发布',
  paused: '暂停',
}

const platformNames: Record<string, string> = {
  psx: 'PlayStation',
  psp: 'PlayStation Portable',
  switch: 'Nintendo Switch',
  gba: 'Game Boy Advance',
  sfc: 'Super Famicom',
}

type Filter = { label: string; test: (g: GameConfig) => boolean }
const FILTERS: Filter[] = [
  { label: '全部', test: () => true },
  { label: 'PSX', test: g => g.platform === 'psx' },
  { label: '进行中', test: g => g.status === 'in_progress' || g.status === 'planning' },
  { label: '已完成', test: g => g.status === 'translated' || g.status === 'released' },
]

function enShort(g: GameConfig) {
  return g.title.replace(/^Persona\s*2:\s*/i, '').toUpperCase()
}

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '')
  const n = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

export default function GameIndex() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState(0)

  const byPlatform = useMemo(() => {
    const filtered = games.filter(FILTERS[filter].test)
    const groups: Record<string, GameConfig[]> = {}
    filtered.forEach(g => { (groups[g.platform] ??= []).push(g) })
    return groups
  }, [filter])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0E18', color: '#EAEEF7', fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
      <TopNav />
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '70px 40px 90px' }}>
        <div style={{ fontFamily: mono, fontSize: 13, color: 'rgba(200,220,255,0.45)', letterSpacing: 2 }}>// /game</div>
        <h1 style={{ fontFamily: cn, fontWeight: 900, fontSize: 54, margin: '14px 0 8px', letterSpacing: 2 }}>游戏汉化项目</h1>
        <p style={{ fontSize: 17, color: 'rgba(220,228,245,0.6)', maxWidth: 560, margin: '0 0 32px' }}>按平台分组的所有汉化项目。点击进入对应游戏的公告与下载页。</p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
          {FILTERS.map((f, i) => {
            const active = i === filter
            return (
              <button
                key={f.label}
                onClick={() => setFilter(i)}
                style={{
                  fontSize: 13, padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? 'rgba(232,178,58,0.15)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#E8B23A' : 'rgba(200,220,255,0.6)',
                  border: `1px solid ${active ? 'rgba(232,178,58,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {Object.entries(byPlatform).map(([platform, list]) => (
          <div key={platform} style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: mono, fontSize: 13, color: 'rgba(200,220,255,0.4)', letterSpacing: 2, marginBottom: 16 }}>
              {platform.toUpperCase()} · {(platformNames[platform] ?? platform).toUpperCase()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {list.map(g => {
                const accent = g.accent ?? '#5E8BFF'
                const accentSoft = g.accentSoft ?? accent
                const rgb = hexToRgb(accent)
                return (
                  <div
                    key={g.slug}
                    onClick={() => navigate(g.routes.announce)}
                    style={{
                      position: 'relative', overflow: 'hidden', cursor: 'pointer', padding: 28, borderRadius: 16,
                      background: `linear-gradient(135deg,rgba(${rgb},0.14),rgba(${rgb},0.03))`,
                      border: `1px solid rgba(${rgb},0.28)`,
                    }}
                  >
                    {g.ghostChar && (
                      <div style={{ position: 'absolute', right: -10, top: -34, fontFamily: cn, fontWeight: 900, fontSize: 170, color: `rgba(${rgb},0.10)`, lineHeight: 1, pointerEvents: 'none' }}>{g.ghostChar}</div>
                    )}
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontFamily: mono, fontSize: 12, color: accent, letterSpacing: 2 }}>{g.platform.toUpperCase()} · {enShort(g)}</div>
                      <div style={{ fontFamily: cn, fontWeight: 700, fontSize: 25, margin: '8px 0 4px' }}>{g.titleZh ?? g.title}</div>
                      <div style={{ fontSize: 14, color: 'rgba(200,220,255,0.55)' }}>{g.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                          <div style={{ width: `${g.progress}%`, height: '100%', borderRadius: 3, background: accent }} />
                        </div>
                        <span style={{ fontFamily: mono, fontSize: 13, color: accent }}>{g.progress}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: `rgba(${rgb},0.15)`, color: accentSoft }}>{statusLabels[g.status] ?? g.status}</span>
                          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(200,220,255,0.6)', fontFamily: mono }}>{g.announcement.version}</span>
                        </div>
                        <span style={{ fontFamily: mono, fontSize: 13, color: accent }}>进入 →</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {Object.keys(byPlatform).length === 0 && (
          <p style={{ color: 'rgba(200,220,255,0.5)' }}>没有符合条件的项目。</p>
        )}
      </section>
    </div>
  )
}
