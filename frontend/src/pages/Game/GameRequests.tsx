import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { getGameTheme } from './gameTheme'

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"

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
        <main style={{ minHeight: '100vh', background: '#0A0E18', color: '#EAEEF7', padding: 40 }}>
          <p>找不到这个游戏项目。</p>
        </main>
      </GamePageShell>
    )
  }

  const t = getGameTheme(game)

  const statusMeta: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
    open: { icon: '⇅', label: '开放', color: t.warning, bg: 'rgba(240,184,74,0.12)', border: 'rgba(240,184,74,0.3)' },
    merged: { icon: '✓', label: '已合并', color: t.success, bg: 'rgba(45,140,80,0.14)', border: 'rgba(45,140,80,0.32)' },
    closed: { icon: '✕', label: '已关闭', color: t.danger, bg: 'rgba(240,136,138,0.12)', border: 'rgba(240,136,138,0.3)' },
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

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'open', label: '开放', count: counts.open },
    { key: 'merged', label: '已合并', count: counts.merged },
    { key: 'closed', label: '已关闭', count: counts.closed },
    { key: 'all', label: '全部', count: counts.all },
  ]

  return (
    <GamePageShell game={game}>
      <main
        style={{
          minHeight: '100vh',
          background: t.page,
          color: t.ink,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
        }}
      >
        <div style={{ height: 3, background: t.accent }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px 90px' }}>
          {/* intro */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 24,
            }}
          >
            <div style={{ maxWidth: 580 }}>
              <h1 style={{ fontFamily: cnf, fontWeight: 900, fontSize: 30, margin: 0, letterSpacing: 1 }}>
                {game.shortTitle} 合并请求
              </h1>
              <p style={{ fontSize: 14.5, color: t.muted, margin: '10px 0 0', lineHeight: 1.6 }}>
                把社区翻译集的修订并入主集前，先在这里逐条审阅改动。维护者通过后改动才会落到主集。
              </p>
            </div>

            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <button
                onClick={downloadOpenChanges}
                style={{
                  cursor: 'pointer',
                  fontFamily: cnf,
                  fontSize: 13,
                  padding: '10px 16px',
                  borderRadius: 9,
                  background: t.inkSoft,
                  border: `1px solid ${t.line2}`,
                  color: t.ink,
                }}
              >
                下载改动
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  style={{
                    cursor: 'pointer',
                    fontFamily: cnf,
                    fontSize: 14,
                    fontWeight: 700,
                    padding: '10px 18px',
                    borderRadius: 9,
                    background: t.accent,
                    border: 'none',
                    color: t.buttonText,
                  }}
                >
                  一键合并全部
                </button>
              )}
            </div>
          </div>

          {/* filter tabs + search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {tabs.map(tabItem => {
                const on = tab === tabItem.key
                return (
                  <button
                    key={tabItem.key}
                    onClick={() => setTab(tabItem.key)}
                    style={{
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: cnf,
                      fontSize: 13,
                      padding: '8px 15px',
                      borderRadius: 20,
                      background: on ? t.inkSoft : t.card,
                      color: on ? t.ink : t.muted,
                      border: `1px solid ${on ? t.inkBorder : t.line2}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    {tabItem.label}
                    <span style={{ fontFamily: mono, fontSize: 11, opacity: 0.7 }}>{tabItem.count}</span>
                  </button>
                )
              })}
            </div>

            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索标题 · 作者 · 文件…"
              style={{
                marginLeft: 'auto',
                background: t.card,
                border: `1px solid ${t.line2}`,
                borderRadius: 8,
                color: t.ink,
                fontFamily: 'inherit',
                fontSize: 13,
                padding: '9px 13px',
                outline: 'none',
                width: 240,
              }}
            />
          </div>

          {loading && (
            <p style={{ fontFamily: mono, fontSize: 13, color: t.label }}>加载中…</p>
          )}

          {/* MR list */}
          {!loading && (
            <div
              style={{
                border: `1px solid ${t.line2}`,
                borderRadius: 13,
                background: t.card,
                overflow: 'hidden',
              }}
            >
              {visible.map(r => {
                const sm = statusMeta[statusOf(r)]
                const score = r.vote_score ?? 0

                return (
                  <div
                    key={r.id}
                    onClick={() => openRequest(r.id)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '16px 20px',
                      borderBottom: `1px solid ${t.line}`,
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: sm.bg,
                        color: sm.color,
                        border: `1px solid ${sm.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: mono,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {sm.icon}
                    </span>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: cnf, fontWeight: 700, fontSize: 15.5, color: t.ink }}>
                          {r.title}
                        </span>
                        <span
                          style={{
                            fontFamily: cnf,
                            fontSize: 10.5,
                            padding: '2px 9px',
                            borderRadius: 20,
                            background: sm.bg,
                            color: sm.color,
                            border: `1px solid ${sm.border}`,
                          }}
                        >
                          {sm.label}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                          marginTop: 5,
                        }}
                      >
                        {r.source_file && (
                          <span
                            style={{
                              fontFamily: mono,
                              fontSize: 11.5,
                              padding: '1px 7px',
                              borderRadius: 5,
                              background: t.inkSoft,
                              color: t.ink,
                              border: `1px solid ${t.line2}`,
                            }}
                          >
                            {r.source_file}
                          </span>
                        )}
                        <span style={{ fontFamily: cnf, fontSize: 11.5, color: t.muted }}>
                          {r.username} 提交 · {new Date(r.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 13 }}>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 12,
                          color: score > 0 ? t.success : score < 0 ? t.danger : t.label,
                        }}
                      >
                        {score > 0 ? '+' : ''}
                        {score}
                      </span>
                      <span style={{ fontFamily: mono, fontSize: 13, color: t.label }}>▸</span>
                    </div>
                  </div>
                )
              })}

              {visible.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '56px 20px',
                    fontFamily: mono,
                    fontSize: 13,
                    color: t.label,
                  }}
                >
                  {requests.length === 0
                    ? 'Fork 主集并修改后，可以在编辑器中提交合并请求'
                    : '没有匹配的合并请求'}
                </div>
              )}
            </div>
          )}
        </div>

        {showBulkModal && (
          <div
            onClick={() => setShowBulkModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              background: 'rgba(5,8,15,0.6)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 470,
                background: t.card,
                border: `1px solid ${t.line2}`,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 3, background: t.accent }} />
              <div style={{ padding: '24px 26px' }}>
                <div style={{ fontFamily: cnf, fontWeight: 700, fontSize: 19, marginBottom: 14 }}>
                  确认一键合并
                </div>
                <p style={{ fontSize: 14, color: t.muted, lineHeight: 1.7, margin: 0 }}>
                  将合并 <strong style={{ color: t.ink }}>{mergeableCount}</strong> 个开放请求的所有变更，此操作不可撤销。
                  {mergeableCount < open.length && (
                    <span style={{ display: 'block', marginTop: 6 }}>
                      （另有 {open.length - mergeableCount} 个请求因缺少快照数据将被跳过）
                    </span>
                  )}
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                  <button
                    onClick={() => setShowBulkModal(false)}
                    style={{
                      cursor: 'pointer',
                      fontFamily: cnf,
                      fontSize: 13.5,
                      padding: '10px 18px',
                      borderRadius: 9,
                      background: t.inkSoft,
                      border: `1px solid ${t.line2}`,
                      color: t.muted,
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={mergeAll}
                    disabled={bulkMerging}
                    style={{
                      cursor: bulkMerging ? 'not-allowed' : 'pointer',
                      fontFamily: cnf,
                      fontSize: 13.5,
                      fontWeight: 700,
                      padding: '10px 18px',
                      borderRadius: 9,
                      background: t.accent,
                      border: 'none',
                      color: t.buttonText,
                    }}
                  >
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
