import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { getGameTheme } from './gameTheme'

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"

const GRID = '1.5fr 1.5fr 0.8fr 28px'

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
  const [cat, setCat] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
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

  if (!game) {
    return (
      <GamePageShell game={getGameBySlug('p2is')!}>
        <main style={{ minHeight: '100vh', background: '#0A0E18', color: '#EAEEF7', padding: 40 }}>
          <p>找不到这个游戏项目。</p>
        </main>
      </GamePageShell>
    )
  }

  const t = getGameTheme(game)

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

  const stat = (value: string | number, label: string, color: string) => (
    <div style={{ flex: 1, padding: '14px 18px' }}>
      <div style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: 1.5, color: t.label, marginTop: 2 }}>
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

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px 90px' }}>
          {/* intro */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 22,
            }}
          >
            <div style={{ maxWidth: 580 }}>
              <h1 style={{ fontFamily: cnf, fontWeight: 900, fontSize: 30, margin: 0, letterSpacing: 1 }}>
                {game.shortTitle} 术语表
              </h1>
              <p style={{ fontSize: 14.5, color: t.muted, margin: '10px 0 0', lineHeight: 1.6 }}>
                全集统一的人名、恶魔、道具、技能、地名与系统用语。所有翻译集都应对齐这里的确认译法。
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={openCreateModal}
                style={{
                  cursor: 'pointer',
                  fontFamily: cnf,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '11px 20px',
                  borderRadius: 9,
                  background: t.accent,
                  border: 'none',
                  color: t.buttonText,
                }}
              >
                + 新增术语
              </button>
            )}
          </div>

          {/* stat strip */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              border: `1px solid ${t.line2}`,
              borderRadius: 12,
              background: t.card,
              overflow: 'hidden',
              marginBottom: 18,
            }}
          >
            {stat(rows.length, '收录术语', t.ink)}
            <div style={{ width: 1, background: t.line }} />
            {stat(cats.length, '分类', t.accent)}
            <div style={{ width: 1, background: t.line }} />
            {stat(filteredRows.length, '当前显示', t.ink)}
          </div>

          {/* category chips + search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {catChips.map(c => {
                const on = cat === c.key
                return (
                  <button
                    key={c.key || '__all'}
                    onClick={() => setCat(c.key)}
                    style={{
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: cnf,
                      fontSize: 12.5,
                      padding: '7px 13px',
                      borderRadius: 20,
                      background: on ? t.inkSoft : t.card,
                      color: on ? t.ink : t.muted,
                      border: `1px solid ${on ? t.inkBorder : t.line2}`,
                    }}
                  >
                    {c.label}
                    <span style={{ fontFamily: mono, fontSize: 10.5, opacity: 0.65, marginLeft: 6 }}>
                      {c.count}
                    </span>
                  </button>
                )
              })}
            </div>

            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索原文 · 译文 · 备注…"
              style={{
                marginLeft: 'auto',
                background: t.card,
                border: `1px solid ${t.line2}`,
                borderRadius: 8,
                color: t.ink,
                fontFamily: 'inherit',
                fontSize: 13,
                padding: '9px 13px',
                outline: 'none',
                width: 230,
              }}
            />
          </div>

          {loading && (
            <p style={{ fontFamily: mono, fontSize: 13, color: t.label }}>加载中…</p>
          )}

          {/* table */}
          {!loading && (
            <div
              style={{
                border: `1px solid ${t.line2}`,
                borderRadius: 13,
                background: t.card,
                overflow: 'hidden',
              }}
            >
              {/* header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID,
                  gap: 14,
                  padding: '12px 20px',
                  borderBottom: `1px solid ${t.line2}`,
                  background: t.inkSoft,
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: 1.5, color: t.label }}>原文 · JP</span>
                <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: 1.5, color: t.accent }}>确认译法 · ZH</span>
                <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: 1.5, color: t.label }}>分类</span>
                <span />
              </div>

              {filteredRows.map(row => {
                const open = expanded === row.id
                const catLabel = row.category?.trim() || '未分类'

                return (
                  <div key={row.id} style={{ borderBottom: `1px solid ${t.line}` }}>
                    <div
                      onClick={() => setExpanded(open ? null : row.id)}
                      style={{
                        cursor: 'pointer',
                        display: 'grid',
                        gridTemplateColumns: GRID,
                        gap: 14,
                        alignItems: 'center',
                        padding: '13px 20px',
                        borderLeft: `3px solid ${t.accent}`,
                      }}
                    >
                      <span style={{ fontFamily: cnf, fontSize: 15, fontWeight: 500, color: t.ink }}>
                        {row.jp}
                      </span>
                      <span style={{ fontFamily: cnf, fontSize: 15, fontWeight: 700, color: t.ink }}>
                        {row.zh}
                      </span>
                      <span>
                        <span
                          style={{
                            fontFamily: cnf,
                            fontSize: 11,
                            padding: '2px 9px',
                            borderRadius: 6,
                            background: t.accentSoft,
                            color: t.accent,
                            border: `1px solid ${t.accentBorder}`,
                          }}
                        >
                          {catLabel}
                        </span>
                      </span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 12,
                          color: t.label,
                          textAlign: 'right',
                          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        ▸
                      </span>
                    </div>

                    {open && (
                      <div
                        style={{
                          borderTop: `1px solid ${t.line}`,
                          background: t.inkSoft,
                          padding: '16px 20px 18px 23px',
                        }}
                      >
                        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1.5, color: t.label, marginBottom: 6 }}>
                          备注
                        </div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.7, color: row.note ? t.ink : t.label }}>
                          {row.note?.trim() || '（暂无备注）'}
                        </div>

                        <div style={{ fontFamily: mono, fontSize: 11, color: t.label, marginTop: 12 }}>
                          收录于 · {new Date(row.created_at).toLocaleDateString('zh-CN')}
                        </div>

                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button
                              onClick={() => openEditModal(row)}
                              style={{
                                cursor: 'pointer',
                                fontFamily: cnf,
                                fontSize: 12,
                                padding: '7px 13px',
                                borderRadius: 8,
                                background: t.card,
                                border: `1px solid ${t.line2}`,
                                color: t.ink,
                              }}
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => deleteTerm(row)}
                              style={{
                                cursor: 'pointer',
                                fontFamily: cnf,
                                fontSize: 12,
                                padding: '7px 13px',
                                borderRadius: 8,
                                background: 'none',
                                border: '1px solid rgba(240,136,138,0.35)',
                                color: t.danger,
                              }}
                            >
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
                <div
                  style={{
                    textAlign: 'center',
                    padding: '56px 20px',
                    fontFamily: mono,
                    fontSize: 13,
                    color: t.label,
                  }}
                >
                  {rows.length === 0 ? '术语表还是空的' : '没有匹配的术语'}
                </div>
              )}
            </div>
          )}
        </div>

        {showModal && (
          <div
            onClick={() => {
              setShowModal(false)
              resetForm()
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              background: 'rgba(5,8,15,0.6)',
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
                maxWidth: 480,
                background: t.card,
                border: `1px solid ${t.line2}`,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 3, background: t.accent }} />
              <div style={{ padding: '24px 26px' }}>
                <div style={{ fontFamily: cnf, fontWeight: 700, fontSize: 19, marginBottom: 18 }}>
                  {editing ? '编辑术语' : '提交术语'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.5, color: t.label, marginBottom: 6 }}>
                      原文 · JP
                    </div>
                    <input
                      value={jp}
                      onChange={e => setJp(e.target.value)}
                      placeholder="ペルソナ"
                      style={fieldStyle(t)}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.5, color: t.label, marginBottom: 6 }}>
                      译法 · ZH
                    </div>
                    <input
                      value={zh}
                      onChange={e => setZh(e.target.value)}
                      placeholder="人格面具"
                      style={fieldStyle(t)}
                    />
                  </div>
                </div>

                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.5, color: t.label, marginBottom: 6 }}>
                  分类
                </div>
                <input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="例如：人名 / 地名 / 技能 / 系统"
                  style={{ ...fieldStyle(t), marginBottom: 16 }}
                />

                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.5, color: t.label, marginBottom: 6 }}>
                  备注（可选）
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="译名依据、注意事项……"
                  style={{ ...fieldStyle(t), resize: 'vertical', lineHeight: 1.6, marginBottom: 20 }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    disabled={saving}
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
                    onClick={saveTerm}
                    disabled={saving || !jp.trim() || !zh.trim()}
                    style={{
                      cursor: saving || !jp.trim() || !zh.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: cnf,
                      fontSize: 13.5,
                      fontWeight: 700,
                      padding: '10px 18px',
                      borderRadius: 9,
                      background: jp.trim() && zh.trim() ? t.accent : t.line2,
                      border: 'none',
                      color: t.buttonText,
                    }}
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

function fieldStyle(t: ReturnType<typeof getGameTheme>): React.CSSProperties {
  return {
    width: '100%',
    background: t.inkSoft,
    border: `1px solid ${t.line2}`,
    borderRadius: 9,
    color: t.ink,
    fontFamily: 'inherit',
    fontSize: 14,
    padding: '10px 12px',
    outline: 'none',
  }
}
