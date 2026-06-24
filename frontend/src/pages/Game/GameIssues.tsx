import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import '../P2IS/P2IS.css'

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
      <main className="p2is-page">
        <div className="browse-wrap">
          <p className="muted">找不到这个游戏项目。</p>
        </div>
      </main>
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

  return (
    <GamePageShell game={game}>
      <main className="p2is-page">
        <div className="browse-wrap">
          <div className="browse-header">
            <div>
              <h1>{game.shortTitle} 问题反馈</h1>
              <p className="muted">
                反馈错字、显示问题、补丁问题或其他建议。
              </p>
            </div>

            <div className="browse-actions">
              {user ? (
                <button
                  className="btn-primary"
                  onClick={() => setShowModal(true)}
                >
                  新建问题
                </button>
              ) : (
                <button
                  className="btn-ghost"
                  onClick={() => navigate('/auth')}
                >
                  登录后创建
                </button>
              )}
            </div>
          </div>

          {loading && <p className="muted">加载中…</p>}

          {!loading && (
            <div className="issues-list">
              {issues.map(issue => (
                <div className="issue-row" key={issue.id}>
                  <div
                    className="issue-row-main"
                    onClick={() => openIssue(issue.id)}
                  >
                    {issue.is_pinned && (
                      <span className="pin-badge">置顶</span>
                    )}

                    <span className="issue-title">{issue.title}</span>

                    <span className="muted">
                      {issue.username ?? '未知用户'}
                    </span>

                    <span className="muted">
                      {new Date(issue.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="issue-admin-actions">
                      <button
                        className="issue-action-btn"
                        onClick={() => togglePin(issue)}
                      >
                        {issue.is_pinned ? '取消置顶' : '置顶'}
                      </button>

                      <button
                        className="issue-action-btn danger"
                        onClick={() => deleteIssue(issue.id)}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {issues.length === 0 && (
                <p className="muted">暂无问题。</p>
              )}
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">新建问题</h3>

              <div className="modal-form">
                <label className="form-label">标题</label>
                <input
                  className="form-input"
                  placeholder="例如：某段文字超框 / 下载链接失效 / 补丁黑屏"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />

                <label className="form-label">内容</label>
                <textarea
                  className="form-input"
                  rows={5}
                  placeholder="请尽量写清楚版本、位置、截图说明、复现步骤。"
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  取消
                </button>

                <button
                  className="btn-primary"
                  onClick={submitIssue}
                  disabled={submitting || !newTitle.trim()}
                >
                  {submitting ? '提交中…' : '提交'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </GamePageShell>
  )
}