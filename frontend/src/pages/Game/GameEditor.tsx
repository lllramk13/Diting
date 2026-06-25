import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { getGameTheme, type GameTheme } from './gameTheme'

const PAGE_SIZE = 100

const mono = "'Space Mono', monospace"
const cnf = "'Noto Sans SC', sans-serif"
const DONE = '#2D8C50'
const WARN = '#F0B84A'
const ERR = '#F0888A'

type ActiveGame = NonNullable<ReturnType<typeof getGameBySlug>>

type SourceRow = {
  id: string
  jp?: string
  zh?: string
  speaker?: string
  speaker_jp?: string
  speaker_zh?: string
  meta?: string
  context?: string
  srcs?: string[]
  maxLen?: number
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

type ValidationChip = {
  text: string
  kind: 'err' | 'warn' | 'ok'
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

function codesOf(s: string): string[] {
  return s.match(/<[^>]+>/g) ?? []
}

function newlineCount(s: string) {
  return (formatControlNewlines(s).match(/\n/g) ?? []).length
}

function visibleLength(s: string) {
  return [...formatControlNewlines(s).replace(/<[^>]+>/g, '').replace(/\n/g, '')].length
}

function hasKana(s: string) {
  return /[\u3040-\u30ff]/.test(s)
}

function unique<T>(items: T[]) {
  return [...new Set(items)]
}

function computeValidation(row: SourceRow, value: string, glossaryRows: GlossaryRow[]) {
  const chips: ValidationChip[] = []

  const jp = formatControlNewlines(row.jp ?? '')
  const zh = formatControlNewlines(row.zh ?? '')
  const current = formatControlNewlines(value ?? '')
  const dirty = current.trim() !== zh.trim()

  const err = (text: string) => chips.push({ text, kind: 'err' as const })
  const warn = (text: string) => chips.push({ text, kind: 'warn' as const })
  const ok = (text: string) => chips.push({ text, kind: 'ok' as const })

  if (!current.trim()) {
    warn('未填写')
    return { chips, dirty, hasError: false, hasWarn: true }
  }

  const jpCodes = codesOf(jp)
  const currentCodes = codesOf(current)

  const missingCodes = unique(jpCodes.filter(code => !currentCodes.includes(code)))
  const extraCodes = unique(currentCodes.filter(code => !jpCodes.includes(code)))

  if (missingCodes.length > 0) {
    err(`缺控制符 ${missingCodes.join(' ')}`)
  }

  if (extraCodes.length > 0) {
    err(`多余控制符 ${extraCodes.join(' ')}`)
  }

  if (hasKana(current)) {
    err('假名残留')
  }

  if (jp.trim() && current.trim() === jp.trim()) {
    err('与原文相同 · 疑似未翻译')
  }

  if (typeof row.maxLen === 'number' && row.maxLen > 0) {
    const len = visibleLength(current)

    if (len > row.maxLen) {
      err(`超字数 ${len}/${row.maxLen}`)
    } else if (len > row.maxLen * 0.85) {
      warn(`接近字数上限 ${len}/${row.maxLen}`)
    }
  }

  const jpNl = newlineCount(jp)
  const currentNl = newlineCount(current)

  if (jpNl !== currentNl) {
    warn(`换行不一致 原文${jpNl} / 译文${currentNl}`)
  }

  for (const g of glossaryRows) {
    if (!g.jp || !g.zh) continue

    if (jp.includes(g.jp) && !current.includes(g.zh)) {
      warn(`术语 ${g.jp}→${g.zh}`)
    }
  }

  if (chips.length === 0 && dirty) {
    ok('校验通过')
  }

  const hasError = chips.some(chip => chip.kind === 'err')
  const hasWarn = chips.some(chip => chip.kind === 'err' || chip.kind === 'warn')

  return { chips, dirty, hasError, hasWarn }
}

function chipStyle(kind: ValidationChip['kind']) {
  if (kind === 'err') {
    return {
      color: ERR,
      bg: 'rgba(248,136,138,0.10)',
      border: 'rgba(248,136,138,0.30)',
    }
  }

  if (kind === 'warn') {
    return {
      color: WARN,
      bg: 'rgba(240,184,74,0.10)',
      border: 'rgba(240,184,74,0.30)',
    }
  }

  return {
    color: DONE,
    bg: 'rgba(45,140,80,0.12)',
    border: 'rgba(45,140,80,0.30)',
  }
}

function renderTextWithCodePills(text: string, t: GameTheme) {
  const source = formatControlNewlines(text)
  const parts: { text: string; code: boolean }[] = []
  const re = /(<[^>]+>)/g

  let last = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(source)) !== null) {
    if (match.index > last) {
      parts.push({ text: source.slice(last, match.index), code: false })
    }

    parts.push({ text: match[0], code: true })
    last = re.lastIndex
  }

  if (last < source.length) {
    parts.push({ text: source.slice(last), code: false })
  }

  return parts.map((part, index) => {
    if (!part.code) return part.text

    return (
      <span
        key={`${part.text}-${index}`}
        style={{
          display: 'inline-block',
          verticalAlign: 'baseline',
          lineHeight: 1.3,
          color: t.accent,
          background: t.accentSoft,
          border: `1px solid ${t.accentBorder}`,
          padding: '0 4px',
          margin: '0 1px',
          borderRadius: 5,
          fontFamily: mono,
          fontSize: '0.78em',
        }}
      >
        {part.text}
      </span>
    )
  })
}

