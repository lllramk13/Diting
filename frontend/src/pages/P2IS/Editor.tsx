import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import TopNav from '../Home/TopNav'
import './P2IS.css'

const PAGE_SIZE = 100

type SourceRow = {
  id: string
  src: string
  speaker_jp?: string
  speaker_zh?: string
  jp: string
  zh: string
}

type EntryMap = Record<string, { content: string; sort_order: number }>

function EntryRow({
  row,
  readonly,
  value,
  onChange,
}: {
  row: SourceRow
  readonly: boolean
  value: string
  onChange: (id: string, val: string) => void
}) {
  return (
    <div className="entry-row">
      <div className="entry-content">
        {row.speaker_jp && (
          <div className="entry-speaker">
            {row.speaker_jp}{row.speaker_zh ? ` / ${row.speaker_zh}` : ''}
          </div>
        )}
        <div className="entry-ja">{row.jp}</div>
        <div className="entry-ds">{row.zh}</div>
        {!readonly ? (
          <textarea
            className="entry-input"
            value={value}
            placeholder="在此输入你的译文…"
            onChange={e => onChange(row.id, e.target.value)}
          />
        ) : (
          <div className="entry-user">
            {value || <span className="muted">(未翻译)</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function EditorTips() {
  const [open, setOpen] = useState(false)
  return (
    <div className="editor-tips">
      <button className="tips-toggle" onClick={() => setOpen(o => !o)}>
        {open ? '▲' : '▼'} 翻译提示
      </button>
      {open && (
        <div className="tips-body">
          <ul>
            <li>译文长度尽量与原文接近，游戏文本框空间有限。</li>
            <li>控制符（如 <code>&lt;pause:30/&gt;</code>、<code>\n</code>、<code>&lt;c6/&gt;</code>）尽量保留在相同位置，不要删除。</li>
            <li><code>&lt;SURNAME/&gt;</code> 是角色姓氏占位符，会在游戏中自动替换为玩家输入的名字，请保留。</li>
            <li><code>&lt;c1d:11/&gt;</code> 等是颜色/样式代码，控制文字颜色，保留原位即可。</li>
            <li><code>\n</code> 是换行符，控制文本换行位置，可根据译文调整。</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function PRModal({
  fromSetId, toSetId, prTitle, prDesc, setPrTitle, setPrDesc, onClose, onSubmitted,
}: {
  fromSetId: string; toSetId: string
  prTitle: string; prDesc: string
  setPrTitle: (v: string) => void; setPrDesc: (v: string) => void
  onClose: () => void; onSubmitted: (id: string) => void
}) {
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!prTitle.trim()) return
    setSubmitting(true)
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) { setSubmitting(false); return }
    const { data: entryData } = await supabase
      .from('translation_entries').select('string_id, content').eq('set_id', fromSetId)
    const snapshot: Record<string, string> = {}
    entryData?.forEach((e: { string_id: string; content: string }) => { snapshot[e.string_id] = e.content })
    const { data, error } = await supabase
      .from('merge_requests')
      .insert({ from_set_id: fromSetId, to_set_id: toSetId, user_id: uid, title: prTitle, description: prDesc, snapshot })
      .select()
      .single()
    if (error) { alert('提交失败：' + error.message); setSubmitting(false); return }
    onSubmitted(data.id)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">提交修改请求</h3>
        <div className="modal-form">
          <label className="form-label">标题</label>
          <input className="form-input" value={prTitle} onChange={e => setPrTitle(e.target.value)} placeholder="简要描述你的修改" />
          <label className="form-label">说明（可选）</label>
          <textarea className="form-input" rows={4} value={prDesc} onChange={e => setPrDesc(e.target.value)} placeholder="详细说明修改的原因或依据…" style={{ resize: 'vertical' }} />
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={!prTitle.trim() || submitting} onClick={submit}>
            {submitting ? '提交中…' : '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Editor() {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()

  const [sourceStrings, setSourceStrings] = useState<SourceRow[]>([])
  const [loadingStrings, setLoadingStrings] = useState(true)
  const [entries, setEntries] = useState<EntryMap>({})
  const [title, setTitle] = useState('我的译文')
  const [isPublic, setIsPublic] = useState(false)
  const [readonly, setReadonly] = useState(false)
  const [saving, setSaving] = useState(false)
  const [forkedFrom, setForkedFrom] = useState<{ title: string; username: string } | null>(null)
  const [forkedFromId, setForkedFromId] = useState<string | null>(null)
  const [forkedFromIsOfficial, setForkedFromIsOfficial] = useState(false)
  const [showPR, setShowPR] = useState(false)
  const [prTitle, setPrTitle] = useState('')
  const [prDesc, setPrDesc] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id ?? null

      const { data: setData } = await supabase.from('translation_sets').select('*').eq('id', setId).single()
      if (!setData) { navigate('/game/psx/p2is'); return }

      setTitle(setData.title)
      setIsPublic(setData.is_public)
      setReadonly(setData.user_id !== uid)

      if (setData.forked_from) {
        setForkedFromId(setData.forked_from)
        const { data: parent } = await supabase
          .from('translation_sets')
          .select('title, user_id, is_official')
          .eq('id', setData.forked_from)
          .single()
        if (parent) {
          const { data: profile } = await supabase.from('profiles').select('username').eq('id', parent.user_id).single()
          setForkedFrom({ title: parent.title, username: profile?.username ?? '未知用户' })
          setForkedFromIsOfficial(parent.is_official ?? false)
        }
      }

      // 加载原文（只加载对应组的文件）
      let strings: SourceRow[] = []
      if (setData.source_file) {
        const groupFile = setData.source_file.replace(':', '_')
        const res = await fetch(`/p2is/groups/${groupFile}.json`)
        strings = await res.json()
      } else {
        const res = await fetch('/merged_jp_zh.json')
        strings = await res.json()
      }
      setSourceStrings(strings)
      setLoadingStrings(false)

      const { data: entryData } = await supabase.from('translation_entries').select('*').eq('set_id', setId).order('sort_order')
      const map: EntryMap = {}
      entryData?.forEach((e: { string_id: string; content: string; sort_order: number }) => {
        map[e.string_id] = { content: e.content, sort_order: e.sort_order }
      })
      setEntries(map)
    }
    load()
  }, [setId, navigate])

  function handleChange(id: string, value: string) {
    setEntries(prev => ({ ...prev, [id]: { content: value, sort_order: sourceStrings.findIndex(s => s.id === id) } }))
  }

  const save = useCallback(async () => {
    if (!setId || readonly) return
    setSaving(true)
    const { error: setError } = await supabase.from('translation_sets').update({ title, is_public: isPublic, updated_at: new Date().toISOString() }).eq('id', setId)
    if (setError) { alert('保存失败：' + setError.message); setSaving(false); return }
    const rows = Object.entries(entries)
      .filter(([, v]) => v.content.trim())
      .map(([string_id, v]) => ({ set_id: setId, string_id, content: v.content, sort_order: v.sort_order, updated_at: new Date().toISOString() }))
    if (rows.length > 0) {
      const { error: entryError } = await supabase.from('translation_entries').upsert(rows, { onConflict: 'set_id,string_id' })
      if (entryError) { alert('保存条目失败：' + entryError.message); setSaving(false); return }
    }
    setSaving(false)
  }, [setId, readonly, title, isPublic, entries])

  function download() {
    const result = sourceStrings.map(src => ({
      id: src.id,
      jp: src.jp,
      translation: entries[src.id]?.content || src.zh,
    }))
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = sourceStrings.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.jp.toLowerCase().includes(q) || s.zh.toLowerCase().includes(q) || (entries[s.id]?.content ?? '').toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const changedCount = Object.values(entries).filter(e => e.content.trim()).length

  if (loadingStrings) return (
    <div className="p2is-page">
      <TopNav />
      <div className="editor-wrap"><p className="muted">加载中...</p></div>
    </div>
  )

  return (
    <div className="p2is-page">
      <TopNav />
      <div className="editor-wrap">
        <div className="editor-header">
          <div className="editor-title-block">
            <button className="btn-ghost" style={{ marginBottom: 8 }} onClick={() => navigate(-1)}>← 返回</button>
            {readonly ? <h2>{title}</h2> : (
              <input className="title-input" value={title} onChange={e => setTitle(e.target.value)} />
            )}
            {forkedFrom && (
              <div className="fork-attribution">forked from <strong>{forkedFrom.username}</strong> · {forkedFrom.title}</div>
            )}
          </div>
          <div className="editor-meta">
            <span className="muted">{changedCount} / {sourceStrings.length} 句已翻</span>
            {!readonly && (
              <>
                {forkedFromIsOfficial && forkedFromId && (
                  <button className="btn-ghost" onClick={() => setShowPR(true)}>提交修改请求</button>
                )}
                <label className="toggle">
                  <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                  公开
                </label>
                <button className="btn-ghost" onClick={download}>下载</button>
                <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
              </>
            )}
            {readonly && <button className="btn-ghost" onClick={download}>下载</button>}
          </div>
        </div>

        <EditorTips />

        <div className="editor-search-bar">
          <input
            className="search-input"
            placeholder="搜索日文 / 中文..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
          <span className="muted">{filtered.length} 条</span>
        </div>

        <div className="entries-list">
          {pageRows.map(row => (
            <EntryRow
              key={row.id}
              row={row}
              readonly={readonly}
              value={entries[row.id]?.content ?? ''}
              onChange={handleChange}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>上一页</button>
            <span className="muted">{page + 1} / {totalPages}</span>
            <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>下一页</button>
          </div>
        )}

        {!readonly && (
          <div className="editor-footer">
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
          </div>
        )}
      </div>

      {showPR && forkedFromId && (
        <PRModal
          fromSetId={setId ?? ''}
          toSetId={forkedFromId}
          prTitle={prTitle}
          prDesc={prDesc}
          setPrTitle={setPrTitle}
          setPrDesc={setPrDesc}
          onClose={() => setShowPR(false)}
          onSubmitted={(id: string) => { setShowPR(false); navigate(`/game/psx/p2is/requests/${id}`) }}
        />
      )}
    </div>
  )
}
