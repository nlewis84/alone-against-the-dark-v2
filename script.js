let gameData;
export let currentState;
let currentDate = new Date(1931, 8, 1); // Start on September 1, 1931

document.addEventListener("DOMContentLoaded", () => {
  // Fetch the game data from the JSON file
  fetch("data/gameData.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
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

  document.getElementById("saveButton").onclick = saveGame;
  document.getElementById("loadButton").onclick = loadGame;
});

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
      "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2";
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
  localStorage.setItem("gameState", JSON.stringify(currentState));
}

// Load game state from localStorage
export function loadGame() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    currentState = JSON.parse(savedState);
    displayEntry(currentState.currentEntry);
    updateHealth(0); // Refresh health display
    updateSanity(0); // Refresh sanity display
    updateInventory(); // Refresh inventory display
    updateTime(0); // Refresh date display
  }
}

export function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function makeSkillCheck(skill) {
  const roll = rollDice(100);
  const skillLevel = currentState.skills[skill];
  return roll <= skillLevel;
}
