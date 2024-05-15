import { initializeGame } from "./gameState.js";
import { saveGame, loadGame } from "./gameActions.js";

document.addEventListener("DOMContentLoaded", () => {
  initializeGame();

  document.getElementById("saveButton").onclick = saveGame;
  document.getElementById("loadButton").onclick = loadGame;
});
