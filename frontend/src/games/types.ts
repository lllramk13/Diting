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

export type GameAnnouncement = {
  version: string
  videoUrl?: string
  downloadLinks: GameDownloadLink[]
  notes: string[]
  installGuide: string[]
  copyrightNotice: string
  resaleNotice: string
  sponsorNote: string
}

export type GameConfig = {
    slug: string
    title: string
    shortTitle: string
    platform: GamePlatform
    series?: string

    status: GameStatus
    progress: number

    coverImage?: string
    heroImage?: string

    basePath: string
    dataPath: string
    groupIndexPath: string

    description: string

    routes: {
        announce: string
        main: string
        search: string
        issues: string
        glossary: string
        requests: string
    }

    categories: string[]

    announcement: GameAnnouncement
}
