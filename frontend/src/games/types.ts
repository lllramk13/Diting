export type GameStatus = 
    | 'planning'
    | 'in_progress'
    | 'translated'
    | 'released'
    | 'paused'

export type GamePlatform = 'psx' | 'psp' | 'switch' | 'gba' | 'sfc' | string

export type GameDownloadLink = {
  label: string
  url: string
  note?: string
}

export type GameChangelogEntry = {
  version: string
  text: string
}

export type GameAnnouncement = {
  version: string
  releaseKind?: 'patch' | 'full_game'
  size?: string          // 发布包大小，如「48.6 MB」
  updated?: string       // 更新日期，如「2026-05-30」
  videoUrl?: string
  downloadLinks: GameDownloadLink[]
  notes: string[]
  installGuide: string[]
  knownIssues?: string[]            // 已知问题
  changelog?: GameChangelogEntry[]  // 更新说明
  copyrightNotice: string
  resaleNotice: string
  sponsorNote: string
}

export type GameStatsSignal = {
  key: string
  title: string
  source: string
  value: string
  note?: string
  accent?: string
  href?: string
  samples?: number[]
}

export type GameStatsContributionAdjustment = {
  key: string
  username: string
  userId?: string
  count: number
  category?: string
  note?: string
}

export type GameCredit = {
  role: string
  members: string[]
  note?: string
}

export type GameConfig = {
    slug: string
    title: string
    shortTitle: string
    platform: GamePlatform
    series?: string

    /* 卡片展示用 */
    titleZh?: string      // 中文标题，如「女神异闻录2 · 罪」
    accent?: string       // 主强调色
    accentSoft?: string   // 浅强调色（状态徽标文字）
    ghostChar?: string    // 卡片右侧巨大幽灵字，如「罪」

    status: GameStatus
    progress: number

    coverImage?: string
    heroImage?: string

    basePath: string
    dataPath: string
    groupIndexPath: string

    description: string
    credits?: GameCredit[]

    routes: {
        announce: string
        main: string
        search: string
        issues: string
        glossary: string
        requests: string
        font?: string       // 字库校对（可选；仅设置了的游戏在导航里显示入口）
    }

    categories: string[]

    stats?: {
      externalSignals?: GameStatsSignal[]
      contributionAdjustments?: GameStatsContributionAdjustment[]
    }

    announcement: GameAnnouncement
}