type EntryRowProps = {
  row: SourceRow
  value: string
  readonly: boolean
  validation: ReturnType<typeof computeValidation>
  theme: GameTheme
  active: boolean
  textareaRef: (el: HTMLTextAreaElement | null) => void
  onFocus: () => void
  onChange: (value: string) => void
}

function EntryRow({
  row,
  value,
  readonly,
  validation,
  theme: t,
  active,
  textareaRef,
  onFocus,
  onChange,
}: EntryRowProps) {
  const { chips, dirty, hasError } = validation

  const speakerJp = row.meta ?? row.speaker_jp ?? row.speaker
  const speakerZh = row.speaker_zh
  const speaker =
    speakerJp && speakerZh && speakerJp !== speakerZh
      ? `${speakerJp} / ${speakerZh}`
      : speakerJp ?? speakerZh
  const srcs = row.srcs ?? []
  const occurrences = srcs.length

  const len = visibleLength(value)
  const maxLen = typeof row.maxLen === 'number' && row.maxLen > 0 ? row.maxLen : null
  const over = maxLen !== null && len > maxLen
  const near = maxLen !== null && len > maxLen * 0.85

  const countColor = over ? ERR : near ? WARN : t.label
  const rail = hasError ? ERR : dirty ? t.accent : t.line2
  const rowBorder = hasError ? 'rgba(248,136,138,0.35)' : active ? t.accentBorder : t.line2

  const lineCount = Math.max(
    3,
    formatControlNewlines(row.jp ?? '').split('\n').length + 1,
    formatControlNewlines(value ?? '').split('\n').length,
  )

  return (
    <article
      style={{
        border: `1px solid ${rowBorder}`,
        borderLeft: `3px solid ${rail}`,
        borderRadius: 12,
        background: t.card,
        padding: '15px 17px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        boxShadow: active ? '0 4px 18px rgba(0,0,0,0.20)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: mono,
            fontSize: 11,
            letterSpacing: 0.5,
            color: t.muted,
          }}
        >
          {row.id}
        </span>

        {speaker && (
          <span
            style={{
              fontFamily: cnf,
              fontSize: 12,
              padding: '2px 9px',
              borderRadius: 20,
              background: t.accentSoft,
              color: t.accent,
            }}
          >
            🗣 {speaker}
          </span>
        )}

        {occurrences > 1 && (
          <details style={{ position: 'relative' }}>
            <summary
              style={{
                listStyle: 'none',
                cursor: 'pointer',
                fontFamily: mono,
                fontSize: 11,
                padding: '2px 9px',
                borderRadius: 20,
                border: `1px solid ${t.line2}`,
                color: t.muted,
                userSelect: 'none',
              }}
              title="这句原文在游戏里出现的所有位置；翻译一次会应用到全部位置"
            >
              出现 {occurrences} 处 ▾
            </summary>

            <div
              style={{
                position: 'absolute',
                zIndex: 5,
                top: '100%',
                left: 0,
                marginTop: 6,
                maxHeight: 200,
                overflow: 'auto',
                minWidth: 220,
                padding: '8px 10px',
                borderRadius: 9,
                background: t.card,
                border: `1px solid ${t.line2}`,
                boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 9.5,
                  letterSpacing: 1,
                  color: t.label,
                  marginBottom: 6,
                }}
              >
                应用到以下 {occurrences} 个位置
              </div>

              {srcs.map(src => (
                <div
                  key={src}
                  style={{
                    fontFamily: mono,
                    fontSize: 11.5,
                    color: t.muted,
                    lineHeight: 1.7,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {src}
                </div>
              ))}
            </div>
          </details>
        )}

        {dirty && (
          <span
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: 1,
              padding: '2px 8px',
              borderRadius: 20,
              border: `1px solid ${t.line2}`,
              color: t.muted,
            }}
          >
            MODIFIED
          </span>
        )}

        <span
          style={{
            marginLeft: 'auto',
            fontFamily: mono,
            fontSize: 11,
            color: countColor,
          }}
        >
          {maxLen ? `${len} / ${maxLen}` : `${len} 字`}
        </span>
      </div>

      {row.context && (
        <div
          style={{
            fontSize: 12,
            color: t.label,
            fontStyle: 'italic',
          }}
        >
          {String(row.context)}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 9.5,
                color: t.label,
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              原文 · JP
            </div>

            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 15,
                lineHeight: 1.8,
                color: t.ink,
                fontFamily: cnf,
              }}
            >
              {renderTextWithCodePills(row.jp ?? '', t)}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 9.5,
                color: t.label,
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              当前译文 · 参考
            </div>

            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 14,
                lineHeight: 1.7,
                color: t.muted,
                fontFamily: cnf,
              }}
            >
              {row.zh?.trim() ? renderTextWithCodePills(row.zh, t) : '（暂无）'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 9.5,
              color: t.accent,
              letterSpacing: 2,
            }}
          >
            我的译文
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            disabled={readonly}
            onFocus={onFocus}
            onChange={e => onChange(e.target.value)}
            rows={lineCount}
            placeholder="在此输入中文翻译…"
            style={{
              width: '100%',
              resize: 'vertical',
              background: t.inkSoft,
              border: `1px solid ${active ? t.accent : t.line2}`,
              borderRadius: 10,
              color: t.ink,
              fontFamily: cnf,
              fontSize: 15,
              lineHeight: 1.8,
              padding: '10px 12px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              opacity: readonly ? 0.72 : 1,
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chips.map((chip, index) => {
              const s = chipStyle(chip.kind)

              return (
                <span
                  key={`${chip.text}-${index}`}
                  style={{
                    fontFamily: cnf,
                    fontSize: 11.5,
                    padding: '3px 9px',
                    borderRadius: 20,
                    background: s.bg,
                    color: s.color,
                    border: `1px solid ${s.border}`,
                  }}
                >
                  {chip.text}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </article>
  )
}

type EditorTipsProps = {
  theme: GameTheme
}

function EditorTips({ theme: t }: EditorTipsProps) {
  return (
    <div
      style={{
        padding: 17,
        border: `1px solid ${t.line2}`,
        borderRadius: 12,
        background: t.card,
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 10,
          letterSpacing: 2,
          color: t.label,
          marginBottom: 11,
        }}
      >
        编辑提示 · TIPS
      </div>

      <ul
        style={{
          margin: 0,
          paddingLeft: 17,
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
        }}
      >
        <li style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.55 }}>
          控制符 <span style={{ fontFamily: mono, color: t.accent }}>{'<c6/>'}</span>{' '}
          <span style={{ fontFamily: mono, color: t.accent }}>{'<WAIT>'}</span> 原样保留。
        </li>

        <li style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.55 }}>
          点进输入框后，下方工具栏可以插入换行、控制符和术语。
        </li>

        <li style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.55 }}>
          改完保存，再提交合并请求等待审核。
        </li>
      </ul>
    </div>
  )
}

