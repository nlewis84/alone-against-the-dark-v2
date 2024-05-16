import { currentState, gameData, currentDate } from "./gameState.js";
import { saveState, loadState } from "../utils/storage.js";
import { rollDice, makeSkillCheck } from "../utils/dice.js";

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

  let entryText = `<strong>${entryId}. ${entry.title || ""}</strong><br>`;
  if (entry.specialInstructions) {
    entryText += `<em>${entry.specialInstructions}</em><br>`;
  }
  entryText += entry.description;

  document.getElementById("description").innerHTML = entryText;

  const choicesContainer = document.getElementById("choices");
  choicesContainer.innerHTML = "";
  entry.choices.forEach((choice) => {
    if (checkRequirements(choice.requirements)) {
      const button = document.createElement("button");
      button.innerText = choice.text;
      button.className =
        "px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2";
      if (choice.effects && choice.effects.check) {
        button.onclick = () => {
          const success = makeSkillCheck(
            choice.effects.check.skill,
            currentState.skills,
            currentState
          );
          displayEntry(
            success
              ? choice.effects.check.success
              : choice.effects.check.failure
          );
        };
      } else if (choice.nextEntry.endsWith(" Location")) {
        button.onclick = () => {
          displayLocations(choice.nextEntry.replace(" Location", ""));
        };
      } else {
        button.onclick = () => makeChoice(choice.nextEntry, choice.effects);
      }
      choicesContainer.appendChild(button);
    }
  });

  if (entry.end) {
    document.getElementById("description").innerHTML +=
      "<br><strong>THE END</strong>";
  }
}

export function displayLocations(locationType) {
  const locations = gameData.locationTables[locationType];
  if (!locations) {
    console.error(`${locationType} Location Table not found.`);
    document.getElementById(
      "description"
    ).innerText = `Error: ${locationType} Location Table not found.`;
    return;
  }

  // Update the description to explicitly mention the location type being displayed
  document.getElementById(
    "description"
  ).innerHTML = `<strong>${locationType} Locations:</strong><br>Select a location from the list below:`;

  const choicesContainer = document.getElementById("choices");
  choicesContainer.innerHTML = "";

  Object.keys(locations).forEach((location) => {
    const locationData = locations[location];
    if (isLocationAvailable(locationData.availability)) {
      const button = document.createElement("button");
      button.innerText = location;
      button.className =
        "px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2";
      button.onclick = () => {
        displayEntry(locationData.entry);
      };
      choicesContainer.appendChild(button);
    }
  });
}

export function isLocationAvailable(availability) {
  if (availability.alwaysOpen) {
    return true;
  }

  const currentDay = currentDate.toLocaleString("en-US", { weekday: "long" });
  const currentHour = currentDate.getHours();

  if (
    availability.daysOfWeek &&
    !availability.daysOfWeek.includes(currentDay)
  ) {
    return false;
  }

  if (availability.hours && !isWithinHours(currentHour, availability.hours)) {
    return false;
  }

  if (
    availability.character &&
    availability.character !== currentState.character
  ) {
    return false;
  }

  return true;
}

function isWithinHours(currentHour, hours) {
  for (let i = 0; i < hours.length; i += 2) {
    if (currentHour >= hours[i] && currentHour < hours[i + 1]) {
      return true;
    }
  }
  return false;
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
  saveState("gameState", currentState);
}

// Load game state from localStorage
export function loadGame() {
  const savedState = loadState("gameState");
  if (savedState) {
    Object.assign(currentState, savedState);
    displayEntry(currentState.currentEntry);
    updateHealth(0); // Refresh health display
    updateSanity(0); // Refresh sanity display
    updateInventory(); // Refresh inventory display
    updateTime(0); // Refresh date display
  } else {
    console.log("No saved state found in localStorage.");
  }
}

export function checkRequirements(requirements) {
  if (requirements) {
    if (requirements.dateAfter) {
      const dateAfter = new Date(requirements.dateAfter);
      if (currentDate <= dateAfter) {
        return false;
      }
    }
    if (requirements.character) {
      if (currentState.character !== requirements.character) {
        return false;
      }
    }
    if (requirements.characterNot) {
      if (currentState.character === requirements.characterNot) {
        return false;
      }
    }
  }
  return true;
}
