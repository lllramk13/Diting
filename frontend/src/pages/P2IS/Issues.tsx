import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import TopNav from '../Home/TopNav'
import P2ISNav from './P2ISNav'
import './P2IS.css'

type IssueRow = {
  id: string
  title: string
  body: string
  user_id: string
  is_pinned: boolean
  created_at: string
}

export default function Issues() {
  const navigate = useNavigate()
  const [issues, setIssues] = useState<IssueRow[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setUser(uid ? { id: uid } : null)
      if (uid) setIsAdmin(await getIsAdmin(uid))
    })
    supabase
      .from('issues')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => setIssues((data as IssueRow[]) ?? []))
  }, [])

  async function submitIssue() {
    if (!newTitle.trim() || !user) return
    const { data, error } = await supabase
      .from('issues')
      .insert({ title: newTitle, body: newBody, user_id: user.id })
      .select()
      .single()
    if (error) { alert(error.message); return }
    setIssues(prev => [data as IssueRow, ...prev])
    setNewTitle('')
    setNewBody('')
    setShowModal(false)
  }

  async function togglePin(issue: IssueRow) {
    const next = !issue.is_pinned
    await supabase.from('issues').update({ is_pinned: next }).eq('id', issue.id)
    setIssues(prev => {
      const updated = prev.map(i => i.id === issue.id ? { ...i, is_pinned: next } : i)
      return [...updated.filter(i => i.is_pinned), ...updated.filter(i => !i.is_pinned)]
    })
  }

  async function deleteIssue(id: string) {
    if (!confirm('确定删除此问题？')) return
    await supabase.from('issues').delete().eq('id', id)
    setIssues(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="p2is-page">
      <TopNav />
      <div className="browse-wrap">
        <P2ISNav />
        <div className="browse-header">
          <h1>问题</h1>
          <div className="browse-actions">
            {user && <button className="btn-primary" onClick={() => setShowModal(true)}>新建问题</button>}
          </div>
        </div>

        <div className="issues-list">
          {issues.map(issue => (
            <div className="issue-row" key={issue.id}>
              <div className="issue-row-main" onClick={() => navigate(`/game/psx/p2is/issues/${issue.id}`)}>
                {issue.is_pinned && <span className="pin-badge">置顶</span>}
                <span className="issue-title">{issue.title}</span>
                <span className="muted">{new Date(issue.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
              {isAdmin && (
                <div className="issue-admin-actions">
                  <button className="issue-action-btn" onClick={() => togglePin(issue)}>
                    {issue.is_pinned ? '取消置顶' : '置顶'}
                  </button>
                  <button className="issue-action-btn danger" onClick={() => deleteIssue(issue.id)}>删除</button>
                </div>
              )}
            </div>
          ))}
          {issues.length === 0 && <p className="muted">暂无问题</p>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">新建问题</h3>
            <div className="modal-form">
              <label className="form-label">标题</label>
              <input className="form-input" placeholder="标题" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <label className="form-label">内容（可选）</label>
              <textarea className="form-input" rows={4} placeholder="详细说明" value={newBody} onChange={e => setNewBody(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn-primary" onClick={submitIssue}>提交</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
