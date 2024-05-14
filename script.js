let gameData;
let currentState;

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
    console.error("There has been a problem with your fetch operation:", error);
  });

function startGame() {
  currentState = {
    currentEntry: "1",
    health: 100,
    inventory: [],
  };
  displayEntry(currentState.currentEntry);
  updateHealth(0); // Initialize health display
  updateInventory(); // Initialize inventory display
}

function displayEntry(entryId) {
  const entry = gameData.entries[entryId];
  if (!entry) {
    console.error(`Entry with ID ${entryId} not found`);
    document.getElementById(
      "description"
    ).innerText = `Error: Entry with ID ${entryId} not found.`;
    document.getElementById("choices").innerHTML = "";
    return;
  }

  // Apply any effects from the entry
  if (entry.effects) {
    if (entry.effects.health !== undefined) {
      updateHealth(entry.effects.health - currentState.health); // Set health to the specified value
    }
    if (entry.effects.inventory) {
      entry.effects.inventory.forEach((item) => addItem(item));
    }
  }

  document.getElementById("description").innerText = entry.description;

  const choicesContainer = document.getElementById("choices");
  choicesContainer.innerHTML = "";
  entry.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.innerText = choice.text;
    button.className =
      "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2";
    button.onclick = () => makeChoice(choice.nextEntry);
    choicesContainer.appendChild(button);
  });
}

function makeChoice(nextEntry) {
  currentState.currentEntry = nextEntry;
  displayEntry(nextEntry);
}

function updateHealth(amount) {
  currentState.health += amount;
  document.getElementById(
    "health"
  ).innerText = `Health: ${currentState.health}`;
}

function addItem(item) {
  if (!currentState.inventory.includes(item)) {
    currentState.inventory.push(item);
  }
  updateInventory();
}

function updateInventory() {
  document.getElementById(
    "inventory"
  ).innerText = `Inventory: ${currentState.inventory.join(", ")}`;
}

// Save game state to localStorage
function saveGame() {
  localStorage.setItem("gameState", JSON.stringify(currentState));
}

// Load game state from localStorage
function loadGame() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    currentState = JSON.parse(savedState);
    displayEntry(currentState.currentEntry);
    updateHealth(0); // Refresh health display
    updateInventory(); // Refresh inventory display
  }
}

document.getElementById("saveButton").onclick = saveGame;
document.getElementById("loadButton").onclick = loadGame;
