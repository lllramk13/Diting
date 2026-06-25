import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { games } from '../../games/registry'
import type { GameConfig } from '../../games/types'
import TopNav from '../Home/TopNav'
import './GameIndex.css'

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
    <div className="game-index">
      <TopNav />
      <section className="gi-section">
        <div className="gi-eyebrow">// /game</div>
        <h1 className="gi-h1">游戏汉化项目</h1>
        <p className="gi-intro">按平台分组的所有汉化项目。点击进入对应游戏的公告与下载页。</p>

        <div className="gi-filters">
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              className={`gi-filter${i === filter ? ' is-active' : ''}`}
              onClick={() => setFilter(i)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {Object.entries(byPlatform).map(([platform, list]) => (
          <div key={platform} className="gi-group">
            <div className="gi-group-label">
              {platform.toUpperCase()} · {(platformNames[platform] ?? platform).toUpperCase()}
            </div>
            <div className="gi-cards">
              {list.map(g => {
                const accent = g.accent ?? '#5E8BFF'
                const accentSoft = g.accentSoft ?? accent
                const cardVars = {
                  '--gi-accent': accent,
                  '--gi-accent-soft': accentSoft,
                  '--gi-rgb': hexToRgb(accent),
                } as CSSProperties
                return (
                  <div
                    key={g.slug}
                    className="gi-card"
                    style={cardVars}
                    onClick={() => navigate(g.routes.announce)}
                  >
                    {g.ghostChar && <div className="gi-ghost">{g.ghostChar}</div>}
                    <div className="gi-card-body">
                      <div className="gi-platform">
                        {g.platform.toUpperCase()} · {enShort(g)}
                      </div>
                      <div className="gi-title">{g.titleZh ?? g.title}</div>
                      <div className="gi-subtitle">{g.title}</div>
                      <div className="gi-progress-row">
                        <div className="gi-progress">
                          <div
                            className="gi-progress-bar"
                            style={{ '--gi-pct': `${g.progress}%` } as CSSProperties}
                          />
                        </div>
                        <span className="gi-percent">{g.progress}%</span>
                      </div>
                      <div className="gi-meta-row">
                        <div className="gi-tags">
                          <span className="gi-tag--status">
                            {statusLabels[g.status] ?? g.status}
                          </span>
                          <span className="gi-tag--ver">{g.announcement.version}</span>
                        </div>
                        <span className="gi-enter">进入 →</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {Object.keys(byPlatform).length === 0 && (
          <p className="gi-empty">没有符合条件的项目。</p>
        )}
      </section>
    </div>
  )
}
