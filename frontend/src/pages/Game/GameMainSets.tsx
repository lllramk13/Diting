import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { getGameTheme } from './gameTheme'

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"
const DONE = '#2D8C50'
const DANGER = '#F0888A'

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

    const { data: entries } = await supabase
      .from('translation_entries')
      .select('*')
      .eq('set_id', setId)

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
      })
      .select()
      .single()

    if (error) {
      alert('Fork 失败：' + error.message)
      return
    }

    if (newSet && entries && entries.length > 0) {
      await supabase.from('translation_entries').insert(
        entries.map((e: { string_id: string; content: string; sort_order: number }) => ({
          set_id: newSet.id,
          string_id: e.string_id,
          content: e.content,
          sort_order: e.sort_order,
        })),
      )
    }

    if (newSet) {
      navigate(`${game.basePath}/edit/${newSet.id}`)
    }
  }

  if (!game) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#0A0E18',
          color: '#EAEEF7',
          padding: 40,
        }}
      >
        <h1>Game not found</h1>
        <Link to="/game" style={{ color: '#E8B23A' }}>
          返回游戏列表
        </Link>
      </main>
    )
  }

  const t = getGameTheme(game)
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

  const chip = (active: boolean): React.CSSProperties => ({
    cursor: 'pointer',
    fontFamily: mono,
    fontSize: 11.5,
    padding: '7px 13px',
    borderRadius: 20,
    background: active ? t.accentSoft : t.card,
    color: active ? t.accent : t.muted,
    border: `1px solid ${active ? t.accentBorder : t.line2}`,
  })

  const stat = (value: string | number, label: string, color: string) => (
    <div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 22,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontFamily: mono,
          fontSize: 9.5,
          letterSpacing: 1.5,
          color: t.label,
        }}
      >
        {label}
      </div>
    </div>
  )

  return (
    <GamePageShell game={game}>
      <main
        style={{
          minHeight: '100vh',
          background: t.page,
          color: t.ink,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
        }}
      >
        <div style={{ height: 3, background: t.accent }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '26px 32px 90px' }}>
          <section
            style={{
              border: `1px solid ${t.line2}`,
              borderRadius: 14,
              background: t.card,
              padding: '24px 26px',
              marginBottom: 22,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 34,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 52,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: t.ink,
                  }}
                >
                  {pct}
                </span>

                <span style={{ fontFamily: mono, fontSize: 20, color: t.muted }}>
                  %
                </span>
              </div>

              <div
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: 2,
                  color: t.label,
                  marginTop: 8,
                }}
              >
                主集完成度 · {completedCount} / {totalCount}
              </div>
            </div>

            <div>
              <div
                style={{
                  height: 8,
                  borderRadius: 5,
                  background: t.inkSoft,
                  border: `1px solid ${t.line}`,
                  overflow: 'hidden',
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: DONE,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
                {stat(completedCount, '已完成主集', DONE)}
                {stat(totalCount - completedCount, '进行中', t.muted)}
                {stat(totalCount, '主集总数', t.ink)}
                {stat(presentCats.length, '文件分类', t.ink)}
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            <button onClick={() => setFilter('')} style={chip(filter === '')}>
              全部
              <span style={{ opacity: 0.55, marginLeft: 6 }}>{totalCount}</span>
            </button>

            {presentCats.map(c => (
              <button key={c} onClick={() => setFilter(c)} style={chip(filter === c)}>
                {c}
                <span style={{ opacity: 0.55, marginLeft: 6 }}>{catCounts[c]}</span>
              </button>
            ))}
          </div>

          <section
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              flexWrap: 'wrap',
              padding: '11px 13px',
              border: `1px solid ${t.line2}`,
              borderRadius: 11,
              background: t.card,
              marginBottom: 22,
            }}
          >
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索文件组，例如 script · field · strtbl…"
              style={{
                flex: 1,
                minWidth: 200,
                background: t.inkSoft,
                border: `1px solid ${t.line2}`,
                borderRadius: 8,
                color: t.ink,
                fontFamily: 'inherit',
                fontSize: 14,
                padding: '9px 12px',
                outline: 'none',
              }}
            />

            <span
              style={{
                fontFamily: mono,
                fontSize: 11,
                color: t.label,
                whiteSpace: 'nowrap',
              }}
            >
              {shownSets} 个主集
            </span>

            {user && !loading && (
              <button
                onClick={initOfficialSets}
                disabled={initializing}
                style={{
                  cursor: initializing ? 'not-allowed' : 'pointer',
                  fontFamily: cnf,
                  fontSize: 12.5,
                  padding: '9px 14px',
                  borderRadius: 8,
                  background: t.accentSoft,
                  border: `1px solid ${t.accentBorder}`,
                  color: t.accent,
                  fontWeight: 600,
                }}
              >
                {initializing
                  ? `创建中… ${initProgress}`
                  : totalCount === 0
                    ? '初始化主集'
                    : '补全主集'}
              </button>
            )}
          </section>

          {loading && (
            <p style={{ fontFamily: mono, fontSize: 13, color: t.label }}>
              加载中…
            </p>
          )}

          {dupSets.length > 0 && !filter && !search && (
            <section style={{ marginBottom: 26 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 11,
                }}
              >
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: t.ink,
                  }}
                >
                  重复集 · 共享译文
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, color: t.muted }}>
                  重复出现的句子在这里统一翻译，普通集里只读镜像
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {dupSets.map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: `1px solid ${t.accentBorder}`,
                    }}
                  >
                    <button
                      onClick={() => {
                        sessionStorage.setItem('mainsets-scroll', String(window.scrollY))
                        navigate(`${game.basePath}/edit/${s.id}`)
                      }}
                      style={{
                        cursor: 'pointer',
                        fontFamily: cnf,
                        fontSize: 13,
                        padding: '10px 14px',
                        background: t.accentSoft,
                        border: 'none',
                        color: t.accent,
                        fontWeight: 600,
                      }}
                    >
                      {s.title || s.source_file}
                    </button>

                    <button
                      onClick={() => {
                        sessionStorage.setItem('mainsets-scroll', String(window.scrollY))
                        fork(s.id, s.source_file, s.title)
                      }}
                      title="Fork 这个重复集来修改，改完提交合并请求"
                      style={{
                        cursor: 'pointer',
                        fontFamily: cnf,
                        fontSize: 12.5,
                        padding: '10px 12px',
                        background: t.accent,
                        border: 'none',
                        color: '#0A0E18',
                        fontWeight: 700,
                      }}
                    >
                      Fork
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {groups.map(grp => {
              const barW = grp.totalN ? Math.round((grp.doneN / grp.totalN) * 100) : 0

              return (
                <section key={grp.cat}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 11,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: t.ink,
                      }}
                    >
                      {grp.cat}
                    </span>

                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: 11,
                        color: grp.doneN === grp.totalN ? DONE : t.muted,
                      }}
                    >
                      {grp.doneN} / {grp.totalN} 完成
                    </span>

                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 3,
                        background: t.inkSoft,
                        border: `1px solid ${t.line}`,
                        overflow: 'hidden',
                        maxWidth: 200,
                      }}
                    >
                      <div
                        style={{
                          width: `${barW}%`,
                          height: '100%',
                          background: DONE,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grp.rows.map(s => {
                      const done = !!s.is_completed

                      return (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 13,
                            padding: '13px 16px',
                            border: `1px solid ${t.line2}`,
                            borderLeft: `3px solid ${done ? DONE : t.line2}`,
                            borderRadius: 11,
                            background: t.card,
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              background: t.accentSoft,
                              color: t.accent,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: cnf,
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            主
                          </span>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontFamily: mono,
                                fontSize: 14,
                                color: t.ink,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {s.source_file}
                            </div>
                          </div>

                          <span
                            style={{
                              flexShrink: 0,
                              fontFamily: cnf,
                              fontSize: 11.5,
                              padding: '3px 10px',
                              borderRadius: 20,
                              background: done ? 'rgba(45,140,80,0.10)' : t.inkSoft,
                              color: done ? DONE : t.muted,
                              border: `1px solid ${
                                done ? 'rgba(45,140,80,0.28)' : t.line2
                              }`,
                            }}
                          >
                            {done ? '✓ 已完成' : '进行中'}
                          </span>

                          <div style={{ flexShrink: 0, display: 'flex', gap: 7 }}>
                            <button
                              onClick={() => {
                                sessionStorage.setItem('mainsets-scroll', String(window.scrollY))
                                navigate(`${game.basePath}/edit/${s.id}`)
                              }}
                              style={{
                                cursor: 'pointer',
                                fontFamily: cnf,
                                fontSize: 12.5,
                                padding: '8px 14px',
                                borderRadius: 8,
                                background: t.inkSoft,
                                border: `1px solid ${t.line2}`,
                                color: t.ink,
                              }}
                            >
                              查看
                            </button>

                            <button
                              onClick={() => {
                                sessionStorage.setItem('mainsets-scroll', String(window.scrollY))
                                fork(s.id, s.source_file, s.title)
                              }}
                              style={{
                                cursor: 'pointer',
                                fontFamily: cnf,
                                fontSize: 12.5,
                                padding: '8px 14px',
                                borderRadius: 8,
                                background: t.accent,
                                border: 'none',
                                color: '#0A0E18',
                                fontWeight: 700,
                              }}
                            >
                              Fork
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => toggleCompleted(s.id, done)}
                                style={{
                                  cursor: 'pointer',
                                  fontFamily: cnf,
                                  fontSize: 12,
                                  padding: '8px 12px',
                                  borderRadius: 8,
                                  background: 'none',
                                  border: `1px solid ${
                                    done
                                      ? 'rgba(248,81,73,0.3)'
                                      : 'rgba(45,140,80,0.3)'
                                  }`,
                                  color: done ? DANGER : DONE,
                                }}
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
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                fontFamily: mono,
                fontSize: 13,
                color: t.label,
              }}
            >
              没有匹配的主集
            </div>
          )}
        </div>
      </main>
    </GamePageShell>
  )
}