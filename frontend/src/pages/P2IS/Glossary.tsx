import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getIsAdmin } from '../../lib/admin'
import TopNav from '../Home/TopNav'
import P2ISNav from './P2ISNav'
import './P2IS.css'

type GlossaryEntry = {
  id: string
  jp: string
  zh: string
  category: string | null
  note: string | null
  created_at: string
}

const CATEGORIES = ['人名', '地名', '技能', '道具', '其他']

export default function Glossary() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<GlossaryEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ jp: '', zh: '', category: '', note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) setIsAdmin(await getIsAdmin(data.user.id))
    })
    load()
  }, [])

  async function load() {
    const { data } = await supabase.from('glossary').select('*').order('category').order('jp')
    setEntries((data as GlossaryEntry[]) ?? [])
    setLoading(false)
  }

  async function add() {
    if (!form.jp.trim() || !form.zh.trim()) return
    setSaving(true)
    const { error } = await supabase.from('glossary').insert({
      jp: form.jp.trim(),
      zh: form.zh.trim(),
      category: form.category || null,
      note: form.note.trim() || null,
    })
    if (error) { alert('添加失败：' + error.message); setSaving(false); return }
    setForm({ jp: '', zh: '', category: '', note: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    if (!confirm('确定删除？')) return
    await supabase.from('glossary').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const filtered = entries.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.jp.toLowerCase().includes(q) || e.zh.toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="p2is-page">
      <TopNav />
      <div className="browse-wrap">
        <P2ISNav />
        <div className="browse-header">
          <h1>术语表</h1>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
              {showForm ? '取消' : '+ 添加'}
            </button>
          )}
        </div>

        {isAdmin && showForm && (
          <div className="glossary-form">
            <input className="form-input" placeholder="日文原文 *" value={form.jp} onChange={e => setForm(f => ({ ...f, jp: e.target.value }))} />
            <input className="form-input" placeholder="中文译名 *" value={form.zh} onChange={e => setForm(f => ({ ...f, zh: e.target.value }))} />
            <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">分类（可选）</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="form-input" placeholder="备注（可选）" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            <button className="btn-primary" onClick={add} disabled={saving || !form.jp.trim() || !form.zh.trim()}>
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        )}

        <div className="editor-search-bar" style={{ marginBottom: 24 }}>
          <input
            className="search-input"
            placeholder="搜索日文 / 中文…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="muted">{filtered.length} 条</span>
        </div>

        {loading && <p className="muted">加载中…</p>}

        <div className="glossary-table">
          <div className="glossary-header-row">
            <span>日文</span>
            <span>中文</span>
            <span>分类</span>
            <span>备注</span>
            {isAdmin && <span></span>}
          </div>
          {filtered.map(e => (
            <div key={e.id} className="glossary-row">
              <span className="glossary-jp">{e.jp}</span>
              <span className="glossary-zh">{e.zh}</span>
              <span>{e.category ? <span className="set-source-tag">{e.category}</span> : <span className="muted">—</span>}</span>
              <span className="muted">{e.note ?? '—'}</span>
              {isAdmin && (
                <button className="btn-ghost" style={{ color: '#f87171', fontSize: 12 }} onClick={() => remove(e.id)}>删除</button>
              )}
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="muted" style={{ padding: '16px 0' }}>暂无术语。</p>
          )}
        </div>
      </div>
    </div>
  )
}
