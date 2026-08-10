import type { GameConfig } from './types'

export const dds2: GameConfig = {
  slug: 'dds2',
  title: 'Shin Megami Tensei: Digital Devil Saga 2',
  shortTitle: 'DDS2',
  platform: 'ps2',
  series: 'Digital Devil Saga',

  titleZh: '数码恶魔传说 天魔变 2',
  accent: '#cfc6c7',
  accentSoft: '#b43688',
  ghostChar: '魔',

  status: 'planning',
  progress: 5,

  coverImage: '',

  basePath: '/game/ps2/dds2',
  dataPath: '/games/dds2',
  groupIndexPath: '/games/dds2/index.json',

  description: '《数码恶魔传说 天魔变 2》PS2 汉化项目',

  routes: {
    announce: '/game/ps2/dds2/announce',
    main: '/game/ps2/dds2/main',
    search: '/game/ps2/dds2/search',
    issues: '/game/ps2/dds2/issues',
    glossary: '/game/ps2/dds2/glossary',
    requests: '/game/ps2/dds2/requests',
    font: '/game/ps2/dds2/font',
  },

  categories: ['field', 'event', 'battle', 'facility', 'exe', 'msgtbl', 'fldall', 'slpm_raw'],

  announcement: {
    version: '筹备中',
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
