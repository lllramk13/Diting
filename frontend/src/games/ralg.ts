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

  status: 'released',
  progress: 90,

  coverImage: '',

  basePath: '/game/ps1/ralg',
  dataPath: '/games/ralg',
  groupIndexPath: '/games/ralg/index.json',

  description: '《横滨极速传说》PS1 汉化项目',
  credits: [
    { role: '程序', members: ['Mark'] },
    { role: '翻译', members: ['codex', '匿名1'] },
    { role: '修图', members: ['渲酱', 'forgot君'] },
  ],

  routes: {
    announce: '/game/ps1/ralg/announce',
    main: '/game/ps1/ralg/main',
    search: '/game/ps1/ralg/search',
    issues: '/game/ps1/ralg/issues',
    glossary: '/game/ps1/ralg/glossary',
    requests: '/game/ps1/ralg/requests',
    font: '/game/ps1/ralg/font',
  },

  categories: ['field', 'battle', 'jimusyo', 'gohmaden', 'shop', 'event', 'exe', 'ui'],

  announcement: {
    version: 'v0.1.0',
    releaseKind: 'full_game',
    updated: '2026-11-03',
    downloadLinks: [
      {
        label: '百度网盘',
        url: 'https://pan.baidu.com/s/1M7K6gH6cIhswYyGXTWpGPA?pwd=d48h',
      },
      {
        label: 'MEGA',
        url: 'https://mega.nz/folder/iVYz0TBa#H-KZktbyzazDO1jPT4akkg',
      },
    ],
    notes: [
      '这是民间汉化项目，与 Square 官方无关。',
      '本作比较小众，汉化组人手有限，当前版本几乎完全由 AI 翻译，译文质量可能参差不齐。',
      '游戏尚未经过完整测试，可能存在文本错误、显示问题或卡死等情况，建议勤存档。',
      '后续会根据反馈慢慢修正，欢迎在「问题反馈」页面提交遇到的问题。',
    ],
    installGuide: [
      '下载即可游玩',
    ],
    knownIssues: [
      '未经完整测试，部分剧情、菜单或支线文本可能存在错译、漏译或排版问题。',
    ],
    changelog: [
      {
        version: 'v0.1.0',
        text: '首个公开测试版。几乎完全由 AI 翻译，未经完整测试，后续将逐步修正。',
      },
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