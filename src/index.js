import { initializeGame } from './game/gameState.js'
import {
  saveGame,
  loadGame,
  showMinimapIfPiecesExist,
} from './game/gameActions.js'

document.addEventListener('DOMContentLoaded', () => {
  initializeGame()

  document.getElementById('saveButton').onclick = saveGame
  document.getElementById('loadButton').onclick = loadGame

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
