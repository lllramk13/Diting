import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getGameBySlug } from '../../games/registry'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import './gameTheme.css'
import './GameEditor.css'

const PAGE_SIZE = 100

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
  dup?: string | null
  maxLen?: number
  [key: string]: unknown
}

type EntryValue = {
  content: string
  sort_order: number
  base_content: string | null
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
  storage_version?: number | null
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

function getInitialContent(row: SourceRow, entries: EntryMap, inheritedEntries: EntryMap) {
  return entries[row.id]?.content ?? inheritedEntries[row.id]?.content ?? ''
}

async function loadEffectiveEntries(
  targetSetId: string,
  gameSlug: string,
  visited = new Set<string>(),
): Promise<EntryMap> {
  if (visited.has(targetSetId)) throw new Error('翻译集 Fork 链存在循环。')
  visited.add(targetSetId)
  const { data: setRow, error: setError } = await supabase
    .from('translation_sets').select('forked_from')
    .eq('id', targetSetId).eq('game_slug', gameSlug).single()
  if (setError || !setRow) throw new Error(setError?.message ?? '找不到父翻译集。')
  const inherited = setRow.forked_from
    ? await loadEffectiveEntries(setRow.forked_from, gameSlug, visited)
    : {}
  const { data, error } = await supabase
    .from('translation_entries')
    .select('string_id, content, sort_order, base_content')
    .eq('set_id', targetSetId)
  if (error) throw new Error(error.message)
  const own: EntryMap = {}
  ;(data ?? []).forEach((entry: { string_id: string; content: string; sort_order: number; base_content: string | null }) => {
    own[entry.string_id] = {
      content: entry.content,
      sort_order: entry.sort_order,
      base_content: entry.base_content,
    }
  })
  return { ...inherited, ...own }
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
  return /[぀-ヿ]/.test(s)
}

function unique<T>(items: T[]) {
  return [...new Set(items)]
}

function computeValidation(row: SourceRow, value: string, glossaryRows: GlossaryRow[], base = '') {
  const chips: ValidationChip[] = []

  const jp = formatControlNewlines(row.jp ?? '')
  const current = formatControlNewlines(value ?? '')
  const dirty = current !== formatControlNewlines(base)

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

function renderTextWithCodePills(text: string) {
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
      <span key={`${part.text}-${index}`} className="ed-pill">
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
  active: boolean
  textareaRef: (el: HTMLTextAreaElement | null) => void
  onFocus: () => void
  onChange: (value: string) => void
  /** when true this row is a duplicate sentence: edit happens in the dup set, here it is read-only */
  mirror?: boolean
  /** the shared translation pulled from the dup set (for mirror rows) */
  mirrorValue?: string
  /** jump to edit this sentence in its dup set */
  onGotoDup?: () => void
}

function EntryRow({
  row,
  value,
  readonly,
  validation,
  active,
  textareaRef,
  onFocus,
  onChange,
  mirror,
  mirrorValue,
  onGotoDup,
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

  const countClass = over ? ' is-over' : near ? ' is-near' : ''
  const rail = hasError ? 'var(--gt-danger)' : dirty ? 'var(--gt-accent)' : 'var(--gt-line)'
  const rowBorder = hasError
    ? 'rgba(248,136,138,0.35)'
    : active
      ? 'var(--gt-accent-border)'
      : 'var(--gt-line)'

  const lineCount = Math.max(
    3,
    formatControlNewlines(row.jp ?? '').split('\n').length + 1,
    formatControlNewlines(value ?? '').split('\n').length,
  )

  return (
    <article
      className={`ed-row${active ? ' is-active' : ''}`}
      style={{ '--ed-rail': rail, '--ed-border': rowBorder } as CSSProperties}
    >
      <div className="ed-row-head">
        <span className="ed-id">{row.id}</span>

        {speaker && <span className="ed-speaker">🗣 {speaker}</span>}

        {occurrences > 1 && (
          <details className="ed-occ">
            <summary
              className="ed-occ-summary"
              title="这句原文在游戏里出现的所有位置；翻译一次会应用到全部位置"
            >
              出现 {occurrences} 处 ▾
            </summary>

            <div className="ed-occ-pop">
              <div className="ed-occ-label">应用到以下 {occurrences} 个位置</div>

              {srcs.map(src => (
                <div key={src} className="ed-occ-item">
                  {src}
                </div>
              ))}
            </div>
          </details>
        )}

        {dirty && <span className="ed-modified">MODIFIED</span>}

        <span className={`ed-count${countClass}`}>
          {maxLen ? `${len} / ${maxLen}` : `${len} 字`}
        </span>
      </div>

      {row.context && <div className="ed-context">{String(row.context)}</div>}

      <div className="ed-cols">
        <div className="ed-src-col">
          <div>
            <div className="ed-field-label">原文 · JP</div>
            <div className="ed-src-text">{renderTextWithCodePills(row.jp ?? '')}</div>
          </div>

          <div>
            <div className="ed-field-label">AI 初稿 · 仅供参考</div>
            <div className="ed-ref-text">
              {row.zh?.trim() ? renderTextWithCodePills(row.zh) : '（暂无）'}
            </div>
          </div>
        </div>

        {mirror ? (
          <div className="ed-mirror-col">
            <div className="ed-mirror-head">
              <span className="ed-mirror-label">译文 · 来自重复集（只读）</span>

              {onGotoDup && (
                <button className="ed-goto-dup" onClick={onGotoDup}>
                  去重复集修改 →
                </button>
              )}
            </div>

            <div className="ed-mirror-text">
              {mirrorValue?.trim() ? renderTextWithCodePills(mirrorValue) : '（重复集暂无译文）'}
            </div>

            <div className="ed-mirror-note">这句重复出现，统一在重复集翻译，此处只读。</div>
          </div>
        ) : (
          <div className="ed-edit-col">
            <div className="ed-edit-label">我的译文</div>

            <textarea
              ref={textareaRef}
              className="ed-textarea"
              value={value}
              disabled={readonly}
              onFocus={onFocus}
              onChange={e => onChange(e.target.value)}
              rows={lineCount}
              placeholder="在此输入中文翻译…"
            />

            <div className="ed-chips">
              {chips.map((chip, index) => (
                <span key={`${chip.text}-${index}`} className={`ed-chip ed-chip--${chip.kind}`}>
                  {chip.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function EditorTips() {
  return (
    <div className="ed-panel">
      <div className="ed-panel-label ed-panel-label--tips">编辑提示 · TIPS</div>

      <ul className="ed-tips-list">
        <li className="ed-tip">
          控制符 <span className="ed-tip-code">{'<c6/>'}</span>{' '}
          <span className="ed-tip-code">{'<WAIT>'}</span> 原样保留。
        </li>

        <li className="ed-tip">点进输入框后，下方工具栏可以插入换行、控制符和术语。</li>

        <li className="ed-tip">改完保存，再提交合并请求等待审核。</li>
      </ul>
    </div>
  )
}

function LegendPanel() {
  return (
    <div className="ed-panel">
      <div className="ed-panel-label">校验图例 · LEGEND</div>

      <div className="ed-legend-rows">
        <div className="ed-legend-row">
          <span className="ed-legend-dot is-err" />
          <span className="ed-legend-text">控制符缺失 · 假名残留 · 超字数</span>
        </div>

        <div className="ed-legend-row">
          <span className="ed-legend-dot is-warn" />
          <span className="ed-legend-text">换行不一致 · 术语不一致</span>
        </div>

        <div className="ed-legend-row">
          <span className="ed-legend-dot is-ok" />
          <span className="ed-legend-text">校验通过</span>
        </div>
      </div>
    </div>
  )
}

type GlossaryPanelProps = {
  gameSlug: string
  onRowsLoaded: (rows: GlossaryRow[]) => void
  onInsert: (text: string) => void
}

function GlossaryPanel({ gameSlug, onRowsLoaded, onInsert }: GlossaryPanelProps) {
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
    <div className="ed-panel">
      <div className="ed-glossary-head">
        <div className="ed-glossary-title">术语表 · GLOSSARY</div>

        <span className="ed-glossary-hint">点击插入</span>
      </div>

      {loading && <p className="ed-glossary-msg">加载中…</p>}

      {!loading && rows.length === 0 && <p className="ed-glossary-msg">暂无术语。</p>}

      {!loading && rows.length > 0 && (
        <div className="ed-glossary-list">
          {rows.map(row => (
            <div key={row.id} className="ed-glossary-item" onClick={() => onInsert(row.zh)}>
              <div className="ed-glossary-term">
                <span className="ed-g-from">{row.jp}</span>
                <span className="ed-g-sep"> → </span>
                <span className="ed-g-to">{row.zh}</span>
              </div>

              {row.note && <div className="ed-glossary-note">{row.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
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
  const [prTitle, setPrTitle] = useState(title)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!prTitle.trim()) {
      alert('请填写标题。')
      return
    }

    if (Object.keys(snapshot).length === 0) {
      alert('没有可提交的实际变更。')
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
        format_version: 2,
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
    <div className="ed-modal-overlay" onClick={onClose}>
      <div className="ed-modal" onClick={e => e.stopPropagation()}>
        <div className="ed-modal-top" />

        <div className="ed-modal-body">
          <div className="ed-modal-title">提交合并请求</div>

          <label className="ed-modal-label">标题</label>

          <input
            className="ed-modal-input"
            value={prTitle}
            onChange={e => setPrTitle(e.target.value)}
            placeholder="给这次合并请求起个标题"
          />

          <label className="ed-modal-label">说明</label>

          <textarea
            className="ed-modal-textarea"
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="可以简单说明这次修改了什么，比如错字修正、润色、控制符修复等。"
          />

          <div className="ed-modal-footer">
            <button className="ed-modal-cancel" onClick={onClose} disabled={submitting}>
              取消
            </button>

            <button className="ed-modal-submit" onClick={submit} disabled={submitting}>
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
  const [isDupSet, setIsDupSet] = useState(false)
  // duplicate-sentence mirror data (for normal sets): dup_id -> shared translation from the dup set
  const [dupTx, setDupTx] = useState<Record<string, string>>({})
  // category -> dup set DB id, used to jump "去重复集修改"
  const [dupSetByCat, setDupSetByCat] = useState<Record<string, string>>({})
  // dup_id -> the dup's primary category (may differ from the row's own category)
  const [dupCatById, setDupCatById] = useState<Record<string, string>>({})

  const [sourceStrings, setSourceStrings] = useState<SourceRow[]>([])
  const [entries, setEntries] = useState<EntryMap>({})
  const [inheritedEntries, setInheritedEntries] = useState<EntryMap>({})
  const [persistedEntryIds, setPersistedEntryIds] = useState<string[]>([])
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
  const [jumpPage, setJumpPage] = useState('')

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

      const dupSet = (loadedSet.source_file ?? '').startsWith('dup:')

      setSetData(loadedSet)
      setTitle(loadedSet.title)
      setIsPublic(loadedSet.is_public)
      setReadonly(loadedSet.user_id !== uid)
      setIsScript((loadedSet.source_file ?? '').startsWith('script'))
      setIsDupSet(dupSet)

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
            .from('public_profiles')
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

      if (dupSet) {
        // dup set: rows live in dups/<category>.json (deduped sentences, editable normally)
        const category = (loadedSet.source_file ?? '').slice('dup:'.length)
        const url = `${activeGame.dataPath}/dups/${category.replaceAll(':', '_')}.json`

        const res = await fetch(url)
        const text = await res.text()

        if (!res.ok || text.trim().startsWith('<')) {
          alert(`读取重复集失败：${url}`)
          setSourceStrings([])
          setEntries({})
          setLoadingStrings(false)
          return
        }

        strings = JSON.parse(text)
      } else if (loadedSet.source_file) {
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

      let inherited: EntryMap = {}
      try {
        inherited = loadedSet.forked_from
          ? await loadEffectiveEntries(loadedSet.forked_from, activeGame.slug)
          : {}
      } catch (error) {
        alert('读取父集译文失败：' + (error instanceof Error ? error.message : String(error)))
        setLoadingStrings(false)
        return
      }
      setInheritedEntries(inherited)

      const { data: entryData, error: entryError } = await supabase
        .from('translation_entries')
        .select('string_id, content, sort_order, base_content')
        .eq('set_id', setId)
        .order('sort_order')
      if (entryError) {
        alert('读取人工译文失败：' + entryError.message)
        setLoadingStrings(false)
        return
      }

      const map: EntryMap = {}
      ;(entryData ?? []).forEach((e: { string_id: string; content: string; sort_order: number; base_content: string | null }) => {
        map[e.string_id] = {
          content: e.content,
          sort_order: e.sort_order,
          base_content: e.base_content,
        }
      })
      setEntries(map)
      setPersistedEntryIds(Object.keys(map))

      // for normal sets: load the shared translations of duplicate sentences from the dup sets,
      // plus a category -> dup-set-id map so mirror rows can link "去重复集修改".
      if (!dupSet) {
        const dupIds = [...new Set(strings.map(s => s.dup).filter((d): d is string => !!d))]

        // dup_id -> { category, zh }: routes a mirror row to the dup set that actually owns it
        try {
          const dmRes = await fetch(`${activeGame.dataPath}/dup_map.json`)
          const dmText = await dmRes.text()
          if (dmRes.ok && dmText.trim().startsWith('{')) {
            const dmap = JSON.parse(dmText) as Record<string, { category: string; zh: string }>
            const catById: Record<string, string> = {}
            for (const id of dupIds) {
              if (dmap[id]) catById[id] = dmap[id].category
            }
            setDupCatById(catById)
          } else {
            setDupCatById({})
          }
        } catch {
          setDupCatById({})
        }

        const { data: dupSets } = await supabase
          .from('translation_sets')
          .select('id, source_file')
          .eq('game_slug', activeGame.slug)
          .eq('is_official', true)
          .like('source_file', 'dup:%')

        const catToId: Record<string, string> = {}
        const dupSetIds: string[] = []
        ;(dupSets ?? []).forEach((s: { id: string; source_file: string | null }) => {
          if (!s.source_file) return
          catToId[s.source_file.slice('dup:'.length)] = s.id
          dupSetIds.push(s.id)
        })
        setDupSetByCat(catToId)

        if (dupIds.length > 0 && dupSetIds.length > 0) {
          const { data: dupEntries } = await supabase
            .from('translation_entries')
            .select('string_id, content')
            .in('set_id', dupSetIds)
            .in('string_id', dupIds)

          const tx: Record<string, string> = {}
          ;(dupEntries ?? []).forEach((e: { string_id: string; content: string }) => {
            tx[e.string_id] = e.content
          })
          setDupTx(tx)
        } else {
          setDupTx({})
        }
      } else {
        setDupTx({})
        setDupSetByCat({})
        setDupCatById({})
      }

      setLoadingStrings(false)
    }

    load(currentGame)
  }, [gameSlug, setId, navigate])

  function updateEntryById(rowId: string, value: string) {
    const inherited = inheritedEntries[rowId]?.content ?? ''
    setEntries(prev => {
      const next = { ...prev }
      if (value === inherited) {
        delete next[rowId]
      } else {
        next[rowId] = {
          content: value,
          sort_order: sourceStrings.findIndex(item => item.id === rowId),
          base_content: prev[rowId]?.base_content ?? inherited,
        }
      }
      return next
    })
  }

  function updateEntry(row: SourceRow, value: string) {
    updateEntryById(row.id, value)
  }

  function insertToken(token: string) {
    if (!activeRowId || readonly) return

    const row = sourceStrings.find(item => item.id === activeRowId)
    if (!row) return

    const current = getInitialContent(row, entries, inheritedEntries)
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
      const current = getInitialContent(row, entries, inheritedEntries)
      const base = inheritedEntries[row.id]?.content ?? ''

      map[row.id] = {
        current,
        base,
        validation: computeValidation(row, current, glossaryRows, base),
      }
    }

    return map
  }, [sourceStrings, entries, inheritedEntries, glossaryRows])

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

  function goToPage() {
    const requestedPage = Number.parseInt(jumpPage, 10)
    if (Number.isNaN(requestedPage)) return

    setPage(Math.min(totalPages, Math.max(1, requestedPage)))
    setJumpPage('')
  }

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

  const snapshot = useMemo(() => Object.fromEntries(
    Object.entries(entries).map(([stringId, entry]) => [stringId, entry.content]),
  ), [entries])

  const baseSnapshot = useMemo(() => Object.fromEntries(
    Object.entries(entries).map(([stringId, entry]) => [
      stringId,
      entry.base_content ?? inheritedEntries[stringId]?.content ?? '',
    ]),
  ), [entries, inheritedEntries])

  async function saveAll() {
    if (!setId || readonly) return

    setSaving(true)

    const rows = Object.entries(entries).map(([stringId, value]) => ({
      set_id: setId,
      string_id: stringId,
      content: value.content,
      sort_order: value.sort_order,
      base_content: value.base_content,
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

    const removedIds = persistedEntryIds.filter(id => !entries[id])
    if (removedIds.length > 0) {
      const { error } = await supabase
        .from('translation_entries')
        .delete()
        .eq('set_id', setId)
        .in('string_id', removedIds)
      if (error) {
        alert('清除已还原译文失败：' + error.message)
        setSaving(false)
        return
      }
    }
    setPersistedEntryIds(Object.keys(entries))

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

  async function forkThisSet() {
    if (!setData || !game) return

    const { data: u } = await supabase.auth.getUser()
    const uid = u.user?.id
    if (!uid) {
      navigate('/auth')
      return
    }


    const { data: newSet, error } = await supabase
      .from('translation_sets')
      .insert({
        user_id: uid,
        title: `Fork - ${setData.title}`,
        forked_from: setData.id,
        source_file: setData.source_file,
        is_public: false,
        is_official: false,
        is_completed: false,
        game_slug: game.slug,
        storage_version: 2,
      })
      .select()
      .single()

    if (error || !newSet) {
      alert('Fork 失败：' + (error?.message ?? '未知错误'))
      return
    }

    navigate(`${game.basePath}/edit/${newSet.id}`)
  }

  if (!game) {
    return (
      <main className="ed-notfound">
        <h1>Game not found</h1>
        <Link to="/game" className="ed-notfound-link">
          返回游戏列表
        </Link>
      </main>
    )
  }

  if (loadingStrings) {
    return (
      <GamePageShell game={game}>
        <main className="game-theme ed-state" style={themeVars(game)}>
          <p className="ed-state-text">加载中…</p>
        </main>
      </GamePageShell>
    )
  }

  if (!setData) {
    return (
      <GamePageShell game={game}>
        <main className="game-theme ed-state" style={themeVars(game)}>
          <p className="ed-state-text">找不到这个翻译集。</p>
        </main>
      </GamePageShell>
    )
  }

  const canSubmitPR = !readonly && !!forkedFromId && setData.storage_version === 2 && changedCount > 0

  const toolbarTokens = [
    { label: '↵ 换行', token: '\n' },
    { label: '<c6/>', token: '<c6/>' },
    { label: '<c2/>', token: '<c2/>' },
    { label: '<WAIT>', token: '<WAIT>' },
    { label: '【id】', token: '【id】' },
  ]

  return (
    <GamePageShell game={game}>
      <main className="game-theme ed-main" style={themeVars(game)}>
        <div className="ed-topline" />

        <div className="ed-layout">
          <div className="ed-left">
            <section className="ed-head">
              <div className="ed-crumb">
                <Link to={game.routes.main} className="ed-crumb-link">
                  ← 返回主集
                </Link>

                {forkedFrom && (
                  <>
                    {' '}· FORK 自 {forkedFromIsOfficial ? '官方主集' : '社区集'}
                  </>
                )}
              </div>

              <div className="ed-head-row">
                <div className="ed-title-block">
                  {readonly ? (
                    <h1 className="ed-title">{title}</h1>
                  ) : (
                    <input
                      className="ed-title-input"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  )}

                  {forkedFromId && setData.storage_version !== 2 && (
                    <p className="ed-forkfrom">
                      这是旧版全量 Fork，仅供查看。请从最新主集重新 Fork 后提交修改。
                    </p>
                  )}

                  <div className="ed-meta">
                    {setData.source_file ? (
                      <span className="ed-tag">{setData.source_file}</span>
                    ) : (
                      <span className="ed-tag">全量合并数据</span>
                    )}

                    {isScript && <span className="ed-tag-script">SCRIPT</span>}

                    {readonly && (
                      <span className="ed-readonly">
                        只读模式
                        <button
                          className="ed-fork-btn"
                          onClick={forkThisSet}
                          title="Fork 一份可编辑的副本，改完提交合并请求"
                        >
                          Fork 编辑
                        </button>
                      </span>
                    )}

                    {!readonly && (
                      <label className="ed-public-label">
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
                    <p className="ed-forkfrom">
                      Fork 自：{forkedFrom.title} · {forkedFrom.username}
                    </p>
                  )}
                </div>

                <div className="ed-head-right">
                  <div className="ed-stats">
                    <div className="ed-stat">
                      <div className="ed-stat-val">{changedCount}</div>
                      <div className="ed-stat-label">CHANGED</div>
                    </div>

                    <div className="ed-stat">
                      <div className={`ed-stat-val ${warnCount > 0 ? 'is-err' : 'is-muted'}`}>
                        {warnCount}
                      </div>
                      <div className="ed-stat-label">WARNINGS</div>
                    </div>
                  </div>

                  {!readonly && (
                    <div className="ed-actions">
                      <button className="ed-save-btn" onClick={saveAll} disabled={saving}>
                        {saving ? '保存中…' : '保存'}
                      </button>

                      <button
                        className="ed-pr-btn"
                        onClick={() => setShowPRModal(true)}
                        disabled={!canSubmitPR}
                      >
                        提交合并请求
                      </button>

                      {!setData.is_official && (
                        <button className="ed-del-btn" onClick={deleteSet} disabled={deleting}>
                          {deleting ? '删除中…' : '删除此集'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="ed-filterbar">
              <input
                className="ed-search"
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="搜索 ID · 原文 · 译文 · 角色名…"
              />

              <button
                className={`ed-filter-btn${onlyChanged ? ' is-active' : ''}`}
                onClick={() => {
                  setOnlyChanged(prev => !prev)
                  setPage(1)
                }}
              >
                仅看改动
              </button>

              <button
                className={`ed-filter-btn${onlyWarn ? ' is-warn' : ''}`}
                onClick={() => {
                  setOnlyWarn(prev => !prev)
                  setPage(1)
                }}
              >
                仅看告警
              </button>

              <span className="ed-filter-count">
                {filteredRows.length} / {sourceStrings.length}
              </span>
            </section>

            <div className="ed-rows">
              {pageRows.map(row => {
                const rowState = rowStates[row.id]
                const value = rowState?.current ?? getInitialContent(row, entries, inheritedEntries)
                const validation = rowState?.validation ?? computeValidation(row, value, glossaryRows, inheritedEntries[row.id]?.content ?? '')

                const mirror = !isDupSet && !!row.dup
                // route to the dup's OWN category (may differ from the row's category),
                // falling back to the row's category prefix
                const cat =
                  (row.dup && dupCatById[row.dup]) ||
                  game.categories.find(c => row.id.startsWith(c))
                const dupSetId = cat ? dupSetByCat[cat] : undefined

                return (
                  <EntryRow
                    key={row.id}
                    row={row}
                    value={value}
                    readonly={readonly}
                    validation={validation}
                    active={activeRowId === row.id}
                    textareaRef={el => {
                      textareaRefs.current[row.id] = el
                    }}
                    onFocus={() => setActiveRowId(row.id)}
                    onChange={next => updateEntry(row, next)}
                    mirror={mirror}
                    mirrorValue={mirror && row.dup ? dupTx[row.dup] ?? '' : undefined}
                    onGotoDup={
                      mirror && dupSetId
                        ? () => navigate(`${game.basePath}/edit/${dupSetId}`)
                        : undefined
                    }
                  />
                )
              })}
            </div>

            {pageRows.length === 0 && <div className="ed-empty">没有匹配条目</div>}

            <div className="ed-pager">
              <button
                className="ed-pager-btn"
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
              >
                PREV
              </button>

              <span className="ed-pager-info">
                {String(Math.min(page, totalPages)).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
              </span>

              <div className="ed-pager-jump">
                <input
                  className="ed-pager-input"
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPage}
                  aria-label="跳转页码"
                  placeholder="页码"
                  onChange={event => setJumpPage(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') goToPage()
                  }}
                />
                <button
                  className="ed-pager-btn ed-pager-go"
                  disabled={jumpPage.trim() === ''}
                  onClick={goToPage}
                >
                  跳转
                </button>
              </div>

              <button
                className="ed-pager-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              >
                NEXT
              </button>
            </div>
          </div>

          <aside className="ed-aside">
            <LegendPanel />

            <EditorTips />

            <GlossaryPanel
              gameSlug={game.slug}
              onRowsLoaded={setGlossaryRows}
              onInsert={insertToken}
            />
          </aside>
        </div>

        {activeRowId && !readonly && (
          <div className="ed-toolbar">
            <div className="ed-toolbar-inner">
              <span className="ed-toolbar-label">插入 → {activeRowId}</span>

              <div className="ed-token-group">
                {toolbarTokens.map(item => (
                  <button
                    key={item.label}
                    className="ed-token-btn"
                    onClick={() => insertToken(item.token)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button className="ed-copy-btn" onClick={copyCodesFromSource}>
                ⎘ 复制原文控制符
              </button>

              <button className="ed-copy-btn" onClick={copySourceToEdit}>
                ⎘ 复制原文到译文
              </button>

              {glossaryRows.length > 0 && (
                <>
                  <div className="ed-toolbar-div" />

                  <span className="ed-toolbar-label">术语</span>

                  <div className="ed-token-group">
                    {glossaryRows.slice(0, 8).map(row => (
                      <button
                        key={row.id}
                        className="ed-gloss-btn"
                        onClick={() => insertToken(row.zh)}
                      >
                        {row.zh}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button className="ed-collapse-btn" onClick={() => setActiveRowId(null)}>
                收起 ✕
              </button>
            </div>
          </div>
        )}

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
