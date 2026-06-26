import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameBrowse.css'

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
      <main className="gb-notfound">
        <h1>Game not found</h1>
      </main>
    )
  }

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
    if (set.is_completed) return 'var(--gt-success)'
    if (set.source_file || set.forked_from) return 'var(--gt-accent)'
    return 'var(--gt-line)'
  }

  function sourceLabel(set: SetViewRow) {
    if (set.source_file) return `⑂ Fork · ${set.source_file}`
    if (set.forked_from) return '⑂ Fork'
    return '✎ 新建'
  }

  function renderSetCard(set: SetViewRow) {
    const author = set.username ?? '未知用户'
    const isFork = !!set.source_file || !!set.forked_from

    return (
      <article
        key={set.id}
        className="gb-card"
        style={{ '--gb-rail': cardRail(set) } as CSSProperties}
        onClick={() => openSet(set.id)}
      >
        <div className="gb-card-top">
          <div className="gb-card-title">{set.title}</div>

          <span className={`gb-vis${set.is_public ? ' is-public' : ''}`}>
            {set.is_public ? '公开' : '私有'}
          </span>
        </div>

        <div className="gb-tags">
          <span className={`gb-src-tag${isFork ? ' is-fork' : ''}`}>{sourceLabel(set)}</span>

          {set.is_completed && <span className="gb-done-tag">✓ 完成</span>}
        </div>

        {set.description && <div className="gb-desc">{set.description}</div>}

        <div className="gb-card-foot">
          <div className="gb-author">
            <span className="gb-avatar">{author === '我' ? '我' : avatarOf(author)}</span>
            <span className="gb-author-name">{author}</span>
          </div>

          <div className="gb-card-meta">
            {set.source_file && <span className="gb-meta-src">{set.source_file}</span>}
            <span className="gb-meta-date">{formatDate(set.created_at)}</span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <GamePageShell game={game}>
      <main className="game-theme gb-main" style={themeVars(game)}>
        <div className="gb-topline" />

        <div className="gb-wrap">
          <div className="gb-header">
            <div className="gb-header-text">
              <h1 className="gb-h1">{game.shortTitle} 社区翻译集</h1>

              <p className="gb-intro">
                浏览大家公开的翻译版本，或从主集 Fork 出属于自己的修订。正式发布的内容在「主集」页。
              </p>
            </div>
            {/*
            {currentUserId ? (
              <button onClick={() => setShowModal(true)}>+ 新建翻译集</button>
            ) : (
              <button onClick={() => navigate('/auth')}>登录后创建</button>
            )}*/}
          </div>

          {loading && <p className="gb-loading">加载中…</p>}

          {!loading && currentUserId && (
            <section className="gb-section">
              <div className="gb-sec-head">
                <h2 className="gb-sec-title">我的翻译集</h2>
                <span className="gb-sec-count">{mySets.length}</span>
              </div>

              {mySets.length > 0 ? (
                <div className="gb-grid">{mySets.map(renderSetCard)}</div>
              ) : (
                <div className="gb-empty-box">
                  你还没有创建社区翻译集。可以从主集 Fork，或者新建空翻译集。
                </div>
              )}
            </section>
          )}

          {!loading && (
            <section>
              <div className="gb-sec-head">
                <h2 className="gb-sec-title">公开翻译集</h2>
                <span className="gb-sec-count">{sets.length}</span>

                <div className="gb-search-wrap">
                  <input
                    className="gb-search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="搜索标题 · 作者 · 来源…"
                  />
                </div>
              </div>

              {filteredPublicSets.length > 0 ? (
                <div className="gb-grid">{filteredPublicSets.map(renderSetCard)}</div>
              ) : (
                <div className="gb-empty">
                  {sets.length === 0 ? '暂无公开社区翻译集。' : '没有匹配的公开翻译集'}
                </div>
              )}
            </section>
          )}
        </div>

        {showModal && (
          <div className="gb-overlay" onClick={() => setShowModal(false)}>
            <div className="gb-modal" onClick={e => e.stopPropagation()}>
              <div className="gb-modal-top" />

              <div className="gb-modal-body">
                <div className="gb-modal-title">新建翻译集</div>

                <div className="gb-field-label">标题</div>
                <input
                  className="gb-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={`例如：我的 ${game.shortTitle} 翻译修订版`}
                />

                <div className="gb-field-label">简介</div>
                <textarea
                  className="gb-textarea"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={4}
                  placeholder="这个翻译集的目标、风格、进度……"
                />

                <label className="gb-check-label" onClick={() => setNewIsPublic(prev => !prev)}>
                  <span className={`gb-checkbox${newIsPublic ? ' is-checked' : ''}`}>
                    {newIsPublic ? '✓' : ''}
                  </span>

                  <span className="gb-check-text">公开展示在社区翻译集列表</span>
                </label>

                <div className="gb-modal-footer">
                  <button className="gb-cancel-btn" onClick={() => setShowModal(false)} disabled={creating}>
                    取消
                  </button>

                  <button
                    className="gb-create-btn"
                    onClick={createSet}
                    disabled={creating || !newTitle.trim()}
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