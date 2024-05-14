let gameData;
let currentState;

fetch("data/gameData.json")
  .then((response) => response.json())
  .then((data) => {
    gameData = data;
    startGame();
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
  document.getElementById("description").innerText = entry.description;

  const choicesContainer = document.getElementById("choices");
  choicesContainer.innerHTML = "";
  entry.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.innerText = choice.text;
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
  currentState.inventory.push(item);
  updateInventory();
}

function updateInventory() {
  document.getElementById(
    "inventory"
  ).innerText = `Inventory: ${currentState.inventory.join(", ")}`;
}
