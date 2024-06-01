import {
  currentState,
  gameData,
  getCurrentDate,
  setCurrentDate,
  getTempDescription,
  setTempDescription,
  setPreviousEntry,
  getPreviousEntry,
  setCurrentLocale,
  getCurrentLocale,
} from './gameState.js'
import { saveState, loadState } from '../utils/storage.js'
import { rollDice, makeSkillCheck } from '../utils/dice.js'

export function updateTime(hours, setHour = null, timeSuffix = null) {
  const date = getCurrentDate()
  if (setHour !== null) {
    date.setHours(setHour)
  } else {
    date.setHours(date.getHours() + hours)
  }
  setCurrentDate(date)

  let hour = date.getHours()
  let suffix = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12
  hour = hour ? hour : 12 // Convert hour '0' to '12'
  let timeString = `${hour}:00 ${suffix}`

  document.getElementById('date').innerText =
    `Date: ${date.toDateString()}, Time: ${timeString}`
}

function createButton(text, className, onClick) {
  const button = document.createElement('button')
  button.innerText = text
  button.className = className
  button.onclick = onClick
  return button
}

function updateDescription(entryId, title, description, specialInstructions) {
  let entryText = `<strong>${entryId}. ${title || ''}</strong><br>`
  if (specialInstructions) {
    entryText += `<em>${specialInstructions}</em><br>`
  }
  entryText += description

  document.getElementById('description').innerHTML = entryText
}

function updateChoices(choices, requirementsChecker, onClickHandler) {
  const choicesContainer = document.getElementById('choices')
  choicesContainer.innerHTML = ''

  choices.forEach((choice) => {
    if (requirementsChecker(choice.requirements)) {
      const button = createButton(
        choice.text,
        'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
        () => onClickHandler(choice),
      )
      choicesContainer.appendChild(button)
    }
  })
}

function displayError(entryId) {
  console.error(`Entry with ID ${entryId} not found`)
  document.getElementById('description').innerText =
    `Error: Entry with ID ${entryId} not found.`
  document.getElementById('choices').innerHTML = ''
}

export function displayEntry(entryId) {
  if (entryId === 'previousEntry') {
    entryId = getPreviousEntry() || currentState.currentEntry
  }
  const entry = gameData.entries[entryId]
  if (!entry) {
    try {
      displayLocations(entryId)
      return
    } catch {
      displayError(entryId)
      return
    }
  }

  // Update currentEntry in the state
  currentState.currentEntry = entryId

  let descriptionWithTemp =
    (getTempDescription() ? `\n${getTempDescription()} ` : '') +
    entry.description
  setTempDescription('') // Clear the temporary description after using it

  updateDescription(
    entryId,
    entry.title,
    descriptionWithTemp,
    entry.specialInstructions,
  )

  // Display the image associated with the entry
  displayImage(entry.image)

  const choicesContainer = document.getElementById('choices')
  choicesContainer.innerHTML = ''

  if (entryId === '38') {
    const weaponCategories = ['Handguns', 'Rifles', 'SMGs', 'Shotguns', 'Melee']
    weaponCategories.forEach((category) => {
      gameData.weapons[category].forEach((weapon) => {
        if (hasSkill(weapon.skill)) {
          const weaponButton = createButton(
            `Buy ${weapon.name}`,
            'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
            () => {
              addItem(weapon.name)
              displayEntry(getCurrentLocale())
            },
          )
          choicesContainer.appendChild(weaponButton)
        }
      })
    })
  }

  entry.choices.forEach((choice) => {
    if (checkRequirements(choice.requirements)) {
      const button = createButton(
        choice.text,
        'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
        () => {
          if (choice.effects && choice.effects.diceRoll) {
            handleOutcomeBasedEncounter(choice)
          } else if (choice.effects && choice.effects.check) {
            const success = makeSkillCheck(
              choice.effects.check.skill,
              currentState.skills,
              currentState,
              choice.effects.check.difficulty,
            )
            const checkResult = success
              ? choice.effects.check.success
              : choice.effects.check.failure

            // Check if the result is a string (entry ID) or an object (new structured outcome)
            if (choice.effects && choice.effects.diceRoll) {
              handleOutcomeBasedEncounter(choice)
            } else if (typeof checkResult === 'string') {
              displayEntry(checkResult)
            } else if (typeof checkResult === 'object') {
              if (checkResult.modifyHealth) {
                updateHealth(parseInt(checkResult.modifyHealth)) // Ensure you parse the modifyHealth result if it's a string like "2D3"
              }

              if (checkResult.damage) {
                // Using parseAndComputeDamage to calculate damage before updating health
                const damage = parseAndComputeDamage(checkResult.damage)
                updateHealth(-damage) // Negate the damage since it's harmful
              }

              if (checkResult.message) {
                setTempDescription(checkResult.message)
              }

              displayEntry(checkResult.nextEntry)
            }
          } else if (choice.nextEntry.endsWith(' Location')) {
            currentState.currentEntry = choice.nextEntry.replace(
              ' Location',
              '',
            )
            displayLocations(choice.nextEntry.replace(' Location', ''))
          } else {
            makeChoice(choice.nextEntry, choice.effects)
          }
        },
      )
      choicesContainer.appendChild(button)
    }
  })

  if (entry.end) {
    document.getElementById('description').innerHTML +=
      '<br><strong>THE END</strong>'
  }
}

