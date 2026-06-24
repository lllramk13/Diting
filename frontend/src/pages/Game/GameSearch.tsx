import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import '../P2IS/P2IS.css'

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
  // 常见格式：
  // field:1075:0x6509c
  // script:xxx
  // config:0x25c
  const parts = id.split(':')

  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }

  return ''
}

function GameSearch() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const game = getGameBySlug(gameSlug ?? '')

  const [rows, setRows] = useState<SearchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'all' | 'jp' | 'zh' | 'id'>('all')
  const [onlyTranslated, setOnlyTranslated] = useState(false)

  useEffect(() => {
    const currentGame = getGameBySlug(gameSlug ?? '')

    if (!currentGame) {
        setLoading(false)
        return
    }

    async function load(activeGame: ActiveGame) {
        setLoading(true)

        const url = `${activeGame.dataPath}/merged_jp_zh.json`
        const res = await fetch(url)
        const text = await res.text()

        if (!res.ok || text.trim().startsWith('<')) {
        alert(`读取搜索数据失败：${url}\n返回的不是 JSON，可能文件不存在或路径错误。`)
        setRows([])
        setLoading(false)
        return
        }

        const data = JSON.parse(text)

        if (Array.isArray(data)) {
        setRows(data as SearchRow[])
        } else if (Array.isArray(data.entries)) {
        setRows(data.entries as SearchRow[])
        } else {
        console.warn('[GameSearch] unknown merged json shape', data)
        setRows([])
        }

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
      <main className="p2is-page">
        <div className="browse-wrap">
          <p className="muted">找不到这个游戏项目。</p>
        </div>
      </main>
    )
  }

  return (
    <GamePageShell game={game}>
      <main className="p2is-page">
        <div className="browse-wrap">
          <div className="browse-header">
            <h1>{game.shortTitle} 搜索</h1>
            <p className="muted">
              搜索原文、译文、ID、说话人和上下文。默认最多显示 200 条，搜索后最多显示 300 条。
            </p>
          </div>

          <section className="browse-section">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <input
                className="search-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="输入日文、中文、ID、角色名……"
              />

              <select
                className="search-input"
                value={mode}
                onChange={e => setMode(e.target.value as typeof mode)}
                style={{ minWidth: 110 }}
              >
                <option value="all">全部</option>
                <option value="jp">原文</option>
                <option value="zh">译文</option>
                <option value="id">ID</option>
              </select>

              <label
                className="muted"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyTranslated}
                  onChange={e => setOnlyTranslated(e.target.checked)}
                />
                仅有译文
              </label>
            </div>

            <p className="muted" style={{ marginTop: 10 }}>
              {loading
                ? '加载中…'
                : `共 ${rows.length} 条，当前显示 ${results.length} 条`}
            </p>
          </section>

          {!loading && (
            <section className="browse-section">
              <div className="requests-list">
                {results.map(row => {
                  const sourceFile = sourceFileFromId(row.id)
                  const editUrl = sourceFile
                    ? `${game.routes.main}`
                    : game.routes.main

                  return (
                    <div
                      key={row.id}
                      className="request-row"
                      style={{ cursor: 'default' }}
                    >
                      <div style={{ width: '100%' }}>
                        <div
                          className="request-meta muted"
                          style={{
                            marginBottom: 8,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <span className="set-source-tag">{row.id}</span>

                          {sourceFile && (
                            <span className="set-source-tag">{sourceFile}</span>
                          )}

                          {row.speaker && <span>{row.speaker}</span>}

                          <Link to={editUrl}>去主集</Link>
                        </div>

                        {row.context && (
                          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                            {row.context}
                          </div>
                        )}

                        {row.jp && (
                          <div style={{ marginBottom: 10 }}>
                            <div className="muted" style={{ fontSize: 12 }}>
                              原文
                            </div>
                            <pre className="entry-ja">
                              {formatControlNewlines(row.jp)}
                            </pre>
                          </div>
                        )}

                        <div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            中文
                          </div>
                          <pre className="entry-user">
                            {formatControlNewlines(row.zh ?? '')}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {results.length === 0 && (
                <p className="muted">没有找到匹配结果。</p>
              )}
            </section>
          )}
        </div>
      </main>
    </GamePageShell>
  )
}

export default GameSearch