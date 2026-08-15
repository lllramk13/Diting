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

  status: 'released',
  progress: 100,

  coverImage: '',

  basePath: '/game/ps1/smtif',
  dataPath: '/games/smtif',
  groupIndexPath: '/games/smtif/index.json',

  description: '《真・女神转生 If...》PS1 汉化项目',
  credits: [
    { role: '程序', members: ['Mark', '落月'] },
    {
      role: '翻译',
      members: ['Nutest', 'soft and wet', '藤堂小鸟', '♪', '美工猫', 'cfsoso', '蕾米酱', '八武崎碧', '💧', 'iwakura_lain'],
    },
    { role: '校对', members: ['cfsoso', 'Forget'] },
    { role: '字幕', members: ['真田アキラ', 'Forget'] },
    {
      role: '测试',
      members: ['Mark', 'Forget', 'Smirk', '雷吼君', '一个星期', '霜鱼斯利维', '哆啦海皇·A梦', 'chelly大人的五音', 'cfsoso', '十年君Decade', '渲酱'],
    },
    { role: '特别感谢', members: ['空调JO太郎', 'shikeyu'] },
  ],

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
    version: '完成',
    releaseKind: 'full_game',
    updated: '2026-08-15',
    downloadLinks: [
      {
        label: '百度网盘',
        url: 'https://pan.baidu.com/s/1lyBjqfl8ddMNJ_qwbYrRWw?pwd=2ynk',
        note: "",
      },
      {
        label: 'MEGA',
        url: 'https://mega.nz/folder/fVoi3JJL#RhPuYYa5ERv4NDGhcbhs1g',
        note: '链接已更新',
      },
    ],
    notes: [
      '这是民间汉化项目，与 ATLUS 官方无关。',
      '本次发布为已整合汉化内容的完整版，无需另行安装补丁。',
      '请使用合法来源的游戏镜像。',
    ],
    installGuide: [
      '解压下载压缩包，用模拟器加载游戏镜像即可游玩。',
    ],
    changelog: [
      {
        version: '完成',
        text: '完全汉化测试完成',
      },
      {
        version: '筹备中',
        text: '已创建项目页面，等待导入文本、字库与翻译数据。',
      }
    ],
    copyrightNotice:
      '本项目仅用于学习、研究和交流。游戏版权、商标和相关素材版权均属于 ATLUS 及原权利方。',
    resaleNotice:
      '禁止打包转载、禁止转载资源、禁止倒卖、禁止打包收费、禁止将本补丁用于任何商业用途。',
    sponsorNote:
      '如果你喜欢这个项目，可以选择赞助支持。赞助完全自愿，公开版本仍会正常发布。',
  },
}
