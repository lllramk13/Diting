import type { GameConfig } from './types'

export const smtif: GameConfig = {
  slug: 'smtif',
  title: 'Shin Megami Tensei: If...',
  shortTitle: 'SMTIF',
  platform: 'psx',
  series: 'Shin Megami Tensei',

  titleZh: '真・女神转生 If...',
  accent: '#1a2188',
  accentSoft: '#a8a3c9',
  ghostChar: 'IF',

  status: 'translated',
  progress: 95,

  coverImage: '',

  basePath: '/game/ps1/smtif',
  dataPath: '/games/smtif',
  groupIndexPath: '/games/smtif/index.json',

  description: '《真・女神转生 If...》PS1 汉化项目',

  routes: {
    announce: '/game/ps1/smtif/announce',
    main: '/game/ps1/smtif/main',
    search: '/game/ps1/smtif/search',
    issues: '/game/ps1/smtif/issues',
    glossary: '/game/ps1/smtif/glossary',
    requests: '/game/ps1/smtif/requests',
    font: '/game/ps1/smtif/font',
  },

  categories: [],

  announcement: {
    version: '测试中',
    updated: '2026-08-09',
    downloadLinks: [],
    notes: [
      '这是民间汉化项目，与 ATLUS 官方无关。',
      '项目目前处于筹备阶段，暂未提供可下载的汉化补丁。',
      '请使用合法来源的游戏镜像。',
    ],
    installGuide: [
      '项目尚在筹备，补丁发布后将在此提供下载和使用说明。',
    ],
    changelog: [
      {
        version: '筹备中',
        text: '已创建项目页面，等待导入文本、字库与翻译数据。',
      },
    ],
    copyrightNotice:
      '本项目仅用于学习、研究和交流。游戏版权、商标和相关素材版权均属于 ATLUS 及原权利方。',
    resaleNotice:
      '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止将本补丁用于任何商业用途。',
    sponsorNote:
      '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
  },
}
