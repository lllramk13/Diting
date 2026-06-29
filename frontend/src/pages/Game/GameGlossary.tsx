import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameGlossary.css'

type GlossaryRow = {
  id: string
  jp: string
  zh: string
  note: string | null
  category: string | null
  created_at: string
  game_slug: string
}

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

const DB_PAGE_SIZE = 1000
const UI_PAGE_SIZE = 100

export default function GameGlossary() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const game = getGameBySlug(gameSlug ?? '')

  const [rows, setRows] = useState<GlossaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [isAdmin, setIsAdmin] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<GlossaryRow | null>(null)

  const [jp, setJp] = useState('')
  const [zh, setZh] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const currentGame = getGameBySlug(gameSlug ?? '')
    let cancelled = false

    if (!currentGame) {
      setLoading(false)
      return
    }

    async function load(activeGame: ActiveGame) {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null

      if (cancelled) return

      if (uid) {
        setIsAdmin(await getIsAdmin(uid))
      } else {
        setIsAdmin(false)
      }

      if (cancelled) return

      const allRows: GlossaryRow[] = []
      let from = 0

      while (true) {
        const to = from + DB_PAGE_SIZE - 1

        const { data, error } = await supabase
          .from('glossary')
          .select('*')
          .eq('game_slug', activeGame.slug)
          .order('category', { ascending: true })
          .order('jp', { ascending: true })
          .range(from, to)

        if (cancelled) return

        if (error) {
          alert('读取术语表失败：' + error.message)
          setRows([])
          setLoading(false)
          return
        }

        const batch = (data ?? []) as GlossaryRow[]
        allRows.push(...batch)

        if (batch.length < DB_PAGE_SIZE) break
        from += DB_PAGE_SIZE
      }

      setRows(allRows)
      setPage(1)
      setExpanded(null)
      setLoading(false)
    }

    load(currentGame)

    return () => {
      cancelled = true
    }
  }, [gameSlug])

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of rows) {
      const key = row.category?.trim() || '未分类'
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [rows])

  const cats = useMemo(() => Object.keys(catCounts).sort(), [catCounts])

  const filteredRows = useMemo(() => {
    const q = query.toLowerCase().trim()

    return rows.filter(row => {
      if (cat && (row.category?.trim() || '未分类') !== cat) return false

      if (!q) return true

      return (
        row.jp.toLowerCase().includes(q) ||
        row.zh.toLowerCase().includes(q) ||
        (row.note ?? '').toLowerCase().includes(q) ||
        (row.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, query, cat])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / UI_PAGE_SIZE))

  const pagedRows = useMemo(() => {
    const start = (page - 1) * UI_PAGE_SIZE
    return filteredRows.slice(start, start + UI_PAGE_SIZE)
  }, [filteredRows, page])

  useEffect(() => {
    setPage(1)
    setExpanded(null)
  }, [query, cat])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
      setExpanded(null)
    }
  }, [page, totalPages])

  if (!game) {
    return (
      <GamePageShell game={getGameBySlug('p2is')!}>
        <main className="gl-notfound">
          <p>找不到这个游戏项目。</p>
        </main>
      </GamePageShell>
    )
  }

  function resetForm() {
    setEditing(null)
    setJp('')
    setZh('')
    setNote('')
    setCategory('')
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  function openEditModal(row: GlossaryRow) {
    setEditing(row)
    setJp(row.jp)
    setZh(row.zh)
    setNote(row.note ?? '')
    setCategory(row.category ?? '')
    setShowModal(true)
  }

  async function saveTerm() {
    if (!game) return
    if (!jp.trim() || !zh.trim()) return

    setSaving(true)

    if (editing) {
      if (editing.game_slug !== game.slug) {
        alert('游戏不匹配，不能编辑。')
        setSaving(false)
        return
      }

      const { data, error } = await supabase
        .from('glossary')
        .update({
          jp: jp.trim(),
          zh: zh.trim(),
          note: note.trim() || null,
          category: category.trim() || null,
        })
        .eq('id', editing.id)
        .eq('game_slug', game.slug)
        .select()
        .single()

      if (error) {
        alert('保存失败：' + error.message)
        setSaving(false)
        return
      }

      const updated = data as GlossaryRow

      setRows(prev =>
        prev.map(row =>
          row.id === updated.id
            ? updated
            : row,
        ),
      )
    } else {
      const { data, error } = await supabase
        .from('glossary')
        .insert({
          jp: jp.trim(),
          zh: zh.trim(),
          note: note.trim() || null,
          category: category.trim() || null,
          game_slug: game.slug,
        })
        .select()
        .single()

      if (error) {
        alert('新增失败：' + error.message)
        setSaving(false)
        return
      }

      setRows(prev => [...prev, data as GlossaryRow])
    }

    setSaving(false)
    setShowModal(false)
    resetForm()
  }

  async function deleteTerm(row: GlossaryRow) {
    if (!game) return

    if (row.game_slug !== game.slug) {
      alert('游戏不匹配，不能删除。')
      return
    }

    if (!confirm(`确定删除术语「${row.jp}」？`)) return

    const { error } = await supabase
      .from('glossary')
      .delete()
      .eq('id', row.id)
      .eq('game_slug', game.slug)

    if (error) {
      alert('删除失败：' + error.message)
      return
    }

    setRows(prev => prev.filter(item => item.id !== row.id))
  }

  const catChips = [
    { key: '', label: '全部', count: rows.length },
    ...cats.map(c => ({ key: c, label: c, count: catCounts[c] })),
  ]

  const stat = (value: string | number, label: string, variant: '' | 'is-accent' = '') => (
    <div className="gl-stat">
      <div className={`gl-stat-val${variant ? ' ' + variant : ''}`}>{value}</div>
      <div className="gl-stat-label">{label}</div>
    </div>
  )

  return (
    <GamePageShell game={game}>
      <main className="game-theme gl-main" style={themeVars(game)}>
        <div className="gl-topline" />

        <div className="gl-wrap">
          {/* intro */}
          <div className="gl-intro">
            <div className="gl-intro-text">
              <h1 className="gl-h1">{game.shortTitle} 术语表</h1>
              <p className="gl-intro-p">
                全集统一的人名、恶魔、道具、技能、地名与系统用语。所有翻译集都应对齐这里的确认译法。
              </p>
            </div>

            {isAdmin && (
              <button className="gl-add-btn" onClick={openCreateModal}>
                + 新增术语
              </button>
            )}
          </div>

          {/* stat strip */}
          <div className="gl-stats">
            {stat(rows.length, '收录术语')}
            <div className="gl-stat-div" />
            {stat(cats.length, '分类', 'is-accent')}
            <div className="gl-stat-div" />
            {stat(filteredRows.length, '匹配术语')}
            <div className="gl-stat-div" />
            {stat(`${page}/${totalPages}`, '页码')}
          </div>

          {/* category chips + search */}
          <div className="gl-toolbar">
            <div className="gl-chips">
              {catChips.map(c => (
                <button
                  key={c.key || '__all'}
                  className={`gl-chip${cat === c.key ? ' is-active' : ''}`}
                  onClick={() => setCat(c.key)}
                >
                  {c.label}
                  <span className="gl-chip-count">{c.count}</span>
                </button>
              ))}
            </div>

            <input
              className="gl-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索原文 · 译文 · 备注…"
            />
          </div>

          {loading && <p className="gl-loading">加载中…</p>}

          {/* table */}
          {!loading && (
            <>
              <div className="gl-table">
                {/* header row */}
                <div className="gl-thead">
                  <span className="gl-th">原文 · JP</span>
                  <span className="gl-th gl-th--zh">确认译法 · ZH</span>
                  <span className="gl-th">分类</span>
                  <span />
                </div>

                {pagedRows.map(row => {
                  const open = expanded === row.id
                  const catLabel = row.category?.trim() || '未分类'

                  return (
                    <div key={row.id} className="gl-row">
                      <div className="gl-row-main" onClick={() => setExpanded(open ? null : row.id)}>
                        <span className="gl-jp">{row.jp}</span>
                        <span className="gl-zh">{row.zh}</span>
                        <span>
                          <span className="gl-cat">{catLabel}</span>
                        </span>
                        <span className={`gl-chevron${open ? ' is-open' : ''}`}>▸</span>
                      </div>

                      {open && (
                        <div className="gl-detail">
                          <div className="gl-detail-label">备注</div>
                          <div className={`gl-note${row.note ? '' : ' is-empty'}`}>
                            {row.note?.trim() || '（暂无备注）'}
                          </div>

                          <div className="gl-date">
                            收录于 · {new Date(row.created_at).toLocaleDateString('zh-CN')}
                          </div>

                          {isAdmin && (
                            <div className="gl-detail-actions">
                              <button className="gl-edit-btn" onClick={() => openEditModal(row)}>
                                编辑
                              </button>
                              <button className="gl-del-btn" onClick={() => deleteTerm(row)}>
                                删除
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {filteredRows.length === 0 && (
                  <div className="gl-empty">
                    {rows.length === 0 ? '术语表还是空的' : '没有匹配的术语'}
                  </div>
                )}
              </div>

              {filteredRows.length > UI_PAGE_SIZE && (
                <div className="gl-pagination">
                  <button
                    className="gl-page-btn"
                    onClick={() => {
                      setPage(1)
                      setExpanded(null)
                    }}
                    disabled={page === 1}
                  >
                    首页
                  </button>

                  <button
                    className="gl-page-btn"
                    onClick={() => {
                      setPage(prev => Math.max(1, prev - 1))
                      setExpanded(null)
                    }}
                    disabled={page === 1}
                  >
                    上一页
                  </button>

                  <div className="gl-page-info">
                    第 <strong>{page}</strong> / {totalPages} 页 · 本页 {pagedRows.length} 条
                  </div>

                  <button
                    className="gl-page-btn"
                    onClick={() => {
                      setPage(prev => Math.min(totalPages, prev + 1))
                      setExpanded(null)
                    }}
                    disabled={page === totalPages}
                  >
                    下一页
                  </button>

                  <button
                    className="gl-page-btn"
                    onClick={() => {
                      setPage(totalPages)
                      setExpanded(null)
                    }}
                    disabled={page === totalPages}
                  >
                    末页
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {showModal && (
          <div
            className="gl-overlay"
            onClick={() => {
              setShowModal(false)
              resetForm()
            }}
          >
            <div className="gl-modal" onClick={e => e.stopPropagation()}>
              <div className="gl-modal-top" />
              <div className="gl-modal-body">
                <div className="gl-modal-title">{editing ? '编辑术语' : '提交术语'}</div>

                <div className="gl-form-grid">
                  <div>
                    <div className="gl-field-label">原文 · JP</div>
                    <input
                      className="gl-field"
                      value={jp}
                      onChange={e => setJp(e.target.value)}
                      placeholder="ペルソナ"
                    />
                  </div>
                  <div>
                    <div className="gl-field-label">译法 · ZH</div>
                    <input
                      className="gl-field"
                      value={zh}
                      onChange={e => setZh(e.target.value)}
                      placeholder="人格面具"
                    />
                  </div>
                </div>

                <div className="gl-field-label">分类</div>
                <input
                  className="gl-field gl-field-mb"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="例如：人名 / 地名 / 技能 / 系统"
                />

                <div className="gl-field-label">备注（可选）</div>
                <textarea
                  className="gl-field gl-textarea"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="译名依据、注意事项……"
                />

                <div className="gl-modal-footer">
                  <button
                    className="gl-cancel-btn"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    disabled={saving}
                  >
                    取消
                  </button>
                  <button
                    className="gl-save-btn"
                    onClick={saveTerm}
                    disabled={saving || !jp.trim() || !zh.trim()}
                  >
                    {saving ? '保存中…' : '保存'}
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