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

export function initializeGame() {
  getData("data/gameData.json")
    .then((data) => {
      gameData = data;
      startGame();
    })
    .catch((error) => {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    });
}

export function startGame() {
  currentState = {
    currentEntry: "1",
    health: 100,
    sanity: 100,
    inventory: [],
    investigator: "Professor Grunewald",
    skills: gameData.investigators["Professor Grunewald"].skills,
  };
  displayEntry(currentState.currentEntry);
  updateHealth(0); // Initialize health display
  updateSanity(0); // Initialize sanity display
  updateInventory(); // Initialize inventory display
  updateTime(0); // Initialize date display
}
