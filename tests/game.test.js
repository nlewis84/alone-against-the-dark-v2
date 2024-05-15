import {
  currentDate,
  initializeGame,
  currentState,
  setGameData,
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

const mockGameData = {
  investigators: {
    "Professor Grunewald": {
      health: 100,
      sanity: 100,
      DEX: 60,
      skills: {
        Climb: 40,
        Charm: 50,
        Fighting: 30,
        Accounting: 5,
        Anthropology: 5,
        Archaeology: 5,
        Art: 5,
        Astronomy: 5,
      },
      inventory: [],
    },
    "Lydia Lau": {
      health: 100,
      sanity: 100,
      DEX: 65,
      skills: {
        FastTalk: 45,
        History: 40,
        Listen: 35,
        Accounting: 5,
        Anthropology: 5,
        Archaeology: 5,
        Art: 5,
        Astronomy: 5,
      },
      inventory: [],
    },
    "Devon Wilson": {
      health: 100,
      sanity: 100,
      DEX: 60,
      skills: {
        FirstAid: 40,
        Navigate: 60,
        PilotBoat: 60,
        Accounting: 5,
        Anthropology: 5,
        Archaeology: 5,
        Art: 5,
        Astronomy: 5,
      },
      inventory: [],
    },
    "Ernest Holt": {
      health: 100,
      sanity: 100,
      DEX: 55,
      skills: {
        Accounting: 50,
        FirearmsHandgun: 40,
        Intimidate: 50,
        Anthropology: 5,
        Archaeology: 5,
        Art: 5,
        Astronomy: 5,
      },
      inventory: [],
    },
  },
  entries: {
    1: {
      title: "TAXIS",
      description: "You are in a dark room...",
      specialInstructions: "Keep track of your time.",
      choices: [
        { text: "Turn on the light", nextEntry: "2" },
        { text: "Leave the room", nextEntry: "3" },
      ],
      traceNumbers: [],
      hasPhone: false,
      end: false,
    },
    2: {
      title: "LIBRARY",
      description:
        "The light reveals an old library with bookshelves full of ancient tomes...",
      choices: [
        { text: "Read a book", nextEntry: "4" },
        { text: "Leave the library", nextEntry: "3" },
      ],
      traceNumbers: ["1"],
      hasPhone: false,
      end: false,
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
      traceNumbers: ["8"],
      hasPhone: false,
      end: false,
    },
  },
};

// Add all the default skills with a value of 10 to each investigator
const allSkills = [
  "Accounting",
  "Anthropology",
  "Archaeology",
  "Art",
  "Astronomy",
  "Bargain",
  "Biology",
  "Botany",
  "Brawl",
  "Charm",
  "Chemistry",
  "Climb",
  "ComputerUse",
  "CreditRating",
  "CthulhuMythos",
  "Disguise",
  "Dodge",
  "DriveAuto",
  "ElectricRepair",
  "FastTalk",
  "Fighting",
  "Firearms",
  "FirstAid",
  "Geology",
  "History",
  "Intimidate",
  "Jump",
  "Language",
  "Law",
  "LibraryUse",
  "Listen",
  "Locksmith",
  "MartialArts",
  "MechanicalRepair",
  "Medicine",
  "NaturalWorld",
  "Navigate",
  "Occult",
  "OperateHeavyMachinery",
  "Persuade",
  "Photography",
  "Physics",
  "Pilot",
  "Psychoanalysis",
  "Psychology",
  "Ride",
  "Science",
  "SleightOfHand",
  "SpotHidden",
  "Stealth",
  "Survival",
  "Swim",
  "Throw",
  "Track",
];

Object.values(mockGameData.investigators).forEach((investigator) => {
  allSkills.forEach((skill) => {
    if (!investigator.skills[skill]) {
      investigator.skills[skill] = 10; // default value
    }
  });
});

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

    // Set the mock game data directly
    setGameData(mockGameData);

    initializeGame();
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
      "You are in a dark room..."
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
});
