import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameIssues.css'

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
        setIsAdmin(await getIsAdmin())
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
          .from('public_profiles')
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
        <main className="iss-notfound">
          <p>找不到这个游戏项目。</p>
        </main>
      </GamePageShell>
    )
  }

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

  const adminBtn = (label: string, onClick: () => void, danger = false): ReactNode => (
    <button
      className={`iss-admin-btn${danger ? ' is-danger' : ''}`}
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
    >
      {label}
    </button>
  )

  return (
    <GamePageShell game={game}>
      <main className="game-theme iss-main" style={themeVars(game)}>
        <div className="iss-topline" />

        <div className="iss-wrap">
          {/* intro */}
          <div className="iss-intro">
            <div className="iss-intro-text">
              <h1 className="iss-h1">{game.shortTitle} 问题</h1>
              <p className="iss-intro-p">
                报告误译、讨论术语、提出润色建议。每条问题都可以展开讨论，理清后再改主集。
              </p>
            </div>

            {user ? (
              <button className="iss-new-btn" onClick={() => setShowModal(true)}>
                + 新建问题
              </button>
            ) : (
              <button className="iss-login-btn" onClick={() => navigate('/auth')}>
                登录后创建
              </button>
            )}
          </div>

          {/* tabs + search */}
          <div className="iss-toolbar">
            <div className="iss-tabs">
              {tabs.map(tabItem => (
                <button
                  key={tabItem.key}
                  className={`iss-tab${tab === tabItem.key ? ' is-active' : ''}`}
                  onClick={() => setTab(tabItem.key)}
                >
                  {tabItem.label}
                  <span className="iss-tab-count">{tabItem.count}</span>
                </button>
              ))}
            </div>

            <input
              className="iss-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索标题 · 作者…"
            />
          </div>

          {loading && <p className="iss-loading">加载中…</p>}

          {/* issue list */}
          {!loading && (
            <div className="iss-list">
              {visible.map(issue => (
                <div key={issue.id} className="iss-row" onClick={() => openIssue(issue.id)}>
                  <span className="iss-bang">!</span>

                  <div className="iss-row-body">
                    <div className="iss-title-row">
                      <span className="iss-title">{issue.title}</span>
                      {issue.is_pinned && <span className="iss-pin">置顶</span>}
                    </div>

                    <div className="iss-meta">
                      <span className="iss-meta-text">
                        {issue.username} 提出 · {new Date(issue.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  <div className="iss-row-actions">
                    {isAdmin && (
                      <>
                        {adminBtn(issue.is_pinned ? '取消置顶' : '置顶', () => togglePin(issue))}
                        {adminBtn('删除', () => deleteIssue(issue.id), true)}
                      </>
                    )}
                    <span className="iss-chevron">▸</span>
                  </div>
                </div>
              ))}

              {visible.length === 0 && (
                <div className="iss-empty">
                  {issues.length === 0 ? '暂无问题' : '没有匹配的问题'}
                </div>
              )}
            </div>
          )}
        </div>

        {showModal && (
          <div className="iss-overlay" onClick={() => setShowModal(false)}>
            <div className="iss-modal" onClick={e => e.stopPropagation()}>
              <div className="iss-modal-top" />
              <div className="iss-modal-body">
                <div className="iss-modal-title">新建问题</div>

                <div className="iss-field-label">标题</div>
                <input
                  className="iss-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="简述这个翻译问题"
                />

                <div className="iss-field-label">描述</div>
                <textarea
                  className="iss-textarea"
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  rows={4}
                  placeholder="详细说明问题与你的建议……"
                />

                <div className="iss-modal-footer">
                  <button
                    className="iss-cancel-btn"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    取消
                  </button>
                  <button
                    className="iss-submit-btn"
                    onClick={submitIssue}
                    disabled={submitting || !newTitle.trim()}
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
