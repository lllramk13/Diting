import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import TopNav from '../Home/TopNav'
import GamePageShell from './GamePageShell'
import './GameFontProof.css'

type Manifest = {
  image: string
  tileW: number
  tileH: number
  cols?: number
  chars?: string[]
}

type Entries = Record<number, string>

const GRID_ROWS = 16

export default function GameFontProof() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const slug = gameSlug ?? 'p1'
  const game = getGameBySlug(slug)
  const base = `/games/${slug}`

  const [isAdmin, setIsAdmin] = useState(false)
  const [uid, setUid] = useState<string | null>(null)

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
      const id = data.user?.id ?? null
      const admin = id ? await getIsAdmin(id) : false
      if (alive) {
        setUid(id)
        setIsAdmin(admin)
      }
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

  // ---- load: published baseline (manifest.chars) overlaid with live edits (font_char) ----
  useEffect(() => {
    if (!manifest) return
    let alive = true
    ;(async () => {
      const seed: Entries = {}
      if (manifest.chars && manifest.chars.length) {
        manifest.chars.forEach((ch, i) => {
          if (ch !== undefined && ch !== null && ch !== '') seed[i] = ch
        })
      }
      const { data, error } = await supabase
        .from('font_char')
        .select('idx, ch')
        .eq('game_slug', slug)
      if (!alive) return
      if (error) {
        console.error('[fontproof] load font_char failed', error)
      } else if (data) {
        for (const row of data as { idx: number; ch: string }[]) {
          seed[row.idx] = row.ch
        }
      }
      setEntries(seed)
    })()
    return () => {
      alive = false
    }
  }, [manifest, slug])

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
      if (isAdmin) {
        supabase
          .from('font_char')
          .upsert(
            {
              game_slug: slug,
              idx: current,
              ch: value,
              updated_by: uid,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'game_slug,idx' },
          )
          .then(({ error }) => {
            if (error) console.error('[fontproof] save failed', error)
          })
      }
    },
    [current, isAdmin, slug, uid],
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
    reader.onload = async () => {
      let m: Manifest
      try {
        m = JSON.parse(String(reader.result)) as Manifest
      } catch {
        alert('导入失败：不是合法的 font.json')
        return
      }
      const next: Entries = {}
      const rows: { game_slug: string; idx: number; ch: string; updated_by: string | null; updated_at: string }[] = []
      const now = new Date().toISOString()
      ;(m.chars ?? []).forEach((ch, i) => {
        if (ch !== undefined && ch !== null) {
          next[i] = ch
          rows.push({ game_slug: slug, idx: i, ch, updated_by: uid, updated_at: now })
        }
      })
      setEntries(next)
      if (isAdmin && rows.length) {
        const { error } = await supabase
          .from('font_char')
          .upsert(rows, { onConflict: 'game_slug,idx' })
        if (error) alert('导入已加载到页面，但保存到服务器失败：' + error.message)
      }
    }
    reader.readAsText(file)
  }

  // ---- glyph sprite: feed per-cell values to .fp-glyph as CSS vars ----
  const glyphVars = (idx: number, scale: number): CSSProperties => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const w = imgSize ? imgSize.w : 512
    return {
      '--fp-gw': `${tileW * scale}px`,
      '--fp-gh': `${tileH * scale}px`,
      '--fp-gimg': `url(${imgUrl})`,
      '--fp-gsize': `${w * scale}px auto`,
      '--fp-gpos': `-${col * tileW * scale}px -${row * tileH * scale}px`,
    } as CSSProperties
  }

  // grid pagination
  const perPage = cols * GRID_ROWS
  const pageCount = total > 0 ? Math.ceil(total / perPage) : 0
  const pageStart = page * perPage
  const pageEnd = Math.min(total, pageStart + perPage)

  const body = (
    <div className="fp-body">
      <div className="fp-head">
        <h2>字库校对 · {slug}</h2>
        <span className="fp-sub">
          {isAdmin ? '逐格转录字模，建立字表' : '只读浏览（仅管理员可编辑）'}
        </span>
      </div>

      {loadError && <div className="fp-error">⚠ {loadError}</div>}

      {missing && (
        <div className="fp-missing">
          该游戏暂未提供字库
          <div className="fp-missing-sub">
            放入 <code>{base}/font.json</code> 与字模图后，此页会自动显示。
          </div>
        </div>
      )}

      {manifest && imgSize && (
        <>
          {/* meta + progress */}
          <div className="fp-meta">
            <span>
              图 {imgSize.w}×{imgSize.h} · tile {tileW}×{tileH} · {cols} 列 × {rows} 行
            </span>
            <span className="fp-c-good">已填 {visitedCount}</span>
            <span className="fp-c-faint">空白 {blankCount}</span>
            <span>/ 共 {total}</span>
            <div className="fp-progress">
              <div
                className="fp-progress-bar"
                style={{ '--fp-pct': `${total ? (visitedCount / total) * 100 : 0}%` } as CSSProperties}
              />
            </div>
          </div>

          {/* toolbar */}
          <div className="fp-toolbar">
            <Btn active={view === 'focus'} onClick={() => setView('focus')}>
              {isAdmin ? '专注录入' : '逐字查看'}
            </Btn>
            <Btn active={view === 'grid'} onClick={() => setView('grid')}>
              网格总览
            </Btn>
            <Btn active={invert} onClick={() => setInvert((v) => !v)}>
              反色
            </Btn>
            <div className="fp-spacer" />
            <input
              className="fp-input"
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
            />
            <Btn onClick={exportJson}>导出 font.json</Btn>
            {isAdmin && (
              <label className="fp-btn">
                导入
                <input
                  type="file"
                  accept="application/json"
                  hidden
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
            <div className="fp-focus">
              <div className="fp-glyph-box">
                <div className="fp-glyph" style={glyphVars(current, 6)} />
                {entries[current] !== undefined && (
                  <div className={`fp-recog${entries[current] === '' ? ' is-blank' : ''}`}>
                    {entries[current] === '' ? '空白' : entries[current]}
                  </div>
                )}
                <div className="fp-meta-id">
                  #{current} · 行{Math.floor(current / cols)} 列{current % cols} · 0x
                  {current.toString(16).toUpperCase()}
                </div>
              </div>

              <div className="fp-col">
                {isAdmin ? (
                  <>
                    <label className="fp-label">这个字模是什么字？</label>
                    <input
                      ref={inputRef}
                      className="fp-input fp-input--char"
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onCompositionStart={() => (composingRef.current = true)}
                      onCompositionEnd={() => (composingRef.current = false)}
                      onKeyDown={onKeyDown}
                      placeholder="输入后按 Enter 进入下一个"
                    />
                    <div className="fp-actions">
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
                    <p className="fp-hint">
                      提示：中文输入法选词的回车不会误触，确认成字后再按一次 Enter 才前进。进度自动保存到服务器，多人可协作，换设备也能续传。
                    </p>
                  </>
                ) : (
                  <>
                    <div className="fp-status">
                      {entries[current] !== undefined ? '已识别（见左侧）' : '该字模尚未识别'}
                    </div>
                    <div className="fp-actions">
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
            <div className="fp-grid-wrap">
              <div className="fp-grid-head">
                <Btn onClick={() => setPage((p) => Math.max(0, p - 1))}>←</Btn>
                <span className="fp-status">
                  第 {page + 1} / {pageCount} 页 · 下标 {pageStart}–{pageEnd - 1}
                </span>
                <Btn onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>→</Btn>
              </div>
              <div className="fp-grid" style={{ '--fp-cols': cols } as CSSProperties}>
                {Array.from({ length: pageEnd - pageStart }, (_, k) => {
                  const idx = pageStart + k
                  const val = entries[idx]
                  return (
                    <button
                      key={idx}
                      className={`fp-cell${idx === current ? ' is-current' : ''}`}
                      onClick={() => {
                        setView('focus')
                        goto(idx)
                      }}
                      title={`#${idx}`}
                    >
                      <div className="fp-glyph" style={glyphVars(idx, 1)} />
                      {val !== undefined && (
                        <span className={`fp-badge${val === '' ? ' is-blank' : ''}`}>
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

  const pageClass = `fp-page${invert ? ' is-invert' : ''}`

  if (game) {
    return (
      <div className={pageClass}>
        <GamePageShell game={game}>{body}</GamePageShell>
      </div>
    )
  }

  return (
    <div className={pageClass}>
      <TopNav />
      {body}
    </div>
  )
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
    <button className={`fp-btn${active ? ' is-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}
