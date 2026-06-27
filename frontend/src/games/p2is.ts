import type { GameConfig } from "./types";


export const p2is: GameConfig = {
    slug: 'p2is',
    title: 'Persona 2: Innocent Sin',
    shortTitle: 'P2IS',
    platform: 'psx',
    series: 'Persona',

    titleZh: '女神异闻录2 · 罪',
    accent: '#5E8BFF',
    accentSoft: '#9FB8FF',
    ghostChar: '罪',

    status: 'in_progress',
    progress: 87.5,

    coverImage: "/games/p2is/cover.jpg",

    basePath: '/game/psx/p2is',
    dataPath: '/games/p2is',
    groupIndexPath: '/games/p2is/index.json',

    description: 'Persona 2: Innocent Sin PSX 汉化项目。',

    routes: {
        announce: '/game/psx/p2is/announce',
        main: '/game/psx/p2is/main',
        search: '/game/psx/p2is/search',
        issues: '/game/psx/p2is/issues',
        glossary: '/game/psx/p2is/glossary',
        requests: '/game/psx/p2is/requests',
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
    version: 'v0.6.0',
    size: '',
    updated: '2026-06-24',
    videoUrl: '',
    downloadLinks: [
        {
        label: '百度网盘',
        url: 'https://pan.baidu.com/s/1h6dE4ICZu62mjCRD8kTpGA?pwd=bvmp',
        note: '链接已更新',
        },
        {
        label: 'MEGA',
        url: 'https://mega.nz/folder/yZI10bwI#LN9E1oFAgAPpSK2CyWzK5A',
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
        '部分菜单与系统文本在长字符串下可能溢出。',
        '个别人名与术语仍在统一校对中。',
        '战斗中较长的技能名可能出现换行异常。',
    ],
    changelog: [
        { version: 'v0.6.0', text: '翻译校对' },
    ],
    copyrightNotice:
        '本项目仅用于学习、研究和交流。游戏版权、商标和相关素材版权均属于 ATLUS 及原权利方。',
    resaleNotice:
        '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止将本补丁用于任何商业用途。',
    sponsorNote:
        '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
    },
}