type LegendPanelProps = {
  theme: GameTheme
}

function LegendPanel({ theme: t }: LegendPanelProps) {
  return (
    <div
      style={{
        padding: 17,
        border: `1px solid ${t.line2}`,
        borderRadius: 12,
        background: t.card,
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 10,
          letterSpacing: 2,
          color: t.label,
          marginBottom: 13,
        }}
      >
        校验图例 · LEGEND
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: ERR, flexShrink: 0 }} />
          <span style={{ color: t.muted }}>控制符缺失 · 假名残留 · 超字数</span>
        </div>

        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: WARN, flexShrink: 0 }} />
          <span style={{ color: t.muted }}>换行不一致 · 术语不一致</span>
        </div>

        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: DONE, flexShrink: 0 }} />
          <span style={{ color: t.muted }}>校验通过</span>
        </div>
      </div>
    </div>
  )
}

type GlossaryPanelProps = {
  gameSlug: string
  theme: GameTheme
  onRowsLoaded: (rows: GlossaryRow[]) => void
  onInsert: (text: string) => void
}

function GlossaryPanel({ gameSlug, theme: t, onRowsLoaded, onInsert }: GlossaryPanelProps) {
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
        onRowsLoaded([])
        setLoading(false)
        return
      }

      const loadedRows = (data ?? []) as GlossaryRow[]
      setRows(loadedRows)
      onRowsLoaded(loadedRows)
      setLoading(false)
    }

    load()
  }, [gameSlug, onRowsLoaded])

  return (
    <div
      style={{
        padding: 17,
        border: `1px solid ${t.line2}`,
        borderRadius: 12,
        background: t.card,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 13,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: 2,
            color: t.label,
          }}
        >
          术语表 · GLOSSARY
        </div>

        <span style={{ fontFamily: mono, fontSize: 9.5, color: t.label }}>
          点击插入
        </span>
      </div>

      {loading && (
        <p style={{ margin: 0, fontSize: 12.5, color: t.muted }}>
          加载中…
        </p>
      )}

      {!loading && rows.length === 0 && (
        <p style={{ margin: 0, fontSize: 12.5, color: t.muted }}>
          暂无术语。
        </p>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(row => (
            <div
              key={row.id}
              onClick={() => onInsert(row.zh)}
              style={{
                cursor: 'pointer',
                padding: '9px 11px',
                borderRadius: 9,
                background: t.inkSoft,
                border: `1px solid ${t.line}`,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontFamily: cnf, fontSize: 13.5 }}>
                <span style={{ color: t.muted }}>{row.jp}</span>
                <span style={{ color: t.label }}> → </span>
                <span style={{ color: t.accent, fontWeight: 500 }}>{row.zh}</span>
              </div>

              {row.note && (
                <div style={{ fontSize: 11, color: t.label, marginTop: 3 }}>
                  {row.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type PRModalProps = {
  theme: GameTheme
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
  theme: t,
  gameSlug,
  fromSetId,
  toSetId,
  title,
  snapshot,
  baseSnapshot,
  onClose,
  onSubmitted,
}: PRModalProps) {
  const [prTitle, setPrTitle] = useState(title)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!prTitle.trim()) {
      alert('请填写标题。')
      return
    }

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
        title: prTitle.trim(),
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.58)',
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
          background: t.page,
          border: `1px solid ${t.line2}`,
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
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
            提交合并请求
          </div>

          <label
            style={{
              display: 'block',
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: 1.5,
              color: t.label,
              marginBottom: 6,
            }}
          >
            标题
          </label>

          <input
            value={prTitle}
            onChange={e => setPrTitle(e.target.value)}
            placeholder="给这次合并请求起个标题"
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
            }}
          />

          <label
            style={{
              display: 'block',
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: 1.5,
              color: t.label,
              marginBottom: 6,
            }}
          >
            说明
          </label>

          <textarea
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="可以简单说明这次修改了什么，比如错字修正、润色、控制符修复等。"
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
              marginBottom: 18,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={onClose}
              disabled={submitting}
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
              onClick={submit}
              disabled={submitting}
              style={{
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: cnf,
                fontSize: 13.5,
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: 9,
                background: t.accent,
                border: 'none',
                color: '#0A0E18',
              }}
            >
              {submitting ? '提交中…' : '提交'}
            </button>
          </div>
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
  const [deleting, setDeleting] = useState(false)

  const [forkedFromId, setForkedFromId] = useState<string | null>(null)
  const [forkedFrom, setForkedFrom] = useState<ForkedFromInfo | null>(null)
  const [forkedFromIsOfficial, setForkedFromIsOfficial] = useState(false)

  const [query, setQuery] = useState('')
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [onlyWarn, setOnlyWarn] = useState(false)
  const [page, setPage] = useState(1)

  const [showPRModal, setShowPRModal] = useState(false)

  const [glossaryRows, setGlossaryRows] = useState<GlossaryRow[]>([])
  const [activeRowId, setActiveRowId] = useState<string | null>(null)
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

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

  function updateEntry(row: SourceRow, value: string) {
    setEntries(prev => ({
      ...prev,
      [row.id]: {
        content: value,
        sort_order: sourceStrings.findIndex(item => item.id === row.id),
      },
    }))
  }

  function updateEntryById(rowId: string, value: string) {
    setEntries(prev => ({
      ...prev,
      [rowId]: {
        content: value,
        sort_order: sourceStrings.findIndex(item => item.id === rowId),
      },
    }))
  }

  function insertToken(token: string) {
    if (!activeRowId || readonly) return

    const row = sourceStrings.find(item => item.id === activeRowId)
    if (!row) return

    const current = entries[activeRowId]?.content ?? getBaseContent(row)
    const textarea = textareaRefs.current[activeRowId]

    let next = ''
    let caret = 0

    if (textarea && typeof textarea.selectionStart === 'number') {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      next = current.slice(0, start) + token + current.slice(end)
      caret = start + token.length
    } else {
      next = current + token
      caret = next.length
    }

    updateEntryById(activeRowId, next)

    setTimeout(() => {
      const el = textareaRefs.current[activeRowId]

      if (!el) return

      el.focus()

      try {
        el.setSelectionRange(caret, caret)
      } catch {
        // ignore selection errors
      }
    }, 0)
  }

  function copyCodesFromSource() {
    if (!activeRowId) return

    const row = sourceStrings.find(item => item.id === activeRowId)
    if (!row) return

    const codes = codesOf(formatControlNewlines(row.jp ?? '')).join(' ')

    if (!codes) {
      alert('当前原文没有控制符。')
      return
    }

    insertToken(codes)
  }

  function copySourceToEdit() {
    if (!activeRowId || readonly) return

    const row = sourceStrings.find(item => item.id === activeRowId)
    if (!row) return

    const source = row.jp ?? ''

    updateEntryById(activeRowId, source)

    setTimeout(() => {
      const el = textareaRefs.current[activeRowId]
      if (!el) return

      el.focus()

      try {
        el.setSelectionRange(source.length, source.length)
      } catch {
        // ignore selection errors
      }
    }, 0)
  }

  const rowStates = useMemo(() => {
    const map: Record<
      string,
      {
        current: string
        base: string
        validation: ReturnType<typeof computeValidation>
      }
    > = {}

    for (const row of sourceStrings) {
      const current = getInitialContent(row, entries)
      const base = getBaseContent(row)

      map[row.id] = {
        current,
        base,
        validation: computeValidation(row, current, glossaryRows),
      }
    }

    return map
  }, [sourceStrings, entries, glossaryRows])

  const filteredRows = useMemo(() => {
    const q = normalize(query)

    let rows = sourceStrings

    if (onlyChanged) {
      rows = rows.filter(row => rowStates[row.id]?.validation.dirty)
    }

    if (onlyWarn) {
      rows = rows.filter(row => rowStates[row.id]?.validation.hasWarn)
    }

    if (!q) return rows

    return rows.filter(row => {
      const current = rowStates[row.id]?.current ?? ''

      const id = normalize(row.id)
      const jp = normalize(row.jp ?? '')
      const zh = normalize(row.zh ?? '')
      const speaker = normalize(row.speaker ?? '')
      const context = normalize(row.context ?? '')
      const currentText = normalize(current)

      return (
        id.includes(q) ||
        jp.includes(q) ||
        zh.includes(q) ||
        speaker.includes(q) ||
        context.includes(q) ||
        currentText.includes(q)
      )
    })
  }, [sourceStrings, rowStates, query, onlyChanged, onlyWarn])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  const pageRows = useMemo(() => {
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page, totalPages])

  const changedCount = useMemo(() => {
    return sourceStrings.filter(row => rowStates[row.id]?.validation.dirty).length
  }, [sourceStrings, rowStates])

  const warnCount = useMemo(() => {
    return sourceStrings.reduce((n, row) => {
      return n + (rowStates[row.id]?.validation.chips.filter(chip => chip.kind === 'err' || chip.kind === 'warn').length ?? 0)
    }, 0)
  }, [sourceStrings, rowStates])

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

  async function deleteSet() {
    if (!setId || readonly || !setData) return

    if (setData.is_official) {
      alert('官方主集不能删除。')
      return
    }

    if (!confirm(`确定要删除这个翻译集「${title}」吗？\n此操作不可撤销，集内的所有翻译内容都会一起删除。`)) {
      return
    }

    setDeleting(true)

    const { error: entriesError } = await supabase
      .from('translation_entries')
      .delete()
      .eq('set_id', setId)

    if (entriesError) {
      alert('删除失败：' + entriesError.message)
      setDeleting(false)
      return
    }

    const { error: setError } = await supabase
      .from('translation_sets')
      .delete()
      .eq('id', setId)
      .eq('game_slug', game?.slug ?? '')

    if (setError) {
      alert('删除失败：' + setError.message)
      setDeleting(false)
      return
    }

    setDeleting(false)
    navigate(game?.routes.main ?? '/game')
  }

  if (!game) {
    return (
      <main style={{ minHeight: '100vh', background: '#0A0E18', color: '#EAEEF7', padding: 40 }}>
        <h1>Game not found</h1>
        <Link to="/game" style={{ color: '#E8B23A' }}>
          返回游戏列表
        </Link>
      </main>
    )
  }

  const t = getGameTheme(game)

  if (loadingStrings) {
    return (
      <GamePageShell game={game}>
        <main
          style={{
            minHeight: '100vh',
            background: t.page,
            color: t.ink,
            fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, sans-serif",
            padding: 40,
          }}
        >
          <p style={{ color: t.muted, fontFamily: mono }}>加载中…</p>
        </main>
      </GamePageShell>
    )
  }

  if (!setData) {
    return (
      <GamePageShell game={game}>
        <main
          style={{
            minHeight: '100vh',
            background: t.page,
            color: t.ink,
            fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, sans-serif",
            padding: 40,
          }}
        >
          <p style={{ color: t.muted, fontFamily: mono }}>找不到这个翻译集。</p>
        </main>
      </GamePageShell>
    )
  }

  const canSubmitPR = !readonly && !!forkedFromId && changedCount > 0

  const toolbarTokens = [
    { label: '↵ 换行', token: '\n' },
    { label: '<c6/>', token: '<c6/>' },
    { label: '<c2/>', token: '<c2/>' },
    { label: '<WAIT>', token: '<WAIT>' },
    { label: '【id】', token: '【id】' },
  ]

  return (
    <GamePageShell game={game}>
      <main
        style={{
          minHeight: '100vh',
          background: t.page,
          color: t.ink,
          fontFamily: "'Space Grotesk', 'Noto Sans SC', -apple-system, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <div style={{ height: 3, background: t.accent }} />

        <div
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            padding: '26px 32px 130px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 296px',
            gap: 26,
            alignItems: 'start',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <section
              style={{
                border: `1px solid ${t.line2}`,
                borderRadius: 12,
                background: t.card,
                padding: '20px 22px',
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 10.5,
                  letterSpacing: 2,
                  color: t.label,
                  marginBottom: 10,
                }}
              >
                <Link
                  to={game.routes.main}
                  style={{ color: t.label, textDecoration: 'none' }}
                >
                  ← 返回主集
                </Link>

                {forkedFrom && (
                  <>
                    {' '}· FORK 自 {forkedFromIsOfficial ? '官方主集' : '社区集'}
                  </>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 20,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 240, flex: 1 }}>
                  {readonly ? (
                    <h1
                      style={{
                        fontFamily: cnf,
                        fontWeight: 700,
                        fontSize: 25,
                        margin: 0,
                        color: t.ink,
                      }}
                    >
                      {title}
                    </h1>
                  ) : (
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: `1px solid ${t.line2}`,
                        color: t.ink,
                        fontFamily: cnf,
                        fontWeight: 700,
                        fontSize: 25,
                        padding: '2px 0',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      flexWrap: 'wrap',
                      marginTop: 9,
                    }}
                  >
                    {setData.source_file ? (
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 10.5,
                          letterSpacing: 1,
                          padding: '3px 9px',
                          borderRadius: 20,
                          border: `1px solid ${t.line2}`,
                          color: t.muted,
                        }}
                      >
                        {setData.source_file}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 10.5,
                          letterSpacing: 1,
                          padding: '3px 9px',
                          borderRadius: 20,
                          border: `1px solid ${t.line2}`,
                          color: t.muted,
                        }}
                      >
                        全量合并数据
                      </span>
                    )}

                    {isScript && (
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 10.5,
                          letterSpacing: 1,
                          padding: '3px 9px',
                          borderRadius: 20,
                          background: t.accentSoft,
                          color: t.accent,
                        }}
                      >
                        SCRIPT
                      </span>
                    )}

                    {readonly && (
                      <span style={{ fontSize: 12.5, color: t.muted }}>
                        只读模式
                      </span>
                    )}

                    {!readonly && (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          fontSize: 12.5,
                          color: t.muted,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isPublic}
                          onChange={e => setIsPublic(e.target.checked)}
                        />
                        公开展示
                      </label>
                    )}
                  </div>

                  {forkedFrom && (
                    <p style={{ margin: '9px 0 0', fontSize: 12.5, color: t.muted }}>
                      Fork 自：{forkedFrom.title} · {forkedFrom.username}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 18 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 22,
                          fontWeight: 700,
                          color: t.ink,
                        }}
                      >
                        {changedCount}
                      </div>
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 9.5,
                          letterSpacing: 1.5,
                          color: t.label,
                        }}
                      >
                        CHANGED
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 22,
                          fontWeight: 700,
                          color: warnCount > 0 ? ERR : t.muted,
                        }}
                      >
                        {warnCount}
                      </div>
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 9.5,
                          letterSpacing: 1.5,
                          color: t.label,
                        }}
                      >
                        WARNINGS
                      </div>
                    </div>
                  </div>

                  {!readonly && (
                    <div style={{ display: 'flex', gap: 9 }}>
                      <button
                        onClick={saveAll}
                        disabled={saving}
                        style={{
                          background: t.inkSoft,
                          border: `1px solid ${t.line2}`,
                          color: t.ink,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          padding: '10px 16px',
                          fontFamily: 'inherit',
                          fontSize: 13,
                          borderRadius: 9,
                        }}
                      >
                        {saving ? '保存中…' : '保存'}
                      </button>

                      <button
                        onClick={() => setShowPRModal(true)}
                        disabled={!canSubmitPR}
                        style={{
                          background: canSubmitPR ? t.accent : t.line2,
                          border: 'none',
                          color: '#0A0E18',
                          fontWeight: 700,
                          cursor: canSubmitPR ? 'pointer' : 'not-allowed',
                          padding: '10px 16px',
                          fontFamily: 'inherit',
                          fontSize: 13,
                          borderRadius: 9,
                        }}
                      >
                        提交合并请求
                      </button>

                      {!setData.is_official && (
                        <button
                          onClick={deleteSet}
                          disabled={deleting}
                          style={{
                            background: 'none',
                            border: `1px solid ${ERR}`,
                            color: ERR,
                            cursor: deleting ? 'not-allowed' : 'pointer',
                            padding: '10px 16px',
                            fontFamily: 'inherit',
                            fontSize: 13,
                            borderRadius: 9,
                          }}
                        >
                          {deleting ? '删除中…' : '删除此集'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

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
                marginBottom: 16,
              }}
            >
              <input
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="搜索 ID · 原文 · 译文 · 角色名…"
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

              <button
                onClick={() => {
                  setOnlyChanged(prev => !prev)
                  setPage(1)
                }}
                style={{
                  cursor: 'pointer',
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: 0.5,
                  padding: '9px 13px',
                  borderRadius: 8,
                  background: onlyChanged ? t.accentSoft : t.card,
                  color: onlyChanged ? t.accent : t.muted,
                  border: `1px solid ${onlyChanged ? t.accentBorder : t.line2}`,
                }}
              >
                仅看改动
              </button>

              <button
                onClick={() => {
                  setOnlyWarn(prev => !prev)
                  setPage(1)
                }}
                style={{
                  cursor: 'pointer',
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: 0.5,
                  padding: '9px 13px',
                  borderRadius: 8,
                  background: onlyWarn ? 'rgba(248,136,138,0.10)' : t.card,
                  color: onlyWarn ? ERR : t.muted,
                  border: `1px solid ${onlyWarn ? 'rgba(248,136,138,0.30)' : t.line2}`,
                }}
              >
                仅看告警
              </button>

              <span
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: t.label,
                  whiteSpace: 'nowrap',
                }}
              >
                {filteredRows.length} / {sourceStrings.length}
              </span>
            </section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pageRows.map(row => {
                const rowState = rowStates[row.id]
                const value = rowState?.current ?? getInitialContent(row, entries)
                const validation = rowState?.validation ?? computeValidation(row, value, glossaryRows)

                return (
                  <EntryRow
                    key={row.id}
                    row={row}
                    value={value}
                    readonly={readonly}
                    validation={validation}
                    theme={t}
                    active={activeRowId === row.id}
                    textareaRef={el => {
                      textareaRefs.current[row.id] = el
                    }}
                    onFocus={() => setActiveRowId(row.id)}
                    onChange={next => updateEntry(row, next)}
                  />
                )
              })}
            </div>

            {pageRows.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  fontFamily: mono,
                  fontSize: 13,
                  color: t.label,
                }}
              >
                没有匹配条目
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                marginTop: 24,
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                style={{
                  background: t.card,
                  border: `1px solid ${t.line2}`,
                  color: page <= 1 ? t.label : t.ink,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: 1,
                }}
              >
                PREV
              </button>

              <span style={{ fontFamily: mono, fontSize: 12, color: t.muted }}>
                {String(Math.min(page, totalPages)).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  background: t.card,
                  border: `1px solid ${t.line2}`,
                  color: page >= totalPages ? t.label : t.ink,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: 1,
                }}
              >
                NEXT
              </button>
            </div>
          </div>

          <aside
            style={{
              position: 'sticky',
              top: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <LegendPanel theme={t} />

            <EditorTips theme={t} />

            <GlossaryPanel
              gameSlug={game.slug}
              theme={t}
              onRowsLoaded={setGlossaryRows}
              onInsert={insertToken}
            />
          </aside>
        </div>

        {activeRowId && !readonly && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              background: t.page,
              borderTop: `1px solid ${t.accentBorder}`,
              boxShadow: '0 -8px 30px rgba(0,0,0,0.26)',
              padding: '12px 22px',
            }}
          >
            <div
              style={{
                maxWidth: 1320,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: 1.5,
                  color: t.label,
                  whiteSpace: 'nowrap',
                }}
              >
                插入 → {activeRowId}
              </span>

              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {toolbarTokens.map(item => (
                  <button
                    key={item.label}
                    onClick={() => insertToken(item.token)}
                    style={{
                      cursor: 'pointer',
                      fontFamily: mono,
                      fontSize: 12.5,
                      padding: '8px 13px',
                      borderRadius: 8,
                      background: t.inkSoft,
                      border: `1px solid ${t.line2}`,
                      color: t.ink,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={copyCodesFromSource}
                style={{
                  cursor: 'pointer',
                  fontFamily: cnf,
                  fontSize: 12.5,
                  padding: '8px 13px',
                  borderRadius: 8,
                  background: t.accentSoft,
                  border: `1px solid ${t.accentBorder}`,
                  color: t.accent,
                }}
              >
                ⎘ 复制原文控制符
              </button>

              <button
                onClick={copySourceToEdit}
                style={{
                  cursor: 'pointer',
                  fontFamily: cnf,
                  fontSize: 12.5,
                  padding: '8px 13px',
                  borderRadius: 8,
                  background: t.accentSoft,
                  border: `1px solid ${t.accentBorder}`,
                  color: t.accent,
                }}
              >
                ⎘ 复制原文到译文
              </button>

              {glossaryRows.length > 0 && (
                <>
                  <div style={{ width: 1, height: 22, background: t.line2 }} />

                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 10,
                      letterSpacing: 1.5,
                      color: t.label,
                    }}
                  >
                    术语
                  </span>

                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {glossaryRows.slice(0, 8).map(row => (
                      <button
                        key={row.id}
                        onClick={() => insertToken(row.zh)}
                        style={{
                          cursor: 'pointer',
                          fontFamily: cnf,
                          fontSize: 12.5,
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: t.inkSoft,
                          border: `1px solid ${t.line2}`,
                          color: t.ink,
                        }}
                      >
                        {row.zh}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => setActiveRowId(null)}
                style={{
                  marginLeft: 'auto',
                  cursor: 'pointer',
                  fontFamily: mono,
                  fontSize: 11,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'none',
                  border: 'none',
                  color: t.label,
                }}
              >
                收起 ✕
              </button>
            </div>
          </div>
        )}

        {showPRModal && forkedFromId && setId && (
          <PRModal
            theme={t}
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