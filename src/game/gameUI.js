import { initializeGame } from "./gameState.js";
import { saveGame, loadGame, checkRequirements } from "./gameActions.js";

export function displayEntry(entryId) {
  const entry = gameData.entries[entryId];
  if (!entry) {
    console.error(`Entry with ID ${entryId} not found`);
    document.getElementById(
      "description"
    ).innerText = `Error: Entry with ID ${entryId} not found.`;
    return;
  }

  document.getElementById("description").innerText = entry.description;

  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";

  entry.choices.forEach((choice) => {
    if (checkRequirements(choice.requirements)) {
      const button = document.createElement("button");
      button.innerText = choice.text;
      button.onclick = () => displayEntry(choice.nextEntry);
      choicesDiv.appendChild(button);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeGame();

  document.getElementById("saveButton").onclick = saveGame;
  document.getElementById("loadButton").onclick = loadGame;
});
