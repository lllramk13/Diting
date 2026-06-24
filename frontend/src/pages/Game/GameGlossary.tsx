import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import '../P2IS/P2IS.css'

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

export default function GameGlossary() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const game = getGameBySlug(gameSlug ?? '')

  const [rows, setRows] = useState<GlossaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
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

    if (!currentGame) {
      setLoading(false)
      return
    }

    async function load(activeGame: ActiveGame) {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null

      if (uid) {
        setIsAdmin(await getIsAdmin(uid))
      } else {
        setIsAdmin(false)
      }

      const { data, error } = await supabase
        .from('glossary')
        .select('*')
        .eq('game_slug', activeGame.slug)
        .order('category', { ascending: true })
        .order('jp', { ascending: true })

      if (error) {
        alert('读取术语表失败：' + error.message)
        setRows([])
        setLoading(false)
        return
      }

      setRows((data ?? []) as GlossaryRow[])
      setLoading(false)
    }

    load(currentGame)
  }, [gameSlug])

  const filteredRows = useMemo(() => {
    const q = query.toLowerCase().trim()

    if (!q) return rows

    return rows.filter(row => {
      return (
        row.jp.toLowerCase().includes(q) ||
        row.zh.toLowerCase().includes(q) ||
        (row.note ?? '').toLowerCase().includes(q) ||
        (row.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, query])

  const groupedRows = useMemo(() => {
    const groups: Record<string, GlossaryRow[]> = {}

    for (const row of filteredRows) {
      const key = row.category?.trim() || '未分类'

      if (!groups[key]) {
        groups[key] = []
      }

      groups[key].push(row)
    }

    return groups
  }, [filteredRows])

  if (!game) {
    return (
      <main className="p2is-page">
        <div className="browse-wrap">
          <p className="muted">找不到这个游戏项目。</p>
        </div>
      </main>
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

  return (
    <GamePageShell game={game}>
      <main className="p2is-page">
        <div className="browse-wrap">
          <div className="browse-header">
            <div>
              <h1>{game.shortTitle} 术语表</h1>
              <p className="muted">
                统一人名、地名、技能名、系统词和常见译法。
              </p>
            </div>

            <div className="browse-actions">
              {isAdmin && (
                <button
                  className="btn-primary"
                  onClick={openCreateModal}
                >
                  新增术语
                </button>
              )}
            </div>
          </div>

          <section className="browse-section">
            <input
              className="search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索日文、译名、分类或备注……"
            />

            <p className="muted" style={{ marginTop: 10 }}>
              {loading
                ? '加载中…'
                : `共 ${rows.length} 条，当前显示 ${filteredRows.length} 条`}
            </p>
          </section>

          {!loading && filteredRows.length === 0 && (
            <p className="muted">没有找到匹配术语。</p>
          )}

          {!loading && Object.entries(groupedRows).map(([groupName, groupRows]) => (
            <section className="browse-section" key={groupName}>
              <h2 className="section-title">
                {groupName} {groupRows.length}
              </h2>

              <div className="requests-list">
                {groupRows.map(row => (
                  <div
                    key={row.id}
                    className="request-row"
                    style={{ cursor: 'default' }}
                  >
                    <div style={{ width: '100%' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(120px, 1fr) minmax(120px, 1fr) auto',
                          gap: 12,
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            日文
                          </div>
                          <strong>{row.jp}</strong>
                        </div>

                        <div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            中文
                          </div>
                          <strong>{row.zh}</strong>
                        </div>

                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="issue-action-btn"
                              onClick={() => openEditModal(row)}
                            >
                              编辑
                            </button>

                            <button
                              className="issue-action-btn danger"
                              onClick={() => deleteTerm(row)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>

                      {row.note && (
                        <p className="muted" style={{ marginBottom: 0, marginTop: 10 }}>
                          {row.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">
                {editing ? '编辑术语' : '新增术语'}
              </h3>

              <div className="modal-form">
                <label className="form-label">日文</label>
                <input
                  className="form-input"
                  value={jp}
                  onChange={e => setJp(e.target.value)}
                  placeholder="例如：ペルソナ"
                />

                <label className="form-label">中文</label>
                <input
                  className="form-input"
                  value={zh}
                  onChange={e => setZh(e.target.value)}
                  placeholder="例如：人格面具"
                />

                <label className="form-label">分类</label>
                <input
                  className="form-input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="例如：角色 / 地名 / 技能 / 系统"
                />

                <label className="form-label">备注</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="可写使用场景、禁用译法、特殊说明。"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  disabled={saving}
                >
                  取消
                </button>

                <button
                  className="btn-primary"
                  onClick={saveTerm}
                  disabled={saving || !jp.trim() || !zh.trim()}
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </GamePageShell>
  )
}