import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import TopNav from '../Home/TopNav'
import './P2IS.css'

type SourceRow = { id: string; jp: string; zh: string; speaker_jp?: string; speaker_zh?: string }
type ResultGroup = { group: string; officialSetId: string | null; entries: SourceRow[] }

export default function Search() {
  const [query, setQuery] = useState('')
  const [allStrings, setAllStrings] = useState<SourceRow[] | null>(null)
  const [officialMap, setOfficialMap] = useState<Record<string, string>>({})
  const [results, setResults] = useState<ResultGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null)
    })
    async function loadOfficialMap() {
      const map: Record<string, string> = {}
      let from = 0
      while (true) {
        const { data } = await supabase
          .from('translation_sets')
          .select('id, source_file')
          .eq('is_official', true)
          .range(from, from + 999)
        if (!data || data.length === 0) break
        data.forEach((s: { id: string; source_file: string | null }) => {
          if (s.source_file) map[s.source_file] = s.id
        })
        if (data.length < 1000) break
        from += 1000
      }
      setOfficialMap(map)
    }
    loadOfficialMap()
  }, [])

  async function ensureData() {
    if (allStrings) return allStrings
    setLoadingData(true)
    const res = await fetch('/merged_jp_zh.json')
    const data: SourceRow[] = await res.json()
    setAllStrings(data)
    setLoadingData(false)
    return data
  }

  function handleQuery(q: string) {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const data = await ensureData()
      const lower = q.toLowerCase()
      const matched = data.filter(s =>
        s.jp.toLowerCase().includes(lower) ||
        s.zh.toLowerCase().includes(lower)
      )
      // group by src:file prefix
      const groupMap: Record<string, SourceRow[]> = {}
      for (const s of matched) {
        const parts = s.id.split(':')
        const group = parts[0] + ':' + parts[1]
        if (!groupMap[group]) groupMap[group] = []
        groupMap[group].push(s)
      }
      const grouped: ResultGroup[] = Object.entries(groupMap)
        .map(([group, entries]) => ({ group, officialSetId: officialMap[group] ?? null, entries }))
        .sort((a, b) => b.entries.length - a.entries.length)
        .slice(0, 30)
      setResults(grouped)
      setLoading(false)
    }, 350)
  }

  async function fork(setId: string) {
    if (!user) { navigate('/auth'); return }
    const { data: parentSet } = await supabase.from('translation_sets').select('source_file, title').eq('id', setId).single()
    const { data: entries } = await supabase.from('translation_entries').select('*').eq('set_id', setId)
    const { data: newSet, error } = await supabase
      .from('translation_sets')
      .insert({
        user_id: user.id,
        title: `Fork - ${parentSet?.title ?? '译文'}`,
        forked_from: setId,
        source_file: parentSet?.source_file ?? null,
      })
      .select()
      .single()
    if (!error && newSet && entries && entries.length > 0) {
      await supabase.from('translation_entries').insert(
        entries.map((e: { string_id: string; content: string; sort_order: number }) => ({
          set_id: newSet.id,
          string_id: e.string_id,
          content: e.content,
          sort_order: e.sort_order,
        }))
      )
    }
    if (!error && newSet) navigate(`/game/psx/p2is/edit/${newSet.id}`)
  }

  const totalMatches = results.reduce((n, g) => n + g.entries.length, 0)

  return (
    <div className="p2is-page">
      <TopNav />
      <div className="search-wrap">
        <div className="search-header">
          <button className="btn-ghost search-back" onClick={() => navigate('/game/psx/p2is')}>← 返回</button>
          <h1>搜索译文</h1>
        </div>
        <div className="search-bar-large">
          <input
            className="search-input-large"
            autoFocus
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="输入日文或中文..."
          />
          {loadingData && <span className="muted search-loading">加载数据中…</span>}
          {loading && !loadingData && <span className="muted search-loading">搜索中…</span>}
          {!loading && query && <span className="muted search-loading">{totalMatches} 条结果，{results.length} 个文件</span>}
        </div>

        <div className="search-results">
          {results.map(g => (
            <div key={g.group} className="search-group">
              <div className="search-group-header">
                <span className="search-group-name">{g.group}</span>
                <span className="muted">{g.entries.length} 条</span>
                <div className="search-group-actions">
                  {g.officialSetId ? (
                    <>
                      <button className="btn-ghost" onClick={() => navigate(`/game/psx/p2is/edit/${g.officialSetId}`)}>查看主集</button>
                      <button className="btn-primary" onClick={() => fork(g.officialSetId!)}>Fork</button>
                    </>
                  ) : (
                    <span className="muted">无主集</span>
                  )}
                </div>
              </div>
              <div className="search-entries">
                {g.entries.slice(0, 5).map(s => (
                  <div key={s.id} className="search-entry">
                    <div className="entry-ja">{s.jp}</div>
                    <div className="entry-ds">{s.zh}</div>
                  </div>
                ))}
                {g.entries.length > 5 && (
                  <div className="muted search-more">…还有 {g.entries.length - 5} 条</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
