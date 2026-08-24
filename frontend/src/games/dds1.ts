import type { GameConfig } from './types'

export const dds1: GameConfig = {
  slug: 'dds1',
  title: 'Shin Megami Tensei: Digital Devil Saga',
  shortTitle: 'DDS1',
  platform: 'ps2',
  series: 'Digital Devil Saga',

  titleZh: '数码恶魔传说 天魔变',
  accent: '#cfc6c7',
  accentSoft: '#F3A077',
  ghostChar: '魔',

  status: 'released',
  progress: 100,

  coverImage: '',

  basePath: '/game/ps2/dds1',
  dataPath: '/games/dds1',
  groupIndexPath: '/games/dds1/index.json',

  description: '《数码恶魔传说 天魔变》PS2 汉化项目',
  credits: [
    { role: '程序', members: ['Mark'] },
    {
      role: '翻译',
      members: ['匿名1', '雷吼君','HeiseiFish8','汣酌','茶','福建千里香混沌王','美工椒','Forget','JerryHOEI','Mark', '米跳拉斯'],
    },
    { role: '修图', members: ['Forget', '渲酱', 'Mark'] },
    {
      role: '测试',
      members: ['Mark', 'Forget', 'Smirk', '雷吼君', '一个星期', '哆啦海皇·A梦', '渲酱', '匿名1', 'T.K.', '杭城', '4mL Na', '伊恩', 'pootis penser here', 'Chelly大人的五音', 'Firomia Alencon', 'Gaia Rage', 'JH', 'Mo_xiaoying', '饼干', '飞翔的企鹅', '汣酌', '牵', '塞特', '私の物語', '星迷'],
    },
  ],

  routes: {
    announce: '/game/ps2/dds1/announce',
    main: '/game/ps2/dds1/main',
    search: '/game/ps2/dds1/search',
    issues: '/game/ps2/dds1/issues',
    glossary: '/game/ps2/dds1/glossary',
    requests: '/game/ps2/dds1/requests',
    font: '/game/ps2/dds1/font',
  },

  categories: ['field', 'event', 'battle', 'facility', 'exe', 'msgtbl', 'fldall', 'slpm_raw'],

  announcement: {
    version: '完成',
    releaseKind: 'full_game',
    updated: '2026-08-24',
    downloadLinks: [
      {
        label: '百度网盘',
        url: 'https://pan.baidu.com/s/1RxgGeQioTpgZ0_-1smWYqw?pwd=89w6',
        note: "",
      },
      {
        label: 'MEGA',
        url: 'https://mega.nz/folder/LJIFmBSJ#O0fRvmXwHcSR9Nt_T0tmLQ',
        note: '链接已更新',
      },],
    notes: [
      '这是民间汉化项目，与 ATLUS 官方无关。',
    ],
    installGuide: [
      '下载即可游玩',
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
      '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止将本汉化用于任何商业用途。',
    sponsorNote:
      '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
  },
}
