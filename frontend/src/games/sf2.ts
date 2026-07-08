import type { GameConfig } from './types'

export const sf2: GameConfig = {
  slug: 'sf2',
  title: 'SAGA FRONTIER 2',
  shortTitle: 'SF2',
  platform: 'pc',
  series: 'SaGa',

  titleZh: '沙加 未拓领域2',
  accent: '#B08A4A',
  accentSoft: '#D8BC7A',
  ghostChar: '歴',

  status: 'released',
  progress: 100,

  coverImage: '',

  basePath: '/game/pc/sf2',
  dataPath: '/games/sf2',
  groupIndexPath: '/games/sf2/index.json',

  description: '《沙加 未拓领域2》PC 版简体中文移植补丁。',

  routes: {
    announce: '/game/pc/sf2/announce',
    issues: '/game/pc/sf2/issues',

    // 目前类型要求这些字段，先补齐
    main: '/game/pc/sf2/main',
    search: '/game/pc/sf2/search',
    glossary: '/game/pc/sf2/glossary',
    requests: '/game/pc/sf2/requests',
  },

  categories: [],

  announcement: {
    version: 'v1.0（初版）',
    updated: '2026-07-07',
    downloadLinks: [ 
      {
        label: '百度网盘',
        url: 'https://pan.baidu.com/s/1--GO-zpbvtxCBd7LuFxpZg?pwd=yaxa',
        note: "",
      }
    ],

    notes: [
      'switch官方繁体中文PC移植版。',
      '完整汉化主线剧情、支线对白、系统提示及菜单选项等游戏文本。',
      '部分教学图片尚未汉化，但不影响正常游玩。',
      '适用于 PC（Steam）版。',
    ],

    installGuide: [
      '在 Steam 下载并安装正版游戏。',
      '打开游戏安装文件夹，将汉化文件粘贴进去并覆盖日文文件。',
      '启动游戏，在游戏内将语言切换为日文。',
    ],

    changelog: [
      {
        version: 'v1.0',
        text: '初版：根据官方繁体中文版导入简体中文。',
      },
    ],

    copyrightNotice:
      '本补丁为非商业性质的爱好者中文移植补丁，仅供已合法购买游戏的用户学习与研究。本补丁不包含破解、注册机或非法传播内容，不会绕过或修改 DRM 机制。使用本补丁造成的一切后果由用户自行承担。请支持正版游戏，尊重知识产权。',

    resaleNotice:
      '禁止将本补丁用于营利、再包装发布、抽奖变现或嵌套加密推广。引用或转载时请注明出处并保留完整文件结构。',

    sponsorNote: '',
  },
}