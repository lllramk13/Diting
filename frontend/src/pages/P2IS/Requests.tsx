import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import TopNav from '../Home/TopNav'
import P2ISNav from './P2ISNav'
import './P2IS.css'

type RequestRow = {
  id: string
  title: string
  description: string
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
}

export default function Requests() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bulkMerging, setBulkMerging] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null
      if (uid) setIsAdmin(await getIsAdmin(uid))

      const { data } = await supabase
        .from('merge_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      // fetch usernames
      const userIds = [...new Set(data.map((r: RequestRow) => r.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)
      const profileMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; username: string }) => { profileMap[p.id] = p.username })

      // fetch source_file from to_set
      const toSetIds = [...new Set(data.map((r: RequestRow) => r.to_set_id))]
      const { data: toSets } = await supabase
        .from('translation_sets')
        .select('id, source_file')
        .in('id', toSetIds)
      const setMap: Record<string, string> = {}
      toSets?.forEach((s: { id: string; source_file: string }) => { setMap[s.id] = s.source_file })

      // fetch vote scores
      const reqIds = data.map((r: RequestRow) => r.id)
      const { data: votes } = await supabase
        .from('merge_request_votes')
        .select('request_id, vote')
        .in('request_id', reqIds)
      const scoreMap: Record<string, number> = {}
      votes?.forEach((v: { request_id: string; vote: number }) => {
        scoreMap[v.request_id] = (scoreMap[v.request_id] ?? 0) + v.vote
      })

      setRequests(data.map((r: RequestRow) => ({
        ...r,
        username: profileMap[r.user_id] ?? '未知用户',
        source_file: setMap[r.to_set_id] ?? '',
        vote_score: scoreMap[r.id] ?? 0,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const open = requests.filter(r => r.status === 'open')
  const closed = requests.filter(r => r.status !== 'open')

  function downloadOpenChanges() {
    const result = open.map(r => {
      const snap = r.snapshot ?? {}
      const base = r.base_snapshot ?? {}
      const changes: Record<string, { original: string; new: string }> = {}
      for (const [sid, newContent] of Object.entries(snap)) {
        const orig = base[sid] ?? ''
        if (newContent.trim() && newContent.trim() !== orig.trim()) {
          changes[sid] = { original: orig, new: newContent }
        }
      }
      return { id: r.id, title: r.title, source_file: r.source_file ?? '', changes }
    }).filter(r => Object.keys(r.changes).length > 0)

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'open_requests_changes.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function mergeAll() {
    setBulkMerging(true)
    const mergedIds: string[] = []
    const skipped: string[] = []

    for (const r of open) {
      if (!r.snapshot) { skipped.push(r.title); continue }
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
        if (error) { alert(`合并「${r.title}」失败：${error.message}`); setBulkMerging(false); return }
      }
      mergedIds.push(r.id)
    }

    if (mergedIds.length > 0) {
      await supabase.from('merge_requests').update({ status: 'merged' }).in('id', mergedIds)
      setRequests(prev => prev.map(r => mergedIds.includes(r.id) ? { ...r, status: 'merged' } : r))
    }

    setBulkMerging(false)
    setShowBulkModal(false)
    if (skipped.length > 0) alert(`已合并 ${mergedIds.length} 个。\n以下请求因无快照数据被跳过：\n${skipped.join('\n')}`)
  }

  // count of requests that can actually be merged (have snapshot data)
  const mergeableCount = open.filter(r => r.snapshot).length

  return (
    <div className="p2is-page">
      <TopNav />
      <div className="browse-wrap">
        <P2ISNav />
        <div className="browse-header">
          <h1>合并请求</h1>
        </div>
        {loading && <p className="muted">加载中…</p>}

        {open.length > 0 && (
          <section className="browse-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h2 className="section-title" style={{ margin: 0 }}>开放中 {open.length}</h2>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '3px 10px' }} onClick={downloadOpenChanges}>
                下载改动
              </button>
              {isAdmin && (
                <button className="btn-primary" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => setShowBulkModal(true)}>
                  一键合并全部
                </button>
              )}
            </div>
            <div className="requests-list">
              {open.map(r => (
                <div key={r.id} className="request-row" onClick={() => navigate(`/game/psx/p2is/requests/${r.id}`)}>
                  <div className="request-main">
                    <span className="request-status-dot open" />
                    <div>
                      <div className="request-title">{r.title}</div>
                      <div className="request-meta muted">
                        {r.source_file && <span className="set-source-tag">{r.source_file}</span>}
                        <span>{r.username}</span>
                        <span>{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="request-score">
                    <span className={r.vote_score! >= 0 ? 'vote-pos' : 'vote-neg'}>
                      {r.vote_score! > 0 ? '+' : ''}{r.vote_score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {closed.length > 0 && (
          <section className="browse-section">
            <h2 className="section-title">已关闭 {closed.length}</h2>
            <div className="requests-list">
              {closed.map(r => (
                <div key={r.id} className="request-row closed" onClick={() => navigate(`/game/psx/p2is/requests/${r.id}`)}>
                  <div className="request-main">
                    <span className={`request-status-dot ${r.status}`} />
                    <div>
                      <div className="request-title">{r.title}</div>
                      <div className="request-meta muted">
                        {r.source_file && <span className="set-source-tag">{r.source_file}</span>}
                        <span>{r.username}</span>
                        <span>{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="request-score muted">{r.vote_score}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && requests.length === 0 && (
          <p className="muted">暂无合并请求。Fork 主集并修改后，可以在编辑器中提交。</p>
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
              <button className="btn-ghost" onClick={() => setShowBulkModal(false)}>取消</button>
              <button className="btn-primary" onClick={mergeAll} disabled={bulkMerging}>
                {bulkMerging ? '合并中…' : '确认合并'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
