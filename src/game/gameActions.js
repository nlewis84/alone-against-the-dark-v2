import {
  currentState,
  gameData,
  getCurrentDate,
  setCurrentDate,
} from "./gameState.js";
import { saveState, loadState } from "../utils/storage.js";
import { rollDice, makeSkillCheck } from "../utils/dice.js";

export function updateTime(hours, setHour = null, timeSuffix = null) {
  const date = getCurrentDate();
  if (setHour !== null) {
    date.setHours(setHour);
  } else {
    date.setHours(date.getHours() + hours);
  }
  setCurrentDate(date);

  // Handle special designations for time like 'N' for Noon and 'M' for Midnight
  let hour = getCurrentDate().getHours();
  let suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12; // Convert hour '0' to '12'

  let timeString;
  if (timeSuffix) {
    timeString =
      timeSuffix === "N"
        ? "Noon"
        : timeSuffix === "M"
        ? "Midnight"
        : `${hour}${timeSuffix} ${suffix}`;
  } else {
    timeString = `${hour}:00 ${suffix}`;
  }

  document.getElementById(
    "date"
  ).innerText = `Date: ${getCurrentDate().toDateString()}, Time: ${timeString}`;
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

  const currentDay = getCurrentDate().toLocaleString("en-US", {
    weekday: "long",
  });

  // Check if the current day is in the daysOfWeek list
  if (
    availability.daysOfWeek &&
    !availability.daysOfWeek.includes(currentDay)
  ) {
    return false;
  }

  // Check character-specific availability, if applicable
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
  // Automatically advance time by one hour for any action, unless specified otherwise
  const timeChange = effects && effects.time !== undefined ? effects.time : 1;
  updateTime(timeChange);

  if (effects) {
    if (effects.health !== undefined) {
      updateHealth(effects.health - currentState.health);
    }
    if (effects.sanity !== undefined) {
      updateSanity(effects.sanity - currentState.sanity);
    }
    if (effects.inventory) {
      effects.inventory.forEach((item) => addItem(item));
    }
    // Handle day advance with a default or specified hour
    if (effects.dayAdvance) {
      const newDate = new Date(getCurrentDate()); // Clone currentDate to manipulate it
      newDate.setDate(newDate.getDate() + 1); // Advance by one day
      setCurrentDate(newDate); // Update the global currentDate
      updateTime(
        0,
        effects.defaultHour !== undefined ? effects.defaultHour : 6
      ); // Default to 6 AM or specified hour
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
  const currentDate = getCurrentDate();

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
