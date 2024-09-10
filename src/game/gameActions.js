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
import { rollDice, makeSkillCheck, updateMarker } from '../utils/dice.js'

function updateCalendarAndTimeDisplay(date, timeString) {
  const clockElement = document.getElementById('clock')
  if (clockElement) {
    clockElement.innerText = `${timeString}`
  }

  const dayElement = document.getElementById('day')
  const calendarHeaderElement = document.getElementById('calendar-header')
  const dayOfWeekElement = document.getElementById('day-of-week') // New element for the day of the week

  if (dayElement) {
    dayElement.innerText = date.getDate()
  }

  if (calendarHeaderElement) {
    calendarHeaderElement.innerText = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`
  }

  if (dayOfWeekElement) {
    dayOfWeekElement.innerText = `${date.toLocaleString('default', { weekday: 'long' })}` // Display the day of the week
  }
}

export function updateTime(hours, setHour = null, timeSuffix = null) {
  const date = getCurrentDate()

  if (setHour !== null) {
    date.setHours(setHour)
  } else {
    date.setHours(date.getHours() + hours)
  }
  setCurrentDate(date)

  let hour = date.getHours()
  let suffix = timeSuffix || (hour >= 12 ? 'PM' : 'AM')
  hour = hour % 12
  hour = hour ? hour : 12 // Convert hour '0' to '12'

  const timeString = `${hour}:00 ${suffix}`
  updateCalendarAndTimeDisplay(date, timeString)
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

let lastDisplayedEntry = null

export function displayEntry(entryId) {
  if (lastDisplayedEntry === '187' && entryId === '10d') {
    console.log('Prevented display of 10d following 187')
    return // Prevent the specific unwanted transition
  }

  if (entryId === 'previousEntry') {
    entryId = getPreviousEntry() || currentState.currentEntry
  }
  const entry = gameData.entries[entryId]

  // Update state and display logic as usual
  lastDisplayedEntry = entryId // Update last displayed entry
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

  handleEntryChoices(entryId, entry)

  if (entry.effects) {
    handleEntryEffects(entry.effects)
  }

  // Track the visited entry
  addVisitedEntry(entryId) // Only called once per entry visit

  if (entry.end) {
    document.getElementById('description').innerHTML +=
      '<br><strong>THE END</strong>'
  }
}

function handleEntryEffects(effects) {
  if (effects.health) {
    if (effects.health.diceRoll) {
      const diceResult = rollDice(effects.health.diceRoll) // Simulate dice roll, ensure you have a function that supports rolling strings like "1D100"
      const threshold = effects.health.threshold
      let outcome = diceResult >= threshold
      // ? rollDice(effects.health.success)
      // : rollDice(effects.health.success)

      // check to see if effects.health.success is an integer and outcome === true, pass it straight to updateHealth
      // check to see if effects.health.failure is an integer and outcome === false, pass it straight to updateHealth
      // in either case, based on the outcome, pass the effects.health.success or effects.health.failure to rollDice and then pass the result to updateHealth
      if (typeof effects.health.success === 'number' && outcome) {
        updateHealth(effects.health.success)
      } else if (typeof effects.health.failure === 'number' && !outcome) {
        updateHealth(effects.health.failure)
      } else {
        const success = rollDice(effects.health.success)
        const failure = rollDice(effects.health.failure)

        updateHealth(outcome ? -success : -failure)
      }
    } else if (typeof effects.health === 'number') {
      updateHealth(effects.health)
    }
  }

  // Handle other effects such as sanity, inventory updates, etc., similarly
}

export function handleEntryChoices(entryId, entry) {
  const choicesContainer = document.getElementById('choices')
  choicesContainer.innerHTML = ''

  // Handle special case for entry 38
  if (entryId === '38') {
    handleSpecialEntry38(choicesContainer)
  } else if (entryId === '54') {
    handleSpecialEntry54(choicesContainer)
  } else if (entryId === '187') {
    setCurrentLocale('Cunard Ship')
    handleSpecialEntry187(choicesContainer)
  }

  entry.choices.forEach((choice) => {
    const hasSkillCheck = choice.effects?.check?.skill

    // Additional check for research topic limit
    const canResearchToday = entryId !== '74' || canResearchTopic(entryId)

    // Variable for dailyLimit, it will either be choice.effect.dailyLimit, or choice.effects.dailyLimit will be null, or choice.effect.dailyLimit will not exist
    // It should either be choice.effects.dailyLimit (number), or 0 for the other two situations.
    const dailyLimit = choice.effects?.dailyLimit || 0

    // Only call canUseSkill if dailyLimit is truthy
    let canUseSkillToday
    if (dailyLimit) {
      canUseSkillToday = hasSkillCheck
        ? canUseSkill(entryId, choice.effects.check.skill)
        : true // Only call canUseSkill if there's a skill to check
    }

    if (
      checkRequirements(choice.requirements) &&
      (canUseSkillToday || dailyLimit === 0) &&
      canResearchToday
    ) {
      const button = createButton(
        choice.text,
        'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
        () => {
          if (entry.combat) {
            startCombat(entryId, entry.combat)
          }

          if (entryId === '74') {
            recordResearchTopicUsage(entryId) // Track research topic usage
          }

          if (choice.effects) {
            const currentDate = getCurrentDate()
            const currentHour = currentDate.getHours()

            if (choice.effects.setDay !== undefined) {
              const targetDay = choice.effects.setDay
              const daysOfWeek = [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
              ]
              const targetDayIndex = daysOfWeek.indexOf(targetDay)
              const currentDayIndex = currentDate.getUTCDay()

              // Calculate days to advance to the next occurrence of the target day
              let daysToAdvance = targetDayIndex - currentDayIndex
              if (daysToAdvance <= 0) {
                daysToAdvance += 7
              }

              currentDate.setUTCDate(currentDate.getUTCDate() + daysToAdvance)
              setCurrentDate(currentDate)
            }

            if (choice.effects.setHour !== undefined) {
              const targetHour = choice.effects.setHour

              // Check if we need to advance the day first
              if (targetHour < currentHour) {
                currentDate.setDate(currentDate.getDate() + 1)
              }

              // Set the hour directly after potentially advancing the day
              updateTime(0, targetHour)
            }

            if (choice.effects.advanceTime !== undefined) {
              updateTime(choice.effects.advanceTime)
            }
          }

          if (choice.effects && choice.effects.diceRoll) {
            handleOutcomeBasedEncounter(choice)
          } else if (choice.effects && choice.effects.check) {
            if (choice.effects.time) {
              updateTime(choice.effects.time)
            }

            const success = makeSkillCheck(
              choice.effects.check.skill,
              currentState.skills,
              currentState,
              choice.effects.check.difficulty,
              choice.effects.check?.tries || null,
            )
            const checkResult = success
              ? choice.effects.check.success
              : choice.effects.check.failure

            if (success || choice.effects.dailyLimit) {
              // Record usage if daily limit applies
              recordSkillUsage(entryId, choice.effects.check.skill)
            }

            if (choice.effects && choice.effects.diceRoll) {
              handleOutcomeBasedEncounter(choice)
            } else if (typeof checkResult === 'string') {
              if (choice.effects.check.skill === 'Dodge' && success) {
                // If the successful check is specifically for "Dodge", handle ending combat
                handleDodgeSuccess(checkResult)
              } else {
                displayEntry(checkResult)
              }
            } else if (typeof checkResult === 'object') {
              handleComplexOutcome(checkResult)
            }
          } else if (
            choice.nextEntry &&
            choice.nextEntry.endsWith(' Location')
          ) {
            currentState.currentEntry = choice.nextEntry.replace(
              ' Location',
              '',
            )
            displayLocations(choice.nextEntry.replace(' Location', ''))
          } else {
            // This is where the effects are applied, including skill changes
            if (choice.effects && choice.effects.skills) {
              Object.keys(choice.effects.skills).forEach((skill) => {
                if (!currentState.skills[skill]) {
                  currentState.skills[skill] = 0
                }

                currentState.skills[skill] += choice.effects.skills[skill]
              })
            }
            makeChoice(choice.nextEntry, choice.effects)
          }
        },
      )
      choicesContainer.appendChild(button)
    }
  })

  // If the player has reached the research limit for entry 74, display a message
  if (entryId === '74' && !canResearchTopic(entryId)) {
    const message = document.createElement('p')
    message.textContent =
      'You have researched two topics today. Please come back tomorrow.'
    choicesContainer.appendChild(message)

    // Optionally add a button to go to another New York location
    const button = createButton(
      'Go to any New York Location',
      'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
      () => displayLocations('New York'),
    )
    choicesContainer.appendChild(button)
  }
}

export function handleComplexOutcome(checkResult) {
  if (checkResult.modifyHealth) {
    updateHealth(parseInt(checkResult.modifyHealth)) // Ensure you parse the modifyHealth result if it's a string like "2D3"
  }

  // Special handling for successful dodge that leads to a new entry and a day advance
  if (checkResult.dayAdvance) {
    const newDate = new Date(getCurrentDate())
    newDate.setDate(newDate.getDate() + 1) // Advance the day on successful dodge
    setCurrentDate(newDate)
    updateTime(0, checkResult.defaultHour) // Optionally set a specific time, e.g., 6 AM
  }

  if (checkResult.advanceTime !== undefined) {
    updateTime(checkResult.advanceTime)
  }

  if (checkResult.damage) {
    // Using parseAndComputeDamage to calculate damage before updating health
    const damage = parseAndComputeDamage(checkResult.damage)
    updateHealth(-damage) // Negate the damage since it's harmful
  }

  if (checkResult.sanity) {
    // Useing parseAndComputeDamage to caluclate sanity damage before updating sanity
    const sanityDamage = parseAndComputeDamage(checkResult.sanity)
    updateSanity(-sanityDamage) // Negate the sanity damage since it's harmful
  }

  if (checkResult.message) {
    setTempDescription(checkResult.message)
  }

  if (checkResult.skills) {
    Object.keys(checkResult.skills).forEach((skill) => {
      if (!currentState.skills[skill]) {
        currentState.skills[skill] = 0
      }

      currentState.skills[skill] += checkResult.skills[skill]
    })
  }

  displayEntry(checkResult.nextEntry)
}

function handleSpecialEntry38(choicesContainer) {
  const weaponCategories = ['Handguns', 'Rifles', 'SMGs', 'Shotguns', 'Melee']

  // Filter the inventory to only include weapons
  const inventoryWeapons = currentState.inventory.filter((item) =>
    weaponCategories.some((category) =>
      gameData.weapons[category].some((weapon) => weapon.name === item.name),
    ),
  )

  weaponCategories.forEach((category) => {
    gameData.weapons[category].forEach((weapon) => {
      // Only display the weapon if the player has the required skill and doesn't already own it
      if (
        hasSkill(weapon.skill) &&
        !inventoryWeapons.some((invWeapon) => invWeapon.name === weapon.name)
      ) {
        const weaponButton = createButton(
          `Buy ${weapon.name}`,
          'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
          () => {
            addItem(weapon)

            // Remove the button immediately after purchase
            weaponButton.remove()

            // Re-display the current locale
            displayEntry(getCurrentLocale())
          },
        )
        choicesContainer.appendChild(weaponButton)
      }
    })
  })
}

function handleSpecialEntry54(choicesContainer) {
  const books = gameData.books.Books // Access the book data from the books.json file

  // Filter the inventory to only include books from entry 54
  const inventoryBooks = currentState.inventory.filter((item) =>
    books.some((book) => book.name === item.name),
  )

  // Track the number of books the player has already bought
  let selectedBooks = inventoryBooks.length

  // If they already have 3 books, don't show any more book options
  if (selectedBooks >= 3) {
    return
  }

  // Loop through the available books and exclude books already in the inventory
  books.forEach((book) => {
    if (!inventoryBooks.includes(book.name)) {
      // Only allow selecting books not in the player's inventory and if selectedBooks < 3
      if (selectedBooks < 3) {
        const bookButton = createButton(
          `Buy ${book.name}`,
          'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
          () => {
            addItem(book)
            selectedBooks++ // Increment selected books count

            // Remove the button immediately after purchase
            bookButton.remove()

            // After 3 selections, disable further purchases
            if (selectedBooks >= 3) {
              // remove all remaining books
              choicesContainer.querySelectorAll('button').forEach((button) => {
                if (button.textContent.startsWith('Buy ')) {
                  button.remove()
                }
              })
            }
          },
        )
        choicesContainer.appendChild(bookButton)
      }
    }
  })
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

  setCurrentLocale(locationType)

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
  if (effects && !effects?.combat) {
    updateTime(timeChange)
  }

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
      newDate.setDate(newDate.getDate() + effects.dayAdvance)
      setCurrentDate(newDate)

      // Optionally, update time to default hour (6 AM) if needed
      updateTime(0, effects.defaultHour !== undefined ? effects.defaultHour : 6)
    }

    // Initiate combat if combat effects are present
    if (effects.combat) {
      if (!currentState.combat || !currentState.combat.isActive) {
        startCombat(nextEntry, effects.combat)
      } else {
        handleCombatRound('fight')
      }
    }

    // Handle skill checks that may influence the next entry
    if (effects.check) {
      const success = makeSkillCheck(
        effects.check.skill,
        currentState.skills,
        currentState,
        effects.check.difficulty,
      )
      const checkResult = success
        ? effects.check.success
        : effects.check.failure

      nextEntry = checkResult // Update nextEntry based on the outcome of the skill check
    }
  }

  currentState.currentEntry = nextEntry
  displayEntry(nextEntry)
}

export function updateHealth(amount) {
  // Only adjust if there is actual damage (negative values)
  if (amount < 0) {
    currentState.health += amount
    if (currentState.health < 0) {
      currentState.health = 0 // Prevent health from going negative
    }
  } else if (amount > 0) {
    // Handle healing but cap it at 100
    currentState.health = Math.min(currentState.health + amount, 100)
  }
  document.getElementById('health').innerText = `Health: ${currentState.health}`

  const message =
    amount > 0
      ? `Health increased by ${amount}`
      : `Health decreased by ${Math.abs(amount)}`
  if (amount !== 0) {
    if (currentState.health === 100) {
      updateMarker('healthMarker', 'Health fully restored!')
    } else {
      updateMarker('healthMarker', message)
    }
  }
}

export function updateSanity(amount) {
  currentState.sanity += amount
  document.getElementById('sanity').innerText = `Sanity: ${currentState.sanity}`

  const message =
    amount > 0
      ? `Sanity increased by ${amount}`
      : `Sanity decreased by ${Math.abs(amount)}`
  if (amount !== 0) {
    updateMarker('sanityMarker', message)
  }
}

export function addItem(item) {
  if (item.type === 'book') {
    currentState.inventory.push(item)
  } else if (!currentState.inventory.includes(item)) {
    currentState.inventory.push(item)
  }
  updateInventory()
}

export function updateInventory() {
  // Group inventory items by type
  const books = currentState.inventory.filter((item) => item.type === 'book')
  const weapons = currentState.inventory.filter(
    (item) => item.type === 'weapon',
  )
  const artifacts = currentState.inventory.filter(
    (item) => item.type === 'artifact',
  )

  // Prepare HTML for inventory display
  let inventoryHtml = ''

  // Add books section if any
  if (books.length > 0) {
    inventoryHtml += `<h3>Books</h3><ul>`
    books.forEach((book) => {
      inventoryHtml += `<li>${book.name}</li>`
    })
    inventoryHtml += `</ul>`
  }

  // Add weapons section if any
  if (weapons.length > 0) {
    inventoryHtml += `<h3>Weapons</h3><ul>`
    weapons.forEach((weapon) => {
      inventoryHtml += `<li>${weapon.name}</li>`
    })
    inventoryHtml += `</ul>`
  }

  // Add artifacts section if any
  if (artifacts.length > 0) {
    inventoryHtml += `<h3>Artifacts</h3><ul>`
    artifacts.forEach((artifact) => {
      inventoryHtml += `<li>${artifact.name}</li>`
    })
    inventoryHtml += `</ul>`
  }

  // Display the sorted inventory
  document.getElementById('inventory').innerHTML = inventoryHtml.trim()
}

// Save game state to localStorage
export function saveGame() {
  const saveData = {
    ...currentState,
    currentDate: getCurrentDate().toISOString(), // Save the current date as an ISO string
    combat: currentState.combat,
    visitedEntries: Array.from(currentState.visitedEntries),
    onShip: currentState.onShip,
    shipJourneyStartDate: currentState.shipJourneyStartDate,
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

    if (currentState.combat && currentState.combat.isActive) {
      updateCombatStatus() // Refresh combat status display on load
    }

    // Convert visitedEntries back to a Set
    currentState.visitedEntries = new Set(savedState.visitedEntries || [])

    // Convert shipJourneyStartDate back to a Date object if it exists
    if (savedState.shipJourneyStartDate) {
      currentState.shipJourneyStartDate = new Date(
        savedState.shipJourneyStartDate,
      )
    }

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
    if (requirements.notCurrentLocale) {
      if (currentState.currentLocale === requirements.notCurrentLocale) {
        return false
      }
    }
    if (requirements.fullHealth) {
      if (currentState.health < 100) {
        return false
      }
    }
    if (requirements.notFullHealth) {
      if (currentState.health === 100) {
        return false
      }
    }
    if (requirements.isNight && !isNightTime(currentDate)) {
      return false // It must be night, but it's not
    }
    if (requirements.isNotNight && isNightTime(currentDate)) {
      return false // It must not be night, but it is
    }

    // Check if the player has visited a specific entry
    if (requirements.hasVisited) {
      if (!currentState.visitedEntries.has(requirements.hasVisited)) {
        return false // The required entry has not been visited
      }
    }

    // Check if the player has not visited a specific entry
    if (requirements.hasNotVisited) {
      if (currentState.visitedEntries.has(requirements.hasNotVisited)) {
        return false // The entry has been visited, but it should not have been
      }
    }

    if (requirements.dayOfJourney) {
      const journeyDay = calculateJourneyDay()
      if (journeyDay !== requirements.dayOfJourney) {
        return false
      }
    }

    // Inclusive scheduled activity check with strict matching for existing activities
    if (requirements.scheduledActivity) {
      const { am, pm, night } = currentState.shipActivities || {}

      // Normalize by trimming extra spaces, converting to lowercase, and replacing curly quotes with straight quotes
      const normalizeString = (str) =>
        str ? str.trim().toLowerCase().replace(/[’']/g, "'") : null

      const normalizedAM = normalizeString(am)
      const normalizedPM = normalizeString(pm)
      const normalizedNight = normalizeString(night)

      const requiredAM = normalizeString(requirements.scheduledActivity.am)
      const requiredPM = normalizeString(requirements.scheduledActivity.pm)
      const requiredNight = normalizeString(
        requirements.scheduledActivity.night,
      )

      // Perform strict matching, but don't return early for undefined values
      const matchesAM = requiredAM === undefined || normalizedAM === requiredAM
      const matchesPM = requiredPM === undefined || normalizedPM === requiredPM
      const matchesNight =
        requiredNight === undefined || normalizedNight === requiredNight

      // If none of the scheduled activities match, return false
      if (!matchesAM && !matchesPM && !matchesNight) {
        return false // Return false if none of the required activities match
      }
    }
  }
  return true
}

export function recordResearchTopicUsage(entryId) {
  const today = getCurrentDate().toISOString().split('T')[0] // Get the current date in 'YYYY-MM-DD' format

  if (!currentState.dailyResearchUsage) {
    currentState.dailyResearchUsage = {}
  }

  if (!currentState.dailyResearchUsage[today]) {
    currentState.dailyResearchUsage[today] = {
      topicsResearched: 0,
    }
  }

  if (!currentState.dailyResearchUsage[today][entryId]) {
    currentState.dailyResearchUsage[today][entryId] = 0
  }

  currentState.dailyResearchUsage[today][entryId] += 1
}

export function canResearchTopic(entryId) {
  const today = getCurrentDate().toISOString().split('T')[0] // Get the current date in 'YYYY-MM-DD' format

  if (
    currentState.dailyResearchUsage &&
    currentState.dailyResearchUsage[today] &&
    currentState.dailyResearchUsage[today][entryId]
  ) {
    return currentState.dailyResearchUsage[today][entryId] < 2
  }

  return true // If no record, assume the player can research
}

export function recordSkillUsage(entryId, skill) {
  const today = getCurrentDate().toISOString().split('T')[0] // Ensure date is formatted correctly

  if (!currentState.dailySkillUsage[entryId]) {
    currentState.dailySkillUsage[entryId] = {}
  }
  currentState.dailySkillUsage[entryId][skill] = today
}

export function canUseSkill(entryId, skill) {
  const today = getCurrentDate().toISOString().split('T')[0]
  if (!currentState.dailySkillUsage[entryId]) {
    currentState.dailySkillUsage[entryId] = {}
  }
  const skillUsedToday = currentState.dailySkillUsage[entryId][skill] === today

  return !skillUsedToday
}

export function handleOutcomeBasedEncounter(choice) {
  const roll = rollDice(6) // Simulate a 1D6 roll
  const outcomes = choice.effects.outcomes
  let matchedOutcome = findOutcomeForRoll(roll, outcomes) // Adjust this to handle range keys like "1-5"

  updateMarker('skillCheckMarker', `You rolled a ${roll}`)
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

function startCombat(entryId, combatDetails) {
  currentState.combat = {
    isActive: true,
    opponent: {
      name: combatDetails.opponent.name,
      attackChance: combatDetails.opponent.attackChance,
      damage: combatDetails.opponent.damage,
      dex: combatDetails.opponent.dex,
      health: combatDetails.opponent.health,
      maxHealth: combatDetails.opponent.maxHealth,
    },
    outcome: {
      win: combatDetails.win,
      lose: combatDetails.lose,
      escape: combatDetails.escape,
    },
  }

  handleCombatRound('start') // Initialize the combat phase
}

function handleCombatRound(actionType) {
  if (!currentState.combat.isActive) {
    console.log('Combat has already ended, exiting round.')
    return
  }

  const { opponent } = currentState.combat

  clearHitMarkers()

  // Player attack
  if (actionType === 'fight') {
    let playerAttackSuccess =
      rollDice(100) <=
      parseInt(currentState.skills['Firearms (Handgun)'] || 50, 10)

    if (playerAttackSuccess) {
      const damageToOpponent = parseAndComputeDamage(opponent.damage)
      opponent.health -= damageToOpponent
      console.log(
        `Player attacked successfully, new opponent health: ${opponent.health}`,
      )

      updateHitMarker(
        document.getElementById('playerHitMarker'),
        `You hit opponent for ${damageToOpponent} damage!`,
      )
    } else {
      console.log('Player attack failed.')
      updateHitMarker(document.getElementById('playerHitMarker'), 'You missed!')
    }
  }

  // Opponent attack (if it's not the start of the combat)
  if (actionType !== 'start') {
    let opponentAttackSuccess =
      rollDice(100) <= parseInt(opponent.attackChance, 10)

    if (opponentAttackSuccess) {
      const damageToPlayer = parseAndComputeDamage(opponent.damage)
      currentState.health -= damageToPlayer
      updateHealthDisplay()
      console.log(
        `Opponent attacked successfully, new player health: ${currentState.health}`,
      )

      updateHitMarker(
        document.getElementById('opponentHitMarker'),
        `Opponent hit you for ${damageToPlayer} damage!`,
      )
    } else {
      console.log('Opponent attack failed.')
      updateHitMarker(
        document.getElementById('opponentHitMarker'),
        'Opponent missed!',
      )
    }
  }

  // Check for end of combat
  if (currentState.health <= 0) {
    console.log('Player defeated, handling loss.')
    endCombat(currentState.combat.outcome.lose)
    return
  } else if (opponent.health <= 0) {
    console.log('Opponent defeated, handling win.')
    endCombat(currentState.combat.outcome.win)
    return
  }

  // Update combat status if still active
  if (currentState.combat.isActive) {
    updateCombatStatus()
  } else {
    console.log('Combat is not active post-round, no UI update required.')
  }
}

function endCombat(entry = null) {
  clearHitMarkers() // Clear the hit markers when combat ends

  console.log(`Ending combat, transition to entry: ${entry}`)
  currentState.combat.isActive = false // Explicitly mark combat as inactive
  updateCombatStatus() // Update any UI or status indicators

  if (entry) {
    console.log(`Displaying victory/defeat entry: ${entry}`)
    setTimeout(() => displayEntry(entry), 100) // Use a slight delay to ensure all combat processes have ceased
  }
}

function updateHealthDisplay() {
  document.getElementById('health').innerText = `Health: ${currentState.health}`
}

function handleDodgeSuccess(entryId) {
  if (currentState.combat.isActive) {
    endCombat(entryId) // End combat if it is active
  } else {
    displayEntry(entryId)
  }
}

function updateCombatStatus() {
  const combatStatusContainer = document.getElementById('combatStatus')

  if (currentState.combat && currentState.combat.isActive) {
    combatStatusContainer.innerHTML = `
      <strong>Opponent: ${currentState.combat.opponent.name}</strong>
      <br>Health: ${currentState.combat.opponent.health}/${currentState.combat.opponent.maxHealth}
    `
    combatStatusContainer.style.display = 'block'
  } else {
    combatStatusContainer.style.display = 'none'
    combatStatusContainer.innerHTML = ''
  }
}

function updateHitMarker(markerElement, message) {
  if (markerElement) {
    markerElement.innerText = message
    markerElement.style.display = 'block' // Show the marker
  }
}

function clearHitMarkers() {
  const playerHitMarker = document.getElementById('playerHitMarker')
  const opponentHitMarker = document.getElementById('opponentHitMarker')

  if (playerHitMarker) {
    playerHitMarker.innerText = ''
    playerHitMarker.style.display = 'none' // Hide the marker
  }

  if (opponentHitMarker) {
    opponentHitMarker.innerText = ''
    opponentHitMarker.style.display = 'none' // Hide the marker
  }
}

function startShipJourney() {
  const currentDate = getCurrentDate() // Retrieve the current in-game date
  currentState.shipJourneyStartDate = currentDate // Store the start date in the game state
  currentState.onShip = true // Mark that the player is on the ship
}

function calculateJourneyDay() {
  const currentDate = getCurrentDate()
  const startDate = currentState.shipJourneyStartDate

  // Reset hours, minutes, and seconds to 0 for both dates to compare only the calendar day
  const startDay = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  )
  const currentDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  )

  // Calculate the number of full days between startDate and currentDate
  const timeDifference = currentDay.getTime() - startDay.getTime()
  const daysPassed = Math.floor(timeDifference / (1000 * 3600 * 24)) // Convert milliseconds to days

  return daysPassed // Returns the day of the journey
}

function getScheduleEntryForDay(journeyDay) {
  const schedule = gameData.entries['187'].schedule

  switch (journeyDay) {
    case 0:
      return schedule.firstSunday
    case 1:
      return schedule.firstMonday
    case 2:
      return schedule.Tuesday
    case 3:
      return schedule.Wednesday
    case 4:
      return schedule.Thursday
    case 5:
      return schedule.Friday
    case 6:
      return schedule.Saturday
    case 7:
      return schedule.secondSunday
    case 8:
      return schedule.secondMonday
    case 9:
      return schedule.secondTuesday
    default:
      return null // For days beyond the schedule
  }
}
function checkIfDisembarked() {
  const journeyDay = calculateJourneyDay()

  if (journeyDay === 8 && currentState.currentLocation === 'Athens') {
    resumeHourlyRecordkeeping('12:00 PM') // Second Monday: Disembarking in Athens
    return true // Indicate disembarkation
  } else if (
    journeyDay === 9 &&
    currentState.currentLocation === 'Alexandria'
  ) {
    resumeHourlyRecordkeeping('1:00 PM') // Second Tuesday: Disembarking in Alexandria
    return true // Indicate disembarkation
  }

  return false // Player is still on the ship
}

function saveSelectedActivities(amActivity, pmActivity, nightActivity) {
  currentState.shipActivities = {
    am: amActivity,
    pm: pmActivity,
    night: nightActivity,
  }
}

function displaySelectedActivities() {
  if (currentState.shipActivities) {
    console.log('Your selected activities for today:')
    console.log('AM:', currentState.shipActivities.am)
    console.log('PM:', currentState.shipActivities.pm)
    console.log('Night:', currentState.shipActivities.night)
  }
}

function handleSpecialEntry187(choicesContainer) {
  const currentDate = getCurrentDate()

  // Only initialize if it's not already set
  if (!currentState.shipJourneyStartDate) {
    currentState.shipJourneyStartDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      0,
      0,
      0, // Ensure the time is set to midnight
    )
    console.log('Ship journey started on:', currentState.shipJourneyStartDate)
  }

  const journeyDay = calculateJourneyDay() // Calculate the current day of the journey
  console.log('Journey day:', journeyDay)
  // Handle disembarkation if we're on specific days
  if (checkIfDisembarked()) {
    return // If disembarked, don't display the activity choices for the ship
  }

  // Show the activities for today
  const shipActivities = {
    Bingo: ['pm', 'night'],
    Bridge: ['pm', 'night'],
    Cinema: ['am', 'pm', 'night'],
    Cocktails: ['pm', 'night'],
    'Deck Tennis': ['am', 'pm'],
    Library: ['am', 'pm', 'night'],
    'Mah Jong': ['am', 'pm', 'night'],
    Nightclub: ['night'],
    'Oil Painting': ['am', 'pm'],
    'Ping Pong': ['am', 'pm', 'night'],
    'Rest on Deck Chairs': ['am', 'pm'],
    'Rest in Room': ['am', 'pm', 'night'],
    Sauna: ['am', 'pm', 'night'],
    'Ship’s Tour': ['pm'],
    Shopping: ['am', 'pm'],
    Shuffleboard: ['am', 'pm'],
    'Stroll Decks': ['am', 'pm', 'night'],
  }

  // Create the UI for activity selection
  const activityContainer = document.createElement('div')
  activityContainer.id = 'activity-selection'

  const instruction = document.createElement('p')
  instruction.textContent =
    'Select one activity for each time slot (AM, PM, Night):'
  activityContainer.appendChild(instruction)

  function createActivityDropdown(timeSlot) {
    const activityRow = document.createElement('div')
    activityRow.classList.add('activity-row')

    const label = document.createElement('label')
    label.textContent = `Select ${timeSlot} activity:`
    activityRow.appendChild(label)

    const select = document.createElement('select')
    select.name = timeSlot

    Object.keys(shipActivities).forEach((activity) => {
      if (shipActivities[activity].includes(timeSlot)) {
        const option = document.createElement('option')
        option.value = activity
        option.textContent = activity
        select.appendChild(option)
      }
    })

    activityRow.appendChild(select)
    activityContainer.appendChild(activityRow)
  }

  ;['am', 'pm', 'night'].forEach(createActivityDropdown)

  // Submit button to save the selected activities and proceed to the day's schedule entry
  const submitButton = createButton(
    'Submit Activities',
    'btn btn-primary',
    () => {
      const amActivity =
        activityContainer.querySelector('select[name="am"]').value
      const pmActivity =
        activityContainer.querySelector('select[name="pm"]').value
      const nightActivity = activityContainer.querySelector(
        'select[name="night"]',
      ).value

      if (amActivity && pmActivity && nightActivity) {
        // Save selected activities
        saveSelectedActivities(amActivity, pmActivity, nightActivity)
        console.log('Activities selected for Cunard Ship:', {
          am: amActivity,
          pm: pmActivity,
          night: nightActivity,
        })

        // Get the schedule entry for the current journey day and display it
        const journeyDay = calculateJourneyDay() // Recalculate the journey day
        const scheduleEntry = getScheduleEntryForDay(journeyDay) // Get the entry for this day
        displayEntry(scheduleEntry) // Display the corresponding entry
      } else {
        console.error('Please select activities for all time slots.')
      }
    },
  )

  submitButton.id = 'submit-button' // Assign the styling ID
  activityContainer.appendChild(submitButton)
  choicesContainer.appendChild(activityContainer)
}

function resumeHourlyRecordkeeping(hour = null) {
  currentState.hourlyTracking = true // Resume hourly tracking

  if (hour) {
    const currentDate = getCurrentDate()
    currentDate.setHours(hour.split(':')[0]) // Set the current hour
    setCurrentDate(currentDate) // Update the game's current date/time
  }

  console.log('Hourly recordkeeping resumed at', hour ? hour : 'current hour')
}

export function addVisitedEntry(entryId) {
  if (!currentState.visitedEntries.has(entryId)) {
    currentState.visitedEntries.add(entryId)
  }
}
