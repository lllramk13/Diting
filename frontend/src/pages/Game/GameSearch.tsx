import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { getGameTheme, type GameTheme } from './gameTheme'

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

type SearchRow = {
  id: string
  jp?: string
  zh?: string
  speaker?: string
  context?: string
  srcs?: string[]
  [key: string]: unknown
}

function formatControlNewlines(s: string) {
  return s.replace(/\\n/g, '\n')
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

function sourceFileFromId(id: string) {
  const parts = id.split(':')

  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }

  return ''
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tokenizeText(
  text: string,
  query: string,
  theme: GameTheme,
  shouldHighlight: boolean,
): ReactNode[] {
  const q = query.trim()
  const source = formatControlNewlines(text)

  const codeStyle: CSSProperties = {
    display: 'inline-block',
    verticalAlign: 'baseline',
    lineHeight: 1.3,
    color: theme.accent,
    background: theme.accentSoft,
    border: `1px solid ${theme.accentBorder}`,
    padding: '0 4px',
    margin: '0 1px',
    borderRadius: 5,
    fontFamily: mono,
    fontSize: '0.78em',
  }

  const hitStyle: CSSProperties = {
    background: theme.accentSoft,
    color: theme.accent,
    borderRadius: 3,
    padding: '0 2px',
    fontWeight: 700,
  }

  const codeRe = /(<[^>]+>)/g
  const segments: { text: string; code: boolean }[] = []

  let last = 0
  let match: RegExpExecArray | null

  while ((match = codeRe.exec(source)) !== null) {
    if (match.index > last) {
      segments.push({ text: source.slice(last, match.index), code: false })
    }

    segments.push({ text: match[0], code: true })
    last = codeRe.lastIndex
  }

  if (last < source.length) {
    segments.push({ text: source.slice(last), code: false })
  }

  const nodes: ReactNode[] = []

  for (const seg of segments) {
    if (seg.code) {
      nodes.push(
        <span key={nodes.length} style={codeStyle}>
          {seg.text}
        </span>,
      )
      continue
    }

    if (!q || !shouldHighlight) {
      nodes.push(seg.text)
      continue
    }

    const re = new RegExp(`(${escapeRegExp(q)})`, 'ig')
    const parts = seg.text.split(re)

    for (const part of parts) {
      if (!part) continue

      if (part.toLowerCase() === q.toLowerCase()) {
        nodes.push(
          <span key={nodes.length} style={hitStyle}>
            {part}
          </span>,
        )
      } else {
        nodes.push(part)
      }
    }
  }

  return nodes
}

function GameSearch() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const game = getGameBySlug(gameSlug ?? '')

  const [rows, setRows] = useState<SearchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [mode, setMode] = useState<'all' | 'jp' | 'zh' | 'id'>('all')
  const [onlyTranslated, setOnlyTranslated] = useState(false)

  useEffect(() => {
    const currentGame = getGameBySlug(gameSlug ?? '')

    if (!currentGame) {
      setLoading(false)
      return
    }

    async function fetchJson(url: string): Promise<unknown | null> {
      const res = await fetch(url)
      const text = await res.text()
      if (!res.ok || text.trim().startsWith('<')) return null
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }

    async function load(activeGame: ActiveGame) {
      setLoading(true)

      // the search index may be split into parts (Cloudflare Pages caps files at 25 MiB);
      // merged_index.json lists them. Fall back to a single merged_jp_zh.json.
      const manifest = await fetchJson(`${activeGame.dataPath}/merged_index.json`)
      const parts = Array.isArray(manifest)
        ? (manifest as string[])
        : ['merged_jp_zh.json']

      const all: SearchRow[] = []
      for (const part of parts) {
        const data = await fetchJson(`${activeGame.dataPath}/${part}`)
        if (Array.isArray(data)) {
          all.push(...(data as SearchRow[]))
        } else if (data && Array.isArray((data as { entries?: unknown }).entries)) {
          all.push(...((data as { entries: SearchRow[] }).entries))
        }
      }

      if (all.length === 0) {
        alert(`读取搜索数据失败：${activeGame.dataPath}/merged_jp_zh.json`)
      }

      setRows(all)
      setLoading(false)
    }

    load(currentGame)
  }, [gameSlug])

  const results = useMemo(() => {
    const q = normalize(query)

    let filtered = rows

    if (onlyTranslated) {
      filtered = filtered.filter(r => (r.zh ?? '').trim())
    }

    if (!q) {
      return filtered.slice(0, 200)
    }

    return filtered
      .filter(r => {
        const id = normalize(r.id ?? '')
        const jp = normalize(r.jp ?? '')
        const zh = normalize(r.zh ?? '')
        const speaker = normalize(r.speaker ?? '')
        const context = normalize(r.context ?? '')

        if (mode === 'id') return id.includes(q)
        if (mode === 'jp') return jp.includes(q)
        if (mode === 'zh') return zh.includes(q)

        return (
          id.includes(q) ||
          jp.includes(q) ||
          zh.includes(q) ||
          speaker.includes(q) ||
          context.includes(q)
        )
      })
      .slice(0, 300)
  }, [rows, query, mode, onlyTranslated])

  if (!game) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#0A0E18',
          color: '#EAEEF7',
          padding: 40,
        }}
      >
        <h1>Game not found</h1>
        <Link to="/game" style={{ color: '#E8B23A' }}>
          返回游戏列表
        </Link>
      </main>
    )
  }

  const t = getGameTheme(game)
  const q = normalize(query)

  const modeButton = (value: typeof mode, label: string) => {
    const active = mode === value

    return (
      <button
        key={value}
        onClick={() => setMode(value)}
        style={{
          cursor: 'pointer',
          fontFamily: cnf,
          fontSize: 12.5,
          padding: '6px 14px',
          borderRadius: 8,
          background: active ? t.accentSoft : t.card,
          color: active ? t.accent : t.muted,
          border: `1px solid ${active ? t.accentBorder : t.line2}`,
          transition: 'all 0.2s ease',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <GamePageShell game={game}>
      <main
        style={{
          minHeight: '100vh',
          background: t.page,
          color: t.ink,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <div style={{ height: 3, background: t.accent }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px 90px' }}>
          <h1
            style={{
              fontFamily: cnf,
              fontWeight: 900,
              fontSize: 28,
              margin: '0 0 6px',
              letterSpacing: 1,
              color: t.ink,
            }}
          >
            {game.shortTitle} 全文搜索
          </h1>

          <p style={{ fontSize: 14, color: t.muted, margin: '0 0 22px' }}>
            搜索原文、译文、ID、角色名与上下文。命中内容会高亮显示。
          </p>

          <section
            style={{
              border: `1px solid ${t.line2}`,
              borderRadius: 13,
              background: t.card,
              padding: '16px 18px',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 220,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: t.inkSoft,
                  border: `1px solid ${focused ? t.accent : t.line2}`,
                  borderRadius: 9,
                  padding: '0 12px',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 14, color: t.label }}>⌕</span>

                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="输入日文、中文、ID、角色名……"
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: t.ink,
                    fontFamily: 'inherit',
                    fontSize: 15,
                    padding: '11px 0',
                    outline: 'none',
                  }}
                />

                {query && (
                  <button
                    onClick={() => setQuery('')}
                    style={{
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      fontFamily: mono,
                      fontSize: 13,
                      color: t.label,
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <label
                onClick={() => setOnlyTranslated(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1px solid ${onlyTranslated ? t.accent : t.line2}`,
                    background: onlyTranslated ? t.accent : t.inkSoft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0A0E18',
                    fontSize: 11,
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {onlyTranslated ? '✓' : ''}
                </span>

                <span style={{ fontSize: 13, color: t.muted }}>仅有译文</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 13 }}>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: 1.5,
                  color: t.label,
                  marginRight: 4,
                }}
              >
                范围
              </span>

              {modeButton('all', '全部')}
              {modeButton('jp', '原文')}
              {modeButton('zh', '译文')}
              {modeButton('id', 'ID')}
            </div>
          </section>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              padding: '0 2px',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: mono, fontSize: 12, color: t.muted }}>
              {loading
                ? '加载中…'
                : `共 ${rows.length} 条 · 显示 ${results.length} 条`}
            </span>

            <span style={{ fontFamily: mono, fontSize: 11, color: t.label }}>
              {q ? `“${query}” 命中高亮` : '输入关键词开始搜索'}
            </span>
          </div>

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {results.map(row => {
                const sourceFile = sourceFileFromId(row.id)
                const untranslated = !(row.zh ?? '').trim()
                const rail = untranslated ? 'rgba(201,138,46,0.65)' : t.line2

                const highlightId = !!q && (mode === 'all' || mode === 'id')
                const highlightJp = !!q && (mode === 'all' || mode === 'jp')
                const highlightZh = !!q && (mode === 'all' || mode === 'zh')

                return (
                  <article
                    key={row.id}
                    style={{
                      border: `1px solid ${t.line2}`,
                      borderLeft: `3px solid ${rail}`,
                      borderRadius: 12,
                      background: t.card,
                      padding: '15px 17px',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        flexWrap: 'wrap',
                        marginBottom: 11,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: t.inkSoft,
                          color: t.ink,
                          border: `1px solid ${t.line2}`,
                        }}
                      >
                        {tokenizeText(row.id, query, t, highlightId)}
                      </span>

                      {sourceFile && (
                        <span style={{ fontFamily: mono, fontSize: 11, color: t.label }}>
                          {sourceFile}
                        </span>
                      )}

                      {row.speaker && (
                        <span
                          style={{
                            fontFamily: cnf,
                            fontSize: 11.5,
                            padding: '2px 9px',
                            borderRadius: 20,
                            background: t.accentSoft,
                            color: t.accent,
                          }}
                        >
                          {row.speaker}
                        </span>
                      )}

                      {untranslated && (
                        <span
                          style={{
                            fontFamily: cnf,
                            fontSize: 11,
                            padding: '2px 9px',
                            borderRadius: 20,
                            background: 'rgba(201,138,46,0.12)',
                            color: '#F0B84A',
                            border: '1px solid rgba(201,138,46,0.3)',
                          }}
                        >
                          待翻译
                        </span>
                      )}

                      <Link
                        to={game.routes.main}
                        style={{
                          marginLeft: 'auto',
                          fontFamily: mono,
                          fontSize: 11.5,
                          color: t.accent,
                          textDecoration: 'none',
                        }}
                      >
                        去主集 →
                      </Link>
                    </div>

                    {row.context && (
                      <div
                        style={{
                          fontSize: 12,
                          color: t.label,
                          marginBottom: 10,
                          fontStyle: 'italic',
                        }}
                      >
                        {row.context}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: mono,
                            fontSize: 9.5,
                            color: t.label,
                            letterSpacing: 2,
                            marginBottom: 5,
                          }}
                        >
                          原文 · JP
                        </div>

                        <div
                          style={{
                            whiteSpace: 'pre-wrap',
                            fontSize: 14.5,
                            lineHeight: 1.75,
                            color: t.ink,
                            fontFamily: cnf,
                          }}
                        >
                          {tokenizeText(row.jp ?? '', query, t, highlightJp)}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontFamily: mono,
                            fontSize: 9.5,
                            color: t.accent,
                            letterSpacing: 2,
                            marginBottom: 5,
                          }}
                        >
                          译文 · ZH
                        </div>

                        <div
                          style={{
                            whiteSpace: 'pre-wrap',
                            fontSize: 14.5,
                            lineHeight: 1.75,
                            color: untranslated ? t.label : t.ink,
                            fontFamily: cnf,
                          }}
                        >
                          {untranslated
                            ? '（未翻译）'
                            : tokenizeText(row.zh ?? '', query, t, highlightZh)}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 20px' }}>
              <div style={{ fontFamily: mono, fontSize: 32, color: t.line2, marginBottom: 12 }}>
                ⌕
              </div>

              <div style={{ fontFamily: mono, fontSize: 13, color: t.label }}>
                没有找到匹配结果
              </div>
            </div>
          )}
        </div>
      </main>
    </GamePageShell>
  )
}

export default GameSearch