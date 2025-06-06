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
  handleInvestigatorDeath,
  updateCharacterImage,
} from './gameState.js'
import { saveState, loadState } from '../utils/storage.js'
import { rollDice, makeSkillCheck, updateMarker } from '../utils/dice.js'
import { showSkillAllocationModal, updateSkillsPanel } from './gameUI.js'

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
  let entryText = `<strong>${entryId}. ${title || ''}</strong>`

  // Replace special characters for better rendering
  description = description
    .replace(/\\n\\n/g, '</p><p>') // Treat double newlines as paragraph breaks
    .replace(/\\n/g, '<br>') // Treat single newlines as line breaks

  // Use regex to find all types of quotes and italicize the content inside quotes
  description = description.replace(/["“”](.*?)["“”]/g, '<em>$1</em>')

  if (specialInstructions) {
    entryText += `<em>${specialInstructions}</em><br>`
  }
  entryText += `<p>${description}</p>` // Wrap description inside <p> tags

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

function checkAntarcticaArrival() {
  // pull currentState.antarcticaArrivalDate if it exists
  if (currentState.antarcticaArrivalDate) {
    const currentDate = new Date(getCurrentDate())
    const arrivalDate = new Date(currentState.antarcticaArrivalDate)

    if (currentDate >= arrivalDate) {
      setTimeout(() => displayEntry('520'), 100)
    }
  }
}

