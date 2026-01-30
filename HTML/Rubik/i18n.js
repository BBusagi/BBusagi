const I18N = {
  en: {
    "player.o": "O Player",
    "player.x": "X Player",
    "btn.rules": "Rules",
    "btn.mode": "Mode",
    "btn.reset": "Reset",
    "lang.label": "Language: {lang}",
    "lang.en": "EN",
    "lang.zh": "中文",
    "lang.ja": "JP",
    "mode.label": "Mode: {mode}",
    "mode.local": "Local 2P",
    "mode.online": "Online 2P",
    "mode.ai": "Vs AI",
    "mode.debug": "Debug AI",
    hint: "Click tiles: empty → O → X. Drag to rotate, wheel to zoom.",
    "rules.title": "Rules",
    "rules.1": "O goes first, then X. Take turns.",
    "rules.2": "Each tile can be marked only once.",
    "rules.3": "Corner tiles sync to the two adjacent faces' corners.",
    "rules.4": "Edge-center tiles sync to one adjacent face's edge-center.",
    "rules.5": "Center tiles do not sync.",
    "rules.6": "3-in-a-row on a face = 1 point. When full, higher score wins.",
    "result.title": "Game Over",
    "result.draw": "Draw (O {o} : X {x})",
    "result.oWin": "O wins (O {o} : X {x})",
    "result.xWin": "X wins (O {o} : X {x})",
  },
  zh: {
    "player.o": "O 玩家",
    "player.x": "X 玩家",
    "btn.rules": "规则",
    "btn.mode": "模式",
    "btn.reset": "重置",
    "lang.label": "语言：{lang}",
    "lang.en": "EN",
    "lang.zh": "中文",
    "lang.ja": "JP",
    "mode.label": "模式：{mode}",
    "mode.local": "本地双人",
    "mode.online": "联机双人",
    "mode.ai": "AI 对战",
    "mode.debug": "调试 AI",
    hint: "点击小格切换：默认 → O → X，拖动旋转，滚轮缩放",
    "rules.title": "游戏规则",
    "rules.1": "玩家 O 先手，玩家 X 后手，轮流落子。",
    "rules.2": "每个格子只能从默认变为当前玩家图案一次。",
    "rules.3": "角落格会同步到相邻两个面的角落。",
    "rules.4": "边中格会同步到相邻一个面的对应边格。",
    "rules.5": "中心格不联动。",
    "rules.6": "单面出现三连即得 1 分；全部填满后比分高者获胜。",
    "result.title": "游戏结束",
    "result.draw": "平局（O {o} : X {x}）",
    "result.oWin": "O 获胜（O {o} : X {x}）",
    "result.xWin": "X 获胜（O {o} : X {x}）",
  },
  ja: {
    "player.o": "O プレイヤー",
    "player.x": "X プレイヤー",
    "btn.rules": "ルール",
    "btn.mode": "モード",
    "btn.reset": "リセット",
    "lang.label": "言語：{lang}",
    "lang.en": "EN",
    "lang.zh": "中文",
    "lang.ja": "JP",
    "mode.label": "モード：{mode}",
    "mode.local": "ローカル対戦",
    "mode.online": "オンライン対戦",
    "mode.ai": "AI 対戦",
    "mode.debug": "デバッグAI",
    hint: "マスをクリック：空 → O → X。ドラッグで回転、ホイールでズーム。",
    "rules.title": "ゲームルール",
    "rules.1": "O が先手、X が後手で交互に手番。",
    "rules.2": "各マスは一度だけ印を付けられます。",
    "rules.3": "角のマスは隣接する2面の角に同期します。",
    "rules.4": "辺の中央は隣接する1面の中央に同期します。",
    "rules.5": "中央のマスは同期しません。",
    "rules.6": "同一面で3連＝1点。全て埋まったら高得点が勝利。",
    "result.title": "ゲーム終了",
    "result.draw": "引き分け（O {o} : X {x}）",
    "result.oWin": "O の勝ち（O {o} : X {x}）",
    "result.xWin": "X の勝ち（O {o} : X {x}）",
  },
};

export function createI18n({ defaultLang = "en" } = {}) {
  let currentLang = defaultLang;
  const LANGS = Object.keys(I18N);

  const t = (key, vars = {}) => {
    const dict = I18N[currentLang] || I18N.en;
    let str = dict[key] ?? I18N.en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
    return str;
  };

  const setLang = (lang) => {
    if (LANGS.includes(lang)) currentLang = lang;
  };

  const nextLang = () => {
    const idx = LANGS.indexOf(currentLang);
    currentLang = LANGS[(idx + 1) % LANGS.length] ?? "en";
    return currentLang;
  };

  return {
    get lang() {
      return currentLang;
    },
    langs: LANGS,
    t,
    setLang,
    nextLang,
  };
}
