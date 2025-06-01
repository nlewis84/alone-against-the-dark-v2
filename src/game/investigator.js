import { currentState, gameData, setCurrentState, initializeGame } from './gameState.js'
import { displayEntry, updateHealth, updateSanity, updateInventory, updateTime, updateInterpreterDisplay, showMinimapIfPiecesExist } from './gameActions.js'
import { showSkillAllocationModal } from './gameUI.js'

const investigatorOrder = [
  { name: 'Professor Grunewald', entry: '13' },
  { name: 'Ernest Holt', entry: '36' },
  { name: 'Lydia Lau', entry: '37' },
  { name: 'Devon Wilson', entry: '554' },
]

let currentInvestigatorIndex = 0

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

export function switchToNextInvestigator() {
  currentInvestigatorIndex++
  if (currentInvestigatorIndex < investigatorOrder.length) {
    const nextInvestigator = investigatorOrder[currentInvestigatorIndex]
    const newState = {
      ...gameData.investigators[nextInvestigator.name],
      currentEntry: nextInvestigator.entry,
      previousEntry: currentState.currentEntry,
      character: nextInvestigator.name,
      dailySkillUsage: {},
      combat: { isActive: false },
      visitedEntries: currentState.visitedEntries,
      onShip: false,
      shipJourneyStartDate: null,
      hiredAthens: null,
      scheduledMeetings: [],
      pyramidPieces: [],
      unallocatedPoints: 150, // Initialize unallocated skill points
    }
    setCurrentState(newState)
    displayEntry(newState.currentEntry)
    updateHealth(0)
    updateSanity(0)
    updateInventory()
    updateTime(0)
    updateInterpreterDisplay()
    updateCharacterImage()

    // Show skill allocation modal if there are unallocated points
    if (newState.unallocatedPoints > 0) {
      showSkillAllocationModal(newState.character)
    }
  } else {
    console.log('All investigators are dead. Game over.')
  }
}

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