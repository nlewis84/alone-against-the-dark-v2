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
import { updateCharacterImage } from './investigator.js'
import { showSkillAllocationModal } from './gameUI.js'

export let gameData = {
  investigators: {},
  entries: {},
  locationTables: {},
  weapons: {},
  books: {},
}
export let currentState = null
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
    displayEntry('382') // Ensure the first entry is displayed ... should be 13
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error)
  }
}

export function startGame() {
  currentState = {
    ...gameData.investigators['Professor Grunewald'],
    currentEntry: '13',
    previousEntry: 'START',
    character: 'Professor Grunewald',
    currentLocale: 'Arkham', // Default starting locale ... should be Arkham
    dailySkillUsage: {},
    combat: { isActive: false },
    visitedEntries: new Set(),
    shipJourneyStartDate: null,
    scheduledMeetings: [],
    pyramidPieces: [],
    unallocatedPoints: 150, // Initialize unallocated skill points
  }
  displayEntry(currentState.currentEntry)
  updateHealth(0)
  updateSanity(0)
  updateInventory()
  updateTime(0)
  updateInterpreterDisplay()
  updateCharacterImage()

  if (currentState.unallocatedPoints > 0) {
    showSkillAllocationModal(currentState.character)
  }
}

export function setCurrentState(newState) {
  currentState = newState
}
