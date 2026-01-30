import { initRubikGame } from "./rubik.js";
import { createI18n } from "./i18n.js";

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
const modeBtn = $("#mode-btn");
const i18n = createI18n({ defaultLang: "en" });
const MODE_ORDER = ["local", "online", "ai"];
let currentMode = "local";
let lastResult = null;

const t = i18n.t;

const applyI18n = () => {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  if (langBtn) langBtn.textContent = t("lang.label", { lang: t(`lang.${i18n.lang}`) });
  if (modeBtn) modeBtn.textContent = t("mode.label", { mode: t(`mode.${currentMode}`) });
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
  i18n.nextLang();
  applyI18n();
  resetUI();
});
modeBtn?.addEventListener("click", () => {
  const idx = MODE_ORDER.indexOf(currentMode);
  currentMode = MODE_ORDER[(idx + 1) % MODE_ORDER.length] ?? "local";
  applyI18n();
});
