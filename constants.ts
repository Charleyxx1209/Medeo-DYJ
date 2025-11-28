// API Configuration
export const API_BASE_URL = "https://ai.medeo.app/api";
export const ASSET_BASE_URL = "https://s3-us.medeo.one2x.ai";

// Credentials
export const ACCESS_ID = "dayuanjing@one2x.ai";
export const ACCESS_KEY = "one2x";

// Options
export const DURATION_OPTIONS = [
  { value: 'auto', label: '智能自动 (Auto)' },
  { value: '5s', label: '5 秒 (5s)' },
  { value: '15s', label: '15 秒 (15s)' },
  { value: '30s', label: '30 秒 (30s)' },
  { value: '60s', label: '1 分钟 (60s)' },
  { value: '120s', label: '2 分钟 (120s)' },
];

export const RATIO_OPTIONS = [
  { value: '16:9', label: '16:9 (横屏 - YouTube/B站)' },
  { value: '9:16', label: '9:16 (竖屏 - 抖音/TikTok)' },
  { value: '1:1', label: '1:1 (方形 - 小红书/Ins)' },
];

export const STYLE_OPTIONS = [
  { value: 'auto', label: '自动风格 (Auto)' },
  { value: 'ghibli_style', label: '宫崎骏吉卜力 (Ghibli)' },
  { value: 'makoto_shinkai_animation', label: '新海诚风格 (Makoto Shinkai)' },
  { value: '3d_cute', label: '3D 可爱风 (3D Cute)' },
  { value: '3d_realistic', label: '3D 写实 (3D Realistic)' },
  { value: 'cyberpunk', label: '赛博朋克 (Cyberpunk)' },
  { value: 'van_gogh_painting_style', label: '梵高油画 (Van Gogh)' },
  { value: 'watercolor_pixel_art', label: '水彩像素 (Watercolor Pixel)' },
  { value: 'documentary_aesthetics', label: '纪录片质感 (Documentary)' },
  { value: 'wesanderson', label: '韦斯·安德森 (Wes Anderson)' },
  { value: 'chinese_ink_wash_painting', label: '中国水墨画 (Ink Wash)' },
  { value: 'chinese_gongbi_style', label: '中国工笔画 (Gongbi)' },
  { value: 'blue_ink_shanshui', label: '青绿山水 (Blue Ink Shanshui)' },
  { value: 'song_dynasty_artwork', label: '宋代艺术 (Song Dynasty)' },
  { value: 'american_comic', label: '美式漫画 (American Comic)' },
  { value: 'manga', label: '日式黑白漫 (Manga)' },
  { value: 'retro_comic', label: '复古漫画 (Retro Comic)' },
  { value: 'clay', label: '黏土动画 (Clay)' },
  { value: '2_5d', label: '2.5D 风格' },
  { value: 'game_concept_art', label: '游戏概念图 (Game Concept)' },
  { value: 'lego', label: '乐高风格 (Lego)' },
  { value: 'embroidery', label: '刺绣风格 (Embroidery)' },
  { value: 'surreal_photography', label: '超现实摄影 (Surreal)' },
];

export const TONE_OPTIONS = [
  { value: '', label: '无旁白' },
  { value: '20845574-3f7b-468c-b565-edec33f9079b', label: '知言📘百科 (中文男声)' },
  { value: 'f5de0a6c-25eb-47fa-ad79-4ea359e6a827', label: '仕明📺新闻 (中文男声)' },
  { value: '5d47c381-eebe-41e6-95a2-464d1035355c', label: '明轩📣播报 (中文男声)' },
  { value: 'e7b2c5dd-3017-4f4e-9283-20d3b25dbce3', label: '思妍🎀学姐 (中文女声)' },
  { value: '5914a664-7c03-49d9-a58c-5f29598a2e55', label: '雅雯📡新闻 (中文女声)' },
  { value: '7688ee3b-ca1d-4607-a4be-586663de2d45', label: '✨British Hazel Social (英式)' },
  { value: '412d4b01-5ff5-407b-93a2-bbfb2d0bc051', label: '📖British Vivian Story (英式)' },
  { value: 'e8ca63e8-9584-4315-bdb8-b74a8db8135e', label: '🧑‍🏫American Nova Edu (美式)' },
  { value: '361cb11c-7f7c-413e-b210-d4a919aab31b', label: '📖American Layla Story (美式)' },
  { value: 'b5e19fd7-fa13-4db8-b980-19f01e4f8042', label: '🧑‍🏫American Derek Edu (美式)' },
];