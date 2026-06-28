import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameRequests.css'

type RequestRow = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  user_id: string
  from_set_id: string
  to_set_id: string
  username?: string
  source_file?: string
  vote_score?: number
  snapshot?: Record<string, string> | null
  base_snapshot?: Record<string, string> | null
  game_slug: string
  format_version?: number | null
}

type ProfileRow = {
  id: string
  username: string
}

type TranslationSetRow = {
  id: string
  source_file: string | null
  game_slug: string
}

type VoteRow = {
  request_id: string
  vote: number
}

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

type TabKey = 'open' | 'merged' | 'closed' | 'all'

export default function GameRequests() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const navigate = useNavigate()

  const game = getGameBySlug(gameSlug ?? '')

  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bulkMerging, setBulkMerging] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)

  const [tab, setTab] = useState<TabKey>('open')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const currentGame = getGameBySlug(gameSlug ?? '')

    if (!currentGame) {
      setLoading(false)
      return
    }

    async function load(activeGame: ActiveGame) {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null

      if (uid) {
        setIsAdmin(await getIsAdmin(uid))
      } else {
        setIsAdmin(false)
      }

      const { data, error } = await supabase
        .from('merge_requests')
        .select('*')
        .eq('game_slug', activeGame.slug)
        .order('created_at', { ascending: false })

      if (error) {
        alert('读取合并请求失败：' + error.message)
        setRequests([])
        setLoading(false)
        return
      }

      const rows = (data ?? []) as RequestRow[]

      if (rows.length === 0) {
        setRequests([])
        setLoading(false)
        return
      }

      const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
      const profileMap: Record<string, string> = {}

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds)

        ;(profiles as ProfileRow[] | null)?.forEach(p => {
          profileMap[p.id] = p.username
        })
      }

      const toSetIds = [...new Set(rows.map(r => r.to_set_id).filter(Boolean))]
      const setMap: Record<string, string> = {}

      if (toSetIds.length > 0) {
        const { data: toSets } = await supabase
          .from('translation_sets')
          .select('id, source_file, game_slug')
          .eq('game_slug', activeGame.slug)
          .in('id', toSetIds)

        ;(toSets as TranslationSetRow[] | null)?.forEach(s => {
          setMap[s.id] = s.source_file ?? ''
        })
      }

      const reqIds = rows.map(r => r.id)
      const scoreMap: Record<string, number> = {}

      if (reqIds.length > 0) {
        const { data: votes } = await supabase
          .from('merge_request_votes')
          .select('request_id, vote')
          .in('request_id', reqIds)

        ;(votes as VoteRow[] | null)?.forEach(v => {
          scoreMap[v.request_id] = (scoreMap[v.request_id] ?? 0) + v.vote
        })
      }

      setRequests(
        rows.map(r => ({
          ...r,
          username: profileMap[r.user_id] ?? '未知用户',
          source_file: setMap[r.to_set_id] ?? '',
          vote_score: scoreMap[r.id] ?? 0,
        })),
      )

      setLoading(false)
    }

    load(currentGame)
  }, [gameSlug])

  if (!game) {
    return (
      <GamePageShell game={getGameBySlug('p2is')!}>
        <main className="req-notfound">
          <p>找不到这个游戏项目。</p>
        </main>
      </GamePageShell>
    )
  }

  const statusMeta: Record<string, { icon: string; label: string }> = {
    open: { icon: '⇅', label: '开放' },
    merged: { icon: '✓', label: '已合并' },
    closed: { icon: '✕', label: '已关闭' },
  }

  const statusOf = (r: RequestRow) => (r.status === 'merged' ? 'merged' : r.status === 'open' ? 'open' : 'closed')

  const counts = {
    all: requests.length,
    open: requests.filter(r => statusOf(r) === 'open').length,
    merged: requests.filter(r => statusOf(r) === 'merged').length,
    closed: requests.filter(r => statusOf(r) === 'closed').length,
  }

  const q = query.toLowerCase().trim()

  const visible = requests
    .filter(r => tab === 'all' || statusOf(r) === tab)
    .filter(r =>
      !q ||
      (r.title + (r.username ?? '') + (r.source_file ?? '')).toLowerCase().includes(q),
    )

  const open = requests.filter(r => statusOf(r) === 'open')
  const mergeableCount = open.filter(r => r.snapshot && r.format_version === 2).length

  function openRequest(id: string) {
    if (!game) return
    navigate(`${game.routes.requests}/${id}`)
  }

  function downloadOpenChanges() {
    if (!game) return

    const result = open
      .filter(r => r.format_version === 2)
      .map(r => {
        const snap = r.snapshot ?? {}
        const base = r.base_snapshot ?? {}
        const changes: Record<string, { original: string; new: string }> = {}

        for (const [sid, newContent] of Object.entries(snap)) {
          const orig = base[sid] ?? ''

          if (newContent !== orig) {
            changes[sid] = {
              original: orig,
              new: newContent,
            }
          }
        }

        return {
          id: r.id,
          title: r.title,
          source_file: r.source_file ?? '',
          changes,
        }
      })
      .filter(r => Object.keys(r.changes).length > 0)

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `${game.slug}_open_requests_changes.json`
    a.click()

    URL.revokeObjectURL(url)
  }

  async function mergeAll() {
    if (!game) return
    setBulkMerging(true)
    const mergedIds: string[] = []
    const skipped: string[] = []

    for (const request of open) {
      if (request.game_slug !== game.slug || request.format_version !== 2) {
        skipped.push(`${request.title}（旧版请求或游戏不匹配）`)
        continue
      }
      const { error } = await supabase.rpc('merge_translation_request', {
        p_request_id: request.id,
      })
      if (error) {
        skipped.push(`${request.title}（${error.message}）`)
        continue
      }
      mergedIds.push(request.id)
    }

    setRequests(prev => prev.map(request =>
      mergedIds.includes(request.id) ? { ...request, status: 'merged' } : request,
    ))
    setBulkMerging(false)
    setShowBulkModal(false)
    alert(`已合并 ${mergedIds.length} 个。${skipped.length ? `\n跳过：\n${skipped.join('\n')}` : ''}`)
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'open', label: '开放', count: counts.open },
    { key: 'merged', label: '已合并', count: counts.merged },
    { key: 'closed', label: '已关闭', count: counts.closed },
    { key: 'all', label: '全部', count: counts.all },
  ]

  return (
    <GamePageShell game={game}>
      <main className="game-theme req-main" style={themeVars(game)}>
        <div className="req-topline" />

        <div className="req-wrap">
          {/* intro */}
          <div className="req-intro">
            <div className="req-intro-text">
              <h1 className="req-h1">{game.shortTitle} 合并请求</h1>
              <p className="req-intro-p">
                把社区翻译集的修订并入主集前，先在这里逐条审阅改动。维护者通过后改动才会落到主集。
              </p>
            </div>

            <div className="req-actions">
              <button className="req-download-btn" onClick={downloadOpenChanges}>
                下载改动
              </button>

              {isAdmin && (
                <button className="req-mergeall-btn" onClick={() => setShowBulkModal(true)}>
                  一键合并全部
                </button>
              )}
            </div>
          </div>

          {/* filter tabs + search */}
          <div className="req-toolbar">
            <div className="req-tabs">
              {tabs.map(tabItem => (
                <button
                  key={tabItem.key}
                  className={`req-tab${tab === tabItem.key ? ' is-active' : ''}`}
                  onClick={() => setTab(tabItem.key)}
                >
                  {tabItem.label}
                  <span className="req-tab-count">{tabItem.count}</span>
                </button>
              ))}
            </div>

            <input
              className="req-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索标题 · 作者 · 文件…"
            />
          </div>

          {loading && <p className="req-loading">加载中…</p>}

          {/* MR list */}
          {!loading && (
            <div className="req-list">
              {visible.map(r => {
                const status = statusOf(r)
                const sm = statusMeta[status]
                const score = r.vote_score ?? 0

                return (
                  <div key={r.id} className="req-row" onClick={() => openRequest(r.id)}>
                    <span className={`req-status-icon req-st-${status}`}>{sm.icon}</span>

                    <div className="req-row-body">
                      <div className="req-title-row">
                        <span className="req-title">{r.title}</span>
                        <span className={`req-status-badge req-st-${status}`}>{sm.label}</span>
                      </div>

                      <div className="req-meta">
                        {r.source_file && <span className="req-srcfile">{r.source_file}</span>}
                        <span className="req-meta-text">
                          {r.username} 提交 · {new Date(r.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>

                    <div className="req-right">
                      <span
                        className={`req-score${score > 0 ? ' is-pos' : score < 0 ? ' is-neg' : ''}`}
                      >
                        {score > 0 ? '+' : ''}
                        {score}
                      </span>
                      <span className="req-chevron">▸</span>
                    </div>
                  </div>
                )
              })}

              {visible.length === 0 && (
                <div className="req-empty">
                  {requests.length === 0
                    ? 'Fork 主集并修改后，可以在编辑器中提交合并请求'
                    : '没有匹配的合并请求'}
                </div>
              )}
            </div>
          )}
        </div>

        {showBulkModal && (
          <div className="req-overlay" onClick={() => setShowBulkModal(false)}>
            <div className="req-modal" onClick={e => e.stopPropagation()}>
              <div className="req-modal-top" />
              <div className="req-modal-body">
                <div className="req-modal-title">确认一键合并</div>
                <p className="req-modal-text">
                  将合并 <strong className="req-strong">{mergeableCount}</strong> 个开放请求的所有变更，此操作不可撤销。
                  {mergeableCount < open.length && (
                    <span className="req-skip-note">
                      （另有 {open.length - mergeableCount} 个请求因缺少快照数据将被跳过）
                    </span>
                  )}
                </p>

                <div className="req-modal-footer">
                  <button className="req-cancel-btn" onClick={() => setShowBulkModal(false)}>
                    取消
                  </button>
                  <button className="req-confirm-btn" onClick={mergeAll} disabled={bulkMerging}>
                    {bulkMerging ? '合并中…' : '确认合并'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </GamePageShell>
  )
}
