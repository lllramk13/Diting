import type { GameConfig } from './types'

export const p2ep: GameConfig = {
    slug: 'p2ep',
    title: 'Persona 2: Eternal Punishment',
    shortTitle: 'P2EP',
    platform: 'psx',
    series: 'Persona',

    titleZh: '女神异闻录2 · 罚',
    accent: '#E8455A',
    accentSoft: '#FF8A98',
    ghostChar: '罚',

    status: 'in_progress',
    progress: 50,

    coverImage: "/games/p2ep/cover.jpg",

    basePath: '/game/psx/p2ep',
    dataPath: '/games/p2ep',
    groupIndexPath: '/games/p2ep/index.json',

    description: 'Persona 2: Eternal Punishment PSX 汉化项目。',

    routes: {
        announce: '/game/psx/p2ep/announce',
        main: '/game/psx/p2ep/main',
        search: '/game/psx/p2ep/search',
        issues: '/game/psx/p2ep/issues',
        glossary: '/game/psx/p2ep/glossary',
        requests: '/game/psx/p2ep/requests',
    },

    categories: [
        'script',
        'field',
        'strtbl',
        'config',
        'contactui',
        'mainmenu',
        'map_names',
        'names',
        'nametable',
    ],  

    announcement: {
    version: 'v0.1.0',
    size: '',
    updated: '2026-06-24',
    videoUrl: '',
    downloadLinks: [
        {
        label: '百度网盘',
        url: 'https://pan.baidu.com/s/1eOHw6MfMTKN6g77jo7eJzg?pwd=2rkg',
        note: '链接已更新',
        },
        {
        label: 'MEGA',
        url: 'https://mega.nz/folder/2MhWVRDZ#ZRUncAmP7r9midGPCHfbrQ',
        note: '链接已更新',
        },
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
    knownIssues: [
        '部分支线对话仍为初翻，未经过校对。',
        '术语表与「罪」共享，仍在统一中。',
        '少量界面排版尚未适配长中文。',
    ],
    changelog: [
        { version: 'v0.1.0', text: '初版完成' },
    ],
    copyrightNotice:
        '本项目仅用于学习、研究和交流。游戏版权、商标和相关素材版权均属于 ATLUS 及原权利方。',
    resaleNotice:
        '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止将本补丁用于任何商业用途。',
    sponsorNote:
        '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
    },
}