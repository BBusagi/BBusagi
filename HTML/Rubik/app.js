import { initRubikGame } from "./rubik.js";

const mount = document.getElementById("app");
const resetButton = document.getElementById("reset-btn");

initRubikGame({ mount, resetButton });
