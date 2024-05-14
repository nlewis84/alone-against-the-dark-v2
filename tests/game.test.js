import {
  updateTime,
  displayEntry,
  makeChoice,
  startGame,
  updateHealth,
  updateSanity,
  addItem,
  updateInventory,
  saveGame,
  loadGame,
  rollDice,
  makeSkillCheck,
  currentState,
} from "../script";

const mockGameData = {
  investigators: {
    "Professor Grunewald": {
      health: 100,
      sanity: 100,
      skills: {
        Climb: 40,
        Charm: 50,
        Fighting: 30,
      },
      inventory: [],
    },
  },
  entries: {
    1: {
      description: "You are in a dark room...",
      choices: [
        { text: "Turn on the light", nextEntry: "2" },
        { text: "Leave the room", nextEntry: "3" },
      ],
    },
    2: {
      description:
        "The light reveals an old library with bookshelves full of ancient tomes...",
      choices: [
        { text: "Read a book", nextEntry: "4" },
        { text: "Leave the library", nextEntry: "3" },
      ],
    },
    9: {
      description: "You open the chest and find a magical artifact.",
      choices: [
        {
          text: "Take the artifact and leave",
          nextEntry: "7",
          effects: { health: 100, inventory: ["Magical Artifact"] },
        },
        { text: "Leave without taking the artifact", nextEntry: "7" },
      ],
    },
  },
};

describe("Game Logic", () => {
  beforeEach(() => {
    fetch.resetMocks();
    fetch.mockResponseOnce(JSON.stringify(mockGameData));

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

    // Simulate DOMContentLoaded event
    document.dispatchEvent(new Event("DOMContentLoaded"));
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
    expect(document.getElementById("description").innerText).toBe(
      "You are in a dark room..."
    );
  });

  test("should make choice and apply effects", () => {
    makeChoice("9", { health: 100, inventory: ["Magical Artifact"] });
    expect(currentState.health).toBe(100);
    expect(currentState.inventory).toContain("Magical Artifact");
  });

  test("should display the first prompt when the game starts", () => {
    startGame();
    expect(document.getElementById("description").innerText).toBe(
      "You are in a dark room..."
    );
  });

  test("should update sanity correctly", () => {
    updateSanity(-10);
    expect(currentState.sanity).toBe(90);
  });

  test("should make skill check", () => {
    currentState.skills = { Climb: 40 };
    const result = makeSkillCheck("Climb");
    expect([true, false]).toContain(result);
  });
});
