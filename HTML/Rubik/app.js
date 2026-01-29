import { initRubikGame } from "./rubik.js";

const mount = document.getElementById("app");
const resetButton = document.getElementById("reset-btn");
const oScore = document.getElementById("o-score");
const xScore = document.getElementById("x-score");
const oPlayer = document.getElementById("o-player");
const xPlayer = document.getElementById("x-player");
const hint = document.querySelector(".hint");
const defaultHint = "点击小格切换：默认 → O → X，拖动旋转，滚轮缩放";
const resultModal = document.getElementById("result-modal");
const resultText = document.getElementById("result-text");
const resultResetBtn = document.getElementById("result-reset-btn");

function setActivePlayer(playerState) {
  if (!oPlayer || !xPlayer) return;
  oPlayer.classList.toggle("active", playerState === 1);
  xPlayer.classList.toggle("active", playerState === 2);
}

function setScores({ o, x }) {
  if (oScore) oScore.textContent = String(o);
  if (xScore) xScore.textContent = String(x);
}

function showGameResult({ winner, scores }) {
  if (resultModal) resultModal.classList.remove("hidden");
  if (!resultText) return;
  if (winner === 0) {
    resultText.textContent = `平局（O ${scores.o} : X ${scores.x}）`;
  } else if (winner === 1) {
    resultText.textContent = `O 获胜（O ${scores.o} : X ${scores.x}）`;
  } else {
    resultText.textContent = `X 获胜（O ${scores.o} : X ${scores.x}）`;
  }
}

initRubikGame({
  mount,
  resetButton,
  onTurnChange: setActivePlayer,
  onScoreChange: setScores,
  onGameEnd: showGameResult,
  onReset() {
    if (hint) hint.textContent = defaultHint;
    if (resultModal) resultModal.classList.add("hidden");
  },
});

setScores({ o: 0, x: 0 });
setActivePlayer(1);
if (hint) hint.textContent = defaultHint;
if (resultModal) resultModal.classList.add("hidden");

if (resultResetBtn) {
  resultResetBtn.addEventListener("click", () => {
    resetButton?.click();
  });
}