function displayImage(imagePath) {
  const imageContainer = document.getElementById('imageContainer')
  if (imageContainer) {
    if (imagePath) {
      // Create and append the image element if imagePath is provided
      imageContainer.innerHTML = `<img src="${imagePath}" alt="Entry Image" class="max-w-full h-auto rounded-lg shadow-lg">`
      imageContainer.style.display = 'block' // Ensure the container is visible when there is an image
    } else {
      // Clear the container and hide it if no imagePath is provided
      imageContainer.innerHTML = ''
      imageContainer.style.display = 'none' // Hide the container to avoid empty space
    }
  }
}

function createImage(imagePath, className) {
  const image = document.createElement('img')
  image.src = imagePath
  image.alt = 'Entry Image'
  image.className = className // Apply Tailwind CSS classes dynamically
  return image
}

export function displayLocations(locationType) {
  const locations = gameData.locationTables[locationType]
  if (!locations) {
    if (parseInt(locationType, 10)) {
      displayError(locationType)
      return
    } else {
      displayError(locationType + ' Location Table')
      return
    }
  }

  document.getElementById('description').innerHTML =
    `<strong>${locationType} Locations:</strong><br>Select a location from the list below:`

  const choicesContainer = document.getElementById('choices')
  choicesContainer.innerHTML = ''

  Object.keys(locations).forEach((location) => {
    const locationData = locations[location]
    if (isLocationAvailable(locationData.availability)) {
      const button = createButton(
        location,
        'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
        () => {
          displayEntry(locationData.entry)
          currentState.currentEntry = locationData.entry
          updateTime(1) // Ensuring time updates each time a location is chosen
        },
      )
      choicesContainer.appendChild(button)
    }
  })
}

export function isLocationAvailable(availability) {
  const currentDate = getCurrentDate()
  const currentDay = currentDate.toLocaleString('en-US', {
    weekday: 'long',
  })
  const currentHour = currentDate.getHours()

  // Check if the current day is in the daysOfWeek list
  if (
    availability.daysOfWeek &&
    !availability.daysOfWeek.includes(currentDay)
  ) {
    return false
  }

  // Check character-specific availability, if applicable
  if (
    availability.character &&
    availability.character !== currentState.character
  ) {
    return false
  }

  // Check hours of operation
  if (availability.hours && !isWithinHours(currentHour, availability.hours)) {
    return false
  }

  return true
}

function isWithinHours(currentHour, hours) {
  for (let i = 0; i < hours.length; i += 2) {
    if (currentHour >= hours[i] && currentHour < hours[i + 1]) {
      return true
    }
  }
  return false
}

export function makeChoice(nextEntry, effects) {
  const timeChange = effects && effects.time !== undefined ? effects.time : 1
  updateTime(timeChange)

  if (nextEntry !== 'previousEntry') {
    setPreviousEntry(currentState.currentEntry)
  }

  if (effects) {
    if (effects.health !== undefined) {
      updateHealth(effects.health - currentState.health)
    }
    if (effects.sanity !== undefined) {
      updateSanity(effects.sanity - currentState.sanity)
    }
    if (effects.inventory) {
      effects.inventory.forEach((item) => addItem(item))
    }
    if (effects.dayAdvance) {
      const newDate = new Date(getCurrentDate())
      newDate.setDate(newDate.getDate() + 1)
      setCurrentDate(newDate)
      updateTime(0, effects.defaultHour !== undefined ? effects.defaultHour : 6)
    }

    // Handle skill checks that may influence the next entry
    if (effects.check) {
      const success = makeSkillCheck(
        effects.check.skill,
        currentState.skills,
        currentState,
        choice.effects.check.difficulty,
      )
      const checkResult = success
        ? effects.check.success
        : effects.check.failure

      // Special handling for successful dodge that leads to a new entry and a day advance
      if (success && effects.check.success === '187') {
        const newDate = new Date(getCurrentDate())
        newDate.setDate(newDate.getDate() + 1) // Advance the day on successful dodge
        setCurrentDate(newDate)
        updateTime(0, 6) // Optionally set a specific time, e.g., 6 AM
      }

      nextEntry = checkResult // Update nextEntry based on the outcome of the skill check
    }
  }

  currentState.currentEntry = nextEntry
  displayEntry(nextEntry)
}

export function updateHealth(amount) {
  currentState.health += amount
  document.getElementById('health').innerText = `Health: ${currentState.health}`
}

export function updateSanity(amount) {
  currentState.sanity += amount
  document.getElementById('sanity').innerText = `Sanity: ${currentState.sanity}`
}

export function addItem(item) {
  if (!currentState.inventory.includes(item)) {
    currentState.inventory.push(item)
  }
  updateInventory()
}

export function updateInventory() {
  document.getElementById('inventory').innerText =
    `Inventory: ${currentState.inventory.join(', ')}`
}

