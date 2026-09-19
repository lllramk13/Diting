import type { GameConfig } from './types'

export const p2epp: GameConfig = {
    slug: 'p2epp',
    title: 'Persona 2: Eternal Punishment',
    shortTitle: 'P2EPP',
    platform: 'psp',
    series: 'Persona',

    titleZh: '女神异闻录2 · 罚',
    accent: '#E8455A',
    accentSoft: '#FF8A98',
    ghostChar: '罚',

    status: 'in_progress',
    progress: 50,

    coverImage: "/games/p2epp/cover.jpg",

    basePath: '/game/psp/p2epp',
    dataPath: '/games/p2epp',
    groupIndexPath: '/games/p2epp/index.json',

    description: 'Persona 2: Eternal Punishment PSP 汉化项目。',

    routes: {
        announce: '/game/psp/p2epp/announce',
        main: '/game/psp/p2epp/main',
        search: '/game/psp/p2epp/search',
        issues: '/game/psp/p2epp/issues',
        glossary: '/game/psp/p2epp/glossary',
        requests: '/game/psp/p2epp/requests',
    },

    categories: [
        'script',
        'field',
        'strtbl',
        'SLUS',
        'free',
    ],

    announcement: {
    version: 'v0.3.2',
    size: '',
    updated: '2026-07-02',
    videoUrl: '',
    downloadLinks: [
    ],
    notes: [
        '这是民间汉化项目，与 ATLUS 官方无关。',
        '请使用合法来源的游戏镜像。',
        '补丁仍在更新中，可能存在文本错误、显示问题或未完成内容。',
    ],
    installGuide: [
        '下载补丁文件。',
        '根据发布说明将补丁应用到对应版本的游戏镜像。',
        '使用模拟器或实机测试补丁。',
    ],
    knownIssues: [,
    ],
    changelog: [
    ],
    copyrightNotice:
        '本项目仅用于学习、研究和交流。游戏版权、商标和相关素材版权均属于 ATLUS 及原权利方。',
    resaleNotice:
        '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止将本补丁用于任何商业用途。',
    sponsorNote:
        '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
    },
}