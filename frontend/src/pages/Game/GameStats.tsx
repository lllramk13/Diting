import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGameBySlug } from '../../games/registry'
import type { GameConfig } from '../../games/types'
import { supabase } from '../../lib/supabase'
import GamePageShell from './GamePageShell'
import { themeVars } from './gameTheme'
import ContributionMatrix from './stats/ContributionMatrix'
import ExternalSignalGrid from './stats/ExternalSignalGrid'
import StatsMetricRail from './stats/StatsMetricRail'
import type { ContributionRow, ExternalSignalItem } from './stats/types'
import './gameTheme.css'
import './stats/GameStats.css'

type MergeRequestRow = {
  id: string
  user_id: string | null
  to_set_id: string | null
  status: string | null
  created_at: string | null
  snapshot: Record<string, string> | null
  base_snapshot: Record<string, string> | null
}

type ProfileRow = {
  id: string
  username: string
}

type SetRow = {
  id: string
  source_file: string | null
}

const numberFormat = new Intl.NumberFormat('zh-CN')

function changedIds(request: MergeRequestRow) {
  const snapshot = request.snapshot ?? {}
  const base = request.base_snapshot ?? {}

  return Object.entries(snapshot)
    .filter(([stringId, content]) => content.trim() && content.trim() !== (base[stringId] ?? '').trim())
    .map(([stringId]) => stringId)
}

function categoryFromSource(game: GameConfig, sourceFile: string | null) {
  if (!sourceFile) return null
  const raw = sourceFile.startsWith('dup:') ? sourceFile.slice(4) : sourceFile
  const prefix = raw.split(':')[0].toLowerCase()
  return game.categories.find(category => category.toLowerCase() === prefix) ?? null
}

