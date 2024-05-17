import { getData } from '../utils/storage.js'
import {
  displayEntry,
  updateHealth,
  updateSanity,
  updateInventory,
  updateTime,
} from './gameActions.js'

export let gameData = {
  investigators: {},
  entries: {},
  locationTables: {},
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
    const [investigators, entries, locationTables] = await Promise.all([
      getData('data/investigators.json'),
      getData('data/entries.json'),
      getData('data/locationTables.json'),
    ])
    setGameData('investigators', investigators)
    setGameData('entries', entries)
    setGameData('locationTables', locationTables)
    startGame()
    displayEntry('230_guard_3_combat') // Ensure the first entry is displayed
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error)
  }
}

export function startGame() {
  currentState = {
    currentEntry: '13',
    character: 'Professor Grunewald',
    currentLocale: 'Arkham', // Default starting locale
    ...gameData.investigators['Professor Grunewald'],
  }
  displayEntry(currentState.currentEntry)
  updateHealth(0) // Initialize health display
  updateSanity(0) // Initialize sanity display
  updateInventory() // Initialize inventory display
  updateTime(0) // Initialize date display
}

export function handleInvestigatorDeath() {
  console.log(`${currentState.character} has died.`)
  switchToNextInvestigator()
}

function switchToNextInvestigator() {
  currentInvestigatorIndex++
  if (currentInvestigatorIndex < investigatorOrder.length) {
    const nextInvestigator = investigatorOrder[currentInvestigatorIndex]
    currentState = {
      currentEntry: nextInvestigator.entry,
      character: nextInvestigator.name,
      ...gameData.investigators[nextInvestigator.name],
    }
    displayEntry(currentState.currentEntry)
    updateHealth(0)
    updateSanity(0)
    updateInventory()
    updateTime(0)
  } else {
    console.log('All investigators are dead. Game over.')
  }
}
