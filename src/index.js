import { initializeGame } from "./game/gameState.js";
import { saveGame, loadGame } from "./game/gameActions.js";

document.addEventListener("DOMContentLoaded", () => {
  initializeGame();

  document.getElementById("saveButton").onclick = saveGame;
  document.getElementById("loadButton").onclick = loadGame;
});