// Save game state to localStorage
export function saveGame() {
  const saveData = {
    ...currentState,
    currentDate: getCurrentDate().toISOString(), // Save the current date as an ISO string
  }
  saveState('gameState', saveData)
}

// Load game state from localStorage
export function loadGame() {
  const savedState = loadState('gameState')

  if (savedState) {
    setCurrentDate(new Date(savedState.currentDate)) // Set the date from the loaded state

    delete savedState.currentDate // Remove the date from the state object to avoid conflicts
    Object.assign(currentState, savedState)

    displayEntry(currentState.currentEntry)
    updateHealth(0) // Refresh health display
    updateSanity(0) // Refresh sanity display
    updateInventory() // Refresh inventory display
    updateTime(0) // Refresh date display explicitly after setting state
  } else {
    console.log('No saved state found in localStorage.')
  }
}

export function checkRequirements(requirements) {
  const currentDate = getCurrentDate()

  // Define night hours, for example from 21:00 (9 PM) to 5:00 (5 AM)
  const isNightTime = (date) => {
    const hour = date.getHours()
    return hour >= 21 || hour < 5
  }

  if (requirements) {
    if (requirements.dateBefore) {
      const dateBefore = new Date(requirements.dateBefore)
      if (currentDate >= dateBefore) {
        return false
      }
    }
    if (requirements.dateAfter) {
      const dateAfter = new Date(requirements.dateAfter)
      if (currentDate <= dateAfter) {
        return false
      }
    }
    if (requirements.character) {
      if (currentState.character !== requirements.character) {
        return false
      }
    }
    if (requirements.characterNot) {
      if (currentState.character === requirements.characterNot) {
        return false
      }
    }
    if (requirements.currentLocale) {
      if (currentState.currentLocale !== requirements.currentLocale) {
        return false
      }
    }
    if (requirements.fullHealth) {
      if (currentState.health < currentState.maxHealth) {
        return false
      }
    }
    if (requirements.notFullHealth) {
      if (currentState.health >= currentState.maxHealth) {
        return false
      }
    }
    if (requirements.isNight && !isNightTime(currentDate)) {
      return false // It must be night, but it's not
    }
    if (requirements.isNotNight && isNightTime(currentDate)) {
      return false // It must not be night, but it is
    }
  }
  return true
}

export function handleOutcomeBasedEncounter(choice) {
  const roll = rollDice(6) // Simulate a 1D6 roll
  const outcomes = choice.effects.outcomes
  let matchedOutcome = findOutcomeForRoll(roll, outcomes) // Adjust this to handle range keys like "1-5"

  if (matchedOutcome) {
    setTempDescription(matchedOutcome.description || 'Unexpected outcome.')
    if (matchedOutcome.damage) {
      const damageAmount = parseAndComputeDamage(matchedOutcome.damage)
      updateHealth(-damageAmount)
    }
    if (matchedOutcome.nextEntry) {
      displayEntry(matchedOutcome.nextEntry)
    }
  } else {
    console.error('No outcome defined for roll: ' + roll)
    document.getElementById('description').innerText +=
      '\nError: Unexpected dice roll result.'
  }
}

export function findOutcomeForRoll(roll, outcomes) {
  for (let key in outcomes) {
    if (key.includes('-')) {
      const [start, end] = key.split('-').map(Number)
      if (roll >= start && roll <= end) {
        return outcomes[key]
      }
    } else if (parseInt(key) === roll) {
      return outcomes[key]
    }
  }
  return null // If no match found
}

export function parseAndComputeDamage(damageInput, diceRoller = rollDice) {
  if (typeof damageInput === 'number') {
    return damageInput
  } else if (typeof damageInput === 'string') {
    const cleanedInput = damageInput.replace(/\s+/g, '')
    const parts = cleanedInput.split(/([+\-])/)

    let totalDamage = 0
    let currentModifier = '+'

    parts.forEach((part) => {
      if (part === '+' || part === '-') {
        currentModifier = part
      } else {
        const dicePattern = /^(\d+)D(\d+)$/i
        const match = part.match(dicePattern)

        let value = 0
        if (match) {
          const numberOfDice = parseInt(match[1], 10)
          const sidesOfDice = parseInt(match[2], 10)
          for (let i = 0; i < numberOfDice; i++) {
            value += diceRoller(sidesOfDice)
          }
        } else {
          value = parseInt(part, 10)
        }

        if (currentModifier === '+') {
          totalDamage += value
        } else if (currentModifier === '-') {
          totalDamage -= value
        }
      }
    })

    return totalDamage
  }
  console.error('Invalid damage input format: ' + damageInput)
  return 0
}

function findWeaponByName(name) {
  const categories = ['Handguns', 'Rifles', 'SMGs', 'Shotguns', 'Melee']
  for (const category of categories) {
    const weapon = gameData[category].find((weapon) => weapon.name === name)
    if (weapon) return weapon
  }
  return null
}

function hasSkill(skillName) {
  return currentState.skills[skillName] && currentState.skills[skillName] > 0
}
