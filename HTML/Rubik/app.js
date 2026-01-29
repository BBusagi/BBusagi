import { initRubikGame } from "./rubik.js";

const mount = document.getElementById("app");
const resetButton = document.getElementById("reset-btn");
const oScore = document.getElementById("o-score");
const xScore = document.getElementById("x-score");
const oPlayer = document.getElementById("o-player");
const xPlayer = document.getElementById("x-player");

function setActivePlayer(playerState) {
  if (!oPlayer || !xPlayer) return;
  oPlayer.classList.toggle("active", playerState === 1);
  xPlayer.classList.toggle("active", playerState === 2);
}

initRubikGame({
  mount,
  resetButton,
  onTurnChange: setActivePlayer,
});

if (oScore) oScore.textContent = "0";
if (xScore) xScore.textContent = "0";
setActivePlayer(1);
