import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameSearch.css'

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
  shouldHighlight: boolean,
): ReactNode[] {
  const q = query.trim()
  const source = formatControlNewlines(text)

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
        <span key={nodes.length} className="gs-code">
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
          <span key={nodes.length} className="gs-hit">
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

    if (!currentGame) return

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
      let sourceAvailable = Array.isArray(manifest)

      const all: SearchRow[] = []
      for (const part of parts) {
        const data = await fetchJson(`${activeGame.dataPath}/${part}`)
        if (Array.isArray(data)) {
          sourceAvailable = true
          all.push(...(data as SearchRow[]))
        } else if (data && Array.isArray((data as { entries?: unknown }).entries)) {
          sourceAvailable = true
          all.push(...((data as { entries: SearchRow[] }).entries))
        }
      }

      if (all.length === 0 && !sourceAvailable) {
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
      <main className="gs-notfound">
        <h1>Game not found</h1>
        <Link to="/game" className="gs-notfound-link">
          返回游戏列表
        </Link>
      </main>
    )
  }

  const q = normalize(query)

  const modeButton = (value: typeof mode, label: string) => (
    <button
      key={value}
      className={`gs-mode-btn${mode === value ? ' is-active' : ''}`}
      onClick={() => setMode(value)}
    >
      {label}
    </button>
  )

  return (
    <GamePageShell game={game}>
      <main className="game-theme gs-main" style={themeVars(game)}>
        <div className="gs-topline" />

        <div className="gs-wrap">
          <h1 className="gs-h1">{game.shortTitle} 全文搜索</h1>

          <p className="gs-intro">搜索原文、译文、ID、角色名与上下文。命中内容会高亮显示。</p>

          <section className="gs-panel">
            <div className="gs-row">
              <div className={`gs-searchbox${focused ? ' is-focused' : ''}`}>
                <span className="gs-search-icon">⌕</span>

                <input
                  className="gs-search-input"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="输入日文、中文、ID、角色名……"
                />

                {query && (
                  <button className="gs-clear" onClick={() => setQuery('')}>
                    ✕
                  </button>
                )}
              </div>

              <label className="gs-check-label" onClick={() => setOnlyTranslated(prev => !prev)}>
                <span className={`gs-checkbox${onlyTranslated ? ' is-checked' : ''}`}>
                  {onlyTranslated ? '✓' : ''}
                </span>

                <span className="gs-check-text">仅有译文</span>
              </label>
            </div>

            <div className="gs-mode-row">
              <span className="gs-mode-label">范围</span>

              {modeButton('all', '全部')}
              {modeButton('jp', '原文')}
              {modeButton('zh', '译文')}
              {modeButton('id', 'ID')}
            </div>
          </section>

          <div className="gs-status-row">
            <span className="gs-status">
              {loading ? '加载中…' : `共 ${rows.length} 条 · 显示 ${results.length} 条`}
            </span>

            <span className="gs-hint">
              {q ? `“${query}” 命中高亮` : '输入关键词开始搜索'}
            </span>
          </div>

          {!loading && (
            <div className="gs-results">
              {results.map(row => {
                const sourceFile = sourceFileFromId(row.id)
                const untranslated = !(row.zh ?? '').trim()

                const highlightId = !!q && (mode === 'all' || mode === 'id')
                const highlightJp = !!q && (mode === 'all' || mode === 'jp')
                const highlightZh = !!q && (mode === 'all' || mode === 'zh')

                return (
                  <article
                    key={row.id}
                    className={`gs-card${untranslated ? ' is-untranslated' : ''}`}
                  >
                    <div className="gs-card-head">
                      <span className="gs-id">
                        {tokenizeText(row.id, query, highlightId)}
                      </span>

                      {sourceFile && <span className="gs-src">{sourceFile}</span>}

                      {row.speaker && <span className="gs-speaker">{row.speaker}</span>}

                      {untranslated && <span className="gs-untrans-tag">待翻译</span>}

                      <Link to={game.routes.main} className="gs-to-main">
                        去主集 →
                      </Link>
                    </div>

                    {row.context && <div className="gs-context">{row.context}</div>}

                    <div className="gs-cols">
                      <div>
                        <div className="gs-col-label">原文 · JP</div>

                        <div className="gs-text">
                          {tokenizeText(row.jp ?? '', query, highlightJp)}
                        </div>
                      </div>

                      <div>
                        <div className="gs-col-label gs-col-label--zh">译文 · ZH</div>

                        <div className={`gs-text${untranslated ? ' is-untranslated' : ''}`}>
                          {untranslated
                            ? '（未翻译）'
                            : tokenizeText(row.zh ?? '', query, highlightZh)}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="gs-empty">
              <div className="gs-empty-icon">⌕</div>

              <div className="gs-empty-text">没有找到匹配结果</div>
            </div>
          )}
        </div>
      </main>
    </GamePageShell>
  )
}

export default GameSearch
