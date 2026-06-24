import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import type { GameConfig } from '../../games/types'
import GamePageShell from './GamePageShell'
import '../P2IS/P2IS.css'

type SourceRow = { id: string; jp: string; zh: string }
type DiffEntry = { string_id: string; content: string; jp: string; original_zh: string }
type MRComment = { id: string; user_id: string; body: string; created_at: string; username: string }

function formatControlNewlines(text: string) {
  return text.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n')
}

export default function GameRequestDetail() {
  const { gameSlug, requestId } = useParams<{ gameSlug: string; requestId: string }>()
  const navigate = useNavigate()
  const game = getGameBySlug(gameSlug ?? '')

  const [request, setRequest] = useState<{
    id: string; title: string; description: string; status: string;
    from_set_id: string; to_set_id: string; user_id: string; created_at: string;
    game_slug: string;
    snapshot?: Record<string, string> | null; base_snapshot?: Record<string, string> | null
  } | null>(null)
  const [author, setAuthor] = useState('')
  const [sourceFile, setSourceFile] = useState('')
  const [diff, setDiff] = useState<DiffEntry[]>([])
  const [myVote, setMyVote] = useState<number>(0)
  const [score, setScore] = useState(0)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPRModal, setShowPRModal] = useState(false)
  const [merging, setMerging] = useState(false)
  const [comments, setComments] = useState<MRComment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    const currentGame = getGameBySlug(gameSlug ?? '')
    if (!currentGame || !requestId) { setLoading(false); return }

    async function load(activeGame: GameConfig) {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null
      setUser(uid ? { id: uid } : null)

      const { data: req } = await supabase
        .from('merge_requests')
        .select('*')
        .eq('id', requestId)
        .eq('game_slug', activeGame.slug)
        .single()
      if (!req) { navigate(activeGame.routes.requests); return }
      setRequest(req)

      const [{ data: fromProfile }, { data: toSet }] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', req.user_id).single(),
        supabase.from('translation_sets').select('source_file, user_id').eq('id', req.to_set_id).single(),
      ])
      setAuthor(fromProfile?.username ?? '未知用户')
      setSourceFile(toSet?.source_file ?? '')
      if (uid) {
        setIsOwner(await getIsAdmin(uid))
        setIsAuthor(uid === req.user_id)
      }

      // load diff — use snapshots if available, fall back to live entries
      const snapshot = req.snapshot as Record<string, string> | null
      const base_snapshot = req.base_snapshot as Record<string, string> | null
      const fromEntries: { string_id: string; content: string }[] = snapshot
        ? Object.entries(snapshot).map(([string_id, content]) => ({ string_id, content }))
        : (await supabase.from('translation_entries').select('string_id, content').eq('set_id', req.from_set_id)).data ?? []
      const toMap: Record<string, string> = base_snapshot ?? {}
      if (!base_snapshot) {
        const { data: toEntries } = await supabase
          .from('translation_entries').select('string_id, content').eq('set_id', req.to_set_id)
        toEntries?.forEach((e: { string_id: string; content: string }) => { toMap[e.string_id] = e.content })
      }

      if (fromEntries.length > 0 && toSet?.source_file) {
        const groupFile = toSet.source_file.replaceAll(':', '_')
        const res = await fetch(`${activeGame.dataPath}/groups/${groupFile}.json`)
        const sourceStrings: SourceRow[] = await res.json()
        const srcMap: Record<string, string> = {}
        const jpMap: Record<string, string> = {}
        sourceStrings.forEach(s => { srcMap[s.id] = s.zh; jpMap[s.id] = s.jp })

        const changed = fromEntries
          .filter((e: { string_id: string; content: string }) =>
            e.content.trim() && e.content.trim() !== (toMap[e.string_id] ?? '').trim()
          )
          .map((e: { string_id: string; content: string }) => ({
            string_id: e.string_id,
            content: e.content,
            jp: jpMap[e.string_id] ?? '',
            original_zh: toMap[e.string_id] || srcMap[e.string_id] || '',
          }))
        setDiff(changed)
      }

      // votes
      const { data: votes } = await supabase
        .from('merge_request_votes').select('user_id, vote').eq('request_id', requestId)
      const total = votes?.reduce((n: number, v: { vote: number }) => n + v.vote, 0) ?? 0
      setScore(total)
      if (uid) {
        const mine = votes?.find((v: { user_id: string; vote: number }) => v.user_id === uid)
        setMyVote(mine?.vote ?? 0)
      }
      // comments
      const { data: commentRows } = await supabase
        .from('merge_request_comments')
        .select('id, user_id, body, created_at, profiles(username)')
        .eq('request_id', requestId)
        .order('created_at')
      setComments((commentRows ?? []).map((c: { id: string; user_id: string; body: string; created_at: string; profiles: { username: string }[] | null }) => ({
        id: c.id, user_id: c.user_id, body: c.body, created_at: c.created_at,
        username: (Array.isArray(c.profiles) ? c.profiles[0]?.username : (c.profiles as { username: string } | null)?.username) ?? '未知用户',
      })))

      setLoading(false)
    }
    load(currentGame)
  }, [gameSlug, requestId, navigate])

  async function vote(v: number) {
    if (!user || !requestId) return
    const next = myVote === v ? 0 : v
    if (next === 0) {
      await supabase.from('merge_request_votes').delete().eq('request_id', requestId).eq('user_id', user.id)
    } else {
      await supabase.from('merge_request_votes').upsert({ request_id: requestId, user_id: user.id, vote: next }, { onConflict: 'request_id,user_id' })
    }
    setScore(s => s - myVote + next)
    setMyVote(next)
  }

  async function merge() {
    if (!request || !isOwner) return
    setMerging(true)
    const rows = diff.map(d => ({
      set_id: request.to_set_id,
      string_id: d.string_id,
      content: d.content,
      sort_order: 0,
      updated_at: new Date().toISOString(),
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('translation_entries').upsert(rows, { onConflict: 'set_id,string_id' })
      if (error) { alert('合并失败：' + error.message); setMerging(false); return }
    }
    await supabase.from('merge_requests').update({ status: 'merged' }).eq('id', request.id)
    setRequest(r => r ? { ...r, status: 'merged' } : r)
    setMerging(false)
    setShowPRModal(false)
  }

  async function reject() {
    if (!request || !isOwner) return
    await supabase.from('merge_requests').update({ status: 'rejected' }).eq('id', request.id)
    setRequest(r => r ? { ...r, status: 'rejected' } : r)
  }

  async function submitComment() {
    if (!user || !commentBody.trim() || !requestId) return
    setSubmittingComment(true)
    const { data, error } = await supabase
      .from('merge_request_comments')
      .insert({ request_id: requestId, user_id: user.id, body: commentBody.trim() })
      .select('id, user_id, body, created_at, profiles(username)')
      .single()
    if (error) { alert('发送失败：' + error.message); setSubmittingComment(false); return }
    const c = data as { id: string; user_id: string; body: string; created_at: string; profiles: { username: string }[] | null }
    const username = (Array.isArray(c.profiles) ? c.profiles[0]?.username : (c.profiles as { username: string } | null)?.username) ?? '未知用户'
    setComments(prev => [...prev, { id: c.id, user_id: c.user_id, body: c.body, created_at: c.created_at, username }])
    setCommentBody('')
    setSubmittingComment(false)
  }

  async function deleteComment(id: string, commentUserId: string) {
    if (!user || (user.id !== commentUserId && !isOwner)) return
    await supabase.from('merge_request_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  async function deleteRequest() {
    if (!request || !game || (!isAuthor && !isOwner)) return
    if (!confirm('确定删除此请求？此操作不可撤销。')) return
    const { error } = await supabase.from('merge_requests').delete().eq('id', request.id)
    if (error) { alert('删除失败：' + error.message); return }
    navigate(game.routes.requests)
  }

  if (!game) {
    return (
      <main className="p2is-page">
        <div className="browse-wrap"><p className="muted">找不到这个游戏项目。</p></div>
      </main>
    )
  }

  if (loading) return (
    <GamePageShell game={game}>
      <main className="p2is-page"><div className="browse-wrap"><p className="muted">加载中…</p></div></main>
    </GamePageShell>
  )
  if (!request) return null

  const isOpen = request.status === 'open'

  return (
    <GamePageShell game={game}>
      <main className="p2is-page">
        <div className="browse-wrap">
          <div className="request-detail-header">
            <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(game.routes.requests)}>← 返回</button>
            <div className="request-detail-top">
              <div>
                <h2 className="request-detail-title">{request.title}</h2>
                <div className="request-meta muted">
                  <span className={`request-status-badge ${request.status}`}>{request.status === 'open' ? '开放' : request.status === 'merged' ? '已合并' : '已拒绝'}</span>
                  {sourceFile && <span className="set-source-tag">{sourceFile}</span>}
                  <span>{author}</span>
                  <span>{new Date(request.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                {request.description && <p className="request-detail-body">{request.description}</p>}
              </div>
              <div className="request-vote-block">
                <button className={`vote-btn up ${myVote === 1 ? 'active' : ''}`} onClick={() => vote(1)} disabled={!user || !isOpen}>
                  ▲
                </button>
                <span className={`vote-score ${score > 0 ? 'vote-pos' : score < 0 ? 'vote-neg' : ''}`}>{score}</span>
                <button className={`vote-btn down ${myVote === -1 ? 'active' : ''}`} onClick={() => vote(-1)} disabled={!user || !isOpen}>
                  ▼
                </button>
              </div>
            </div>
          </div>

          <section className="browse-section">
            <h2 className="section-title">变更 {diff.length} 句</h2>
            <div className="diff-list">
              {diff.map(d => (
                <div key={d.string_id} className="diff-row">
                  <div className="entry-ja">{formatControlNewlines(d.jp)}</div>
                  <div className="diff-compare">
                    <div className="diff-before">
                      <span className="diff-label">原</span>
                      <span>{d.original_zh ? formatControlNewlines(d.original_zh) : <span className="muted">(空)</span>}</span>
                    </div>
                    <div className="diff-arrow">→</div>
                    <div className="diff-after">
                      <span className="diff-label">新</span>
                      <span>{formatControlNewlines(d.content)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {diff.length === 0 && <p className="muted">无变更内容。</p>}
            </div>
          </section>

          {isOwner && isOpen && (
            <div className="request-actions">
              <button className="btn-primary" onClick={() => setShowPRModal(true)} disabled={merging}>合并</button>
              <button className="btn-ghost" onClick={reject}>拒绝</button>
            </div>
          )}
          {(isAuthor || isOwner) && isOpen && (
            <div className="request-actions" style={{ marginTop: 8 }}>
              <button className="btn-ghost" style={{ color: '#f87171' }} onClick={deleteRequest}>删除请求</button>
            </div>
          )}

          <section className="browse-section" style={{ marginTop: 32 }}>
            <h2 className="section-title">留言 {comments.length > 0 ? `· ${comments.length}` : ''}</h2>
            <div className="issue-comments">
              {comments.map(c => (
                <div key={c.id} className="issue-comment">
                  <div className="comment-meta">
                    <span className="comment-author">{c.username}</span>
                    <span className="muted">{new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
                    {(user?.id === c.user_id || isOwner) && (
                      <button className="btn-ghost" style={{ fontSize: 11, padding: '2px 8px', color: '#f87171', marginLeft: 'auto' }} onClick={() => deleteComment(c.id, c.user_id)}>删除</button>
                    )}
                  </div>
                  <div className="comment-body">{c.body}</div>
                </div>
              ))}
              {comments.length === 0 && <p className="muted">暂无留言。</p>}
            </div>
            {user && (
              <div className="comment-form" style={{ marginTop: 16 }}>
                <textarea
                  className="entry-input"
                  rows={3}
                  placeholder="留下评论…"
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn-primary" onClick={submitComment} disabled={submittingComment || !commentBody.trim()}>
                    {submittingComment ? '发送中…' : '发送'}
                  </button>
                </div>
              </div>
            )}
            {!user && <p className="muted" style={{ marginTop: 12 }}>登录后可留言。</p>}
          </section>
        </div>

        {showPRModal && (
          <div className="modal-overlay" onClick={() => setShowPRModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">确认合并</h3>
              <div className="modal-form">
                <p style={{ fontSize: 14, color: 'rgba(200,220,255,0.7)' }}>
                  将 {diff.length} 句变更写入主集 <strong>{sourceFile}</strong>，此操作不可撤销。
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn-ghost" onClick={() => setShowPRModal(false)}>取消</button>
                <button className="btn-primary" onClick={merge} disabled={merging}>{merging ? '合并中…' : '确认合并'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </GamePageShell>
  )
}
