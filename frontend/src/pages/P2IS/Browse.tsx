import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import TopNav from '../Home/TopNav'
import P2ISNav from './P2ISNav'
import './P2IS.css'

type SetRow = {
  id: string
  title: string
  source_file?: string
  username?: string
  vote_count?: number
  changed_count?: number
  is_public?: boolean
  created_at: string
}

type UserSession = { id: string } | null

export default function Browse() {
  const [publicSets, setPublicSets] = useState<SetRow[]>([])
  const [mySets, setMySets] = useState<SetRow[]>([])
  const [mergedCount, setMergedCount] = useState(0)
  const [user, setUser] = useState<UserSession>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUser(uid ? { id: uid } : null)
      if (uid) {
        supabase
          .from('translation_sets')
          .select('id, title, source_file, is_public, created_at')
          .eq('user_id', uid)
          .neq('is_official', true)
          .order('created_at', { ascending: false })
          .then(({ data: mine }) => setMySets((mine as SetRow[]) ?? []))
        supabase
          .from('merge_requests')
          .select('id', { count: 'exact' })
          .eq('user_id', uid)
          .eq('status', 'merged')
          .then(({ count }) => setMergedCount(count ?? 0))
      }
    })
    supabase
      .from('public_sets_with_stats')
      .select('*')
      .neq('is_official', true)
      .order('vote_count', { ascending: false })
      .then(({ data }) => {
        setPublicSets((data as SetRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  async function forkSet(setId: string) {
    if (!user) { navigate('/auth'); return }
    const { data: parentSet } = await supabase.from('translation_sets').select('source_file, title').eq('id', setId).single()
    const { data: entries } = await supabase.from('translation_entries').select('*').eq('set_id', setId)
    const { data: newSet, error } = await supabase
      .from('translation_sets')
      .insert({ user_id: user.id, title: `Fork - ${parentSet?.title ?? '译文'}`, forked_from: setId, source_file: parentSet?.source_file ?? null })
      .select()
      .single()
    if (error) { alert('Fork 失败：' + error.message); return }
    if (newSet && entries && entries.length > 0) {
      await supabase.from('translation_entries').insert(
        entries.map((e: { string_id: string; content: string; sort_order: number }) => ({
          set_id: newSet.id, string_id: e.string_id, content: e.content, sort_order: e.sort_order,
        }))
      )
    }
    if (newSet) navigate(`/game/psx/p2is/edit/${newSet.id}`)
  }

  async function deleteSet(setId: string) {
    if (!confirm('确定删除？此操作不可撤销。')) return
    await supabase.from('translation_sets').delete().eq('id', setId)
    setMySets(prev => prev.filter(s => s.id !== setId))
  }

  return (
    <div className="p2is-page">
      <TopNav />
      <div className="browse-wrap">
        <P2ISNav />
        <div className="browse-header">
          <h1>社区译文</h1>
        </div>

        {user && mySets.length > 0 && (
          <section className="browse-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>我的译文集</h2>
              {mergedCount > 0 && (
                <span style={{ fontSize: 12, padding: '2px 10px', background: 'rgba(80,200,120,0.12)', border: '1px solid rgba(80,200,120,0.25)', borderRadius: 20, color: '#6ee7a0' }}>
                  ✓ {mergedCount} 次采纳
                </span>
              )}
            </div>
            <div className="sets-grid">
              {mySets.map(s => (
                <div className="set-card" key={s.id}>
                  <div className="set-card-title">{s.title}</div>
                  <div className="set-card-meta">
                    <span>{s.is_public ? '公开' : '私有'}</span>
                    {s.source_file && <span className="set-source-tag">{s.source_file}</span>}
                  </div>
                  <div className="set-card-actions">
                    <button onClick={() => navigate(`/game/psx/p2is/edit/${s.id}`)}>编辑</button>
                    <button onClick={() => deleteSet(s.id)}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="browse-section">
          <h2 className="section-title">公开译文</h2>
          {loading && <p className="muted">加载中…</p>}
          {!loading && publicSets.length === 0 && (
            <p className="muted">还没有公开译文。去主集页面 Fork 一个开始翻译吧。</p>
          )}
          <div className="sets-grid">
            {publicSets.map(s => (
              <div className="set-card" key={s.id}>
                <div className="set-card-title">{s.title}</div>
                <div className="set-card-meta">
                  <span>{s.username}</span>
                  <span>{s.changed_count} 句已翻</span>
                  <span>♥ {s.vote_count}</span>
                </div>
                {s.source_file && <div className="set-source-tag">{s.source_file}</div>}
                <div className="set-card-actions">
                  <button onClick={() => navigate(`/game/psx/p2is/edit/${s.id}`)}>查看</button>
                  <button onClick={() => forkSet(s.id)}>Fork</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
