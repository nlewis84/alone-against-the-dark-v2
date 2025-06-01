import { initializeGame } from './game/gameState.js'
import {
  saveGame,
  loadGame,
  showMinimapIfPiecesExist,
  highlightCurrentLocationOnMap,
} from './game/gameActions.js'
import { showSkillAllocationModal } from './game/gameUI.js'

document.addEventListener('DOMContentLoaded', () => {
  initializeGame()

  // Show skill allocation modal for the first investigator
  showSkillAllocationModal('Professor Grunewald')

  document.getElementById('saveButton').onclick = saveGame
  document.getElementById('loadButton').onclick = loadGame
  document
    .getElementById('minimap-container')
    .addEventListener('click', function () {
      this.classList.toggle('expanded')

      highlightCurrentLocationOnMap(currentEntryId)
    })

  // Add event listeners for opening and closing the inventory panel
  document.getElementById('inventoryButton').addEventListener('click', () => {
    const inventoryPanel = document.getElementById('inventoryPanel')
    if (inventoryPanel.classList.contains('open')) {
      inventoryPanel.classList.remove('open') // Close if it's already open
    } else {
      inventoryPanel.classList.add('open') // Open if it's closed
    }
  })

  document.getElementById('closeInventory').addEventListener('click', () => {
    document.getElementById('inventoryPanel').classList.remove('open')
  })

  document.addEventListener('DOMContentLoaded', () => {
    // Call this to set initial visibility of the minimap
    showMinimapIfPiecesExist()
  })
})
