import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import TopNav from '../Home/TopNav'
import P2ISNav from './P2ISNav'
import './P2IS.css'

type MainSet = {
  id: string
  title: string
  source_file: string
  user_id: string
  is_completed?: boolean
}

export default function MainSets() {
  const [sets, setSets] = useState<MainSet[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [initProgress, setInitProgress] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setUser(uid ? { id: uid } : null)
      if (uid) setIsAdmin(await getIsAdmin(uid))
    })
    fetchAllOfficialSets().then(data => {
      setSets(data)
      setLoading(false)
      const saved = sessionStorage.getItem('mainsets-scroll')
      if (saved) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved)))
        sessionStorage.removeItem('mainsets-scroll')
      }
    })
  }, [])

  async function fetchAllOfficialSourceFiles(): Promise<Set<string>> {
    const result: string[] = []
    let from = 0
    while (true) {
      const { data } = await supabase
        .from('translation_sets')
        .select('source_file')
        .eq('is_official', true)
        .range(from, from + 999)
      if (!data || data.length === 0) break
      data.forEach((s: { source_file: string }) => result.push(s.source_file))
      if (data.length < 1000) break
      from += 1000
    }
    return new Set(result)
  }

  async function fetchAllOfficialSets(): Promise<MainSet[]> {
    const result: MainSet[] = []
    let from = 0
    while (true) {
      const { data } = await supabase
        .from('translation_sets')
        .select('id, title, source_file, user_id, is_completed')
        .eq('is_official', true)
        .order('source_file')
        .range(from, from + 999)
      if (!data || data.length === 0) break
      result.push(...(data as MainSet[]))
      if (data.length < 1000) break
      from += 1000
    }
    return result
  }

  async function toggleCompleted(setId: string, current: boolean) {
    const next = !current
    const { error } = await supabase
      .from('translation_sets')
      .update({ is_completed: next })
      .eq('id', setId)
    if (error) { alert('操作失败：' + error.message); return }
    setSets(prev => prev.map(s => s.id === setId ? { ...s, is_completed: next } : s))
  }

  async function initOfficialSets() {
    if (!user) return
    setInitializing(true)

    const [indexRes, existingSet] = await Promise.all([
      fetch('/p2is/index.json'),
      fetchAllOfficialSourceFiles(),
    ])
    const allGroups: { group: string; count: number }[] = await indexRes.json()
    const missing = allGroups.filter(g => !existingSet.has(g.group))

    if (missing.length === 0) {
      alert('已全部创建，无需补全。')
      setInitializing(false)
      return
    }

    if (!confirm(`发现 ${missing.length} 个缺少的主集，继续创建？`)) {
      setInitializing(false)
      return
    }

    const rows = missing.map(g => ({
      user_id: user.id,
      title: g.group,
      source_file: g.group,
      is_public: true,
      is_official: true,
    }))
    for (let i = 0; i < rows.length; i += 200) {
      setInitProgress(`${Math.min(i + 200, rows.length)} / ${rows.length}`)
      const { error } = await supabase.from('translation_sets').insert(rows.slice(i, i + 200))
      if (error) { alert('创建失败：' + error.message); setInitializing(false); setInitProgress(''); return }
      await new Promise(r => setTimeout(r, 300))
    }
    setInitProgress('')
    setInitializing(false)
    setSets(await fetchAllOfficialSets())
  }

  async function fork(setId: string, sourceFile: string, title: string) {
    if (!user) { navigate('/auth'); return }
    const { data: entries } = await supabase.from('translation_entries').select('*').eq('set_id', setId)
    const { data: newSet, error } = await supabase
      .from('translation_sets')
      .insert({ user_id: user.id, title: `Fork - ${title}`, forked_from: setId, source_file: sourceFile })
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

  const filtered = sets.filter(s => {
    if (filter && !s.source_file.startsWith(filter)) return false
    if (search && !s.source_file.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const completedCount = sets.filter(s => s.is_completed).length
  const totalCount = sets.length

  return (
    <div className="p2is-page">
      <TopNav />
      <div className="browse-wrap">
        <P2ISNav />
        <div className="browse-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>主集</h1>
            {!loading && totalCount > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  fontSize: 12, padding: '3px 10px',
                  background: 'rgba(80,200,120,0.12)', border: '1px solid rgba(80,200,120,0.25)',
                  borderRadius: 20, color: '#6ee7a0'
                }}>
                  ✓ 已完成 {completedCount}
                </span>
                <span style={{
                  fontSize: 12, padding: '3px 10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20, color: 'rgba(200,220,255,0.5)'
                }}>
                  未完成 {totalCount - completedCount}
                </span>
              </div>
            )}
          </div>
          {user && !loading && (
            <button className="btn-ghost" onClick={initOfficialSets} disabled={initializing}>
              {initializing ? `创建中… ${initProgress}` : sets.length === 0 ? '初始化主集' : '补全主集'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['', 'script', 'field', 'strtbl', 'config', 'contactui', 'mainmenu', 'map_names', 'names', 'nametable'].map(c => (
            <button
              key={c}
              className={filter === c ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={() => setFilter(c)}
            >
              {c === '' ? '全部' : c}
            </button>
          ))}
        </div>

        <div className="editor-search-bar" style={{ marginBottom: 24 }}>
          <input
            className="search-input"
            placeholder="搜索文件组，例如 field · script · strtbl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="muted">{filtered.length} 个</span>
        </div>

        {loading && <p className="muted">加载中…</p>}

        <div className="main-sets-list">
          {filtered.map(s => (
            <div key={s.id} className={`main-set-row${s.is_completed ? ' main-set-completed' : ''}`}>
              <span className="main-badge">主</span>
              {s.is_completed && <span className="completed-badge">✓ 已完成</span>}
              <span className="main-set-name">{s.source_file}</span>
              <div className="main-set-actions">
                <button className="btn-ghost" onClick={() => { sessionStorage.setItem('mainsets-scroll', String(window.scrollY)); navigate(`/game/psx/p2is/edit/${s.id}`) }}>查看</button>
                <button className="btn-primary" onClick={() => { sessionStorage.setItem('mainsets-scroll', String(window.scrollY)); fork(s.id, s.source_file, s.title) }}>Fork</button>
                {isAdmin && (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, color: s.is_completed ? 'rgba(248,81,73,0.7)' : '#6ee7a0' }}
                    onClick={() => toggleCompleted(s.id, !!s.is_completed)}
                  >
                    {s.is_completed ? '取消完成' : '标记完成'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
