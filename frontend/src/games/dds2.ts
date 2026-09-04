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

  status: 'released',
  progress: 100,

  coverImage: '',

  basePath: '/game/ps2/dds2',
  dataPath: '/games/dds2',
  groupIndexPath: '/games/dds2/index.json',

  description: '《数码恶魔传说 天魔变 2》PS2 汉化项目',
  credits: [
    { role: '程序', members: ['Mark'] },
    {
      role: '翻译',
      members: ['匿名1', '雷吼君','汣酌','福建千里香混沌王','Forget','JerryHOEI','Mark', '米跳拉斯'],
    },
    { role: '修图', members: ['Forget', '匿名1'] },
    {
      role: '测试',
      members: ['Mark', 'Forget', 'Smirk', '雷吼君', '一个星期', '匿名1','迪元', 'JerryHOEI','伊恩'],
    },
  ],

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
    version: '完成',
    releaseKind: 'full_game',
    updated: '2026-09-04',
    downloadLinks: [
      {
        label: '百度网盘',
        url: 'https://pan.baidu.com/s/14NZeF8cszpGa_l621kWHxA?pwd=ydz7',
        note: "",
      },
      {
        label: 'MEGA',
        url: 'https://mega.nz/folder/PIAHDSiR#D4urQ5UqgUn3WCyXnlVQMQ',
        note: '链接已更新',
      },],
    notes: [
      '这是民间汉化项目，与 ATLUS 官方无关。',
      '项目目前处于筹备阶段，暂未提供可下载的汉化补丁。',
      '请使用合法来源的游戏镜像。',
    ],
    installGuide: [
      '下载即玩',
    ],
    changelog: [
      {
        version: '完成',
        text: '完成',
      },
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
