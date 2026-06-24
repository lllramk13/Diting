import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { getGameTheme } from './gameTheme'

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"

type IssueRow = {
  id: string
  title: string
  body: string | null
  user_id: string
  is_pinned: boolean
  created_at: string
  game_slug: string
}

type ProfileRow = {
  id: string
  username: string
}

type IssueViewRow = IssueRow & {
  username?: string
}

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

type TabKey = 'all' | 'pinned'

export default function GameIssues() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const navigate = useNavigate()

  const game = getGameBySlug(gameSlug ?? '')

  const [issues, setIssues] = useState<IssueViewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [tab, setTab] = useState<TabKey>('all')
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

      setUser(uid ? { id: uid } : null)

      if (uid) {
        setIsAdmin(await getIsAdmin(uid))
      } else {
        setIsAdmin(false)
      }

      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('game_slug', activeGame.slug)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        alert('读取问题列表失败：' + error.message)
        setIssues([])
        setLoading(false)
        return
      }

      const rows = (data ?? []) as IssueRow[]

      if (rows.length === 0) {
        setIssues([])
        setLoading(false)
        return
      }

      const userIds = [...new Set(rows.map(i => i.user_id).filter(Boolean))]
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

      setIssues(
        rows.map(issue => ({
          ...issue,
          username: profileMap[issue.user_id] ?? '未知用户',
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

  function openIssue(id: string) {
    if (!game) return
    navigate(`${game.routes.issues}/${id}`)
  }

  async function submitIssue() {
    if (!game) return
    if (!newTitle.trim()) return

    if (!user) {
      alert('请先登录后再提交问题。')
      return
    }

    setSubmitting(true)

    const { data, error } = await supabase
      .from('issues')
      .insert({
        title: newTitle.trim(),
        body: newBody.trim() || null,
        user_id: user.id,
        is_pinned: false,
        game_slug: game.slug,
      })
      .select()
      .single()

    if (error) {
      alert('提交失败：' + error.message)
      setSubmitting(false)
      return
    }

    const inserted = data as IssueRow

    setIssues(prev => [
      {
        ...inserted,
        username: '我',
      },
      ...prev,
    ])

    setNewTitle('')
    setNewBody('')
    setShowModal(false)
    setSubmitting(false)
  }

  async function togglePin(issue: IssueViewRow) {
    if (!game) return
    if (issue.game_slug !== game.slug) {
      alert('游戏不匹配，不能操作。')
      return
    }

    const next = !issue.is_pinned

    const { error } = await supabase
      .from('issues')
      .update({ is_pinned: next })
      .eq('id', issue.id)
      .eq('game_slug', game.slug)

    if (error) {
      alert('操作失败：' + error.message)
      return
    }

    setIssues(prev => {
      const updated = prev.map(i =>
        i.id === issue.id
          ? { ...i, is_pinned: next }
          : i,
      )

      return [
        ...updated.filter(i => i.is_pinned),
        ...updated.filter(i => !i.is_pinned),
      ]
    })
  }

  async function deleteIssue(id: string) {
    if (!game) return
    if (!confirm('确定删除此问题？')) return

    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', id)
      .eq('game_slug', game.slug)

    if (error) {
      alert('删除失败：' + error.message)
      return
    }

    setIssues(prev => prev.filter(i => i.id !== id))
  }

  const q = query.toLowerCase().trim()

  const visible = issues
    .filter(i => tab === 'all' || i.is_pinned)
    .filter(i => !q || (i.title + (i.username ?? '')).toLowerCase().includes(q))

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: issues.length },
    { key: 'pinned', label: '置顶', count: issues.filter(i => i.is_pinned).length },
  ]

  const adminBtn = (
    label: string,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
      style={{
        cursor: 'pointer',
        fontFamily: cnf,
        fontSize: 12,
        padding: '6px 12px',
        borderRadius: 8,
        background: 'none',
        border: `1px solid ${danger ? 'rgba(240,136,138,0.35)' : t.line2}`,
        color: danger ? t.danger : t.ink,
      }}
    >
      {label}
    </button>
  )

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
                {game.shortTitle} 问题
              </h1>
              <p style={{ fontSize: 14.5, color: t.muted, margin: '10px 0 0', lineHeight: 1.6 }}>
                报告误译、讨论术语、提出润色建议。每条问题都可以展开讨论，理清后再改主集。
              </p>
            </div>

            {user ? (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  cursor: 'pointer',
                  fontFamily: cnf,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '11px 20px',
                  borderRadius: 9,
                  background: t.accent,
                  border: 'none',
                  color: t.buttonText,
                }}
              >
                + 新建问题
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                style={{
                  cursor: 'pointer',
                  fontFamily: cnf,
                  fontSize: 14,
                  padding: '11px 20px',
                  borderRadius: 9,
                  background: t.inkSoft,
                  border: `1px solid ${t.line2}`,
                  color: t.ink,
                }}
              >
                登录后创建
              </button>
            )}
          </div>

          {/* tabs + search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', gap: 7 }}>
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
              placeholder="搜索标题 · 作者…"
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

          {/* issue list */}
          {!loading && (
            <div
              style={{
                border: `1px solid ${t.line2}`,
                borderRadius: 13,
                background: t.card,
                overflow: 'hidden',
              }}
            >
              {visible.map(issue => (
                <div
                  key={issue.id}
                  onClick={() => openIssue(issue.id)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 13,
                    padding: '15px 20px',
                    borderBottom: `1px solid ${t.line}`,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: mono,
                      fontSize: 12,
                      fontWeight: 700,
                      color: t.warning,
                      border: `1.5px solid ${t.warning}`,
                    }}
                  >
                    !
                  </span>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: cnf, fontWeight: 700, fontSize: 15.5, color: t.ink }}>
                        {issue.title}
                      </span>
                      {issue.is_pinned && (
                        <span
                          style={{
                            fontFamily: cnf,
                            fontSize: 10.5,
                            padding: '2px 9px',
                            borderRadius: 20,
                            background: t.accentSoft,
                            color: t.accent,
                            border: `1px solid ${t.accentBorder}`,
                          }}
                        >
                          置顶
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginTop: 6,
                      }}
                    >
                      <span style={{ fontFamily: cnf, fontSize: 11.5, color: t.muted }}>
                        {issue.username} 提出 · {new Date(issue.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    {isAdmin && (
                      <>
                        {adminBtn(issue.is_pinned ? '取消置顶' : '置顶', () => togglePin(issue))}
                        {adminBtn('删除', () => deleteIssue(issue.id), true)}
                      </>
                    )}
                    <span style={{ fontFamily: mono, fontSize: 13, color: t.label }}>▸</span>
                  </div>
                </div>
              ))}

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
                  {issues.length === 0 ? '暂无问题' : '没有匹配的问题'}
                </div>
              )}
            </div>
          )}
        </div>

        {showModal && (
          <div
            onClick={() => setShowModal(false)}
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
                maxWidth: 480,
                background: t.card,
                border: `1px solid ${t.line2}`,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 3, background: t.accent }} />
              <div style={{ padding: '24px 26px' }}>
                <div style={{ fontFamily: cnf, fontWeight: 700, fontSize: 19, marginBottom: 18 }}>
                  新建问题
                </div>

                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.5, color: t.label, marginBottom: 6 }}>
                  标题
                </div>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="简述这个翻译问题"
                  style={{
                    width: '100%',
                    background: t.inkSoft,
                    border: `1px solid ${t.line2}`,
                    borderRadius: 9,
                    color: t.ink,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    padding: '10px 12px',
                    outline: 'none',
                    marginBottom: 16,
                  }}
                />

                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.5, color: t.label, marginBottom: 6 }}>
                  描述
                </div>
                <textarea
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  rows={4}
                  placeholder="详细说明问题与你的建议……"
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    background: t.inkSoft,
                    border: `1px solid ${t.line2}`,
                    borderRadius: 9,
                    color: t.ink,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    lineHeight: 1.6,
                    padding: '10px 12px',
                    outline: 'none',
                    marginBottom: 20,
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
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
                    onClick={submitIssue}
                    disabled={submitting || !newTitle.trim()}
                    style={{
                      cursor: submitting || !newTitle.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: cnf,
                      fontSize: 13.5,
                      fontWeight: 700,
                      padding: '10px 18px',
                      borderRadius: 9,
                      background: newTitle.trim() ? t.accent : t.line2,
                      border: 'none',
                      color: t.buttonText,
                    }}
                  >
                    {submitting ? '提交中…' : '提交'}
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
