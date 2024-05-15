import { getData } from "../utils/storage.js";
import {
  displayEntry,
  updateHealth,
  updateSanity,
  updateInventory,
  updateTime,
} from "./gameActions.js";

export let gameData;
export let currentState;
export let currentDate = new Date(1931, 8, 1); // Start on September 1, 1931

export function setGameData(data) {
  gameData = data;
}

export async function initializeGame() {
  try {
    const data = await getData("data/gameData.json");
    setGameData(data);
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