function categoryFromStringId(game: GameConfig, stringId: string) {
  const id = stringId.toLowerCase()
  const direct = game.categories.find(category => id.startsWith(category.toLowerCase()))
  if (direct) return direct

  if (id.startsWith('talk/')) return game.categories.find(category => category === 'talk') ?? null
  if (id.startsWith('adv/')) return game.categories.find(category => category === 'efile') ?? null
  if (/^d\d{2}\//.test(id)) return game.categories.find(category => category === 'dfile') ?? null
  if (id.startsWith('slps')) return game.categories.find(category => category === 'slps') ?? null

  return null
}

export default function GameStats() {
  const { gameSlug } = useParams<{ gameSlug: string }>()
  const game = getGameBySlug(gameSlug ?? '')
  const [rows, setRows] = useState<ContributionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prSummary, setPrSummary] = useState({ total: 0, merged: 0, open: 0 })

  useEffect(() => {
    if (!game) {
      setLoading(false)
      return
    }

    let active = true

    async function load(activeGame: GameConfig) {
      setLoading(true)
      setError('')

      const { data: requestsData, error: requestsError } = await supabase
        .from('merge_requests')
        .select('id,user_id,to_set_id,status,created_at,snapshot,base_snapshot')
        .eq('game_slug', activeGame.slug)

      if (requestsError) {
        if (active) {
          setError(requestsError.message)
          setLoading(false)
        }
        return
      }

      const requests = (requestsData ?? []) as MergeRequestRow[]
      const userIds = [...new Set(requests.map(request => request.user_id).filter((id): id is string => !!id))]
      const setIds = [...new Set(requests.map(request => request.to_set_id).filter((id): id is string => !!id))]

      const [profilesResult, setsResult] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id,username').in('id', userIds)
          : Promise.resolve({ data: [] as ProfileRow[], error: null }),
        setIds.length
          ? supabase.from('translation_sets').select('id,source_file').in('id', setIds)
          : Promise.resolve({ data: [] as SetRow[], error: null }),
      ])

      const profileMap = new Map(
        ((profilesResult.data ?? []) as ProfileRow[]).map(profile => [profile.id, profile.username]),
      )
      const setMap = new Map(
        ((setsResult.data ?? []) as SetRow[]).map(set => [set.id, set.source_file]),
      )
      const aggregate = new Map<string, ContributionRow & { lastAt: number }>()
      const nextPrSummary = { total: 0, merged: 0, open: 0 }

      for (const request of requests) {
        if (!request.user_id || request.status === 'rejected') continue
        const ids = changedIds(request)
        if (ids.length === 0) continue
        nextPrSummary.total += 1
        if (request.status === 'merged') nextPrSummary.merged += 1
        if (request.status === 'open') nextPrSummary.open += 1

        const current = aggregate.get(request.user_id) ?? {
          userId: request.user_id,
          username: profileMap.get(request.user_id) ?? '未知用户',
          total: 0,
          merged: 0,
          open: 0,
          prCount: 0,
          adjusted: 0,
          categories: {},
          lastAt: 0,
        }

        current.total += ids.length
        current.prCount += 1
        if (request.status === 'merged') current.merged += ids.length
        if (request.status === 'open') current.open += ids.length

        const sourceCategory = categoryFromSource(
          activeGame,
          request.to_set_id ? setMap.get(request.to_set_id) ?? null : null,
        )

        for (const stringId of ids) {
          const category = sourceCategory ?? categoryFromStringId(activeGame, stringId) ?? '其他'
          current.categories[category] = (current.categories[category] ?? 0) + 1
        }

        const createdAt = request.created_at ? new Date(request.created_at).getTime() : 0
        current.lastAt = Math.max(current.lastAt, createdAt)
        aggregate.set(request.user_id, current)
      }


      for (const adjustment of activeGame.stats?.contributionAdjustments ?? []) {
        const count = Math.max(0, Math.floor(adjustment.count))
        if (!count) continue

        const username = adjustment.username.trim() || '线下贡献者'
        const matchedByName = [...aggregate.entries()].find(([, row]) =>
          row.username.localeCompare(username, undefined, { sensitivity: 'accent' }) === 0,
        )
        const aggregateKey = adjustment.userId
          ?? matchedByName?.[0]
          ?? `manual:${adjustment.key}`
        const current = aggregate.get(aggregateKey) ?? {
          userId: aggregateKey,
          username,
          total: 0,
          merged: 0,
          open: 0,
          prCount: 0,
          adjusted: 0,
          categories: {},
          lastAt: 0,
        }
        const category = adjustment.category?.trim() || 'offline'

        current.total += count
        current.merged += count
        current.adjusted += count
        current.categories[category] = (current.categories[category] ?? 0) + count
        aggregate.set(aggregateKey, current)
      }
      const nextRows = [...aggregate.values()]
        .sort((a, b) => b.total - a.total)
        .map(({ lastAt, ...row }) => ({
          ...row,
          lastContribution: lastAt
            ? new Date(lastAt).toLocaleDateString('zh-CN')
            : undefined,
        }))

      if (active) {
        setRows(nextRows)
        setPrSummary(nextPrSummary)
        setLoading(false)
      }
    }

    load(game)

    return () => {
      active = false
    }
  }, [game])

  const categories = useMemo(() => {
    const colors = ['#5e8bff', '#5fd075', '#e8b23a', '#c4a0ff', '#ff8a98', '#64c8d0']
    const baseCategories = game?.categories.map((category, index) => ({
      key: category,
      label: category.toUpperCase(),
      color: colors[index % colors.length],
    })) ?? []
    const extraCategories = [...new Set(
      (game?.stats?.contributionAdjustments ?? [])
        .map(adjustment => adjustment.category?.trim() || 'offline')
        .filter(category => !game?.categories.includes(category)),
    )]

    return [
      ...baseCategories,
      ...extraCategories.map((category, index) => ({
        key: category,
        label: category === 'offline' ? '线下' : category.toUpperCase(),
        color: colors[(baseCategories.length + index) % colors.length],
      })),
    ]
  }, [game])

  if (!game) {
    return (
      <main className="gst-page">
        <div className="gst-state">
          找不到这个游戏。<Link to="/game">返回游戏列表</Link>
        </div>
      </main>
    )
  }

  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const merged = rows.reduce((sum, row) => sum + row.merged, 0)

  const metrics = [
    { key: 'total', label: '累计贡献句数', value: numberFormat.format(total), sublabel: 'PR CHANGES + MANUAL CREDITS' },
    { key: 'merged', label: '已合并句数', value: numberFormat.format(merged), sublabel: total ? `${((merged / total) * 100).toFixed(1)}% ACCEPTED` : '0% ACCEPTED', accent: 'var(--gt-success)' },
    { key: 'contributors', label: '贡献者', value: numberFormat.format(rows.length), sublabel: 'PROFILES WITH CHANGES', accent: '#e8b23a' },
    { key: 'prs', label: '合并请求', value: numberFormat.format(prSummary.total), sublabel: `${numberFormat.format(prSummary.merged)} MERGED / ${numberFormat.format(prSummary.open)} OPEN` },
    { key: 'progress', label: '翻译完成度', value: `${game.progress}%`, sublabel: 'PROJECT CONFIG', accent: 'var(--gt-accent)' },
  ]

  const externalSignals = (game.stats?.externalSignals ?? []) as ExternalSignalItem[]

  return (
    <GamePageShell game={game}>
      <main className="game-theme gst-page" style={themeVars(game)}>
        <div className="gst-wrap">
          <article className="gst-terminal">

            <header className="gst-identity">
              <div>
                <div className="gst-eyebrow">
                  // {game.platform.toUpperCase()} · {game.slug.toUpperCase()} · CONTRIBUTION TERMINAL
                </div>
                <h1>{game.titleZh ?? game.title}</h1>
                <p>历史合并请求中的有效文本变更、贡献占比与项目外部信号。</p>
              </div>
              <div className="gst-game-badge">
                <span>ACTIVE GAME</span>
                <b>{game.shortTitle}</b>
              </div>
            </header>

            <StatsMetricRail items={metrics} />

            {loading ? (
              <div className="gst-state">正在聚合历史贡献…</div>
            ) : error ? (
              <div className="gst-state is-error">读取统计失败：{error}</div>
            ) : (
              <ContributionMatrix categories={categories} rows={rows} />
            )}

            <ExternalSignalGrid items={externalSignals} />

            <footer className="gst-foot">
              <span>DITING TRANSLATION NETWORK · GAME DATA TERMINAL</span>
              <span>矩阵统计非拒绝 PR 的实际差异句与已标注的线下贡献</span>
            </footer>
          </article>
        </div>
      </main>
    </GamePageShell>
  )
}

