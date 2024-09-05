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
  weapons: {},
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
    const [investigators, entries, locationTables, weapons] = await Promise.all(
      [
        getData('data/investigators.json'),
        getData('data/entries.json'),
        getData('data/locationTables.json'),
        getData('data/weapons.json'),
      ],
    )
    setGameData('investigators', investigators)
    setGameData('entries', entries)
    setGameData('locationTables', locationTables)
    setGameData('weapons', weapons)
    startGame()
    displayEntry('10') // Ensure the first entry is displayed ... should be 13
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
      previousEntry: currentState.currentEntry,
      character: nextInvestigator.name,
      dailySkillUsage: {},
      combat: {
        isActive: false,
      },
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
