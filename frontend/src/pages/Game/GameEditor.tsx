import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import '../P2IS/P2IS.css'

const PAGE_SIZE = 100

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

type SourceRow = {
  id: string
  jp?: string
  zh?: string
  speaker?: string
  context?: string
  srcs?: string[]
  [key: string]: unknown
}

type EntryValue = {
  content: string
  sort_order: number
}

type EntryMap = Record<string, EntryValue>

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
  game_slug: string
}

type ForkedFromInfo = {
  title: string
  username: string
}

type GlossaryRow = {
  id: string
  jp: string
  zh: string
  note: string | null
  category: string | null
}

function formatControlNewlines(s: string) {
  return s.replace(/\\n/g, '\n')
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

function getBaseContent(row: SourceRow) {
  return row.zh ?? ''
}

function getInitialContent(row: SourceRow, entries: EntryMap) {
  return entries[row.id]?.content ?? getBaseContent(row)
}

type EntryRowProps = {
  row: SourceRow
  value: string
  readonly: boolean
  isDirty: boolean
  onChange: (value: string) => void
}

function EntryRow({ row, value, readonly, isDirty, onChange }: EntryRowProps) {
  return (
    <div className={`entry-row${isDirty ? ' entry-dirty' : ''}`}>
      <div className="entry-meta">
        <span className="entry-id">{row.id}</span>
        {row.speaker && <span className="entry-speaker">{row.speaker}</span>}
        {isDirty && <span className="entry-dirty-badge">已修改</span>}
      </div>

      {row.context && (
        <div className="entry-context">
          {String(row.context)}
        </div>
      )}

      <div className="entry-columns">
        <div className="entry-col">
          <div className="entry-label">原文</div>
          <pre className="entry-ja">{formatControlNewlines(row.jp ?? '')}</pre>
        </div>

        <div className="entry-col">
          <div className="entry-label">当前译文</div>
          <pre className="entry-ds">{formatControlNewlines(row.zh ?? '')}</pre>
        </div>

        <div className="entry-col">
          <div className="entry-label">我的译文</div>
          <textarea
            className="editor-textarea"
            value={value}
            disabled={readonly}
            onChange={e => onChange(e.target.value)}
            rows={Math.max(3, formatControlNewlines(row.jp ?? '').split('\n').length + 1)}
          />
        </div>
      </div>
    </div>
  )
}

function EditorTips() {
  return (
    <div className="editor-tips">
      <strong>编辑提示</strong>
      <ul>
        <li>控制码例如 <code>{'<c6/>'}</code>、<code>{'<c2/>'}</code>、<code>{'<WAIT>'}</code> 尽量保持不变。</li>
        <li>文本中的 <code>\n</code> 会按换行显示，但保存时仍保留为字符串。</li>
        <li>Fork 主集后修改，再提交合并请求。</li>
      </ul>
    </div>
  )
}

type GlossaryPanelProps = {
  gameSlug: string
}

function GlossaryPanel({ gameSlug }: GlossaryPanelProps) {
  const [rows, setRows] = useState<GlossaryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data, error } = await supabase
        .from('glossary')
        .select('*')
        .eq('game_slug', gameSlug)
        .order('category', { ascending: true })
        .order('jp', { ascending: true })
        .limit(80)

      if (error) {
        setRows([])
        setLoading(false)
        return
      }

      setRows((data ?? []) as GlossaryRow[])
      setLoading(false)
    }

    load()
  }, [gameSlug])

  return (
    <aside className="glossary-panel">
      <h3>术语表</h3>

      {loading && <p className="muted">加载中…</p>}

      {!loading && rows.length === 0 && (
        <p className="muted">暂无术语。</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="glossary-mini-list">
          {rows.map(row => (
            <div className="glossary-mini-row" key={row.id}>
              <div>
                <strong>{row.jp}</strong>
                <span> → </span>
                <strong>{row.zh}</strong>
              </div>

              {row.note && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {row.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}

type PRModalProps = {
  gameSlug: string
  fromSetId: string
  toSetId: string
  title: string
  snapshot: Record<string, string>
  baseSnapshot: Record<string, string>
  onClose: () => void
  onSubmitted: (id: string) => void
}

function PRModal({
  gameSlug,
  fromSetId,
  toSetId,
  title,
  snapshot,
  baseSnapshot,
  onClose,
  onSubmitted,
}: PRModalProps) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      alert('请先登录。')
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase
      .from('merge_requests')
      .insert({
        title,
        description: description.trim() || null,
        from_set_id: fromSetId,
        to_set_id: toSetId,
        snapshot,
        base_snapshot: baseSnapshot,
        user_id: user.id,
        status: 'open',
        game_slug: gameSlug,
      })
      .select()
      .single()

    if (error) {
      alert('提交失败：' + error.message)
      setSubmitting(false)
      return
    }

    onSubmitted(data.id)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">提交合并请求</h3>

        <div className="modal-form">
          <label className="form-label">标题</label>
          <input
            className="form-input"
            value={title}
            disabled
          />

          <label className="form-label">说明</label>
          <textarea
            className="form-input"
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="可以简单说明这次修改了什么，比如错字修正、润色、控制符修复等。"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="modal-footer">
          <button
            className="btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </button>

          <button
            className="btn-primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? '提交中…' : '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GameEditor() {
  const { gameSlug, setId } = useParams<{
    gameSlug: string
    setId: string
  }>()

  const navigate = useNavigate()
  const game = getGameBySlug(gameSlug ?? '')

  const [setData, setSetData] = useState<TranslationSetRow | null>(null)
  const [title, setTitle] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [readonly, setReadonly] = useState(true)
  const [isScript, setIsScript] = useState(false)

  const [sourceStrings, setSourceStrings] = useState<SourceRow[]>([])
  const [entries, setEntries] = useState<EntryMap>({})
  const [loadingStrings, setLoadingStrings] = useState(true)
  const [saving, setSaving] = useState(false)

  const [forkedFromId, setForkedFromId] = useState<string | null>(null)
  const [forkedFrom, setForkedFrom] = useState<ForkedFromInfo | null>(null)
  const [forkedFromIsOfficial, setForkedFromIsOfficial] = useState(false)

  const [query, setQuery] = useState('')
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [page, setPage] = useState(1)

  const [showPRModal, setShowPRModal] = useState(false)

  useEffect(() => {
    const currentGame = getGameBySlug(gameSlug ?? '')

    if (!currentGame || !setId) {
      setLoadingStrings(false)
      return
    }

    async function load(activeGame: ActiveGame) {
      setLoadingStrings(true)

      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null

      const { data: rawSetData, error: setError } = await supabase
        .from('translation_sets')
        .select('*')
        .eq('id', setId)
        .eq('game_slug', activeGame.slug)
        .single()

      if (setError || !rawSetData) {
        alert('找不到这个翻译集，或它不属于当前游戏。')
        navigate(activeGame.routes.main)
        return
      }

      const loadedSet = rawSetData as TranslationSetRow

      setSetData(loadedSet)
      setTitle(loadedSet.title)
      setIsPublic(loadedSet.is_public)
      setReadonly(loadedSet.user_id !== uid)
      setIsScript((loadedSet.source_file ?? '').startsWith('script'))

      if (loadedSet.forked_from) {
        setForkedFromId(loadedSet.forked_from)

        const { data: parent } = await supabase
          .from('translation_sets')
          .select('title, user_id, is_official')
          .eq('id', loadedSet.forked_from)
          .eq('game_slug', activeGame.slug)
          .single()

        if (parent) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', parent.user_id)
            .single()

          setForkedFrom({
            title: parent.title,
            username: profile?.username ?? '未知用户',
          })

          setForkedFromIsOfficial(parent.is_official ?? false)
        } else {
          setForkedFrom(null)
          setForkedFromIsOfficial(false)
        }
      } else {
        setForkedFromId(null)
        setForkedFrom(null)
        setForkedFromIsOfficial(false)
      }

      let strings: SourceRow[] = []

      if (loadedSet.source_file) {
        const groupFile = loadedSet.source_file.replaceAll(':', '_')
        const url = `${activeGame.dataPath}/groups/${groupFile}.json`

        const res = await fetch(url)
        const text = await res.text()

        if (!res.ok || text.trim().startsWith('<')) {
          alert(`读取原文失败：${url}\n返回的不是 JSON，可能文件不存在或路径错误。`)
          setSourceStrings([])
          setEntries({})
          setLoadingStrings(false)
          return
        }

        strings = JSON.parse(text)
      } else {
        const url = `${activeGame.dataPath}/merged_jp_zh.json`

        const res = await fetch(url)
        const text = await res.text()

        if (!res.ok || text.trim().startsWith('<')) {
          alert(`读取原文失败：${url}\n返回的不是 JSON，可能文件不存在或路径错误。`)
          setSourceStrings([])
          setEntries({})
          setLoadingStrings(false)
          return
        }

        strings = JSON.parse(text)
      }

      setSourceStrings(strings)

      const { data: entryData } = await supabase
        .from('translation_entries')
        .select('*')
        .eq('set_id', setId)
        .order('sort_order')

      const map: EntryMap = {}

      ;(entryData ?? []).forEach((e: { string_id: string; content: string; sort_order: number }) => {
        map[e.string_id] = {
          content: e.content,
          sort_order: e.sort_order,
        }
      })

      setEntries(map)
      setLoadingStrings(false)
    }

    load(currentGame)
  }, [gameSlug, setId, navigate])

  const filteredRows = useMemo(() => {
    const q = normalize(query)

    let rows = sourceStrings

    if (onlyChanged) {
      rows = rows.filter(row => {
        const current = entries[row.id]?.content ?? getBaseContent(row)
        const base = getBaseContent(row)
        return current.trim() !== base.trim()
      })
    }

    if (!q) return rows

    return rows.filter(row => {
      const id = normalize(row.id)
      const jp = normalize(row.jp ?? '')
      const zh = normalize(row.zh ?? '')
      const speaker = normalize(row.speaker ?? '')
      const context = normalize(row.context ?? '')
      const current = normalize(entries[row.id]?.content ?? '')

      return (
        id.includes(q) ||
        jp.includes(q) ||
        zh.includes(q) ||
        speaker.includes(q) ||
        context.includes(q) ||
        current.includes(q)
      )
    })
  }, [sourceStrings, entries, query, onlyChanged])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  const pageRows = useMemo(() => {
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page, totalPages])

  const changedCount = useMemo(() => {
    return sourceStrings.filter(row => {
      const current = entries[row.id]?.content ?? getBaseContent(row)
      const base = getBaseContent(row)
      return current.trim() !== base.trim()
    }).length
  }, [sourceStrings, entries])

  const snapshot = useMemo(() => {
    const result: Record<string, string> = {}

    for (const row of sourceStrings) {
      const content = entries[row.id]?.content ?? getBaseContent(row)
      result[row.id] = content
    }

    return result
  }, [sourceStrings, entries])

  const baseSnapshot = useMemo(() => {
    const result: Record<string, string> = {}

    for (const row of sourceStrings) {
      result[row.id] = getBaseContent(row)
    }

    return result
  }, [sourceStrings])

  function updateEntry(row: SourceRow, value: string) {
    setEntries(prev => ({
      ...prev,
      [row.id]: {
        content: value,
        sort_order: sourceStrings.findIndex(item => item.id === row.id),
      },
    }))
  }

  async function saveAll() {
    if (!setId || readonly) return

    setSaving(true)

    const rows = Object.entries(entries).map(([stringId, value]) => ({
      set_id: setId,
      string_id: stringId,
      content: value.content,
      sort_order: value.sort_order,
      updated_at: new Date().toISOString(),
    }))

    if (rows.length > 0) {
      const { error } = await supabase
        .from('translation_entries')
        .upsert(rows, { onConflict: 'set_id,string_id' })

      if (error) {
        alert('保存失败：' + error.message)
        setSaving(false)
        return
      }
    }

    const { error: setError } = await supabase
      .from('translation_sets')
      .update({
        title,
        is_public: isPublic,
      })
      .eq('id', setId)
      .eq('game_slug', game?.slug ?? '')

    if (setError) {
      alert('保存翻译集信息失败：' + setError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    alert('已保存。')
  }

  if (!game) {
    return (
      <main className="p2is-page">
        <div className="browse-wrap">
          <p className="muted">找不到这个游戏项目。</p>
        </div>
      </main>
    )
  }

  if (loadingStrings) {
    return (
      <GamePageShell game={game}>
        <main className="p2is-page">
          <div className="browse-wrap">
            <p className="muted">加载中…</p>
          </div>
        </main>
      </GamePageShell>
    )
  }

  if (!setData) {
    return (
      <GamePageShell game={game}>
        <main className="p2is-page">
          <div className="browse-wrap">
            <p className="muted">找不到这个翻译集。</p>
          </div>
        </main>
      </GamePageShell>
    )
  }

  const canSubmitPR = !readonly && forkedFromId && changedCount > 0

  return (
    <GamePageShell game={game}>
      <main className="p2is-page">
        <div className="editor-layout">
          <div className="editor-main">
            <div className="editor-header">
              <p className="muted">
                <Link to={game.routes.main}>← 返回主集</Link>
              </p>

              <div className="editor-title-row">
                <div>
                  <h1>{title}</h1>

                  <p className="muted">
                    {setData.source_file ? (
                      <>
                        文件组：<span className="set-source-tag">{setData.source_file}</span>
                      </>
                    ) : (
                      '全量合并数据'
                    )}

                    {isScript && (
                      <>
                        {' '}· <span className="set-source-tag">script</span>
                      </>
                    )}
                  </p>

                  {forkedFrom && (
                    <p className="muted">
                      Fork 自：{forkedFromIsOfficial ? '官方主集' : '社区集'} · {forkedFrom.title} · {forkedFrom.username}
                    </p>
                  )}

                  {readonly && (
                    <p className="muted">
                      当前为只读模式。只有翻译集创建者可以编辑。
                    </p>
                  )}
                </div>

                <div className="editor-actions">
                  {!readonly && (
                    <>
                      <button
                        className="btn-ghost"
                        onClick={saveAll}
                        disabled={saving}
                      >
                        {saving ? '保存中…' : '保存'}
                      </button>

                      <button
                        className="btn-primary"
                        onClick={() => setShowPRModal(true)}
                        disabled={!canSubmitPR}
                      >
                        提交合并请求
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!readonly && (
              <section className="browse-section">
                <div className="modal-form">
                  <label className="form-label">标题</label>
                  <input
                    className="form-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
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
                      checked={isPublic}
                      onChange={e => setIsPublic(e.target.checked)}
                    />
                    公开展示
                  </label>
                </div>
              </section>
            )}

            <section className="browse-section">
              <div className="editor-search-bar">
                <input
                  className="search-input"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="搜索 ID、原文、译文、角色名、上下文……"
                />

                <label
                  className="muted"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={onlyChanged}
                    onChange={e => {
                      setOnlyChanged(e.target.checked)
                      setPage(1)
                    }}
                  />
                  仅显示改动
                </label>
              </div>

              <p className="muted" style={{ marginTop: 8 }}>
                共 {sourceStrings.length} 条，筛选后 {filteredRows.length} 条，已修改 {changedCount} 条。
              </p>
            </section>

            <div className="entries-list">
              {pageRows.map(row => {
                const value = getInitialContent(row, entries)
                const base = getBaseContent(row)
                const isDirty = value.trim() !== base.trim()

                return (
                  <EntryRow
                    key={row.id}
                    row={row}
                    value={value}
                    readonly={readonly}
                    isDirty={isDirty}
                    onChange={next => updateEntry(row, next)}
                  />
                )
              })}
            </div>

            <div className="pagination">
              <button
                className="btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
              >
                上一页
              </button>

              <span className="muted">
                {Math.min(page, totalPages)} / {totalPages}
              </span>

              <button
                className="btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              >
                下一页
              </button>
            </div>
          </div>

          <div className="editor-side">
            <EditorTips />
            <GlossaryPanel gameSlug={game.slug} />
          </div>
        </div>

        {showPRModal && forkedFromId && setId && (
          <PRModal
            gameSlug={game.slug}
            fromSetId={setId}
            toSetId={forkedFromId}
            title={`Merge ${title}`}
            snapshot={snapshot}
            baseSnapshot={baseSnapshot}
            onClose={() => setShowPRModal(false)}
            onSubmitted={id => {
              setShowPRModal(false)
              navigate(`${game.routes.requests}/${id}`)
            }}
          />
        )}
      </main>
    </GamePageShell>
  )
}