export function displayEntry(entryId) {
  // Hide or show the minimap based on the entryId
  if (entryId === '324') {
    hideMinimap() // Hide the minimap for entry 324
  } else if (entryId === '382') {
    showMinimap() // Show the minimap for entry 382
  }

  updateMinimapProgress(entryId)

  if (lastDisplayedEntry === '187' && entryId === '10d') {
    console.log('Prevented display of 10d following 187')
    return // Prevent the specific unwanted transition
  }

  if (entryId === 'previousEntry') {
    entryId = getPreviousEntry() || currentState.currentEntry
  }
  const entry = gameData.entries[entryId]

  if (entry && entry.checkAntarcticaArrivalDate) {
    checkAntarcticaArrival()
  }

  // Check if the entry has a `highlightOnMap` property
  if (entry && entry.highlightOnMap) {
    highlightCurrentLocationOnMap(entryId)
  }

  if (entry && entry.setAntarcticaArrivalDate) {
    // only set the arrivalDate if it isn't set yet:
    if (!currentState.antarcticaArrivalDate) {
      // arrivalDate should be 29 days after the current date
      const arrivalDate = new Date(getCurrentDate())
      arrivalDate.setDate(arrivalDate.getDate() + 29)

      currentState.antarcticaArrivalDate = arrivalDate
    }
  }

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

  if (entry.image) {
    addImageToInventory(entry.image)
    updateInventory()
  }

  // Update currentEntry in the state
  currentState.currentEntry = entryId

  let descriptionWithTemp =
    (getTempDescription() ? `${getTempDescription()}\n\n` : '') +
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

// Function to hide the minimap
function hideMinimap() {
  const minimapContainer = document.getElementById('minimap-container')
  const gameDiv = document.getElementById('game')

  if (minimapContainer && gameDiv) {
    minimapContainer.style.display = 'none' // Hide the minimap container
    gameDiv.style.marginTop = '6rem' // Reset margin when minimap is hidden
  }
}

// Function to show the minimap
function showMinimap() {
  const minimapContainer = document.getElementById('minimap-container')
  const gameDiv = document.getElementById('game')

  if (minimapContainer && gameDiv) {
    minimapContainer.style.display = 'block' // Show the minimap container
    gameDiv.style.marginTop = '2rem' // Adjust margin when minimap is visible
  }
}

const locationCoordinates = {
  382: { xPercent: 0.67, yPercent: 0.425 },
  399: { xPercent: 0.65, yPercent: 0.44 },
  352: { xPercent: 0.633, yPercent: 0.49 },
  307: { xPercent: 0.63, yPercent: 0.52 },
  395: { xPercent: 0.59, yPercent: 0.55 },
  303: { xPercent: 0.69, yPercent: 0.6 },
  369: { xPercent: 0.71, yPercent: 0.78 },
  373: { xPercent: 0.71, yPercent: 0.78 },
  348: { xPercent: 0.725, yPercent: 0.595 },
  305: { xPercent: 0.625, yPercent: 0.44 },
  '305b': { xPercent: 0.61, yPercent: 0.415 },
  313: { xPercent: 0.58, yPercent: 0.37 },
  371: { xPercent: 0.475, yPercent: 0.38 },
  353: { xPercent: 0.47, yPercent: 0.44 },
  '353b': { xPercent: 0.57, yPercent: 0.45 },
  393: { xPercent: 0.527, yPercent: 0.27 },
  309: { xPercent: 0.505, yPercent: 0.2 },
  308: { xPercent: 0.475, yPercent: 0.274 },
  310: { xPercent: 0.46, yPercent: 0.345 },
  323: { xPercent: 0.46, yPercent: 0.345 },
  394: { xPercent: 0.42, yPercent: 0.39 },
  325: { xPercent: 0.41, yPercent: 0.47 },
  '398b': { xPercent: 0.405, yPercent: 0.535 },
  328: { xPercent: 0.44, yPercent: 0.58 },
  358: { xPercent: 0.535, yPercent: 0.68 },
  367: { xPercent: 0.31, yPercent: 0.636 },
  391: { xPercent: 0.279, yPercent: 0.745 },
  368: { xPercent: 0.24, yPercent: 0.79 },
  446: { xPercent: 0.195, yPercent: 0.85 },
  '446-str2': { xPercent: 0.205, yPercent: 0.885 },
  '446-str3': { xPercent: 0.205, yPercent: 0.9 },
  327: { xPercent: 0.55, yPercent: 0.472 },
  329: { xPercent: 0.565, yPercent: 0.672 },
  333: { xPercent: 0.565, yPercent: 0.672 },
  406: { xPercent: 0.61, yPercent: 0.85 },
  '443b': { xPercent: 0.63, yPercent: 0.815 },
  441: { xPercent: 0.63, yPercent: 0.815 },
  '441_west': { xPercent: 0.595, yPercent: 0.812 },
  417: { xPercent: 0.707, yPercent: 0.812 },
  416: { xPercent: 0.767, yPercent: 0.812 },
  438: { xPercent: 0.712, yPercent: 0.891 },
  435: { xPercent: 0.675, yPercent: 0.891 },
  419: { xPercent: 0.505, yPercent: 0.86 },
  418: { xPercent: 0.433, yPercent: 0.9 },
  224: { xPercent: 0.515, yPercent: 0.785 },
  442: { xPercent: 0.535, yPercent: 0.795 },
  428: { xPercent: 0.69, yPercent: 0.835 },
  437: { xPercent: 0.707, yPercent: 0.85 },
  '430-investigator-defeated': { xPercent: 0.707, yPercent: 0.85 },
  415: { xPercent: 0.425, yPercent: 0.775 },
  423: { xPercent: 0.365, yPercent: 0.774 },
  425: { xPercent: 0.33, yPercent: 0.778 },
  426: { xPercent: 0.27, yPercent: 0.905 },
}

let currentPulseDot = null // Store the current pulsing dot for later updates
let currentEntryId = null // Store the current entry id to use for repositioning

export function highlightCurrentLocationOnMap(entryId) {
  const mapContainer = document.getElementById('minimap-container')

  if (mapContainer) {
    // Store the current entry ID globally
    currentEntryId = entryId

    // Remove existing pulse dots if any
    if (currentPulseDot) {
      currentPulseDot.remove()
    }

    // Retrieve the coordinates from the mapping
    const coords = locationCoordinates[entryId]
    if (!coords) {
      console.warn(`No coordinates found for entry ${entryId}`)
      return
    }

    // Create a new pulsing dot
    const pulseDot = document.createElement('div')
    pulseDot.classList.add('pulsing-location')

    // Set the dot's position using percentage values directly
    pulseDot.style.top = `${coords.yPercent * 100}%`
    pulseDot.style.left = `${coords.xPercent * 100}%`

    // Store the current pulse dot for future reference
    currentPulseDot = pulseDot

    // Append the pulsing dot to the map container
    mapContainer.appendChild(pulseDot)
  } else {
    console.error('Map container not found.')
  }
}

// Function to update the pulsing dot position on screen resize
function updateDotPosition(pulseDot, coords) {
  const mapContainer = document.getElementById('minimap-container')
  const mapRect = mapContainer.getBoundingClientRect()

  // Calculate the dot's position based on the percentage coordinates relative to the current map size
  const top = coords.yPercent * mapRect.height
  const left = coords.xPercent * mapRect.width

  // Apply the calculated positions
  pulseDot.style.top = `${top}px`
  pulseDot.style.left = `${left}px`
}

function handleEntryEffects(effects) {
  if (effects.health) {
    if (effects.health.diceRoll) {
      const diceResult = rollDice(effects.health.diceRoll)
      const threshold = effects.health.threshold
      let outcome = diceResult >= threshold

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

  if (effects.sanity) {
    if (effects.sanity.diceRoll) {
      const diceResult = rollDice(effects.sanity.diceRoll)
      const threshold = effects.sanity.threshold || currentState.sanity
      let outcome = diceResult >= threshold

      if (typeof effects.sanity.success === 'number' && outcome) {
        updateSanity(effects.sanity.success)
      } else if (typeof effects.sanity.failure === 'number' && !outcome) {
        updateSanity(effects.sanity.failure)
      } else {
        const success = rollDice(effects.sanity.success)
        const failure = rollDice(effects.sanity.failure)

        updateSanity(outcome ? -success : -failure)
      }
    } else if (typeof effects.sanity === 'number') {
      updateSanity(effects.sanity)
    }
  }

  if (effects.setDate) {
    const [dateString, timeString] = effects.setDate.split(' ')
    const newDate = new Date(dateString)

    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number)
      newDate.setHours(hours, minutes, 0, 0)
    } else {
      newDate.setHours(8, 0, 0, 0) // Default to 8:00 AM if no time is specified
    }

    setCurrentDate(newDate)
    updateTime(0)
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
  } else if (entryId === '524') {
    handleSpecialEntry524(choicesContainer)
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
            if (choice.effects?.endGame) {
              handleInvestigatorDeath()
              return
            }

            const currentDate = getCurrentDate()

            if (choice.effects.departAtAntarctica) {
              // set currentDate to currentState.antarcticaArrivalDate
              const arrivalDate = new Date(currentState.antarcticaArrivalDate)
              setCurrentDate(arrivalDate)
            }

            if (choice.effects.hiredAthens) {
              currentState.hiredAthens = choice.effects.hiredAthens

              if (choice.effects.hiredAthens === null) {
                currentState.hiredAthens = null
                updateInterpreterDisplay(null)
              } else {
                currentState.hiredAthens = choice.effects.hiredAthens
                updateInterpreterDisplay(choice.effects.hiredAthens)
              }
            }

            if (
              choice.effects.hiredCairo ||
              choice.effects.hiredCairo === null
            ) {
              if (choice.effects.hiredCairo === null) {
                currentState.hiredCairo = null
                updateInterpreterDisplay(null)
              } else {
                currentState.hiredCairo = choice.effects.hiredCairo
                updateInterpreterDisplay(choice.effects.hiredCairo)
              }
            }

            if (choice.effects.setDay !== undefined) {
              const targetDays = Array.isArray(choice.effects.setDay)
                ? choice.effects.setDay
                : [choice.effects.setDay] // Ensure it's an array

              const daysOfWeek = [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
              ]

              const currentDayIndex = currentDate.getUTCDay()
              let daysToAdvance = null

              targetDays.forEach((targetDay) => {
                const targetDayIndex = daysOfWeek.indexOf(targetDay)

                if (targetDayIndex === -1) return // Ignore invalid days

                // Calculate forward difference only
                let daysDifference = targetDayIndex - currentDayIndex
                if (daysDifference < 0) {
                  daysDifference += 7 // Always move forward, never backward
                }

                // Pick the smallest number of days to advance (closest forward target day)
                if (daysToAdvance === null || daysDifference < daysToAdvance) {
                  daysToAdvance = daysDifference
                }
              })

              // Advance to the closest forward target day
              if (daysToAdvance !== null) {
                currentDate.setUTCDate(currentDate.getUTCDate() + daysToAdvance)
                setCurrentDate(currentDate)
              }
            }
          }

          if (choice.effects && choice.effects.diceRoll) {
            if (choice.effects && choice.effects.increment) {
              const counter = choice.effects.increment.counter
              if (counter === 'moderateHotelStays') {
                currentState.moderateHotelStays =
                  (currentState.moderateHotelStays || 0) + 1
              } else if (counter === 'expensiveHotelStays') {
                currentState.expensiveHotelStays =
                  (currentState.expensiveHotelStays || 0) + 1
              }
            }

            // setPreviousEntry(currentState.currentEntry)
            handleOutcomeBasedEncounter(choice)

            if (choice.effects.setHour !== undefined) {
              const newDate = new Date(getCurrentDate())
              const targetHour = choice.effects.setHour
              const currentHour = newDate.getHours()

              // Check if we need to advance the day first
              if (targetHour < currentHour) {
                newDate.setDate(newDate.getDate() + 1)
                setCurrentDate(newDate)
              }

              // Set the hour directly after potentially advancing the day
              updateTime(0, targetHour)
            }
          } else if (choice.effects && choice.effects.check) {
            if (choice.effects.time) {
              updateTime(choice.effects.time)
            }

            setPreviousEntry(currentState.currentEntry)

            const success = makeSkillCheck(
              choice.effects.check.skill,
              currentState.skills,
              currentState,
              choice.effects.check.difficulty,
              choice.effects.check?.tries || null,
              choice.effects.check?.opposedValue || null,
              choice.effects.check?.bonus || 0,
              choice.effects.check?.penaltyDice || 0,
            )

            const checkResult = success
              ? choice.effects.check.success
              : choice.effects.check.failure

            if (success || choice.effects.dailyLimit) {
              // Record usage if daily limit applies
              recordSkillUsage(entryId, choice.effects.check.skill)
            }

            if (choice.effects && choice.effects.increment) {
              const counter = choice.effects.increment.counter

              if (counter === 'moderateHotelStays') {
                currentState.moderateHotelStays =
                  (currentState.moderateHotelStays || 0) + 1
              } else if (counter === 'expensiveHotelStays') {
                currentState.expensiveHotelStays =
                  (currentState.expensiveHotelStays || 0) + 1
              }
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
              if (choice.effects.check.skill === 'Dodge' && success) {
                // If the successful check is specifically for "Dodge", handle ending combat
                handleDodgeSuccess(checkResult)
              } else {
                handleComplexOutcome(checkResult)
              }
            }
          } else if (
            choice.nextEntry &&
            choice.nextEntry.endsWith(' Location')
          ) {
            if (choice.effects) {
              if (choice.effects.setHour !== undefined) {
                const newDate = new Date(getCurrentDate())
                const targetHour = choice.effects.setHour
                const currentHour = newDate.getHours()

                // Check if we need to advance the day first
                if (targetHour < currentHour) {
                  newDate.setDate(newDate.getDate() + 1)
                  setCurrentDate(newDate)
                }

                // Set the hour directly after potentially advancing the day
                updateTime(0, targetHour)
              }

              if (choice.effects.advanceTime !== undefined) {
                updateTime(choice.effects.advanceTime)
              }

              if (choice.effects.increment) {
                const counter = choice.effects.increment.counter
                if (counter === 'moderateHotelStays') {
                  currentState.moderateHotelStays =
                    (currentState.moderateHotelStays || 0) + 1
                } else if (counter === 'expensiveHotelStays') {
                  currentState.expensiveHotelStays =
                    (currentState.expensiveHotelStays || 0) + 1
                }
              }

              if (choice.effects.addItem) {
                addItem(choice.effects.addItem)
              }

              if (choice.effects.removeItem) {
                removeItem(choice.effects.removeItem)
              }

              // Handle scheduling a meeting
              if (choice.effects.scheduleMeeting) {
                console.log(choice.effects.scheduleMeeting)
                if (!currentState.scheduledMeetings) {
                  currentState.scheduledMeetings = []
                }

                // Add the new meeting to the scheduledMeetings array
                currentState.scheduledMeetings.push({
                  location: choice.effects.scheduleMeeting.location,
                  entry: choice.effects.scheduleMeeting.entry,
                  time: choice.effects.scheduleMeeting.time,
                  meetingWith: choice.effects.scheduleMeeting.meetingWith,
                })
              }

              // Remove the scheduled meeting once it's completed
              if (choice.effects.meetingCompleted) {
                // Find the corresponding meeting
                const completedMeeting = currentState.scheduledMeetings.find(
                  (meeting) =>
                    meeting.entry === choice.effects.meetingCompleted.entry,
                )

                if (completedMeeting) {
                  const newDate = new Date(getCurrentDate())
                  const targetHour = completedMeeting.time
                  const currentHour = newDate.getHours()

                  // Check if we need to advance the day first
                  if (targetHour < currentHour) {
                    newDate.setDate(newDate.getDate() + 1)
                    setCurrentDate(newDate)
                  }

                  updateTime(0, targetHour)

                  // Remove the completed meeting
                  currentState.scheduledMeetings =
                    currentState.scheduledMeetings.filter(
                      (meeting) =>
                        meeting.entry !== choice.effects.meetingCompleted.entry,
                    )
                }
              }
            }

            currentState.currentEntry = choice.nextEntry.replace(
              ' Location',
              '',
            )

            // setPreviousEntry(currentState.currentEntry)
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

            if (choice.message) {
              setTempDescription(choice.message)
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

  if (checkResult.dexterity) {
    console.log(currentState)
    currentState.DEX -= parseInt(checkResult.dexterity)
  }

  if (
    checkResult.modifyVariable &&
    checkResult.modifyVariable.name === 'waterSupply'
  ) {
    const operation = checkResult.modifyVariable.operation || 'subtract' // Default operation

    if (operation === 'clear') {
      currentState.waterSupply = undefined

      const waterSupplyContainer = document.getElementById(
        'waterSupply-container',
      )
      waterSupplyContainer.style.display = 'none' // Hide the water supply container
    } else {
      const value = checkResult.modifyVariable.value.diceRoll
        ? rollDice(checkResult.modifyVariable.value.diceRoll)
        : checkResult.modifyVariable.value

      if (operation === 'subtract') {
        currentState.waterSupply = Math.max(0, currentState.waterSupply - value)
      } else if (operation === 'add') {
        currentState.waterSupply += value
      }

      updateWaterSupplyDisplay(currentState.waterSupply) // Update the UI for water supply

      // If water runs out, reduce health
      if (currentState.waterSupply <= 0) {
        updateHealth(-6)
        updateHealthDisplay(currentState.health) // Update the UI for health
      }
    }
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
  const weaponCategories = [
    'Handguns',
    'Rifles',
    'SMGs',
    'Shotguns',
    'Melee',
    'Explosives',
  ]

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

function handleSpecialEntry524(choicesContainer) {
  const weaponCategories = ['Handguns', 'Rifles', 'Shotguns', 'Explosives']

  const selectedWeapons = {
    Handguns: false,
    Rifles: false,
    Shotguns: false,
    Explosives: false,
  }

  // Filter out weapons based on player inventory skills
  const playerInventorySkills = currentState.inventory.map((item) => item.skill)

  const skillToCategoryMap = {
    'Firearms (Shotgun)': 'Shotguns',
    'Firearms (Rifle)': 'Rifles',
    'Firearms (Handgun)': 'Handguns',
    Throw: 'Explosives',
  }

  // Remove weapon categories if the player already has a weapon for the skill
  Object.keys(skillToCategoryMap).forEach((skill) => {
    if (playerInventorySkills.includes(skill)) {
      selectedWeapons[skillToCategoryMap[skill]] = true
    }
  })

  // Filter the inventory to only include weapons
  const inventoryWeapons = currentState.inventory.filter((item) =>
    weaponCategories.some((category) =>
      gameData.weapons[category].some((weapon) => weapon.name === item.name),
    ),
  )

  // Helper function to add a weapon and update the player's inventory
  const addWeapon = (weapon, category) => {
    addItem(weapon) // Add the selected weapon
    selectedWeapons[category] = true // Mark this category as selected
    // Re-display the current entry to filter out items with the same skill
    displayEntry('524')
  }

  // Loop over weapon categories and create buttons for available weapons
  weaponCategories.forEach((category) => {
    // For other categories (Handguns, Rifles, Shotguns)
    gameData.weapons[category].forEach((weapon) => {
      // Only display the weapon if the player has the required skill,
      // doesn't already own it, and hasn't selected a weapon of that type yet
      if (
        hasSkill(weapon.skill) &&
        !selectedWeapons[category] &&
        !inventoryWeapons.some((invWeapon) => invWeapon.name === weapon.name)
      ) {
        const weaponButton = createButton(
          `Take ${weapon.name}`,
          'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mb-2',
          () => {
            addWeapon(weapon, category)
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
    // Handle water supply
    if (effects.setVariable && effects.setVariable.name === 'waterSupply') {
      currentState.waterSupply = effects.setVariable.value.diceRoll
        ? rollDice(effects.setVariable.value.diceRoll)
        : effects.setVariable.value
      updateWaterSupplyDisplay(currentState.waterSupply) // Update the UI for water supply
    }

    if (
      effects.modifyVariable &&
      effects.modifyVariable.name === 'waterSupply'
    ) {
      const operation = effects.modifyVariable.operation || 'subtract' // Default operation

      if (operation === 'clear') {
        currentState.waterSupply = undefined

        const waterSupplyContainer = document.getElementById(
          'waterSupply-container',
        )
        waterSupplyContainer.style.display = 'none' // Hide the water supply container
      } else {
        const value = effects.modifyVariable.value.diceRoll
          ? rollDice(effects.modifyVariable.value.diceRoll)
          : effects.modifyVariable.value

        if (operation === 'subtract') {
          currentState.waterSupply = Math.max(
            0,
            currentState.waterSupply - value,
          )
        } else if (operation === 'add') {
          currentState.waterSupply += value
        }

        updateWaterSupplyDisplay(currentState.waterSupply) // Update the UI for water supply

        // If water runs out, reduce health
        if (currentState.waterSupply <= 0) {
          updateHealth(-6)
          updateHealthDisplay(currentState.health) // Update the UI for health
        }
      }
    }

    if (effects.setLocale) {
      if (currentState.currentLocale !== effects.setLocale) {
        // Clear location-specific data if leaving the current locale
        currentState.hiredAthens = null
        currentState.hiredCairo = null
      }
      setCurrentLocale(effects.setLocale)

      // Switch case for effects.setLocale: Athens, Cairo, updateInterpreterDisplay(currentState.hired*****that locale)
      switch (effects.setLocale) {
        case 'Athens':
          updateInterpreterDisplay(currentState.hiredAthens)
          break
        case 'Cairo':
          updateInterpreterDisplay(currentState.hiredCairo)
          break
        default:
          break
      }
    }

    if (effects.health !== undefined) {
      updateHealth(effects.health)
    }
    if (effects.sanity !== undefined) {
      updateSanity(effects.sanity)
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
    if (effects.setHour !== undefined) {
      const newDate = new Date(getCurrentDate())
      const targetHour = effects.setHour
      const currentHour = newDate.getHours()

      // Check if we need to advance the day first
      if (targetHour < currentHour) {
        newDate.setDate(newDate.getDate() + 1)
        setCurrentDate(newDate)
      }

      // Set the hour directly after potentially advancing the day
      updateTime(0, targetHour)
    }

    if (effects.advanceTime !== undefined) {
      updateTime(effects.advanceTime)
    }

    // Initiate combat if combat effects are present
    if (effects.combat) {
      if (!currentState.combat || !currentState.combat.isActive) {
        startCombat(nextEntry, effects.combat)
      } else {
        handleCombatRound(effects.combat.type || 'fight')
      }
    }

    // Handle skill checks that may influence the next entry
    if (effects.check) {
      const success = makeSkillCheck(
        effects.check.skill,
        currentState.skills,
        currentState,
        effects.check.difficulty,
        effects.check?.tries || null,
        effects.check?.opposedValue || null,
        effects.check?.bonus || 0,
        effects.check?.penaltyDice || 0,
      )
      const checkResult = success
        ? effects.check.success
        : effects.check.failure

      nextEntry = checkResult // Update nextEntry based on the outcome of the skill check
    }

    if (effects.increment) {
      const counter = effects.increment.counter
      if (counter === 'moderateHotelStays') {
        currentState.moderateHotelStays =
          (currentState.moderateHotelStays || 0) + 1
      } else if (counter === 'expensiveHotelStays') {
        currentState.expensiveHotelStays =
          (currentState.expensiveHotelStays || 0) + 1
      }
    }

    if (effects.addItem) {
      addItem(effects.addItem)
    }

    if (effects.removeItem) {
      removeItem(effects.removeItem)
    }

    if (effects.multipleChecks) {
      for (const check of effects.multipleChecks) {
        const success = makeSkillCheck(
          check.skill,
          currentState.skills,
          currentState,
          effects.check?.difficulty || 'normal',
          effects.check?.tries || null,
          effects.check?.opposedValue || null,
          effects.check?.bonus || 0,
          effects.check?.penaltyDice || 0,
        )

        currentState.results = currentState.results || {} // Initialize if not present
        currentState.results[check.resultKey] = success
      }
    }

    // Handle scheduling a meeting
    if (effects.scheduleMeeting) {
      if (!currentState.scheduledMeetings) {
        currentState.scheduledMeetings = []
      }

      // Add the new meeting to the scheduledMeetings array
      currentState.scheduledMeetings.push({
        location: effects.scheduleMeeting.location,
        entry: effects.scheduleMeeting.entry,
        time: effects.scheduleMeeting.time,
        meetingWith: effects.scheduleMeeting.meetingWith,
      })
    }

    // Remove the scheduled meeting once it's completed
    if (effects.meetingCompleted) {
      // Find the corresponding meeting
      const completedMeeting = currentState.scheduledMeetings.find(
        (meeting) => meeting.entry === effects.meetingCompleted.entry,
      )

      if (completedMeeting) {
        const newDate = new Date(getCurrentDate())
        const targetHour = completedMeeting.time
        const currentHour = newDate.getHours()

        // Check if we need to advance the day first
        if (targetHour < currentHour) {
          newDate.setDate(newDate.getDate() + 1)
          setCurrentDate(newDate)
        }

        updateTime(0, targetHour)

        // Remove the completed meeting
        currentState.scheduledMeetings = currentState.scheduledMeetings.filter(
          (meeting) => meeting.entry !== effects.meetingCompleted.entry,
        )
      }
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
    // Handle healing but cap it at the current character's max initial health
    const initialHealth = gameData.investigators[currentState.character].health
    currentState.health = Math.min(currentState.health + amount, initialHealth)
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
  } else if (
    !currentState.inventory.some(
      (invItem) => invItem.name === item.name && invItem.image === item.image,
    )
  ) {
    currentState.inventory.push(item)
  } else if (!currentState.inventory.includes(item)) {
    currentState.inventory.push(item)
  }
  updateInventory()
}

function removeItem(item) {
  const index = currentState.inventory.findIndex(
    (invItem) => invItem.name === item.name && invItem.image === item.image,
  )

  if (index !== -1) {
    currentState.inventory.splice(index, 1)
  }
  updateInventory()
}

export function updateWaterSupplyDisplay(waterSupply) {
  // Show the water supply container
  const waterSupplyContainer = document.getElementById('waterSupply-container')
  waterSupplyContainer.style.display = 'block' // Make it visible

  const waterSupplyDiv = document.getElementById('waterSupply')

  if (waterSupply !== undefined) {
    waterSupplyDiv.innerText = waterSupply // Update the water supply display
  }
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
  const clues = currentState.inventory.filter((item) => item.type === 'clue')

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

  // Add clues section if any
  if (clues.length > 0) {
    inventoryHtml += `<h3>Clues</h3><ul>`
    clues.forEach((clue) => {
      inventoryHtml += `<li class="clue-item" data-image="${clue.image}">${clue.name}</li>`
    })
    inventoryHtml += `</ul>`
  }

  // Display the sorted inventory
  document.getElementById('inventory').innerHTML = inventoryHtml.trim()

  // Add click event listeners to clue items
  document.querySelectorAll('.clue-item').forEach((clueItem) => {
    clueItem.addEventListener('click', () => {
      const imagePath = clueItem.getAttribute('data-image')
      openClueModal(imagePath)
    })
  })
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
    hiredAthens: currentState.hiredAthens,
    hiredCairo: currentState.hiredCairo,
    moderateHotelStays: currentState.moderateHotelStays,
    expensiveHotelStays: currentState.expensiveHotelStays,
    scheduledMeetings: currentState.scheduledMeetings,
    waterSupply: currentState.waterSupply,
    pyramidPieces: currentState.pyramidPieces,
    antarcticaArrivalDate: currentState.antarcticaArrivalDate,
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

    // if the player is in Athens/Cairo, set the interpreter display
    if (currentState.currentLocale === 'Athens') {
      currentState.hiredAthens = savedState.hiredAthens
      updateInterpreterDisplay(currentState.hiredAthens)
    } else if (currentState.currentLocale === 'Cairo') {
      currentState.hiredCairo = savedState.hiredCairo
      updateInterpreterDisplay(currentState.hiredCairo)

      // Load pyramid pieces as an array and reveal all pieces that have been collected
      currentState.pyramidPieces = savedState.pyramidPieces || []
      currentState.pyramidPieces.forEach((piece) => {
        revealTile(`piece-${piece.toLowerCase()}`) // Reveal all previously collected tiles
      })

      // Ensure the minimap is displayed if there are pieces collected
      showMinimapIfPiecesExist()
    }

    currentState.moderateHotelStays = savedState.moderateHotelStays
    currentState.expensiveHotelStays = savedState.expensiveHotelStays

    currentState.scheduledMeetings = savedState.scheduledMeetings || []

    currentState.waterSupply = savedState.waterSupply || 0
    if (currentState.waterSupply > 0) {
      updateWaterSupplyDisplay(currentState.waterSupply)
    }

    // Hide all pieces before revealing collected ones
    hideAllTiles()

    currentState.pyramidPieces = savedState.pyramidPieces || []
    currentState.pyramidPieces.forEach((piece) => {
      revealTile(`piece-${piece.toLowerCase()}`) // Reveal all previously collected tiles
    })

    currentState.antarcticaArrivalDate =
      savedState.antarcticaArrivalDate || null
    displayEntry(currentState.currentEntry)
    updateHealth(0) // Refresh health display
    updateSanity(0) // Refresh sanity display
    updateInventory() // Refresh inventory display
    updateTime(0) // Refresh date display explicitly after setting state

    updateCharacterImage()
    updateSkillsPanel() // <-- Add this line to update the sidebar after loading
  } else {
    console.log('No saved state found in localStorage.')
  }
}

/**
 * Hide all tiles in the pyramid minimap
 */
function hideAllTiles() {
  const minimapTiles = document.querySelectorAll('[id^="piece-"]')
  minimapTiles.forEach((tile) => {
    tile.style.opacity = 0 // Hide the tile
  })
}

export function checkRequirements(requirements) {
  const currentDate = getCurrentDate()

  // Define night hours, for example from 21:00 (9 PM) to 5:00 (5 AM)
  const isNightTime = (date) => {
    const hour = date.getHours()
    return hour >= 21 || hour < 5
  }

  if (requirements) {
    // New logic for checking water supply
    if (requirements.waterSupply !== undefined) {
      if (currentState.waterSupply < requirements.waterSupply) {
        return false // Player does not have enough water
      }
    }

    if (requirements.previousEntry) {
      if (currentState.previousEntry !== requirements.previousEntry) {
        return false
      }
    }

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
      // We need to find the current investigator's initial health in the investigators.json file and see if they are at full health in currentState.health
      // gameData.investigators is an object and the key should equal currentState.character
      const initialHealth =
        gameData.investigators[currentState.character].health

      if (currentState.health >= initialHealth) {
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

    if (requirements.hasSuccess) {
      if (
        !currentState.results ||
        !currentState.results[requirements.hasSuccess]
      ) {
        return false // The required skill check was not successful
      }
    }

    if (requirements.failedAllChecks) {
      const allFailed = requirements.failedAllChecks.every(
        (checkKey) => !currentState.results || !currentState.results[checkKey],
      )
      if (!allFailed) {
        return false // At least one check succeeded, so this requirement is not met
      }
    }

    if (requirements.anySuccess) {
      const anySuccess = requirements.anySuccess.some(
        (checkKey) => currentState.results && currentState.results[checkKey],
      )
      if (!anySuccess) {
        return false // None of the required checks succeeded
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

    // Check for a scheduled meeting
    if (requirements.scheduledMeeting) {
      const meeting = currentState.scheduledMeetings?.find(
        (m) => m.entry === requirements.scheduledMeeting.entry,
      )
      if (!meeting) {
        return false
      }
    }

    if (requirements.companion) {
      // check to see if you are in Athens, or Cairo and check the hiredCity for a value
      if (currentState.currentLocale === 'Athens') {
        if (!currentState.hiredAthens) {
          return false
        }
      } else if (currentState.currentLocale === 'Cairo') {
        if (!currentState.hiredCairo) {
          return false
        }
      }
    }

    if (requirements.language) {
      const languageSkill = `Language (${requirements.language})`
      if (
        !currentState.skills[languageSkill] ||
        currentState.skills[languageSkill] === 0
      ) {
        return false
      }
    }

    if (requirements.inventory) {
      const hasItem = currentState.inventory.some(
        (item) => item.name === requirements.inventory,
      )

      if (!hasItem) {
        return false
      }
    }

    if (requirements.inventoryType) {
      if (!hasInventoryItemType(requirements.inventoryType)) {
        return false
      }
    }

    // Check if the player has the required skill and the minimum value for that skill
    if (requirements.skill) {
      const { name, minValue } = requirements.skill
      if (!currentState.skills[name] || currentState.skills[name] < minValue) {
        return false
      }
    }

    if (requirements.minHotelStays) {
      const { moderateHotelStays, expensiveHotelStays } =
        requirements.minHotelStays

      // Check for minimum moderateHotelStays
      if (moderateHotelStays !== undefined) {
        const playerModerateStays = currentState.moderateHotelStays || 0 // Default to 0 if undefined
        if (playerModerateStays < moderateHotelStays) {
          return false // Player hasn't met the minimum moderate stays requirement
        }
      }

      // Check for minimum expensiveHotelStays
      if (expensiveHotelStays !== undefined) {
        const playerExpensiveStays = currentState.expensiveHotelStays || 0 // Default to 0 if undefined
        if (playerExpensiveStays < expensiveHotelStays) {
          return false // Player hasn't met the minimum expensive stays requirement
        }
      }
    }

    if (requirements.minHotelStays) {
      const { moderateHotelStays, expensiveHotelStays } =
        requirements.minHotelStays

      // Check for minimum moderateHotelStays
      if (moderateHotelStays !== undefined) {
        const playerModerateStays = currentState.moderateHotelStays || 0 // Default to 0 if undefined
        if (playerModerateStays < moderateHotelStays) {
          return false // Player hasn't met the minimum moderate stays requirement
        }
      }

      // Check for minimum expensiveHotelStays
      if (expensiveHotelStays !== undefined) {
        const playerExpensiveStays = currentState.expensiveHotelStays || 0 // Default to 0 if undefined
        if (playerExpensiveStays < expensiveHotelStays) {
          return false // Player hasn't met the minimum expensive stays requirement
        }
      }
    }

    if (requirements.requiredHotelStays) {
      const { moderateHotelStays, expensiveHotelStays } =
        requirements.requiredHotelStays

      // Check for moderateHotelStays requirement
      if (moderateHotelStays !== undefined) {
        const playerModerateStays = currentState.moderateHotelStays || 0 // Default to 0 if undefined
        if (playerModerateStays !== moderateHotelStays) {
          return false // Player hasn't met the exact moderate stays requirement
        }
      }

      // Check for expensiveHotelStays requirement
      if (expensiveHotelStays !== undefined) {
        const playerExpensiveStays = currentState.expensiveHotelStays || 0 // Default to 0 if undefined
        if (playerExpensiveStays !== expensiveHotelStays) {
          return false // Player hasn't met the exact expensive stays requirement
        }
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
  const roll = rollDice(choice.effects.diceRoll) // Simulate a 1D6 roll
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

    if (
      matchedOutcome.effects &&
      matchedOutcome.effects.advanceTime !== undefined
    ) {
      updateTime(matchedOutcome.effects.advanceTime)
    }

    // Handle water supply
    if (
      matchedOutcome.effects &&
      matchedOutcome.effects.setVariable &&
      matchedOutcome.effects.setVariable.name === 'waterSupply'
    ) {
      currentState.waterSupply = matchedOutcome.effects.setVariable.value
        .diceRoll
        ? rollDice(matchedOutcome.effects.setVariable.value.diceRoll)
        : matchedOutcome.effects.setVariable.value
      console.log('set water level to ' + currentState.waterSupply)
      updateWaterSupplyDisplay(currentState.waterSupply) // Update the UI for water supply
    }

    if (
      matchedOutcome.effects &&
      matchedOutcome.effects.modifyVariable &&
      matchedOutcome.effects.modifyVariable.name === 'waterSupply'
    ) {
      const operation =
        matchedOutcome.effects.modifyVariable.operation || 'subtract' // Default operation

      if (operation === 'clear') {
        currentState.waterSupply = undefined

        const waterSupplyContainer = document.getElementById(
          'waterSupply-container',
        )
        waterSupplyContainer.style.display = 'none' // Hide the water supply container
      } else {
        const value = matchedOutcome.effects.modifyVariable.value.diceRoll
          ? rollDice(matchedOutcome.effects.modifyVariable.value.diceRoll)
          : matchedOutcome.effects.modifyVariable.value

        if (operation === 'subtract') {
          currentState.waterSupply = Math.max(
            0,
            currentState.waterSupply - value,
          )
        } else if (operation === 'add') {
          currentState.waterSupply += value
        }

        updateWaterSupplyDisplay(currentState.waterSupply) // Update the UI for water supply

        // If water runs out, reduce health
        if (currentState.waterSupply <= 0) {
          updateHealth(-6)
          updateHealthDisplay(currentState.health) // Update the UI for health
        }
      }
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
  const categories = [
    'Handguns',
    'Rifles',
    'SMGs',
    'Shotguns',
    'Melee',
    'Explosives',
  ]
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
      image: combatDetails.opponent.image,
      attackChance: combatDetails.opponent.attackChance,
      damage: combatDetails.opponent.damage,
      dex: combatDetails.opponent.dex,
      health: combatDetails.opponent.health,
      maxHealth: combatDetails.opponent.maxHealth,
      roundsUntilRetaliation: combatDetails.opponent.roundsUntilRetaliation,
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

  let playerAttackSuccess
  // Player attack
  if (
    actionType === 'fight' ||
    actionType === 'brawl' ||
    actionType === 'handgun'
  ) {
    switch (actionType) {
      case 'fight':
      case 'brawl':
        playerAttackSuccess =
          rollDice(100) <=
          parseInt(currentState.skills['Fighting (Brawl)'] || 50, 10)

        if (playerAttackSuccess) {
          // If the player doesn't have any weapons, they deal an unarmed strike which is 1D3+db.
          // DB is on currentState. it is either "None" or "+1D4"
          // Combine that text appropriately and pass to parseAndComputeDamage
          const unarmedStrike =
            currentState.DB !== 'None' ? `1D3${currentState.DB}` : `1D3`

          const damageToOpponent = parseAndComputeDamage(unarmedStrike)

          if (opponent.health > 0 - damageToOpponent < 0) {
            opponent.health = 0
          } else {
            opponent.health -= damageToOpponent
          }

          console.log(
            `Player attacked successfully, new opponent health: ${opponent.health}`,
          )

          updateHitMarker(
            document.getElementById('playerHitMarker'),
            `You hit opponent for ${damageToOpponent} damage!`,
          )
        } else {
          console.log('Player attack failed.')
          updateHitMarker(
            document.getElementById('playerHitMarker'),
            'You missed!',
          )
        }
        break
      case 'handgun':
        playerAttackSuccess =
          rollDice(100) <=
          parseInt(currentState.skills['Firearms (Handgun)'] || 50, 10)

        if (playerAttackSuccess) {
          // Unarmed strike as a fallback if the player doesn't have a weapon
          const unarmedStrike =
            currentState.DB !== 'None' ? `1D3${currentState.DB}` : `1D3`

          // Check currentState.inventory for a weapon with a skill of Firearms (Handgun), and grab the .damage
          const weapon = currentState.inventory.find(
            (item) => item.skill === 'Firearms (Handgun)',
          )
          const weaponDamage = weapon ? weapon.damage : unarmedStrike

          const damageToOpponent = parseAndComputeDamage(weaponDamage)

          if (opponent.health > 0 - damageToOpponent < 0) {
            opponent.health = 0
          } else {
            opponent.health -= damageToOpponent
          }

          console.log(
            `Player attacked successfully, new opponent health: ${opponent.health}`,
          )

          updateHitMarker(
            document.getElementById('playerHitMarker'),
            `You hit opponent for ${damageToOpponent} damage!`,
          )
        } else {
          console.log('Player attack failed.')
          updateHitMarker(
            document.getElementById('playerHitMarker'),
            'You missed!',
          )
        }
        break

      default:
        console.error('Invalid combat action type: ' + actionType)
    }
  }

  const roundsUntilRetaliation = opponent.roundsUntilRetaliation || 0

  if (roundsUntilRetaliation && roundsUntilRetaliation > 0) {
    opponent.roundsUntilRetaliation--
  } else {
    // Opponent attack (if it's not the start of the combat)
    // Also, check to see if turns until retaliation has reached 0
    if (actionType !== 'start') {
      let opponentAttackSuccess =
        rollDice(100) <= parseInt(opponent.attackChance, 10)

      if (opponentAttackSuccess) {
        const damageToPlayer = parseAndComputeDamage(opponent.damage)

        if (currentState.health - damageToPlayer < 0) {
          currentState.health = 0
        } else {
          currentState.health -= damageToPlayer
        }
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

  if (typeof entry === 'object') {
    handleComplexOutcome(entry)
  } else {
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
    if (typeof entryId === 'object') {
      handleComplexOutcome(entryId)
    } else {
      displayEntry(entryId)
    }
  }
}

function updateCombatStatus() {
  const combatStatusContainer = document.getElementById('combatStatus')

  if (currentState.combat && currentState.combat.isActive) {
    let combatHtml = `
    <p style="margin-top: 0px">
      <strong>Opponent: ${currentState.combat.opponent.name}</strong>
      <br>Health: ${currentState.combat.opponent.health}/${currentState.combat.opponent.maxHealth}
      </p>
    `
    console.log(currentState.combat.opponent.image)
    // Check if an image is provided for the opponent
    if (currentState.combat.opponent.image) {
      combatHtml += `
        <div class="combat-opponent-image">
          <img src="${currentState.combat.opponent.image}" alt="${currentState.combat.opponent.name}" />
        </div>
      `
    }

    // Inject the generated HTML into the container
    combatStatusContainer.innerHTML = combatHtml
    combatStatusContainer.style.display = 'flex'
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
function checkIfDisembarked(choicesContainer) {
  const journeyDay = calculateJourneyDay()

  // Handle specific logic for the 8th day (Monday, arriving at Athens)
  if (journeyDay === 8) {
    const getOffButton = createButton(
      'Get off at the Athens Pier',
      'btn btn-primary',
      () => {
        // Set the hour to Noon (12 PM)
        updateTime(0, 12)
        console.log('Got off at Athens Pier, time set to Noon.')
        displayEntry('173')
      },
    )
    choicesContainer.appendChild(getOffButton)

    const stayOnboardButton = createButton(
      'Stay onboard for Alexandria',
      'btn btn-primary',
      () => {
        // Advance the day and set the hour to 8AM
        updateTime(24)
        console.log('Staying onboard, time advanced to 11 PM.')
        displayEntry('187')
      },
    )
    choicesContainer.appendChild(stayOnboardButton)

    return true // Indicate disembarkation
  }

  // Handle specific logic for the 9th day (Tuesday, arriving at Alexandria)
  if (journeyDay === 9) {
    const alexandriaButton = createButton(
      'This is your stop for Alexandria',
      'btn btn-primary',
      () => {
        // Set the time to 1 PM
        updateTime(0, 13)
        console.log('Disembarked at Alexandria, time set to 1 PM.')
        displayEntry('195')
      },
    )
    choicesContainer.appendChild(alexandriaButton)

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
  if (checkIfDisembarked(choicesContainer)) {
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

export function addVisitedEntry(entryId) {
  if (!currentState.visitedEntries.has(entryId)) {
    currentState.visitedEntries.add(entryId)
  }
}

function formatClueName(imagePath) {
  const fileName = imagePath.split('/').pop().replace('.png', '') // Remove the .png extension
  return fileName
    .replace(/[-_]/g, ' ') // Replace both hyphens and underscores with spaces
    .split(' ') // Split the words into an array
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(' ') // Join them back with spaces
}

function addImageToInventory(imagePath) {
  const isClueOrMap = imagePath.includes('clues') || imagePath.includes('maps')

  if (isClueOrMap) {
    // Ensure the player has a "Clues" category in their inventory
    const clueItem = {
      type: 'clue',
      name: formatClueName(imagePath), // Extract and format the clue name
      image: imagePath,
    }

    // Check if the clue has already been added to the inventory
    if (!currentState.inventory.some((item) => item.image === imagePath)) {
      addItem(clueItem) // Use addItem to add this clue
    }
  }
}

function openClueModal(imagePath) {
  const modal = document.getElementById('clueModal')
  const clueImage = document.getElementById('clueImage')

  clueImage.src = imagePath
  modal.style.display = 'flex' // Ensure it uses flexbox
  setTimeout(() => {
    modal.classList.add('show') // Add the class for the fade-in effect after a slight delay
  }, 10) // Delay to allow the transition to apply
}

const closeModalButton = document.getElementById('closeModal')
if (closeModalButton) {
  closeModalButton.onclick = function () {
    closeClueModal()
  }
}

function closeClueModal() {
  const modal = document.getElementById('clueModal')
  modal.classList.remove('show') // Start the fade-out
  setTimeout(() => {
    modal.style.display = 'none' // Hide the modal after the transition completes
  }, 300) // Match this timeout with the CSS transition duration
}

/**
 * Reveal a specific tile in the minimap
 * @param {string} tileId - The ID of the tile to reveal
 */
export function revealTile(tileId) {
  const tile = document.getElementById(tileId)
  if (tile) {
    tile.style.opacity = 1 // Make the tile visible
  }
}

/**
 * Handle effects for placing a piece on the pyramid
 * @param {string} piece - The ID of the piece to place
 * @param {number} position - The position to place the piece on the pyramid outline
 */
export function placePieceOnPyramid(piece, position) {
  addPyramidPiece(piece)

  // Ensure the minimap is visible if it's not already
  showMinimapIfPiecesExist()

  // Reveal the tile visually by setting its opacity to 1
  revealTile(`piece-${piece.toLowerCase()}`) // Assuming IDs like piece-k for piece "K"
}

/**
 * Show or hide the minimap container based on the presence of pyramid pieces.
 */
export function showMinimapIfPiecesExist() {
  const minimapContainer = document.getElementById('minimap-container')
  const gameDiv = document.getElementById('game')

  if (currentState.pyramidPieces.length > 0 && gameDiv) {
    minimapContainer.style.display = 'block' // Show the minimap container
    gameDiv.style.marginTop = '2rem' // Adjust margin when minimap is visible
  } else {
    minimapContainer.style.display = 'none' // Hide the minimap container
    gameDiv.style.marginTop = '6rem' // Reset margin when minimap is hidden
  }
}

// Example of integrating this logic in updateMinimapProgress or another relevant function
export function updateMinimapProgress(entryId) {
  switch (entryId) {
    case '393':
    case '309':
    case '308':
      placePieceOnPyramid('A', 1)
      break
    case '353':
    case '394':
    case '323':
    case '325':
      placePieceOnPyramid('J', 2)
      break
    case '313':
    case '371':
    case '310':
      placePieceOnPyramid('I', 3)
      break
    case '327':
    case '353b':
    case '382':
    case '305':
    case '352':
    case '399':
      placePieceOnPyramid('K', 4)
      break
    case '367':
      placePieceOnPyramid('C', 5)
      break
    case '328':
    case '398b':
      placePieceOnPyramid('N', 6)
      break
    case '358':
    case '329':
    case '333':
      placePieceOnPyramid('E', 7)
      break
    case '307':
      placePieceOnPyramid('D', 8)
      break
    case '395':
      placePieceOnPyramid('D', 8)
      break
    case '303':
    case '348':
      placePieceOnPyramid('L', 9)
      break
    case '426':
    case '368':
    case '446':
    case '446-str2':
    case '446-str3':
      placePieceOnPyramid('H', 10)
      break
    case '423':
    case '425':
    case '391':
      placePieceOnPyramid('P', 11)
      break
    case '415':
    case '418':
      placePieceOnPyramid('B', 12)
      break
    case '224':
    case '442':
    case '419':
      placePieceOnPyramid('O', 13)
      break
    case '406':
    case '443b':
    case '435':
    case '440':
    case '441':
    case '441_west':
      placePieceOnPyramid('M', 14)
      break
    case '417':
    case '438':
    case '373':
    case '369':
    case '428':
    case '437':
      placePieceOnPyramid('F', 15)
      break
    case '416':
      placePieceOnPyramid('G', 16)
      break

    // Add other cases for other entries and pieces
    default:
      break
  }
}

// Function to add a piece to the pyramid state
export function addPyramidPiece(piece) {
  if (!currentState.pyramidPieces.includes(piece)) {
    currentState.pyramidPieces.push(piece)
  }
}

// Function to check if a piece has been collected
export function hasPyramidPiece(piece) {
  return currentState.pyramidPieces.includes(piece)
}

/**
 * Check if the player has an item of a specific type in their inventory
 * @param {string} itemType - The type of item to check for (e.g., "weapon")
 * @returns {boolean} - True if an item of that type is found, otherwise false
 */
export function hasInventoryItemType(itemType) {
  return currentState.inventory.some((item) => item.type === itemType)
}

export function updateInterpreterDisplay(name) {
  const interpreterDiv = document.getElementById('interpreter')
  if (!interpreterDiv) return
  if (name) {
    interpreterDiv.style.display = 'block' // Show the div if a name is provided
    const nameElem = document.getElementById('interpreterName')
    if (nameElem) nameElem.innerText = name
  } else {
    interpreterDiv.style.display = 'none' // Hide the div if no name is set
  }
}
