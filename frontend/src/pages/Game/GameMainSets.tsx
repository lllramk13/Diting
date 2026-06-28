import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameMainSets.css'

type MainSet = {
  id: string
  title: string
  source_file: string
  user_id: string
  is_completed?: boolean
}

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

export default function GameMainSets() {
  const { gameSlug } = useParams()
  const game = getGameBySlug(gameSlug ?? '')

  const [sets, setSets] = useState<MainSet[]>([])
  const [dupSets, setDupSets] = useState<MainSet[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [initProgress, setInitProgress] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    const activeGame = getGameBySlug(gameSlug ?? '')

    if (!activeGame) {
      setLoading(false)
      return
    }

    async function load(currentGame: ActiveGame) {
      setLoading(true)

      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null

      setUser(uid ? { id: uid } : null)

      if (uid) {
        setIsAdmin(await getIsAdmin(uid))
      } else {
        setIsAdmin(false)
      }

      const officialSets = await fetchAllOfficialSets(currentGame)

      setSets(officialSets.filter(s => !(s.source_file ?? '').startsWith('dup:')))
      setDupSets(officialSets.filter(s => (s.source_file ?? '').startsWith('dup:')))
      setLoading(false)

      const saved = sessionStorage.getItem('mainsets-scroll')

      if (saved) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved)))
        sessionStorage.removeItem('mainsets-scroll')
      }
    }

    load(activeGame)
  }, [gameSlug])

  async function fetchAllOfficialSourceFiles(currentGame: ActiveGame): Promise<Set<string>> {
    const result: string[] = []
    let from = 0

    while (true) {
      const { data } = await supabase
        .from('translation_sets')
        .select('source_file')
        .eq('game_slug', currentGame.slug)
        .eq('is_official', true)
        .range(from, from + 999)

      if (!data || data.length === 0) break

      data.forEach((s: { source_file: string }) => {
        result.push(s.source_file)
      })

      if (data.length < 1000) break
      from += 1000
    }

    return new Set(result)
  }

  async function fetchAllOfficialSets(currentGame: ActiveGame): Promise<MainSet[]> {
    const result: MainSet[] = []
    let from = 0

    while (true) {
      const { data } = await supabase
        .from('translation_sets')
        .select('id, title, source_file, user_id, is_completed')
        .eq('game_slug', currentGame.slug)
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

    if (error) {
      alert('操作失败：' + error.message)
      return
    }

    setSets(prev =>
      prev.map(s => (s.id === setId ? { ...s, is_completed: next } : s)),
    )
  }

  async function initOfficialSets() {
    if (!user || !game) return

    setInitializing(true)

    const [indexRes, dupsRes, existingSet] = await Promise.all([
      fetch(game.groupIndexPath),
      fetch(`${game.dataPath}/dups_index.json`),
      fetchAllOfficialSourceFiles(game),
    ])

    const indexText = await indexRes.text()
    if (!indexRes.ok || !indexText.trim().startsWith('[')) {
      alert(`读取 ${game.groupIndexPath} 失败`)
      setInitializing(false)
      return
    }

    const allGroups: { group: string; count: number }[] = JSON.parse(indexText)
    const missing = allGroups.filter(g => !existingSet.has(g.group))

    // dup sets (one per category); dups_index.json may be absent on older deploys,
    // in which case the dev server returns the SPA index.html fallback (200 + HTML) — guard it.
    let dupCats: { category: string; set_key: string; count: number }[] = []
    try {
      const dupsText = await dupsRes.text()
      if (dupsRes.ok && dupsText.trim().startsWith('[')) {
        dupCats = JSON.parse(dupsText)
      }
    } catch {
      dupCats = []
    }
    const missingDups = dupCats.filter(d => !existingSet.has(d.set_key))

    if (missing.length === 0 && missingDups.length === 0) {
      alert('已全部创建，无需补全。')
      setInitializing(false)
      return
    }

    if (!confirm(`发现 ${missing.length} 个缺少的主集、${missingDups.length} 个重复集，继续创建？`)) {
      setInitializing(false)
      return
    }

    const rows = [
      ...missing.map(g => ({
        user_id: user.id,
        title: g.group,
        source_file: g.group,
        is_public: true,
        is_official: true,
        is_completed: false,
        game_slug: game.slug,
      })),
      ...missingDups.map(d => ({
        user_id: user.id,
        title: `重复 · ${d.category}`,
        source_file: d.set_key,
        is_public: true,
        is_official: true,
        is_completed: false,
        game_slug: game.slug,
      })),
    ]

    for (let i = 0; i < rows.length; i += 200) {
      setInitProgress(`${Math.min(i + 200, rows.length)} / ${rows.length}`)

      const { error } = await supabase
        .from('translation_sets')
        .insert(rows.slice(i, i + 200))

      if (error) {
        alert('创建失败：' + error.message)
        setInitializing(false)
        setInitProgress('')
        return
      }

      await new Promise(r => setTimeout(r, 300))
    }

    setInitProgress('')
    setInitializing(false)
    const refreshed = await fetchAllOfficialSets(game)
    setSets(refreshed.filter(s => !(s.source_file ?? '').startsWith('dup:')))
    setDupSets(refreshed.filter(s => (s.source_file ?? '').startsWith('dup:')))
  }

  async function fork(setId: string, sourceFile: string, title: string) {
    if (!game) return

    if (!user) {
      navigate('/auth')
      return
    }


    const { data: newSet, error } = await supabase
      .from('translation_sets')
      .insert({
        user_id: user.id,
        title: `Fork - ${title}`,
        forked_from: setId,
        source_file: sourceFile,
        is_public: false,
        is_official: false,
        is_completed: false,
        game_slug: game.slug,
        storage_version: 2,
      })
      .select()
      .single()

    if (error) {
      alert('Fork 失败：' + error.message)
      return
    }


    if (newSet) {
      navigate(`${game.basePath}/edit/${newSet.id}`)
    }
  }

  if (!game) {
    return (
      <main className="ms-notfound">
        <h1>Game not found</h1>
        <Link to="/game" className="ms-notfound-link">
          返回游戏列表
        </Link>
      </main>
    )
  }

  const cats = game.categories

  const catOf = (file: string) => cats.find(c => file.startsWith(c)) ?? '其他'

  const searched = sets.filter(
    s => !search || s.source_file.toLowerCase().includes(search.toLowerCase()),
  )

  const completedCount = sets.filter(s => s.is_completed).length
  const totalCount = sets.length
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  const presentCats = [...cats, '其他'].filter(c =>
    sets.some(s => catOf(s.source_file) === c),
  )

  const catCounts: Record<string, number> = {}

  sets.forEach(s => {
    const c = catOf(s.source_file)
    catCounts[c] = (catCounts[c] ?? 0) + 1
  })

  const groups = presentCats
    .filter(c => !filter || c === filter)
    .map(c => {
      const all = sets.filter(s => catOf(s.source_file) === c)
      const rows = searched.filter(s => catOf(s.source_file) === c)
      const doneN = all.filter(s => s.is_completed).length

      return {
        cat: c,
        rows,
        totalN: all.length,
        doneN,
      }
    })
    .filter(g => g.rows.length > 0)

  const shownSets = groups.reduce((n, g) => n + g.rows.length, 0)

  const stat = (value: string | number, label: string, variant: '' | 'is-done' | 'is-muted' = '') => (
    <div>
      <div className={`ms-stat-val${variant ? ' ' + variant : ''}`}>{value}</div>
      <div className="ms-stat-label">{label}</div>
    </div>
  )

  return (
    <GamePageShell game={game}>
      <main className="game-theme ms-main" style={themeVars(game)}>
        <div className="ms-topline" />

        <div className="ms-wrap">
          <section className="ms-stats">
            <div>
              <div className="ms-pct-row">
                <span className="ms-pct">{pct}</span>
                <span className="ms-pct-sign">%</span>
              </div>

              <div className="ms-pct-label">主集完成度 · {completedCount} / {totalCount}</div>
            </div>

            <div>
              <div className="ms-bar">
                <div className="ms-bar-fill" style={{ '--ms-pct': `${pct}%` } as CSSProperties} />
              </div>

              <div className="ms-stat-row">
                {stat(completedCount, '已完成主集', 'is-done')}
                {stat(totalCount - completedCount, '进行中', 'is-muted')}
                {stat(totalCount, '主集总数')}
                {stat(presentCats.length, '文件分类')}
              </div>
            </div>
          </section>

          <div className="ms-chips">
            <button className={`ms-chip${filter === '' ? ' is-active' : ''}`} onClick={() => setFilter('')}>
              全部
              <span className="ms-chip-count">{totalCount}</span>
            </button>

            {presentCats.map(c => (
              <button
                key={c}
                className={`ms-chip${filter === c ? ' is-active' : ''}`}
                onClick={() => setFilter(c)}
              >
                {c}
                <span className="ms-chip-count">{catCounts[c]}</span>
              </button>
            ))}
          </div>

          <section className="ms-searchbar">
            <input
              className="ms-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索文件组，例如 script · field · strtbl…"
            />

            <span className="ms-count">{shownSets} 个主集</span>

            {user && !loading && (
              <button className="ms-init-btn" onClick={initOfficialSets} disabled={initializing}>
                {initializing
                  ? `创建中… ${initProgress}`
                  : totalCount === 0
                    ? '初始化主集'
                    : '补全主集'}
              </button>
            )}
          </section>

          {loading && <p className="ms-loading">加载中…</p>}

          {dupSets.length > 0 && !filter && !search && (
            <section className="ms-dup-section">
              <div className="ms-dup-head">
                <span className="ms-dup-title">重复集 · 共享译文</span>
                <span className="ms-dup-hint">重复出现的句子在这里统一翻译，普通集里只读镜像</span>
              </div>

              <div className="ms-dup-list">
                {dupSets.map(s => (
                  <div key={s.id} className="ms-dup-item">
                    <button
                      className="ms-dup-open"
                      onClick={() => {
                        sessionStorage.setItem('mainsets-scroll', String(window.scrollY))
                        navigate(`${game.basePath}/edit/${s.id}`)
                      }}
                    >
                      {s.title || s.source_file}
                    </button>

                    <button
                      className="ms-dup-fork"
                      title="Fork 这个重复集来修改，改完提交合并请求"
                      onClick={() => {
                        sessionStorage.setItem('mainsets-scroll', String(window.scrollY))
                        fork(s.id, s.source_file, s.title)
                      }}
                    >
                      Fork
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="ms-groups">
            {groups.map(grp => {
              const barW = grp.totalN ? Math.round((grp.doneN / grp.totalN) * 100) : 0

              return (
                <section key={grp.cat}>
                  <div className="ms-group-head">
                    <span className="ms-group-cat">{grp.cat}</span>

                    <span className={`ms-group-count${grp.doneN === grp.totalN ? ' is-done' : ''}`}>
                      {grp.doneN} / {grp.totalN} 完成
                    </span>

                    <div className="ms-group-bar">
                      <div
                        className="ms-group-bar-fill"
                        style={{ '--ms-pct': `${barW}%` } as CSSProperties}
                      />
                    </div>
                  </div>

                  <div className="ms-rows">
                    {grp.rows.map(s => {
                      const done = !!s.is_completed

                      return (
                        <div key={s.id} className={`ms-row${done ? ' is-done' : ''}`}>
                          <span className="ms-row-icon">主</span>

                          <div className="ms-row-body">
                            <div className="ms-row-file">{s.source_file}</div>
                          </div>

                          <span className={`ms-row-status${done ? ' is-done' : ''}`}>
                            {done ? '✓ 已完成' : '进行中'}
                          </span>

                          <div className="ms-row-actions">
                            <button
                              className="ms-view-btn"
                              onClick={() => {
                                sessionStorage.setItem('mainsets-scroll', String(window.scrollY))
                                navigate(`${game.basePath}/edit/${s.id}`)
                              }}
                            >
                              查看
                            </button>

                            <button
                              className="ms-fork-btn"
                              onClick={() => {
                                sessionStorage.setItem('mainsets-scroll', String(window.scrollY))
                                fork(s.id, s.source_file, s.title)
                              }}
                            >
                              Fork
                            </button>

                            {isAdmin && (
                              <button
                                className={`ms-toggle-btn ${done ? 'is-done' : 'is-todo'}`}
                                onClick={() => toggleCompleted(s.id, done)}
                              >
                                {done ? '取消完成' : '标记完成'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>

          {!loading && groups.length === 0 && (
            <div className="ms-empty">没有匹配的主集</div>
          )}
        </div>
      </main>
    </GamePageShell>
  )
}