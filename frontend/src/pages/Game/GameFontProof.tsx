import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import TopNav from '../Home/TopNav'
import GamePageShell from './GamePageShell'

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"

const C = {
  bg: '#07111e',
  panel: 'rgba(255,255,255,0.03)',
  panelStrong: 'rgba(255,255,255,0.06)',
  border: 'rgba(200,220,255,0.12)',
  text: '#e0eaff',
  muted: 'rgba(200,220,255,0.6)',
  faint: 'rgba(200,220,255,0.35)',
  accent: '#5aa9ff',
  good: '#46d18a',
  warn: '#e8c455',
}

type Manifest = {
  image: string
  tileW: number
  tileH: number
  cols?: number
  chars?: string[]
}

type Entries = Record<number, string>

const STORAGE_PREFIX = 'fontproof:'
const GRID_ROWS = 16

export default function GameFontProof() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const slug = gameSlug ?? 'p1'
  const game = getGameBySlug(slug)
  const base = `/games/${slug}`

  const [isAdmin, setIsAdmin] = useState(false)

  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [imgUrl, setImgUrl] = useState('')
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  const [entries, setEntries] = useState<Entries>({})
  const [current, setCurrent] = useState(0)
  const [draft, setDraft] = useState('')
  const [view, setView] = useState<'focus' | 'grid'>('focus')
  const [page, setPage] = useState(0)
  const [invert, setInvert] = useState(false)
  const [jumpVal, setJumpVal] = useState('')

  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // ---- admin check (does not block viewing) ----
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      const admin = uid ? await getIsAdmin(uid) : false
      if (alive) setIsAdmin(admin)
    })()
    return () => {
      alive = false
    }
  }, [])

  // ---- load manifest + image ----
  useEffect(() => {
    let alive = true
    setManifest(null)
    setImgSize(null)
    setLoadError(null)
    setMissing(false)
    ;(async () => {
      try {
        const res = await fetch(`${base}/font.json`)
        if (res.status === 404) {
          if (alive) setMissing(true)
          return
        }
        if (!res.ok) throw new Error(`font.json ${res.status}`)
        let m: Manifest
        try {
          m = (await res.json()) as Manifest
        } catch {
          // 文件不存在时 dev server 常返回 index.html，解析失败即视为未提供字库
          if (alive) setMissing(true)
          return
        }
        if (!alive) return
        setManifest(m)
        const url = `${base}/${m.image || 'font_grid.png'}`
        setImgUrl(url)
        const img = new Image()
        img.onload = () => {
          if (alive) setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
        }
        img.onerror = () => {
          if (alive) setLoadError(`图片加载失败：${url}`)
        }
        img.src = url
      } catch (e) {
        if (alive) setLoadError(String(e instanceof Error ? e.message : e))
      }
    })()
    return () => {
      alive = false
    }
  }, [base])

  // ---- restore: admin uses local progress, everyone falls back to published chars ----
  useEffect(() => {
    if (!manifest) return
    const seed: Entries = {}
    if (manifest.chars && manifest.chars.length) {
      manifest.chars.forEach((ch, i) => {
        if (ch !== undefined && ch !== null && ch !== '') seed[i] = ch
      })
    }
    const saved = isAdmin ? localStorage.getItem(STORAGE_PREFIX + slug) : null
    if (saved) {
      try {
        setEntries(JSON.parse(saved) as Entries)
        return
      } catch {
        /* ignore corrupt cache */
      }
    }
    setEntries(seed)
  }, [manifest, slug, isAdmin])

  // ---- persist (admin only) ----
  useEffect(() => {
    if (!manifest || !isAdmin) return
    localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(entries))
  }, [entries, manifest, slug, isAdmin])

  const tileW = manifest?.tileW ?? 16
  const tileH = manifest?.tileH ?? 16
  const cols = imgSize ? Math.floor(imgSize.w / tileW) : manifest?.cols ?? 16
  const rows = imgSize ? Math.floor(imgSize.h / tileH) : 0
  const total = cols * rows

  // keep draft in sync with the current cell
  useEffect(() => {
    setDraft(entries[current] ?? '')
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  const visitedCount = useMemo(() => Object.keys(entries).length, [entries])
  const blankCount = useMemo(
    () => Object.values(entries).filter((v) => v === '').length,
    [entries],
  )

  const commit = useCallback(
    (value: string) => {
      setEntries((prev) => ({ ...prev, [current]: value }))
    },
    [current],
  )

  const goto = useCallback(
    (idx: number) => {
      if (total <= 0) return
      const clamped = Math.max(0, Math.min(total - 1, idx))
      setCurrent(clamped)
      setPage(Math.floor(clamped / Math.max(1, cols * GRID_ROWS)))
    },
    [total, cols],
  )

  const commitAndNext = useCallback(() => {
    commit(draft)
    goto(current + 1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [commit, draft, goto, current])

  const nextUnfilled = useCallback(() => {
    for (let i = current + 1; i < total; i++) {
      if (entries[i] === undefined) {
        goto(i)
        return
      }
    }
  }, [current, total, entries, goto])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (composingRef.current || e.nativeEvent.isComposing) return
      e.preventDefault()
      commitAndNext()
    }
  }

  // ---- export / import ----
  const exportJson = () => {
    const chars: string[] = []
    for (let i = 0; i < total; i++) chars.push(entries[i] ?? '')
    const out: Manifest = {
      image: manifest?.image || 'font_grid.png',
      tileW,
      tileH,
      cols,
      chars,
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `font.${slug}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const m = JSON.parse(String(reader.result)) as Manifest
        const next: Entries = {}
        ;(m.chars ?? []).forEach((ch, i) => {
          if (ch !== undefined && ch !== null) next[i] = ch
        })
        setEntries(next)
      } catch {
        alert('导入失败：不是合法的 font.json')
      }
    }
    reader.readAsText(file)
  }

  // ---- glyph sprite ----
  const glyph = (idx: number, scale: number) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const w = imgSize ? imgSize.w : 512
    return {
      width: tileW * scale,
      height: tileH * scale,
      backgroundImage: `url(${imgUrl})`,
      backgroundRepeat: 'no-repeat' as const,
      backgroundSize: `${w * scale}px auto`,
      backgroundPosition: `-${col * tileW * scale}px -${row * tileH * scale}px`,
      imageRendering: 'pixelated' as const,
      filter: invert ? 'invert(1)' : undefined,
    }
  }

  // grid pagination
  const perPage = cols * GRID_ROWS
  const pageCount = total > 0 ? Math.ceil(total / perPage) : 0
  const pageStart = page * perPage
  const pageEnd = Math.min(total, pageStart + perPage)

  const body = (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: mono, margin: 0 }}>字库校对 · {slug}</h2>
        <span style={{ color: C.faint, fontFamily: mono, fontSize: 13 }}>
          {isAdmin ? '逐格转录字模，建立字表' : '只读浏览（仅管理员可编辑）'}
        </span>
      </div>

      {loadError && (
        <div style={{ color: C.warn, fontFamily: mono, marginTop: 16 }}>⚠ {loadError}</div>
      )}

      {missing && (
        <div
          style={{
            marginTop: 40,
            padding: '40px 24px',
            textAlign: 'center',
            border: `1px dashed ${C.border}`,
            borderRadius: 8,
            color: C.faint,
            fontFamily: mono,
            fontSize: 14,
          }}
        >
          该游戏暂未提供字库
          <div style={{ fontSize: 12, marginTop: 8 }}>
            放入 <code>{base}/font.json</code> 与字模图后，此页会自动显示。
          </div>
        </div>
      )}

      {manifest && imgSize && (
        <>
          {/* meta + progress */}
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
              alignItems: 'center',
              fontFamily: mono,
              fontSize: 13,
              color: C.muted,
            }}
          >
            <span>
              图 {imgSize.w}×{imgSize.h} · tile {tileW}×{tileH} · {cols} 列 × {rows} 行
            </span>
            <span style={{ color: C.good }}>已填 {visitedCount}</span>
            <span style={{ color: C.faint }}>空白 {blankCount}</span>
            <span>/ 共 {total}</span>
            <div
              style={{
                flex: 1,
                minWidth: 160,
                height: 6,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${total ? (visitedCount / total) * 100 : 0}%`,
                  height: '100%',
                  background: C.good,
                }}
              />
            </div>
          </div>

          {/* toolbar */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn active={view === 'focus'} onClick={() => setView('focus')}>
              {isAdmin ? '专注录入' : '逐字查看'}
            </Btn>
            <Btn active={view === 'grid'} onClick={() => setView('grid')}>
              网格总览
            </Btn>
            <Btn active={invert} onClick={() => setInvert((v) => !v)}>
              反色
            </Btn>
            <div style={{ flex: 1 }} />
            <input
              value={jumpVal}
              onChange={(e) => setJumpVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const n = parseInt(jumpVal, 10)
                  if (!Number.isNaN(n)) {
                    setView('focus')
                    goto(n)
                  }
                }
              }}
              placeholder="跳到下标…"
              style={inputStyle(120)}
            />
            <Btn onClick={exportJson}>导出 font.json</Btn>
            {isAdmin && (
              <label style={{ ...btnStyle(false), cursor: 'pointer' }}>
                导入
                <input
                  type="file"
                  accept="application/json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) importJson(f)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>

          {/* FOCUS VIEW */}
          {view === 'focus' && (
            <div
              style={{
                marginTop: 24,
                display: 'flex',
                gap: 32,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  background: '#000',
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={glyph(current, 6)} />
                {entries[current] !== undefined && (
                  <div
                    style={{
                      fontFamily: cnf,
                      fontSize: 40,
                      lineHeight: 1,
                      color: entries[current] === '' ? C.faint : C.good,
                    }}
                  >
                    {entries[current] === '' ? '空白' : entries[current]}
                  </div>
                )}
                <div style={{ fontFamily: mono, fontSize: 12, color: C.faint }}>
                  #{current} · 行{Math.floor(current / cols)} 列{current % cols} · 0x
                  {current.toString(16).toUpperCase()}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 260 }}>
                {isAdmin ? (
                  <>
                    <label
                      style={{ display: 'block', color: C.muted, fontFamily: mono, fontSize: 13 }}
                    >
                      这个字模是什么字？
                    </label>
                    <input
                      ref={inputRef}
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onCompositionStart={() => (composingRef.current = true)}
                      onCompositionEnd={() => (composingRef.current = false)}
                      onKeyDown={onKeyDown}
                      placeholder="输入后按 Enter 进入下一个"
                      style={{
                        ...inputStyle(220),
                        fontSize: 28,
                        fontFamily: cnf,
                        marginTop: 8,
                        width: 220,
                      }}
                    />
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Btn onClick={() => goto(current - 1)}>← 上一个</Btn>
                      <Btn onClick={commitAndNext}>保存并下一个 (Enter)</Btn>
                      <Btn
                        onClick={() => {
                          commit('')
                          goto(current + 1)
                          requestAnimationFrame(() => inputRef.current?.focus())
                        }}
                      >
                        标记空白并下一个
                      </Btn>
                      <Btn onClick={nextUnfilled}>跳到下一个未填 →</Btn>
                    </div>
                    <p style={{ color: C.faint, fontFamily: mono, fontSize: 12, marginTop: 16 }}>
                      提示：中文输入法选词的回车不会误触，确认成字后再按一次 Enter 才前进。进度自动存在本地浏览器，可随时关页面续传。
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ color: C.muted, fontFamily: mono, fontSize: 13 }}>
                      {entries[current] !== undefined ? '已识别（见左侧）' : '该字模尚未识别'}
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Btn onClick={() => goto(current - 1)}>← 上一个</Btn>
                      <Btn onClick={() => goto(current + 1)}>下一个 →</Btn>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {view === 'grid' && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <Btn onClick={() => setPage((p) => Math.max(0, p - 1))}>←</Btn>
                <span style={{ fontFamily: mono, color: C.muted, fontSize: 13 }}>
                  第 {page + 1} / {pageCount} 页 · 下标 {pageStart}–{pageEnd - 1}
                </span>
                <Btn onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>→</Btn>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gap: 2,
                  background: C.border,
                  border: `1px solid ${C.border}`,
                }}
              >
                {Array.from({ length: pageEnd - pageStart }, (_, k) => {
                  const idx = pageStart + k
                  const val = entries[idx]
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setView('focus')
                        goto(idx)
                      }}
                      title={`#${idx}`}
                      style={{
                        position: 'relative',
                        padding: 0,
                        border: 'none',
                        background: idx === current ? 'rgba(90,169,255,0.25)' : '#000',
                        cursor: 'pointer',
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={glyph(idx, 1)} />
                      {val !== undefined && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 1,
                            fontSize: 14,
                            fontWeight: 700,
                            fontFamily: cnf,
                            color: val === '' ? C.faint : C.good,
                            background: 'rgba(0,0,0,0.7)',
                            lineHeight: 1,
                            padding: '1px 3px',
                            borderRadius: 2,
                          }}
                        >
                          {val === '' ? '空' : val}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

  if (game) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
        <GamePageShell game={game}>{body}</GamePageShell>
      </div>
    )
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <TopNav />
      {body}
    </div>
  )
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: mono,
    fontSize: 13,
    padding: '6px 12px',
    borderRadius: 6,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? 'rgba(90,169,255,0.18)' : C.panel,
    color: active ? C.accent : C.text,
    cursor: 'pointer',
  }
}

function inputStyle(width: number): React.CSSProperties {
  return {
    fontFamily: mono,
    fontSize: 14,
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${C.border}`,
    background: C.panelStrong,
    color: C.text,
    width,
    outline: 'none',
  }
}

function Btn({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button onClick={onClick} style={btnStyle(active)}>
      {children}
    </button>
  )
}
