import { initRubikGame } from "./rubik.js";

const $ = (sel) => document.querySelector(sel);
const mount = $("#app");
const resetButton = $("#reset-btn");
const oScore = $("#o-score");
const xScore = $("#x-score");
const oPlayer = $("#o-player");
const xPlayer = $("#x-player");
const hint = $(".hint");
const resultModal = $("#result-modal");
const resultText = $("#result-text");
const resultResetBtn = $("#result-reset-btn");
const rulesBtn = $("#rules-btn");
const rulesModal = $("#rules-modal");
const rulesCloseBtn = $("#rules-close-btn");
const langBtn = $("#lang-btn");

const I18N = {
  en: {
    "player.o": "O Player",
    "player.x": "X Player",
    "btn.rules": "Rules",
    "btn.reset": "Reset",
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
    "btn.reset": "重置",
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
    "btn.reset": "リセット",
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

const LANG_ORDER = ["en", "zh", "ja"];
const LANG_LABEL = { en: "EN", zh: "中文", ja: "JP" };
let currentLang = "en";
let lastResult = null;

const t = (key, vars = {}) => {
  const dict = I18N[currentLang] || I18N.en;
  let str = dict[key] ?? I18N.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
};

const applyI18n = () => {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  if (langBtn) langBtn.textContent = LANG_LABEL[currentLang] ?? currentLang.toUpperCase();
  if (lastResult && resultModal && !resultModal.classList.contains("hidden")) {
    showResult(lastResult);
  }
};

const setActive = (p) => {
  oPlayer?.classList.toggle("active", p === 1);
  xPlayer?.classList.toggle("active", p === 2);
};
const setScores = ({ o, x }) => {
  if (oScore) oScore.textContent = String(o);
  if (xScore) xScore.textContent = String(x);
};
const showResult = ({ winner, scores }) => {
  lastResult = { winner, scores };
  resultModal?.classList.remove("hidden");
  if (!resultText) return;
  if (winner === 0) resultText.textContent = t("result.draw", scores);
  else if (winner === 1) resultText.textContent = t("result.oWin", scores);
  else resultText.textContent = t("result.xWin", scores);
};
const resetUI = () => {
  if (hint) hint.textContent = t("hint");
  resultModal?.classList.add("hidden");
  lastResult = null;
};

initRubikGame({
  mount,
  resetButton,
  onTurnChange: setActive,
  onScoreChange: setScores,
  onGameEnd: showResult,
  onReset: resetUI,
});

setScores({ o: 0, x: 0 });
setActive(1);
resetUI();
applyI18n();

resultResetBtn?.addEventListener("click", () => resetButton?.click());
rulesBtn?.addEventListener("click", () => rulesModal?.classList.remove("hidden"));
rulesCloseBtn?.addEventListener("click", () => rulesModal?.classList.add("hidden"));
langBtn?.addEventListener("click", () => {
  const idx = LANG_ORDER.indexOf(currentLang);
  currentLang = LANG_ORDER[(idx + 1) % LANG_ORDER.length] ?? "en";
  applyI18n();
  resetUI();
});
