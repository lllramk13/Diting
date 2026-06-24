import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { getGameTheme, type GameTheme } from './gameTheme'

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"
const DONE = '#2D8C50'

type Theme = {
  page: string
  card: string
  line: string
  line2: string
  label: string
  muted: string
  ink: string
  inkSoft: string
  inkBorder: string
  accent: string
  accentSoft: string
  accentBorder: string
}

const THEMES: Record<string, Theme> = {
  p2is: {
    page: '#EFEBE2',
    card: '#FBFAF6',
    line: '#E5DFD2',
    line2: '#D8D1C1',
    label: '#A89E8C',
    muted: '#85806F',
    ink: '#2E2A23',
    inkSoft: 'rgba(46,42,35,0.06)',
    inkBorder: 'rgba(46,42,35,0.24)',
    accent: '#2F62C4',
    accentSoft: 'rgba(47,98,196,0.10)',
    accentBorder: 'rgba(47,98,196,0.30)',
  },
  p2ep: {
    page: '#F0EAE4',
    card: '#FCF9F6',
    line: '#E8DDD6',
    line2: '#DCCFC6',
    label: '#AE9E94',
    muted: '#8C8076',
    ink: '#2E2A23',
    inkSoft: 'rgba(46,42,35,0.06)',
    inkBorder: 'rgba(46,42,35,0.24)',
    accent: '#B8443C',
    accentSoft: 'rgba(184,68,60,0.10)',
    accentBorder: 'rgba(184,68,60,0.30)',
  },
}

type TranslationSetRow = {
  id: string
  title: string
  description: string | null
  user_id: string
  is_public: boolean
  is_official: boolean
  is_completed: boolean | null
  forked_from: string | null
  source_file: string | null
  created_at: string
  game_slug: string
}

type ProfileRow = {
  id: string
  username: string
}

type SetViewRow = TranslationSetRow & {
  username?: string
}

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

