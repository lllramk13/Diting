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
  image?: string
  tileW: number
  tileH: number
  cols?: number
  chars?: string[]
}

type FontDefinition = {
  id: string
  label: string
  manifest: string
}

type FontCatalog = {
  fonts: FontDefinition[]
}

type Entries = Record<number, string>

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type FontCharRow = {
  idx: number
  ch: string
}

type FontCharUpsertRow = {
  game_slug: string
  font_id: string
  idx: number
  ch: string
  updated_by: string | null
  updated_at: string
}

const GRID_ROWS = 16
const SUPABASE_PAGE_SIZE = 1000
const UPSERT_BATCH_SIZE = 500

const DEFAULT_FONT: FontDefinition = {
  id: 'default',
  label: '默认字库',
  manifest: 'font.json',
}

function isFontCatalog(value: unknown): value is FontCatalog {
  if (!value || typeof value !== 'object' || !('fonts' in value)) return false

  const fonts = (value as { fonts?: unknown }).fonts

  return (
    Array.isArray(fonts) &&
    fonts.length > 0 &&
    fonts.every(
      (font) =>
        font !== null &&
        typeof font === 'object' &&
        typeof (font as FontDefinition).id === 'string' &&
        (font as FontDefinition).id.length > 0 &&
        typeof (font as FontDefinition).label === 'string' &&
        (font as FontDefinition).label.length > 0 &&
        typeof (font as FontDefinition).manifest === 'string' &&
        (font as FontDefinition).manifest.length > 0,
    )
  )
}

function resolveAssetUrl(manifestUrl: string, assetPath: string) {
  return new URL(assetPath, new URL(manifestUrl, window.location.origin)).toString()
}

async function loadAllFontChars(slug: string, fontId: string): Promise<FontCharRow[]> {
  let from = 0
  const all: FontCharRow[] = []

  while (true) {
    const { data, error } = await supabase
      .from('font_char')
      .select('idx, ch')
      .eq('game_slug', slug)
      .eq('font_id', fontId)
      .order('idx', { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      break
    }

    all.push(...(data as FontCharRow[]))

    if (data.length < SUPABASE_PAGE_SIZE) {
      break
    }

    from += SUPABASE_PAGE_SIZE
  }

  return all
}

async function upsertFontCharRows(rows: FontCharUpsertRow[]) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE)

    const { error } = await supabase
      .from('font_char')
      .upsert(batch, { onConflict: 'game_slug,font_id,idx' })

    if (error) {
      throw error
    }
  }
}

