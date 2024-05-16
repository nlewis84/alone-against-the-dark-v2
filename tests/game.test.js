import {
  currentDate,
  initializeGame,
  currentState,
  handleInvestigatorDeath,
} from "../src/game/gameState.js";
import {
  updateTime,
  displayEntry,
  makeChoice,
  updateHealth,
  updateSanity,
  addItem,
  updateInventory,
  saveGame,
  loadGame,
} from "../src/game/gameActions.js";
import { rollDice, makeSkillCheck } from "../src/utils/dice.js";
import fs from "fs";
import path from "path";

// Load the actual JSON files
const investigatorsData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../data/investigators.json"))
);
const entriesData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../data/entries.json"))
);

describe("Game Logic", () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      if (url.includes("investigators.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(investigatorsData),
        });
      }
      if (url.includes("entries.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(entriesData),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    document.body.innerHTML = `
      <div id="description"></div>
      <div id="choices"></div>
      <div id="health"></div>
      <div id="sanity"></div>
      <div id="inventory"></div>
      <div id="date"></div>
      <button id="saveButton"></button>
      <button id="loadButton"></button>
    `;

    return initializeGame();
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore any mocks after each test
  });

  test("should update health correctly", () => {
    updateHealth(10);
    expect(currentState.health).toBe(110);
  });

  test("should add item to inventory", () => {
    addItem("Magical Artifact");
    expect(currentState.inventory).toContain("Magical Artifact");
  });

  test("should display correct entry", () => {
    displayEntry("1");
    expect(document.getElementById("description").innerHTML).toContain(
      "Professor Louis Grunewald, this first day of September 1931"
    );
  });

  test("should make choice and apply effects", () => {
    makeChoice("9", { health: 100, inventory: ["Magical Artifact"] });
    expect(currentState.health).toBe(100);
    expect(currentState.inventory).toContain("Magical Artifact");
  });

  test("should update sanity correctly", () => {
    updateSanity(-10);
    expect(currentState.sanity).toBe(90);
  });

  test("should make skill check", () => {
    currentState.skills = { Climb: 40 };
    const result = makeSkillCheck("Climb", currentState.skills);
    expect([true, false]).toContain(result);
  });

  test("should make a stat check", () => {
    currentState.skills = { DEX: 60 };
    const result = makeSkillCheck("DEX", currentState.skills);
    expect([true, false]).toContain(result);
  });

  test("should roll a dice and return a value between 1 and the specified number of sides", () => {
    const sides = 6;
    const roll = rollDice(sides);
    expect(roll).toBeGreaterThanOrEqual(1);
    expect(roll).toBeLessThanOrEqual(sides);
  });

  test("should update the current time correctly", () => {
    const initialDate = new Date(1931, 8, 1);
    const hoursToAdd = 5;
    updateTime(hoursToAdd);
    const updatedDate = new Date(initialDate);
    updatedDate.setHours(initialDate.getHours() + hoursToAdd);
    expect(new Date(currentDate)).toEqual(updatedDate);
  });

  test("should update the inventory display correctly", () => {
    addItem("Magical Artifact");
    updateInventory();
    expect(document.getElementById("inventory").innerText).toBe(
      "Inventory: Magical Artifact"
    );
  });

  test("should save the game state to localStorage", () => {
    saveGame();
    const savedState = JSON.parse(localStorage.getItem("gameState"));
    expect(savedState).toEqual(currentState);
  });

  test("should load the game state from localStorage", () => {
    // Add item to inventory before saving
    addItem("Magical Artifact");
    saveGame();

    // Modify the current state
    currentState.health = 50;
    currentState.sanity = 50;
    currentState.inventory = [];

    // Load the saved state
    loadGame();

    // Verify the state matches the expected values
    expect(currentState).toMatchObject({
      health: 100,
      sanity: 100,
      inventory: ["Magical Artifact"],
      skills: expect.any(Object),
    });
  });

  test("should switch to the next investigator upon death", () => {
    jest.spyOn(console, "log").mockImplementation(() => {}); // Mock console.log

    // Initialize game and set the first investigator
    initializeGame();

    // Simulate the death of the first investigator
    handleInvestigatorDeath();

    // Verify that the current investigator is now Ernest Holt starting at entry 36
    expect(currentState.currentEntry).toBe("36");
    expect(currentState.health).toBe(100); // Check other properties as necessary

    // Simulate the death of the second investigator
    handleInvestigatorDeath();

    // Verify that the current investigator is now Lydia Lau starting at entry 37
    expect(currentState.currentEntry).toBe("37");
    expect(currentState.health).toBe(100); // Check other properties as necessary

    // Simulate the death of the third investigator
    handleInvestigatorDeath();

    // Verify that the current investigator is now Devon Wilson starting at entry 554
    expect(currentState.currentEntry).toBe("554");
    expect(currentState.health).toBe(100); // Check other properties as necessary

    // Simulate the death of the fourth investigator
    handleInvestigatorDeath();

    // Verify that the game is over
    expect(console.log).toHaveBeenCalledWith(
      "All investigators are dead. Game over."
    );
  });
});
