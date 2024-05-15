import { getData } from "../utils/storage.js";
import {
  displayEntry,
  updateHealth,
  updateSanity,
  updateInventory,
  updateTime,
} from "./gameActions.js";

export let gameData = {
  investigators: {},
  entries: {},
};
export let currentState;
export let currentDate = new Date(1931, 8, 1); // Start on September 1, 1931

export function setGameData(type, data) {
  gameData[type] = data;
}

const investigatorOrder = [
  { name: "Professor Grunewald", entry: "13" },
  { name: "Ernest Holt", entry: "36" },
  { name: "Lydia Lau", entry: "37" },
  { name: "Devon Wilson", entry: "554" },
];

let currentInvestigatorIndex = 0;

export async function initializeGame() {
  try {
    const [investigators, entries] = await Promise.all([
      getData("data/investigators.json"),
      getData("data/entries.json"),
    ]);
    setGameData("investigators", investigators);
    setGameData("entries", entries);
    startGame();
    displayEntry("1"); // Ensure the first entry is displayed
  } catch (error) {
    console.error("There has been a problem with your fetch operation:", error);
  }
}

export function startGame() {
  currentState = {
    currentEntry: "1",
    ...gameData.investigators["Professor Grunewald"],
  };
  displayEntry(currentState.currentEntry);
  updateHealth(0); // Initialize health display
  updateSanity(0); // Initialize sanity display
  updateInventory(); // Initialize inventory display
  updateTime(0); // Initialize date display
}

// Add this function to handle investigator death
export function handleInvestigatorDeath() {
  console.log(`${investigatorOrder[currentInvestigatorIndex].name} has died.`);
  switchToNextInvestigator();
}

// Existing switchToNextInvestigator function
function switchToNextInvestigator() {
  currentInvestigatorIndex++;
  if (currentInvestigatorIndex < investigatorOrder.length) {
    const nextInvestigator = investigatorOrder[currentInvestigatorIndex];
    currentState = {
      currentEntry: nextInvestigator.entry,
      ...gameData.investigators[nextInvestigator.name],
    };
    displayEntry(currentState.currentEntry);
    updateHealth(0);
    updateSanity(0);
    updateInventory();
    updateTime(0);
  } else {
    console.log("All investigators are dead. Game over.");
  }
}
