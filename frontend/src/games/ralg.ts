import type { GameConfig } from './types'

export const ralg: GameConfig = {
  slug: 'ralg',
  title: 'Racing Lagoon',
  shortTitle: 'RALG',
  platform: 'psx',
  series: 'Racing Lagoon',

  titleZh: '横滨极速传说',
  accent: '#771ddd',
  accentSoft: '#0995a5',
  ghostChar: '速',

  status: 'in_progress',
  progress: 35,

  coverImage: '',

  basePath: '/game/ps2/ralg',
  dataPath: '/games/ralg',
  groupIndexPath: '/games/ralg/index.json',

  description: '《横滨极速传说》PS1 汉化项目',

  routes: {
    announce: '/game/ps2/ralg/announce',
    main: '/game/ps2/ralg/main',
    search: '/game/ps2/ralg/search',
    issues: '/game/ps2/ralg/issues',
    glossary: '/game/ps2/ralg/glossary',
    requests: '/game/ps2/ralg/requests',
    font: '/game/ps2/ralg/font',
  },

  categories: ['field', 'battle', 'jimusyo', 'gohmaden', 'shop', 'event', 'exe', 'ui'],

  announcement: {
    version: '进行中',
    updated: '2026-09-15',
    downloadLinks: [],
    notes: [
      '这是民间汉化项目，与 Square 官方无关。',
      '项目目前处于进行中，暂未提供可下载的汉化补丁/游戏。',
      '请使用合法来源的游戏镜像。',
    ],
    installGuide: [
      '项目尚在进行中，发布后将在此提供下载和使用说明。',
    ],
    changelog: [
      {
        version: '筹备中',
        text: '已创建项目页面，等待导入文本、字库与翻译数据。',
      },
    ],
    copyrightNotice:
      '本项目仅用于学习、研究和交流。游戏版权、商标和相关素材版权均属于 Square 及原权利方。',
    resaleNotice:
      '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止将本补丁用于任何商业用途。',
    sponsorNote:
      '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
  },
}