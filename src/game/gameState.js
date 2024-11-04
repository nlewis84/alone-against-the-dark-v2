import { getData } from '../utils/storage.js'
import {
  displayEntry,
  updateHealth,
  updateSanity,
  updateInventory,
  updateTime,
  updateInterpreterDisplay,
  showMinimapIfPiecesExist,
} from './gameActions.js'

export let gameData = {
  investigators: {},
  entries: {},
  locationTables: {},
  weapons: {},
  books: {},
}
export let currentState
let _tempDescription = ''

export function getTempDescription() {
  return _tempDescription
}

export function setTempDescription(value) {
  _tempDescription = value
}

let currentDate = new Date(1931, 8, 1) // Keep it enclosed within the module

export function setCurrentDate(date) {
  currentDate = date
}

export function getCurrentDate() {
  return currentDate
}

// Getter for previousEntry
export function getPreviousEntry() {
  return currentState.previousEntry
}

// Setter for previousEntry
export function setPreviousEntry(entryId) {
  currentState.previousEntry = entryId
}

export function getCurrentLocale() {
  return currentState.currentLocale
}

export function setCurrentLocale(locale) {
  currentState.currentLocale = locale
}

export function setGameData(type, data) {
  gameData[type] = data
}

const investigatorOrder = [
  { name: 'Professor Grunewald', entry: '13' },
  { name: 'Ernest Holt', entry: '36' },
  { name: 'Lydia Lau', entry: '37' },
  { name: 'Devon Wilson', entry: '554' },
]

let currentInvestigatorIndex = 0

export async function initializeGame() {
  try {
    const [investigators, entries, locationTables, weapons, books] =
      await Promise.all([
        getData('data/investigators.json'),
        getData('data/entries.json'),
        getData('data/locationTables.json'),
        getData('data/weapons.json'),
        getData('data/books.json'),
      ])
    setGameData('investigators', investigators)
    setGameData('entries', entries)
    setGameData('locationTables', locationTables)
    setGameData('weapons', weapons)
    setGameData('books', books)
    updateTime(0, 20) // Initialize date display
    startGame()
    // 500/501 is the Dark Sea ship
    displayEntry('13') // Ensure the first entry is displayed ... should be 13
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error)
  }
}

export function startGame() {
  currentState = {
    currentEntry: '13',
    previousEntry: 'START',
    character: 'Professor Grunewald',
    currentLocale: 'Arkham', // Default starting locale ... should be Arkham
    dailySkillUsage: {},
    combat: {
      isActive: false,
    },
    visitedEntries: new Set(),
    shipJourneyStartDate: null,
    scheduledMeetings: [],
    pyramidPieces: [],
    ...gameData.investigators['Professor Grunewald'],
  }
  displayEntry(currentState.currentEntry)
  updateHealth(0) // Initialize health display
  updateSanity(0) // Initialize sanity display
  updateInventory() // Initialize inventory display
  updateTime(0) // Initialize date display
  updateInterpreterDisplay()
  updateCharacterImage()
}

export function handleInvestigatorDeath() {
  console.log(`${currentState.character} has died.`)

  // Check if the current investigator is the last one (Devon Wilson)
  if (currentState.character === 'Devon Wilson') {
    console.log('All investigators have died. Restarting the game.')
    restartGame() // Function to fully reset the game
    // Refresh the page
    location.reload()
  } else {
    switchToNextInvestigator() // Proceed to the next investigator if not the last
    showMinimapIfPiecesExist()
  }
}

function restartGame() {
  currentInvestigatorIndex = 0 // Reset to the first investigator in the order
  initializeGame() // Reinitialize the game, which will reset all states and display the first entry
}

function switchToNextInvestigator() {
  currentInvestigatorIndex++
  if (currentInvestigatorIndex < investigatorOrder.length) {
    const nextInvestigator = investigatorOrder[currentInvestigatorIndex]
    currentState = {
      currentEntry: nextInvestigator.entry,
      previousEntry: currentState.currentEntry,
      character: nextInvestigator.name,
      dailySkillUsage: {},
      combat: {
        isActive: false,
      },
      visitedEntries: currentState.visitedEntries,
      onShip: false,
      shipJourneyStartDate: null,
      hiredAthens: null,
      scheduledMeetings: [],
      pyramidPieces: [],
      ...gameData.investigators[nextInvestigator.name],
    }
    displayEntry(currentState.currentEntry)
    updateHealth(0)
    updateSanity(0)
    updateInventory()
    updateTime(0)
    updateInterpreterDisplay()
    updateCharacterImage()
  } else {
    console.log('All investigators are dead. Game over.')
  }
}

// Function to update the character image in the header
export function updateCharacterImage() {
  const characterImageElement = document.getElementById('characterImage')
  if (!characterImageElement) return

  // Map the current character name to the respective image filename
  const characterImageMap = {
    'Professor Grunewald': 'grunewald.png',
    'Ernest Holt': 'holt.png',
    'Lydia Lau': 'lau.png',
    'Devon Wilson': 'wilson.png',
  }

  const imagePath = `src/assets/images/characters/${characterImageMap[currentState.character]}`

  characterImageElement.src = imagePath
  characterImageElement.alt = `${currentState.character} Image`
}