export default function GameFontProof() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const slug = gameSlug ?? 'p1'
  const game = getGameBySlug(slug)
  const base = `/games/${slug}`

  const [isAdmin, setIsAdmin] = useState(false)
  const [uid, setUid] = useState<string | null>(null)

  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [fonts, setFonts] = useState<FontDefinition[]>([])
  const [fontId, setFontId] = useState('')
  const [catalogBase, setCatalogBase] = useState('')
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

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const resetProof = useCallback(() => {
    setManifest(null)
    setImgUrl('')
    setImgSize(null)
    setLoadError(null)
    setMissing(false)
    setEntries({})
    setCurrent(0)
    setDraft('')
    setPage(0)
    setSaveStatus('idle')
  }, [])

  // ---- admin check (does not block viewing) ----
  useEffect(() => {
    let alive = true

    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const id = data.user?.id ?? null
      const admin = id ? await getIsAdmin() : false

      if (alive) {
        setUid(id)
        setIsAdmin(admin)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  // ---- discover available fonts (legacy games fall back to font.json) ----
  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const res = await fetch(`${base}/fonts.json`)
        let nextFonts = [DEFAULT_FONT]

        if (!res.ok && res.status !== 404) {
          throw new Error(`fonts.json ${res.status}`)
        }

        if (res.ok) {
          try {
            const catalog = (await res.json()) as unknown

            if (!isFontCatalog(catalog)) {
              throw new Error('fonts.json 格式无效或未配置任何字库')
            }

            const ids = catalog.fonts.map((font) => font.id)

            if (new Set(ids).size !== ids.length) {
              throw new Error('fonts.json 中的字库 id 不能重复')
            }

            nextFonts = catalog.fonts
          } catch (e) {
            // Vite dev server may return index.html for a missing static asset.
            if (res.headers.get('content-type')?.includes('application/json')) {
              throw e
            }
          }
        }

        if (!alive) return

        resetProof()
        setCatalogBase(base)
        setFonts(nextFonts)
        setFontId(nextFonts[0].id)
      } catch (e) {
        if (alive) {
          resetProof()
          setCatalogBase(base)
          setFonts([])
          setFontId('')
          setLoadError(String(e instanceof Error ? e.message : e))
        }
      }
    })()

    return () => {
      alive = false
    }
  }, [base, resetProof])

  // ---- load the selected font manifest + image ----
  useEffect(() => {
    if (!fontId || catalogBase !== base) return

    const selectedFont = fonts.find((font) => font.id === fontId)

    if (!selectedFont) return

    let alive = true

    ;(async () => {
      try {
        const manifestUrl = resolveAssetUrl(`${base}/`, selectedFont.manifest)
        const res = await fetch(manifestUrl)

        if (res.status === 404) {
          if (alive) setMissing(true)
          return
        }

        if (!res.ok) throw new Error(`${selectedFont.manifest} ${res.status}`)

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

        const url = resolveAssetUrl(manifestUrl, m.image || 'font_grid.png')
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
  }, [base, catalogBase, fontId, fonts])

  // ---- load: published baseline (manifest.chars) overlaid with live edits (font_char) ----
  useEffect(() => {
    if (!manifest) return

    let alive = true

    ;(async () => {
      const seed: Entries = {}

      if (manifest.chars && manifest.chars.length) {
        manifest.chars.forEach((ch, i) => {
          if (ch !== undefined && ch !== null && ch !== '') {
            seed[i] = ch
          }
        })
      }

      try {
        const rows = await loadAllFontChars(slug, fontId)

        if (!alive) return

        for (const row of rows) {
          seed[row.idx] = row.ch
        }

        console.log('[fontproof] loaded font_char rows:', rows.length)

        setEntries(seed)
        setSaveStatus('idle')
      } catch (e) {
        if (!alive) return

        console.error('[fontproof] load font_char failed', e)
        setEntries(seed)
        setSaveStatus('error')
        alert('读取服务器字库失败：' + String(e instanceof Error ? e.message : e))
      }
    })()

    return () => {
      alive = false
    }
  }, [fontId, manifest, slug])

  const tileW = manifest?.tileW ?? 16
  const tileH = manifest?.tileH ?? 16
  const cols = imgSize ? Math.floor(imgSize.w / tileW) : manifest?.cols ?? 16
  const rows = imgSize ? Math.floor(imgSize.h / tileH) : 0
  const total = cols * rows

  // keep draft in sync with current cell AND loaded server entries
  useEffect(() => {
    if (composingRef.current) return
    setDraft(entries[current] ?? '')
  }, [current, entries])

  const visitedCount = useMemo(() => Object.keys(entries).length, [entries])

  const blankCount = useMemo(
    () => Object.values(entries).filter((v) => v === '').length,
    [entries],
  )

  const commit = useCallback(
    async (value: string) => {
      // 非管理员只改本地，不写服务器
      if (!isAdmin) {
        setEntries((prev) => ({ ...prev, [current]: value }))
        return true
      }

      if (saving) return false

      const previousValue = entries[current]

      setEntries((prev) => ({ ...prev, [current]: value }))
      setSaving(true)
      setSaveStatus('saving')

      const { error } = await supabase
        .from('font_char')
        .upsert(
          {
            game_slug: slug,
            font_id: fontId,
            idx: current,
            ch: value,
            updated_by: uid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'game_slug,font_id,idx' },
        )

      setSaving(false)

      if (error) {
        console.error('[fontproof] save failed', error)
        setSaveStatus('error')

        // 回滚本地显示，避免用户以为已经保存
        setEntries((prev) => {
          const next = { ...prev }

          if (previousValue === undefined) {
            delete next[current]
          } else {
            next[current] = previousValue
          }

          return next
        })

        alert('保存失败：' + error.message)
        return false
      }

      setSaveStatus('saved')
      return true
    },
    [current, entries, fontId, isAdmin, saving, slug, uid],
  )

  const goto = useCallback(
    (idx: number) => {
      if (total <= 0) return

      const clamped = Math.max(0, Math.min(total - 1, idx))
      setCurrent(clamped)
      setPage(Math.floor(clamped / Math.max(1, cols * GRID_ROWS)))
      setSaveStatus('idle')
    },
    [total, cols],
  )

  const commitAndNext = useCallback(async () => {
    const ok = await commit(draft)
    if (!ok) return

    goto(current + 1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [commit, draft, goto, current])

  const markBlankAndNext = useCallback(async () => {
    const ok = await commit('')
    if (!ok) return

    goto(current + 1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [commit, goto, current])

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

      if (!saving) {
        void commitAndNext()
      }
    }
  }

  // ---- export / import ----
  const exportJson = () => {
    const chars: string[] = []

    for (let i = 0; i < total; i++) {
      chars.push(entries[i] ?? '')
    }

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
    a.download = `font.${slug}.${fontId}.json`
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
      const rowsToUpsert: FontCharUpsertRow[] = []

      const now = new Date().toISOString()

      ;(m.chars ?? []).forEach((ch, i) => {
        if (ch !== undefined && ch !== null) {
          next[i] = ch
          rowsToUpsert.push({
            game_slug: slug,
            font_id: fontId,
            idx: i,
            ch,
            updated_by: uid,
            updated_at: now,
          })
        }
      })

      setEntries(next)
      setDraft(next[current] ?? '')

      if (isAdmin && rowsToUpsert.length) {
        setSaving(true)
        setSaveStatus('saving')

        try {
          await upsertFontCharRows(rowsToUpsert)
          setSaveStatus('saved')
          console.log('[fontproof] imported font_char rows:', rowsToUpsert.length)
        } catch (e) {
          console.error('[fontproof] import save failed', e)
          setSaveStatus('error')
          alert('导入已加载到页面，但保存到服务器失败：' + String(e instanceof Error ? e.message : e))
        } finally {
          setSaving(false)
        }
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

  const statusText =
    saveStatus === 'saving'
      ? '保存中…'
      : saveStatus === 'saved'
        ? '已保存'
        : saveStatus === 'error'
          ? '保存失败'
          : ''

  const selectedFont = fonts.find((font) => font.id === fontId)

  const body = (
    <div className="fp-body">
      <div className="fp-head">
        <h2>字库校对 · {slug}</h2>
        <span className="fp-sub">
          {isAdmin ? '逐格转录字模，建立字表' : '只读浏览（仅管理员可编辑）'}
        </span>
      </div>

      {fonts.length > 0 && (
        <div className="fp-font-picker">
          <label htmlFor="fp-font-select">字库</label>
          <select
            id="fp-font-select"
            className="fp-select"
            value={fontId}
            disabled={saving || fonts.length === 1}
            onChange={(e) => {
              resetProof()
              setFontId(e.target.value)
            }}
          >
            {fonts.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </select>
          {selectedFont && <span className="fp-font-id">ID: {selectedFont.id}</span>}
        </div>
      )}

      {loadError && <div className="fp-error">⚠ {loadError}</div>}

      {missing && (
        <div className="fp-missing">
          该游戏暂未提供字库
          <div className="fp-missing-sub">
            请检查字库清单 <code>{selectedFont?.manifest ?? `${base}/font.json`}</code> 与字模图。
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

            {statusText && (
              <span
                className={
                  saveStatus === 'error'
                    ? 'fp-c-error'
                    : saveStatus === 'saved'
                      ? 'fp-c-good'
                      : 'fp-c-faint'
                }
              >
                {statusText}
              </span>
            )}

            <div className="fp-progress">
              <div
                className="fp-progress-bar"
                style={
                  {
                    '--fp-pct': `${total ? (visitedCount / total) * 100 : 0}%`,
                  } as CSSProperties
                }
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
              <label className={`fp-btn${saving ? ' is-disabled' : ''}`}>
                导入
                <input
                  type="file"
                  accept="application/json"
                  hidden
                  disabled={saving}
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
                      disabled={saving}
                      onChange={(e) => {
                        setDraft(e.target.value)
                        setSaveStatus('idle')
                      }}
                      onCompositionStart={() => {
                        composingRef.current = true
                      }}
                      onCompositionEnd={() => {
                        composingRef.current = false
                      }}
                      onKeyDown={onKeyDown}
                      placeholder="输入后按 Enter 进入下一个"
                    />

                    <div className="fp-actions">
                      <Btn onClick={() => goto(current - 1)} disabled={saving}>
                        ← 上一个
                      </Btn>

                      <Btn onClick={commitAndNext} disabled={saving}>
                        {saving ? '保存中…' : '保存并下一个 (Enter)'}
                      </Btn>

                      <Btn onClick={markBlankAndNext} disabled={saving}>
                        标记空白并下一个
                      </Btn>

                      <Btn onClick={nextUnfilled} disabled={saving}>
                        跳到下一个未填 →
                      </Btn>
                    </div>

                    <p className="fp-hint">
                      提示：中文输入法选词的回车不会误触，确认成字后再按一次 Enter 才前进。
                      保存完成后才会跳到下一个，避免刷新后丢字。
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
  disabled = false,
}: {
  children: ReactNode
  onClick: () => void | Promise<void>
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      className={`fp-btn${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
      onClick={() => {
        if (!disabled) void onClick()
      }}
      disabled={disabled}
    >
      {children}
    </button>
  )
}