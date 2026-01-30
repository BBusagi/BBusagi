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
const defaultHint = "点击小格切换：默认 → O → X，拖动旋转，滚轮缩放";

const setActive = (p) => {
  oPlayer?.classList.toggle("active", p === 1);
  xPlayer?.classList.toggle("active", p === 2);
};
const setScores = ({ o, x }) => {
  if (oScore) oScore.textContent = String(o);
  if (xScore) xScore.textContent = String(x);
};
const showResult = ({ winner, scores }) => {
  resultModal?.classList.remove("hidden");
  if (!resultText) return;
  if (winner === 0) resultText.textContent = `平局（O ${scores.o} : X ${scores.x}）`;
  else if (winner === 1) resultText.textContent = `O 获胜（O ${scores.o} : X ${scores.x}）`;
  else resultText.textContent = `X 获胜（O ${scores.o} : X ${scores.x}）`;
};
const resetUI = () => {
  if (hint) hint.textContent = defaultHint;
  resultModal?.classList.add("hidden");
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

resultResetBtn?.addEventListener("click", () => resetButton?.click());
rulesBtn?.addEventListener("click", () => rulesModal?.classList.remove("hidden"));
rulesCloseBtn?.addEventListener("click", () => rulesModal?.classList.add("hidden"));
