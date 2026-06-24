import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import '../P2IS/P2IS.css'

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

export default function GameRequests() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const navigate = useNavigate()

  const game = getGameBySlug(gameSlug ?? '')

  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bulkMerging, setBulkMerging] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)

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
      <main className="p2is-page">
        <div className="browse-wrap">
          <p className="muted">找不到这个游戏项目。</p>
        </div>
      </main>
    )
  }

  const open = requests.filter(r => r.status === 'open')
  const closed = requests.filter(r => r.status !== 'open')
  const mergeableCount = open.filter(r => r.snapshot).length

  function openRequest(id: string) {
    if (!game) return
    navigate(`${game.routes.requests}/${id}`)
  }

  function downloadOpenChanges() {
    if (!game) return

    const result = open
      .map(r => {
        const snap = r.snapshot ?? {}
        const base = r.base_snapshot ?? {}
        const changes: Record<string, { original: string; new: string }> = {}

        for (const [sid, newContent] of Object.entries(snap)) {
          const orig = base[sid] ?? ''

          if (newContent.trim() && newContent.trim() !== orig.trim()) {
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

    for (const r of open) {
      if (r.game_slug !== game.slug) {
        skipped.push(`${r.title}（游戏不匹配）`)
        continue
      }

      if (!r.snapshot) {
        skipped.push(r.title)
        continue
      }

      const snap = r.snapshot
      const base = r.base_snapshot ?? {}

      const rows = Object.entries(snap)
        .filter(([sid, content]) => content.trim() && content.trim() !== (base[sid] ?? '').trim())
        .map(([sid, content]) => ({
          set_id: r.to_set_id,
          string_id: sid,
          content,
          sort_order: 0,
          updated_at: new Date().toISOString(),
        }))

      if (rows.length > 0) {
        const { error } = await supabase
          .from('translation_entries')
          .upsert(rows, { onConflict: 'set_id,string_id' })

        if (error) {
          alert(`合并「${r.title}」失败：${error.message}`)
          setBulkMerging(false)
          return
        }
      }

      mergedIds.push(r.id)
    }

    if (mergedIds.length > 0) {
      const { error } = await supabase
        .from('merge_requests')
        .update({ status: 'merged' })
        .eq('game_slug', game.slug)
        .in('id', mergedIds)

      if (error) {
        alert('更新合并请求状态失败：' + error.message)
        setBulkMerging(false)
        return
      }

      setRequests(prev =>
        prev.map(r =>
          mergedIds.includes(r.id)
            ? { ...r, status: 'merged' }
            : r,
        ),
      )
    }

    setBulkMerging(false)
    setShowBulkModal(false)

    if (skipped.length > 0) {
      alert(`已合并 ${mergedIds.length} 个。\n以下请求被跳过：\n${skipped.join('\n')}`)
    }
  }

  return (
    <GamePageShell game={game}>
      <main className="p2is-page">
        <div className="browse-wrap">
          <div className="browse-header">
            <h1>{game.shortTitle} 合并请求</h1>
            <p className="muted">
              查看社区提交的修改请求。管理员可以合并到主集。
            </p>
          </div>

          {loading && <p className="muted">加载中…</p>}

          {!loading && open.length > 0 && (
            <section className="browse-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  开放中 {open.length}
                </h2>

                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '3px 10px' }}
                  onClick={downloadOpenChanges}
                >
                  下载改动
                </button>

                {isAdmin && (
                  <button
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '3px 10px' }}
                    onClick={() => setShowBulkModal(true)}
                  >
                    一键合并全部
                  </button>
                )}
              </div>

              <div className="requests-list">
                {open.map(r => (
                  <div
                    key={r.id}
                    className="request-row"
                    onClick={() => openRequest(r.id)}
                  >
                    <div className="request-main">
                      <span className="request-status-dot open" />

                      <div>
                        <div className="request-title">{r.title}</div>

                        <div className="request-meta muted">
                          {r.source_file && (
                            <span className="set-source-tag">{r.source_file}</span>
                          )}
                          <span>{r.username}</span>
                          <span>{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="request-score">
                      <span className={(r.vote_score ?? 0) >= 0 ? 'vote-pos' : 'vote-neg'}>
                        {(r.vote_score ?? 0) > 0 ? '+' : ''}
                        {r.vote_score ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && closed.length > 0 && (
            <section className="browse-section">
              <h2 className="section-title">已关闭 {closed.length}</h2>

              <div className="requests-list">
                {closed.map(r => (
                  <div
                    key={r.id}
                    className="request-row closed"
                    onClick={() => openRequest(r.id)}
                  >
                    <div className="request-main">
                      <span className={`request-status-dot ${r.status}`} />

                      <div>
                        <div className="request-title">{r.title}</div>

                        <div className="request-meta muted">
                          {r.source_file && (
                            <span className="set-source-tag">{r.source_file}</span>
                          )}
                          <span>{r.username}</span>
                          <span>{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="request-score muted">
                      {r.vote_score ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && requests.length === 0 && (
            <p className="muted">
              暂无合并请求。Fork 主集并修改后，可以在编辑器中提交。
            </p>
          )}
        </div>

        {showBulkModal && (
          <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">确认一键合并</h3>

              <div className="modal-form">
                <p style={{ fontSize: 14, color: 'rgba(200,220,255,0.7)' }}>
                  将合并 <strong>{mergeableCount}</strong> 个开放请求的所有变更，此操作不可撤销。
                  {mergeableCount < open.length && (
                    <span style={{ display: 'block', marginTop: 6 }}>
                      （另有 {open.length - mergeableCount} 个请求因缺少快照数据将被跳过）
                    </span>
                  )}
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-ghost"
                  onClick={() => setShowBulkModal(false)}
                >
                  取消
                </button>

                <button
                  className="btn-primary"
                  onClick={mergeAll}
                  disabled={bulkMerging}
                >
                  {bulkMerging ? '合并中…' : '确认合并'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </GamePageShell>
  )
}