import { currentState, gameData, currentDate } from "./gameState.js";
import { saveState, loadState } from "../utils/storage.js";

export function updateTime(hours) {
  currentDate.setHours(currentDate.getHours() + hours);
  document.getElementById(
    "date"
  ).innerText = `Date: ${currentDate.toDateString()}`;
}

export function displayEntry(entryId) {
  const entry = gameData.entries[entryId];
  if (!entry) {
    console.error(`Entry with ID ${entryId} not found`);
    document.getElementById(
      "description"
    ).innerText = `Error: Entry with ID ${entryId} not found.`;
    document.getElementById("choices").innerHTML = "";
    return;
  }

  document.getElementById("description").innerText = entry.description;

  const choicesContainer = document.getElementById("choices");
  choicesContainer.innerHTML = "";
  entry.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.innerText = choice.text;
    button.className =
      "px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2";
    button.onclick = () => makeChoice(choice.nextEntry, choice.effects);
    choicesContainer.appendChild(button);
  });
}

export function makeChoice(nextEntry, effects) {
  if (effects) {
    if (effects.health !== undefined) {
      updateHealth(effects.health - currentState.health); // Set health to the specified value
    }
    if (effects.sanity !== undefined) {
      updateSanity(effects.sanity - currentState.sanity); // Set sanity to the specified value
    }
    if (effects.inventory) {
      effects.inventory.forEach((item) => addItem(item));
    }
    if (effects.time) {
      updateTime(effects.time);
    }
  }

  currentState.currentEntry = nextEntry;
  displayEntry(nextEntry);
}

export function updateHealth(amount) {
  currentState.health += amount;
  document.getElementById(
    "health"
  ).innerText = `Health: ${currentState.health}`;
}

export function updateSanity(amount) {
  currentState.sanity += amount;
  document.getElementById(
    "sanity"
  ).innerText = `Sanity: ${currentState.sanity}`;
}

export function addItem(item) {
  if (!currentState.inventory.includes(item)) {
    currentState.inventory.push(item);
  }
  updateInventory();
}

export function updateInventory() {
  document.getElementById(
    "inventory"
  ).innerText = `Inventory: ${currentState.inventory.join(", ")}`;
}

// Save game state to localStorage
export function saveGame() {
  saveState("gameState", currentState);
}

// Load game state from localStorage
export function loadGame() {
  const savedState = loadState("gameState");
  if (savedState) {
    currentState = savedState;
    displayEntry(currentState.currentEntry);
    updateHealth(0); // Refresh health display
    updateSanity(0); // Refresh sanity display
    updateInventory(); // Refresh inventory display
    updateTime(0); // Refresh date display
  }
}
