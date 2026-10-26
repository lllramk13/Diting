import type { GameConfig } from "./types";


export const p2isp: GameConfig = {
    slug: 'p2isp',
    title: 'Persona 2: Innocent Sin',
    shortTitle: 'P2ISP',
    platform: 'psp',
    series: 'Persona',

    titleZh: '女神异闻录2 · 罪',
    accent: '#5E8BFF',
    accentSoft: '#9FB8FF',
    ghostChar: '罪',

    status: 'released',
    progress: 100,

    coverImage: "/games/p2isp/cover.jpg",

    basePath: '/game/psp/p2isp',
    dataPath: '/games/p2isp',
    groupIndexPath: '/games/p2isp/index.json',

    description: 'Persona 2: Innocent Sin PSP汉化项目。',
    credits: [
        { role: '程序', members: ['Mark'] },
        {
            role: '校对&初翻',
            members: [
                '匿名1', 'kkksr', '雷吼君', 'Cattus.', 'lm11123lm', '平成鱼', 'yaetori', '匿名2',
                'Phrygian', 'AAA国家电网哈萨维', '福建千里香混沌王', 'yang5000', 'silverman',
                'lanberser', 'ycx', '迪元drivet', '夜里明光', 'zjh20061007', 'ylylk', 'spma',
                'mark', 'Tharg', 'faraway', 'Hao66787012',
            ],
        },
        {
            role: '修图',
            members: ['Forget', '渲酱', '与晕3d战至世界尽头', '企鹅handheld', 'OLDSCHOOL像素猫'],
        },
        {
            role: 'PSP版最终测试',
            members: [
                'Mark', 'Forget', 'Smirk', '芝士鹅瑞卷', '一个星期', '匿名1', '渲酱',
                'yaetori', 'Phrygian', '汣酌', '哆啦海皇•A梦',
            ],
        },
    ],


    routes: {
        announce: '/game/psp/p2isp/announce',
        main: '/game/psp/p2isp/main',
        search: '/game/psp/p2isp/search',
        issues: '/game/psp/p2isp/issues',
        glossary: '/game/psp/p2isp/glossary',
        requests: '/game/psp/p2isp/requests',
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
    version: 'v1.0.0',
    size: '',
    releaseKind: 'full_game',
    updated: '2026-10-26',
    videoUrl: '',
    downloadLinks: [
    {
        label: '百度网盘',
        url: 'https://pan.baidu.com/s/15su2VVcuGgv1HofyPk7-Ow?pwd=wg5q',
        note: '链接已更新',
    },
    {
        label: 'MEGA',
        url: 'https://mega.nz/folder/3RZ1QCLa#WG-GQc72Bcbh9tkBL2vdTg',
        note: '链接已更新',
    },
    ],
    notes: [
        '这是民间汉化项目，与 ATLUS 官方无关。',
    ],
    installGuide: [
        '下载文件并解压到游戏目录。使用模拟器启动即可游玩',
    ],

    changelog: [
    ],
    copyrightNotice:
        '本项目仅用于学习、研究和交流。游戏版权、商标和相关素材版权均属于 ATLUS 及原权利方。',
    resaleNotice:
        '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止用于任何商业用途。',
    sponsorNote:
        '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
    },


}


    {/*
    stats: {
        externalSignals: [
            {
            key: 'bilibili',
            title: 'B站播放量',
            source: 'BILIBILI · 2 VIDEOS',
            value: '70.0万',
            note: '4.58万点赞 · 1.41万投币',
            accent: '#fb7299',
            href: 'https://www.bilibili.com/',
            samples: [20, 35, 42, 58, 64, 72, 86, 93],
            },
        ],
    },*/}