export default function GameBrowse() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const navigate = useNavigate()

  const game = getGameBySlug(gameSlug ?? '')

  const [sets, setSets] = useState<SetViewRow[]>([])
  const [mySets, setMySets] = useState<SetViewRow[]>([])
  const [loading, setLoading] = useState(true)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [query, setQuery] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newIsPublic, setNewIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const currentGame = getGameBySlug(gameSlug ?? '')

    if (!currentGame) {
      setLoading(false)
      return
    }

    async function load(activeGame: ActiveGame) {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null

      setCurrentUserId(uid)

      const { data: publicSetsData, error: publicError } = await supabase
        .from('translation_sets')
        .select('*')
        .eq('game_slug', activeGame.slug)
        .eq('is_public', true)
        .eq('is_official', false)
        .order('created_at', { ascending: false })

      if (publicError) {
        alert('读取公开翻译集失败：' + publicError.message)
        setSets([])
        setMySets([])
        setLoading(false)
        return
      }

      const publicRows = (publicSetsData ?? []) as TranslationSetRow[]

      let myRows: TranslationSetRow[] = []

      if (uid) {
        const { data: mySetsData, error: myError } = await supabase
          .from('translation_sets')
          .select('*')
          .eq('game_slug', activeGame.slug)
          .eq('user_id', uid)
          .eq('is_official', false)
          .order('created_at', { ascending: false })

        if (myError) {
          alert('读取我的翻译集失败：' + myError.message)
          setSets([])
          setMySets([])
          setLoading(false)
          return
        }

        myRows = (mySetsData ?? []) as TranslationSetRow[]
      }

      const allRows = [...publicRows, ...myRows]
      const userIds = [...new Set(allRows.map(row => row.user_id).filter(Boolean))]
      const profileMap: Record<string, string> = {}

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds)

        ;(profiles as ProfileRow[] | null)?.forEach(profile => {
          profileMap[profile.id] = profile.username
        })
      }

      const withNames = (rows: TranslationSetRow[]) =>
        rows.map(row => ({
          ...row,
          username:
            row.user_id === uid
              ? '我'
              : profileMap[row.user_id] ?? '未知用户',
        }))

      setSets(withNames(publicRows))
      setMySets(uid ? withNames(myRows) : [])
      setLoading(false)
    }

    load(currentGame)
  }, [gameSlug])

  const filteredPublicSets = useMemo(() => {
    const q = query.toLowerCase().trim()

    if (!q) return sets

    return sets.filter(set => {
      return (
        set.title.toLowerCase().includes(q) ||
        (set.description ?? '').toLowerCase().includes(q) ||
        (set.username ?? '').toLowerCase().includes(q) ||
        (set.source_file ?? '').toLowerCase().includes(q)
      )
    })
  }, [sets, query])

  if (!game) {
    return (
      <main style={{ minHeight: '100vh', background: '#EFEBE2', color: t.ink, padding: 40 }}>
        <h1>Game not found</h1>
      </main>
    )
  }

  const t = getGameTheme(game)

  function openSet(id: string) {
    const currentGame = getGameBySlug(gameSlug ?? '')
    if (!currentGame) return

    navigate(`${currentGame.basePath}/edit/${id}`)
  }

  async function createSet() {
    const currentGame = getGameBySlug(gameSlug ?? '')
    if (!currentGame) return

    if (!currentUserId) {
      navigate('/auth')
      return
    }

    if (!newTitle.trim()) return

    setCreating(true)

    const { data, error } = await supabase
      .from('translation_sets')
      .insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        user_id: currentUserId,
        is_public: newIsPublic,
        is_official: false,
        is_completed: false,
        forked_from: null,
        source_file: null,
        game_slug: currentGame.slug,
      })
      .select()
      .single()

    if (error) {
      alert('创建失败：' + error.message)
      setCreating(false)
      return
    }

    const created = data as TranslationSetRow

    const viewRow: SetViewRow = {
      ...created,
      username: '我',
    }

    setMySets(prev => [viewRow, ...prev])

    if (created.is_public) {
      setSets(prev => [viewRow, ...prev])
    }

    setNewTitle('')
    setNewDescription('')
    setNewIsPublic(true)
    setShowModal(false)
    setCreating(false)

    navigate(`${currentGame.basePath}/edit/${created.id}`)
  }

  function formatDate(raw: string) {
    return new Date(raw).toLocaleDateString('zh-CN')
  }

  function avatarOf(name: string) {
    return name.trim().slice(0, 1) || '?'
  }

  function cardRail(set: SetViewRow) {
    if (set.is_completed) return DONE
    if (set.source_file || set.forked_from) return t.accent
    return t.line2
  }

  function sourceLabel(set: SetViewRow) {
    if (set.source_file) return `⑂ Fork · ${set.source_file}`
    if (set.forked_from) return '⑂ Fork'
    return '✎ 新建'
  }

  function cardStyle(set: SetViewRow): CSSProperties {
    return {
      cursor: 'pointer',
      border: `1px solid ${t.line2}`,
      borderLeft: `3px solid ${cardRail(set)}`,
      borderRadius: 13,
      background: t.inkSoft,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    }
  }

  function renderSetCard(set: SetViewRow) {
    const author = set.username ?? '未知用户'
    const isFork = !!set.source_file || !!set.forked_from

    return (
      <article
        key={set.id}
        style={cardStyle(set)}
        onClick={() => openSet(set.id)}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = t.inkBorder
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(40,36,28,0.06)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = t.line2
          e.currentTarget.style.borderLeftColor = cardRail(set)
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: cnf,
              fontWeight: 700,
              fontSize: 16,
              lineHeight: 1.4,
              color: t.ink,
            }}
          >
            {set.title}
          </div>

          <span
            style={{
              flexShrink: 0,
              fontFamily: mono,
              fontSize: 10.5,
              padding: '3px 9px',
              borderRadius: 6,
              background: set.is_public ? t.accentSoft : t.inkSoft,
              color: set.is_public ? t.accent : t.muted,
              border: `1px solid ${set.is_public ? t.accentBorder : t.line2}`,
            }}
          >
            {set.is_public ? '公开' : '私有'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: mono,
              fontSize: 11,
              padding: '3px 9px',
              borderRadius: 6,
              background: isFork ? t.inkSoft : 'transparent',
              color: isFork ? t.ink : t.muted,
              border: `1px solid ${isFork ? t.inkBorder : t.line2}`,
            }}
          >
            {sourceLabel(set)}
          </span>

          {set.is_completed && (
            <span
              style={{
                fontFamily: cnf,
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 6,
                background: 'rgba(45,140,80,0.10)',
                color: DONE,
                border: '1px solid rgba(45,140,80,0.28)',
              }}
            >
              ✓ 完成
            </span>
          )}
        </div>

        {set.description && (
          <div
            style={{
              fontSize: 13,
              color: t.muted,
              lineHeight: 1.6,
            }}
          >
            {set.description}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 2,
            paddingTop: 11,
            borderTop: `1px solid ${t.line}`,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: t.accentSoft,
                color: t.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: cnf,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {author === '我' ? '我' : avatarOf(author)}
            </span>

            <span
              style={{
                fontFamily: cnf,
                fontSize: 12.5,
                color: t.muted,
              }}
            >
              {author}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {set.source_file && (
              <span style={{ fontFamily: mono, fontSize: 11, color: t.label }}>
                {set.source_file}
              </span>
            )}

            <span style={{ fontFamily: mono, fontSize: 11, color: t.label }}>
              {formatDate(set.created_at)}
            </span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <GamePageShell game={game}>
      <main
        style={{
          minHeight: '100vh',
          background: t.inkSoft,
          color: t.ink,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <div style={{ height: 3, background: t.accent }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 32px 90px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 30,
            }}
          >
            <div style={{ maxWidth: 560 }}>
              <h1
                style={{
                  fontFamily: cnf,
                  fontWeight: 900,
                  fontSize: 30,
                  margin: 0,
                  letterSpacing: 1,
                  color: t.ink,
                }}
              >
                {game.shortTitle} 社区翻译集
              </h1>

              <p
                style={{
                  fontSize: 14.5,
                  color: t.muted,
                  margin: '10px 0 0',
                  lineHeight: 1.6,
                }}
              >
                浏览大家公开的翻译版本，或从主集 Fork 出属于自己的修订。正式发布的内容在「主集」页。
              </p>
            </div>
            {/*
            {currentUserId ? (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  cursor: 'pointer',
                  fontFamily: cnf,
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '11px 20px',
                  borderRadius: 9,
                  background: t.ink,
                  border: 'none',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                }}
              >
                + 新建翻译集
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                style={{
                  cursor: 'pointer',
                  fontFamily: cnf,
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '11px 20px',
                  borderRadius: 9,
                  background: t.ink,
                  border: 'none',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                }}
              >
                登录后创建
              </button>
            )}*/}
          </div>

          {loading && (
            <p style={{ fontFamily: mono, fontSize: 13, color: t.label }}>
              加载中…
            </p>
          )}

          {!loading && currentUserId && (
            <section style={{ marginBottom: 38 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    letterSpacing: 2,
                    color: t.ink,
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  我的翻译集
                </h2>

                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    padding: '2px 9px',
                    borderRadius: 20,
                    background: t.inkSoft,
                    color: t.muted,
                    border: `1px solid ${t.line2}`,
                  }}
                >
                  {mySets.length}
                </span>
              </div>

              {mySets.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 14,
                  }}
                >
                  {mySets.map(renderSetCard)}
                </div>
              ) : (
                <div
                  style={{
                    border: `1px solid ${t.line2}`,
                    borderRadius: 13,
                    background: t.inkSoft,
                    padding: '26px 20px',
                    color: t.muted,
                    fontSize: 13,
                  }}
                >
                  你还没有创建社区翻译集。可以从主集 Fork，或者新建空翻译集。
                </div>
              )}
            </section>
          )}

          {!loading && (
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                  flexWrap: 'wrap',
                }}
              >
                <h2
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    letterSpacing: 2,
                    color: t.ink,
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  公开翻译集
                </h2>

                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    padding: '2px 9px',
                    borderRadius: 20,
                    background: t.inkSoft,
                    color: t.muted,
                    border: `1px solid ${t.line2}`,
                  }}
                >
                  {sets.length}
                </span>

                <div
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="搜索标题 · 作者 · 来源…"
                    style={{
                      background: t.inkSoft,
                      border: `1px solid ${t.line2}`,
                      borderRadius: 8,
                      color: t.ink,
                      fontFamily: 'inherit',
                      fontSize: 13,
                      padding: '8px 12px',
                      outline: 'none',
                      width: 220,
                      transition: 'border-color 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {filteredPublicSets.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 14,
                  }}
                >
                  {filteredPublicSets.map(renderSetCard)}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    fontFamily: mono,
                    fontSize: 13,
                    color: t.label,
                  }}
                >
                  {sets.length === 0 ? '暂无公开社区翻译集。' : '没有匹配的公开翻译集'}
                </div>
              )}
            </section>
          )}
        </div>

        {showModal && (
          <div
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              background: 'rgba(30,26,20,0.42)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 460,
                background: t.inkSoft,
                border: `1px solid ${t.line2}`,
                borderRadius: 16,
                boxShadow: '0 24px 60px rgba(30,26,20,0.25)',
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 3, background: t.accent }} />

              <div style={{ padding: '24px 26px' }}>
                <div
                  style={{
                    fontFamily: cnf,
                    fontWeight: 700,
                    fontSize: 19,
                    marginBottom: 18,
                    color: t.ink,
                  }}
                >
                  新建翻译集
                </div>

                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: t.label,
                    marginBottom: 6,
                  }}
                >
                  标题
                </div>

                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={`例如：我的 ${game.shortTitle} 翻译修订版`}
                  style={{
                    width: '100%',
                    background: t.inkSoft,
                    border: `1px solid ${t.line2}`,
                    borderRadius: 9,
                    color: t.ink,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    padding: '10px 12px',
                    outline: 'none',
                    marginBottom: 16,
                    transition: 'border-color 0.2s ease',
                  }}
                />

                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: t.label,
                    marginBottom: 6,
                  }}
                >
                  简介
                </div>

                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={4}
                  placeholder="这个翻译集的目标、风格、进度……"
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    background: t.inkSoft,
                    border: `1px solid ${t.line2}`,
                    borderRadius: 9,
                    color: t.ink,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    lineHeight: 1.6,
                    padding: '10px 12px',
                    outline: 'none',
                    marginBottom: 16,
                    transition: 'border-color 0.2s ease',
                  }}
                />

                <label
                  onClick={() => setNewIsPublic(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    marginBottom: 22,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      border: `1px solid ${newIsPublic ? t.ink : t.line2}`,
                      background: newIsPublic ? t.ink : t.inkSoft,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 12,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {newIsPublic ? '✓' : ''}
                  </span>

                  <span style={{ fontSize: 13.5, color: t.muted }}>
                    公开展示在社区翻译集列表
                  </span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={creating}
                    style={{
                      cursor: 'pointer',
                      fontFamily: cnf,
                      fontSize: 13.5,
                      padding: '10px 18px',
                      borderRadius: 9,
                      background: t.inkSoft,
                      border: `1px solid ${t.line2}`,
                      color: t.muted,
                    }}
                  >
                    取消
                  </button>

                  <button
                    onClick={createSet}
                    disabled={creating || !newTitle.trim()}
                    style={{
                      cursor: creating || !newTitle.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: cnf,
                      fontSize: 13.5,
                      fontWeight: 600,
                      padding: '10px 18px',
                      borderRadius: 9,
                      background: newTitle.trim() ? t.ink : t.line2,
                      border: 'none',
                      color: '#fff',
                    }}
                  >
                    {creating ? '创建中…' : '创建'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </GamePageShell>
  )
}