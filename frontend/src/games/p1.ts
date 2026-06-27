import type { GameConfig } from './types'

export const p1: GameConfig = {
    slug: 'p1',
    title: 'Megami Ibunroku Persona',
    shortTitle: 'P1',
    platform: 'psx',
    series: 'Persona',

    titleZh: '女神异闻录 · Persona',
    accent: '#4FA8E0',
    accentSoft: '#8FCBF0',
    ghostChar: '',

    status: 'planning',
    progress: 0,

    coverImage: '',

    basePath: '/game/psx/p1',
    dataPath: '/games/p1',
    groupIndexPath: '/games/p1/index.json',

    description: 'Megami Ibunroku Persona PSX 汉化项目（筹备中）。',

    routes: {
        announce: '/game/psx/p1/announce',
        main: '/game/psx/p1/main',
        search: '/game/psx/p1/search',
        issues: '/game/psx/p1/issues',
        glossary: '/game/psx/p1/glossary',
        requests: '/game/psx/p1/requests',
        font: '/game/psx/p1/font',
    },

    categories: [
        'talk',
        'efile',
        'dfile',
        'slps',
    ],

    announcement: {
        version: 'v0.0.0',
        updated: '2026-06-25',
        downloadLinks: [],
        notes: [
            '这是民间汉化项目，与 ATLUS 官方无关。',
            '项目仍在筹备，暂无可下载补丁。',
        ],
        installGuide: [],
        copyrightNotice:
            '本项目仅用于学习、研究和交流。游戏版权、商标和相关素材版权均属于 ATLUS 及原权利方。',
        resaleNotice:
            '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止将本补丁用于任何商业用途。',
        sponsorNote:
            '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
    },
}
