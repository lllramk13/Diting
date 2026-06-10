import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import TopNav from '../Home/TopNav'
import P2ISNav from './P2ISNav'
import './P2IS.css'

type Issue = { id: string; title: string; body: string; user_id: string; username?: string; created_at: string }
type Comment = { id: string; body: string; user_id: string; username?: string; created_at: string }

export default function IssuesDetail() {
  const { issueId } = useParams()
  const navigate = useNavigate()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setUser(uid ? { id: uid } : null)
      if (uid) setIsAdmin(await getIsAdmin(uid))
    })

    supabase.from('issues').select('*').eq('id', issueId).single()
      .then(async ({ data: issueData }) => {
        if (!issueData) return
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', issueData.user_id).single()
        setIssue({ ...issueData, username: profile?.username ?? '未知用户' })
      })

    supabase.from('comments').select('*').eq('issue_id', issueId).order('created_at', { ascending: true })
      .then(async ({ data: commentsData }) => {
        if (!commentsData || commentsData.length === 0) { setComments([]); return }
        const userIds = [...new Set(commentsData.map((c: Comment) => c.user_id))]
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds)
        const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string; username: string }) => [p.id, p.username]))
        setComments(commentsData.map((c: Comment) => ({ ...c, username: profileMap[c.user_id] ?? '未知用户' })))
      })
  }, [issueId])

  async function submitComment() {
    if (!newComment.trim() || !user) return
    const { data, error } = await supabase.from('comments').insert({ issue_id: issueId, user_id: user.id, body: newComment }).select().single()
    if (error) { alert(error.message); return }
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    setComments(prev => [...prev, { ...data, username: profile?.username ?? '未知用户' }])
    setNewComment('')
  }

  async function deleteComment(id: string) {
    if (!confirm('确定删除？')) return
    await supabase.from('comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  async function deleteIssue() {
    if (!confirm('确定删除整个讨论？')) return
    await supabase.from('issues').delete().eq('id', issueId)
    navigate('/game/psx/p2is/issues')
  }

  if (!issue) return <div className="p2is-page"><TopNav /></div>

  return (
    <div className="p2is-page">
      <TopNav />
      <div className="browse-wrap">
        <P2ISNav />
        <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate('/game/psx/p2is/issues')}>← 返回</button>

        <div className="issue-detail-header">
          <div className="issue-detail-top">
            <h1>{issue.title}</h1>
            {isAdmin && (
              <button className="issue-action-btn danger" onClick={deleteIssue}>删除讨论</button>
            )}
          </div>
          <p className="muted">{issue.username} · {new Date(issue.created_at).toLocaleDateString('zh-CN')}</p>
          {issue.body && <p className="issue-detail-body">{issue.body}</p>}
        </div>

        <div className="comments-list">
          {comments.map(c => (
            <div className="comment-row" key={c.id}>
              <div style={{ flex: 1 }}>
                <p className="muted" style={{ fontSize: '12px', marginBottom: 4 }}>{c.username} · {new Date(c.created_at).toLocaleDateString('zh-CN')}</p>
                <p>{c.body}</p>
              </div>
              {(isAdmin || c.user_id === user?.id) && (
                <button className="issue-action-btn danger" onClick={() => deleteComment(c.id)}>删除</button>
              )}
            </div>
          ))}
          {comments.length === 0 && <p className="muted">还没有评论</p>}
        </div>

        {user && (
          <div className="comment-input-area">
            <textarea placeholder="写评论..." value={newComment} onChange={e => setNewComment(e.target.value)} />
            <button className="btn-primary" onClick={submitComment}>发送</button>
          </div>
        )}
      </div>
    </div>
  )
}
