import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

type CommentRow = {
  id: string
  issue_id: string
  user_id: string
  body: string
  created_at: string
  username?: string
}

type ProfileRow = {
  id: string
  username: string
}

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

export default function GameIssueDetail() {
  const { gameSlug, issueId } = useParams<{
    gameSlug: string
    issueId: string
  }>()

  const navigate = useNavigate()
  const game = getGameBySlug(gameSlug ?? '')

  const [loading, setLoading] = useState(true)
  const [issue, setIssue] = useState<IssueRow | null>(null)
  const [username, setUsername] = useState('未知用户')
  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pinning, setPinning] = useState(false)

  useEffect(() => {
    const currentGame = getGameBySlug(gameSlug ?? '')

    if (!currentGame || !issueId) {
      setLoading(false)
      return
    }

    async function load(activeGame: ActiveGame) {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null

      setCurrentUserId(uid)

      if (uid) {
        setIsAdmin(await getIsAdmin(uid))
      } else {
        setIsAdmin(false)
      }

      const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .eq('game_slug', activeGame.slug)
        .single()

      if (issueError || !issueData) {
        alert('找不到这个问题，或它不属于当前游戏。')
        navigate(activeGame.routes.issues)
        return
      }

      const typedIssue = issueData as IssueRow
      setIssue(typedIssue)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', typedIssue.user_id)
        .single()

      if (profile) {
        setUsername((profile as ProfileRow).username)
      } else {
        setUsername('未知用户')
      }

      await loadComments()

      setLoading(false)
    }

    async function loadComments() {
      const { data: commentData, error: commentError } = await supabase
        .from('issue_comments')
        .select('*')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true })

      if (commentError) {
        setComments([])
        return
      }

      const rows = (commentData ?? []) as CommentRow[]

      if (rows.length === 0) {
        setComments([])
        return
      }

      const userIds = [...new Set(rows.map(c => c.user_id).filter(Boolean))]
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

      setComments(
        rows.map(c => ({
          ...c,
          username: profileMap[c.user_id] ?? '未知用户',
        })),
      )
    }

    load(currentGame)
  }, [gameSlug, issueId, navigate])

  if (!game) {
    return (
      <main className="p2is-page">
        <div className="browse-wrap">
          <p className="muted">找不到这个游戏项目。</p>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <GamePageShell game={game}>
        <main className="p2is-page">
          <div className="browse-wrap">
            <p className="muted">加载中…</p>
          </div>
        </main>
      </GamePageShell>
    )
  }

  if (!issue) {
    return (
      <GamePageShell game={game}>
        <main className="p2is-page">
          <div className="browse-wrap">
            <p className="muted">找不到这个问题。</p>
          </div>
        </main>
      </GamePageShell>
    )
  }

  async function submitComment() {
    if (!currentUserId || !issueId) {
      alert('请先登录。')
      return
    }

    if (!commentBody.trim()) return

    setSubmitting(true)

    const { data, error } = await supabase
      .from('issue_comments')
      .insert({
        issue_id: issueId,
        user_id: currentUserId,
        body: commentBody.trim(),
      })
      .select()
      .single()

    if (error) {
      alert('评论失败：' + error.message)
      setSubmitting(false)
      return
    }

    const inserted = data as CommentRow

    setComments(prev => [
      ...prev,
      {
        ...inserted,
        username: '我',
      },
    ])

    setCommentBody('')
    setSubmitting(false)
  }

  async function togglePin() {
    if (!issue) return

    const currentGame = getGameBySlug(gameSlug ?? '')
    if (!currentGame) return

    if (issue.game_slug !== currentGame.slug) {
      alert('游戏不匹配，不能操作。')
      return
    }

    setPinning(true)

    const next = !issue.is_pinned

    const { error } = await supabase
      .from('issues')
      .update({ is_pinned: next })
      .eq('id', issue.id)
      .eq('game_slug', currentGame.slug)

    if (error) {
      alert('操作失败：' + error.message)
      setPinning(false)
      return
    }

    setIssue({ ...issue, is_pinned: next })
    setPinning(false)
  }

  async function deleteIssue() {
    if (!issue) return

    const currentGame = getGameBySlug(gameSlug ?? '')
    if (!currentGame) return

    if (issue.game_slug !== currentGame.slug) {
      alert('游戏不匹配，不能删除。')
      return
    }

    if (!confirm('确定删除此问题？')) return

    setDeleting(true)

    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', issue.id)
      .eq('game_slug', currentGame.slug)

    if (error) {
      alert('删除失败：' + error.message)
      setDeleting(false)
      return
    }

    navigate(currentGame.routes.issues)
  }

  return (
    <GamePageShell game={game}>
      <main className="p2is-page">
        <div className="browse-wrap">
          <div className="browse-header">
            <p className="muted">
              <Link to={game.routes.issues}>← 返回问题列表</Link>
            </p>

            <h1>
              {issue.is_pinned && <span className="pin-badge">置顶</span>}
              {' '}
              {issue.title}
            </h1>

            <p className="muted">
              由 {username} 提交 · {new Date(issue.created_at).toLocaleString('zh-CN')}
            </p>

            {issue.body && (
              <p style={{ whiteSpace: 'pre-wrap' }}>
                {issue.body}
              </p>
            )}

            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  className="btn-ghost"
                  onClick={togglePin}
                  disabled={pinning}
                >
                  {pinning
                    ? '处理中…'
                    : issue.is_pinned
                      ? '取消置顶'
                      : '置顶'}
                </button>

                <button
                  className="btn-ghost"
                  onClick={deleteIssue}
                  disabled={deleting}
                >
                  {deleting ? '删除中…' : '删除'}
                </button>
              </div>
            )}
          </div>

          <section className="browse-section">
            <h2 className="section-title">评论</h2>

            <div className="requests-list">
              {comments.map(c => (
                <div key={c.id} className="request-row" style={{ cursor: 'default' }}>
                  <div>
                    <div className="request-meta muted">
                      <span>{c.username ?? '未知用户'}</span>
                      <span>{new Date(c.created_at).toLocaleString('zh-CN')}</span>
                    </div>

                    <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="muted">暂无评论。</p>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <textarea
                className="editor-textarea"
                value={commentBody}
                onChange={e => setCommentBody(e.target.value)}
                placeholder={currentUserId ? '写一条评论…' : '登录后可以评论'}
                disabled={!currentUserId}
                rows={4}
              />

              <div style={{ marginTop: 8 }}>
                <button
                  className="btn-primary"
                  onClick={submitComment}
                  disabled={!currentUserId || submitting || !commentBody.trim()}
                >
                  {submitting ? '发表中…' : '发表评论'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </GamePageShell>
  )
}