import {
  setCurrentDate,
  getCurrentDate,
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
  displayLocations,
  isLocationAvailable,
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
const locationTablesData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../data/locationTables.json"))
);

describe("Game Logic", () => {
  beforeEach(() => {
    setCurrentDate(new Date(1931, 8, 1, 6));

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
      if (url.includes("locationTables.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(locationTablesData),
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
    displayEntry("13");
    expect(document.getElementById("description").innerHTML).toContain(
      "Professor Louis Grunewald, this first day of September 1931"
    );

    displayLocations("Arkham");
    expect(document.getElementById("description").innerHTML).toContain(
      "Arkham Locations"
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
    const initialDate = getCurrentDate();
    setCurrentDate(new Date(initialDate)); // Use setter to isolate test effect

    const hoursToAdd = 5;
    updateTime(hoursToAdd);

    const expectedDate = new Date(initialDate);
    expectedDate.setHours(expectedDate.getHours() + hoursToAdd);

    expect(getCurrentDate()).toEqual(expectedDate);
  });

  test("should update the inventory display correctly", () => {
    addItem("Magical Artifact");
    updateInventory();
    expect(document.getElementById("inventory").innerText).toBe(
      "Inventory: Magical Artifact"
    );
  });

  test("should save the game state to localStorage", () => {
    setCurrentDate(new Date(1931, 8, 1, 12, 0)); // Noon, September 1, 1931
    addItem("Magical Artifact");
    saveGame();

    const savedState = JSON.parse(localStorage.getItem("gameState"));

    // Check each property individually, ignore direct date comparison in object
    expect(savedState.health).toEqual(currentState.health);
    expect(savedState.sanity).toEqual(currentState.sanity);
    expect(savedState.inventory).toEqual(currentState.inventory);
    expect(new Date(savedState.currentDate)).toEqual(getCurrentDate()); // Compare dates as Date objects

    // Optionally, you can check other properties as needed
  });

  test("should load the game state from localStorage, including date and time", () => {
    // Set initial conditions
    setCurrentDate(new Date(1931, 8, 1, 12, 0)); // Noon, September 1, 1931
    addItem("Magical Artifact");

    // Save game state including current date and time
    saveGame();

    // Modify the current state to simulate a change
    setCurrentDate(new Date(1931, 8, 2, 13, 0)); // 1 PM, September 2, 1931
    currentState.health = 50;
    currentState.sanity = 50;
    currentState.inventory = [];

    // Load the saved state
    loadGame();

    // Verify that the state matches the expected values including date and time
    expect(currentState).toMatchObject({
      health: 100,
      sanity: 100,
      inventory: ["Magical Artifact"],
      skills: expect.any(Object),
    });
    expect(getCurrentDate()).toEqual(new Date(1931, 8, 1, 12, 0)); // Check if the date and time are correctly loaded
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

  test("should display Arkham locations", () => {
    setCurrentDate(new Date(1931, 8, 1, 10, 10));
    displayLocations("Arkham");
    const choices = document.getElementById("choices").children;
    const availableLocations = Object.keys(locationTablesData["Arkham"]).filter(
      (location) =>
        isLocationAvailable(locationTablesData["Arkham"][location].availability)
    );
    expect(choices.length).toBe(availableLocations.length);
  });

  test("should handle conditional choices based on current date", () => {
    setCurrentDate(new Date(1931, 8, 1, 10, 0));
    currentState.character = "Professor Grunewald";
    displayEntry("102");
    const choices = document.getElementById("choices").children;
    expect(choices.length).toBe(1);

    setCurrentDate(new Date(1931, 8, 9, 10, 0));
    currentState.character = "Professor Grunewald";
    displayEntry("102");
    const choicesPartTwo = document.getElementById("choices").children;
    expect(choicesPartTwo.length).toBe(2);
  });

  test("should handle choices with character requirements", () => {
    setCurrentDate(new Date(1931, 8, 1, 10, 0));
    currentState.character = "Professor Grunewald";
    displayEntry("102");
    const choices = document.getElementById("choices").children;
    expect(choices.length).toBe(1); // One choice for Arkham locations
  });

  test("should advance time based on effects", () => {
    // Set the initial conditions
    setCurrentDate(new Date(1931, 8, 2, 6, 0)); // Sep 2, 1931 at 6:00 AM
    displayEntry("13");

    // Directly invoke the choice's effect as it would be from clicking the button
    makeChoice("102", {});

    // Expected time after making the choice
    const expectedDate = new Date(1931, 8, 2, 7, 0); // Sep 2, 1931 at 7:00 AM

    expect(getCurrentDate()).toEqual(expectedDate);
  });
});
