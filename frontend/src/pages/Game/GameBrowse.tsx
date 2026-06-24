import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import '../P2IS/P2IS.css'

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

  if (!game) {
    return (
      <main className="p2is-page">
        <div className="browse-wrap">
          <p className="muted">找不到这个游戏项目。</p>
        </div>
      </main>
    )
  }

  function openSet(id: string) {
    if (!game) return
    navigate(`${game.basePath}/edit/${id}`)
  }

  async function createSet() {
    if (!game) return

    if (!currentUserId) {
      alert('请先登录。')
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
        game_slug: game.slug,
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

    navigate(`${game.basePath}/edit/${created.id}`)
  }

  function renderSetCard(set: SetViewRow) {
    return (
      <div
        key={set.id}
        className="set-card"
        onClick={() => openSet(set.id)}
      >
        <div className="set-card-head">
          <h3>{set.title}</h3>

          <div className="set-card-badges">
            {set.is_public ? (
              <span className="set-badge">公开</span>
            ) : (
              <span className="set-badge muted-badge">私有</span>
            )}

            {set.source_file && (
              <span className="set-source-tag">{set.source_file}</span>
            )}

            {set.is_completed && (
              <span className="set-badge complete">完成</span>
            )}
          </div>
        </div>

        {set.description && (
          <p className="set-desc">
            {set.description}
          </p>
        )}

        <div className="set-meta muted">
          <span>{set.username ?? '未知用户'}</span>
          <span>{new Date(set.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    )
  }

  return (
    <GamePageShell game={game}>
      <main className="p2is-page">
        <div className="browse-wrap">
          <div className="browse-header">
            <div>
              <h1>{game.shortTitle} 社区翻译集</h1>
              <p className="muted">
                浏览公开翻译集，或创建自己的翻译版本。正式主集请前往“主集”页面。
              </p>
            </div>

            <div className="browse-actions">
              {currentUserId ? (
                <button
                  className="btn-primary"
                  onClick={() => setShowModal(true)}
                >
                  新建翻译集
                </button>
              ) : (
                <button
                  className="btn-ghost"
                  onClick={() => navigate('/auth')}
                >
                  登录后创建
                </button>
              )}
            </div>
          </div>

          {loading && <p className="muted">加载中…</p>}

          {!loading && currentUserId && (
            <section className="browse-section">
              <h2 className="section-title">我的翻译集 {mySets.length}</h2>

              {mySets.length > 0 ? (
                <div className="sets-grid">
                  {mySets.map(renderSetCard)}
                </div>
              ) : (
                <p className="muted">
                  你还没有创建社区翻译集。可以从主集 Fork，或者新建空翻译集。
                </p>
              )}
            </section>
          )}

          {!loading && (
            <section className="browse-section">
              <h2 className="section-title">公开翻译集 {sets.length}</h2>

              {sets.length > 0 ? (
                <div className="sets-grid">
                  {sets.map(renderSetCard)}
                </div>
              ) : (
                <p className="muted">暂无公开社区翻译集。</p>
              )}
            </section>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">新建翻译集</h3>

              <div className="modal-form">
                <label className="form-label">标题</label>
                <input
                  className="form-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={`例如：我的 ${game.shortTitle} 翻译修订版`}
                />

                <label className="form-label">简介</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="可以写这个翻译集的目标、风格、进度等。"
                  style={{ resize: 'vertical' }}
                />

                <label
                  className="muted"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newIsPublic}
                    onChange={e => setNewIsPublic(e.target.checked)}
                  />
                  公开展示在社区翻译集列表
                </label>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  取消
                </button>

                <button
                  className="btn-primary"
                  onClick={createSet}
                  disabled={creating || !newTitle.trim()}
                >
                  {creating ? '创建中…' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </GamePageShell>
  )
}