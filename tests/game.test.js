import {
  setCurrentDate,
  getCurrentDate,
  initializeGame,
  currentState,
  handleInvestigatorDeath,
  setTempDescription,
} from '../src/game/gameState.js'
import {
  updateTime,
  displayEntry,
  makeChoice,
  updateHealth,
  updateSanity,
  addItem,
  updateInventory,
  saveGame,
  loadGame,
  displayLocations,
  isLocationAvailable,
  checkRequirements,
  handleOutcomeBasedEncounter,
  parseAndComputeDamage,
  findOutcomeForRoll,
} from '../src/game/gameActions.js'
import { rollDice, makeSkillCheck } from '../src/utils/dice.js'
import fs from 'fs'
import path from 'path'

// Load the actual JSON files
const investigatorsData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/investigators.json')),
)
const entriesData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/entries.json')),
)
const locationTablesData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/locationTables.json')),
)

function findChoiceButton(choiceText) {
  return Array.from(document.querySelectorAll('button')).find(
    (button) => button.innerText === choiceText,
  )
}

describe('Game Logic', () => {
  beforeEach(() => {
    setCurrentDate(new Date(1931, 8, 1, 6))

    global.fetch = jest.fn((url) => {
      if (url.includes('investigators.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(investigatorsData),
        })
      }
      if (url.includes('entries.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(entriesData),
        })
      }
      if (url.includes('locationTables.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(locationTablesData),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    document.body.innerHTML = `
      <div id="description"></div>
      <div id="choices"></div>
      <div id="health"></div>
      <div id="sanity"></div>
      <div id="inventory"></div>
      <div id="date"></div>
      <button id="saveButton"></button>
      <button id="loadButton"></button>
    `

    return initializeGame()
  })

  afterEach(() => {
    jest.restoreAllMocks() // Restore any mocks after each test
  })

  test('should update health correctly', () => {
    updateHealth(10)
    expect(currentState.health).toBe(110)
  })

  test('should add item to inventory', () => {
    addItem('Magical Artifact')
    expect(currentState.inventory).toContain('Magical Artifact')
  })

  test('should display correct entry', () => {
    displayEntry('13')
    expect(document.getElementById('description').innerHTML).toContain(
      'Professor Louis Grunewald, this first day of September 1931',
    )

    displayLocations('Arkham')
    expect(document.getElementById('description').innerHTML).toContain(
      'Arkham Locations',
    )

    // Test invalid entry display
    displayEntry('1300')
    expect(document.getElementById('description').innerText).toContain(
      'Error: Entry with ID 1300 not found.',
    )

    // Test invalid location display
    displayLocations('McKinney')
    expect(document.getElementById('description').innerText).toContain(
      'Error: Entry with ID McKinney Location Table not found.',
    )
  })

  test('should make choice and apply effects', () => {
    makeChoice('9', { health: 100, inventory: ['Magical Artifact'] })
    expect(currentState.health).toBe(100)
    expect(currentState.inventory).toContain('Magical Artifact')
  })

  test('should update sanity correctly', () => {
    updateSanity(-10)
    expect(currentState.sanity).toBe(90)
  })

  test('should make skill check', () => {
    currentState.skills = { Climb: 40 }
    const result = makeSkillCheck('Climb', currentState.skills)
    expect([true, false]).toContain(result)
  })

  test('should make a stat check', () => {
    currentState.skills = { DEX: 60 }
    const result = makeSkillCheck('DEX', currentState.skills)
    expect([true, false]).toContain(result)
  })

  test('should roll a dice and return a value between 1 and the specified number of sides', () => {
    const sides = 6
    const roll = rollDice(sides)
    expect(roll).toBeGreaterThanOrEqual(1)
    expect(roll).toBeLessThanOrEqual(sides)
  })

  test('should update the current time correctly', () => {
    const initialDate = getCurrentDate()
    setCurrentDate(new Date(initialDate)) // Use setter to isolate test effect

    const hoursToAdd = 5
    updateTime(hoursToAdd)

    const expectedDate = new Date(initialDate)
    expectedDate.setHours(expectedDate.getHours() + hoursToAdd)

    expect(getCurrentDate()).toEqual(expectedDate)
  })

  test('should update the inventory display correctly', () => {
    addItem('Magical Artifact')
    updateInventory()
    expect(document.getElementById('inventory').innerText).toBe(
      'Inventory: Magical Artifact',
    )
  })

  test('should save the game state to localStorage', () => {
    setCurrentDate(new Date(1931, 8, 1, 12, 0)) // Noon, September 1, 1931
    addItem('Magical Artifact')
    saveGame()

    const savedState = JSON.parse(localStorage.getItem('gameState'))

    // Check each property individually, ignore direct date comparison in object
    expect(savedState.health).toEqual(currentState.health)
    expect(savedState.sanity).toEqual(currentState.sanity)
    expect(savedState.inventory).toEqual(currentState.inventory)
    expect(new Date(savedState.currentDate)).toEqual(getCurrentDate()) // Compare dates as Date objects

    // Optionally, you can check other properties as needed
  })

  test('should load the game state from localStorage, including date and time', () => {
    // Set initial conditions
    setCurrentDate(new Date(1931, 8, 1, 12, 0)) // Noon, September 1, 1931
    addItem('Magical Artifact')

    // Save game state including current date and time
    saveGame()

    // Modify the current state to simulate a change
    setCurrentDate(new Date(1931, 8, 2, 13, 0)) // 1 PM, September 2, 1931
    currentState.health = 50
    currentState.sanity = 50
    currentState.inventory = []

    // Load the saved state
    loadGame()

    // Verify that the state matches the expected values including date and time
    expect(currentState).toMatchObject({
      health: 100,
      sanity: 100,
      inventory: ['Magical Artifact'],
      skills: expect.any(Object),
    })
    expect(getCurrentDate()).toEqual(new Date(1931, 8, 1, 12, 0)) // Check if the date and time are correctly loaded
  })

  test('should switch to the next investigator upon death', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {}) // Mock console.log

    // Initialize game and set the first investigator
    initializeGame()

    // Simulate the death of the first investigator
    handleInvestigatorDeath()

    // Verify that the current investigator is now Ernest Holt starting at entry 36
    expect(currentState.currentEntry).toBe('36')
    expect(currentState.health).toBe(100) // Check other properties as necessary

    // Simulate the death of the second investigator
    handleInvestigatorDeath()

    // Verify that the current investigator is now Lydia Lau starting at entry 37
    expect(currentState.currentEntry).toBe('37')
    expect(currentState.health).toBe(100) // Check other properties as necessary

    // Simulate the death of the third investigator
    handleInvestigatorDeath()

    // Verify that the current investigator is now Devon Wilson starting at entry 554
    expect(currentState.currentEntry).toBe('554')
    expect(currentState.health).toBe(100) // Check other properties as necessary

    // Simulate the death of the fourth investigator
    handleInvestigatorDeath()

    // Verify that the game is over
    expect(console.log).toHaveBeenCalledWith(
      'All investigators are dead. Game over.',
    )
  })

  test('should display Arkham locations', () => {
    setCurrentDate(new Date(1931, 8, 1, 10, 10))
    displayLocations('Arkham')
    const choices = document.getElementById('choices').children
    const availableLocations = Object.keys(locationTablesData['Arkham']).filter(
      (location) =>
        isLocationAvailable(
          locationTablesData['Arkham'][location].availability,
        ),
    )
    expect(choices.length).toBe(availableLocations.length)
  })

  test('should handle conditional choices based on current date', () => {
    setCurrentDate(new Date(1931, 8, 1, 10, 0))
    currentState.character = 'Professor Grunewald'
    displayEntry('102')
    const choices = document.getElementById('choices').children
    expect(choices.length).toBe(1)

    setCurrentDate(new Date(1931, 8, 9, 10, 0))
    currentState.character = 'Zaphod Beeblebrox'
    displayEntry('102')
    const choicesPartTwo = document.getElementById('choices').children
    expect(choicesPartTwo.length).toBe(1)
  })

  test('should handle choices with character requirements', () => {
    setCurrentDate(new Date(1931, 8, 1, 10, 0))
    currentState.character = 'Zaphod Beeblebrox'
    displayEntry('102')
    const choices = document.getElementById('choices').children
    expect(choices.length).toBe(1)

    displayEntry('168')
    const choicesPartTwo = document.getElementById('choices').children
    expect(choicesPartTwo.length).toBe(1)
  })

  test('should advance time based on effects', () => {
    // Set the initial conditions
    setCurrentDate(new Date(1931, 8, 2, 6, 0)) // Sep 2, 1931 at 6:00 AM
    displayEntry('13')

    // Directly invoke the choice's effect as it would be from clicking the button
    makeChoice('102', {})

    // Expected time after making the choice
    const expectedDate = new Date(1931, 8, 2, 7, 0) // Sep 2, 1931 at 7:00 AM

    expect(getCurrentDate()).toEqual(expectedDate)
  })

  test('should only display choices that are available based on the current date and time', () => {
    // Set the date to a time when most locations should be closed (11 PM)
    setCurrentDate(new Date(1931, 8, 1, 23, 0))
    displayLocations('Arkham')
    let choices = document.getElementById('choices').children
    expect(choices.length).toBe(3) // Only 3 locations are always open in Arkham

    // Set the date to a time when some locations should be open (8 AM)
    setCurrentDate(new Date(1931, 8, 1, 8, 0))
    displayLocations('Arkham')
    choices = document.getElementById('choices').children
    expect(choices.length).toBe(8) // 8 locations should be open at this time

    // Set the date to a time when more locations should be open (12 PM)
    setCurrentDate(new Date(1931, 8, 1, 12, 0))
    displayLocations('Arkham')
    choices = document.getElementById('choices').children
    expect(choices.length).toBe(9) // 9 locations should be open at this time
  })

  // Use the setter function in your tests
  test('should display entry with concatenated temporary description and clear it after', () => {
    setTempDescription('Temporary effect occurred.')
    displayEntry('13')
    expect(document.getElementById('description').innerHTML).toContain(
      'Temporary effect occurred. For you, Professor Louis Grunewald',
    )
    setTempDescription('') // Clear after use
    displayEntry('13')
    expect(document.getElementById('description').innerHTML).not.toContain(
      'Temporary effect occurred.',
    )
  })

  test('should handle outcomes based on ranged dice rolls', () => {
    const outcomes = {
      '1-2': {
        description: 'Guard shoots, causing damage.',
        damage: '1D8',
      },
      3: {
        description: 'Guard attempts to grab.',
        nextEntry: '230_combat',
      },
    }

    // Testing different rolls
    expect(findOutcomeForRoll(1, outcomes)).toEqual({
      description: 'Guard shoots, causing damage.',
      damage: '1D8',
    })

    expect(findOutcomeForRoll(2, outcomes)).toEqual({
      description: 'Guard shoots, causing damage.',
      damage: '1D8',
    })

    expect(findOutcomeForRoll(3, outcomes)).toEqual({
      description: 'Guard attempts to grab.',
      nextEntry: '230_combat',
    })

    // Ensure that it returns null if no match is found
    expect(findOutcomeForRoll(4, outcomes)).toBeNull()
  })

  test('should correctly parse and compute complex damage expressions', () => {
    const damageString = '1D6+4'
    const mockDiceRoller = () => 3 // This function will always return 3

    const result = parseAndComputeDamage(damageString, mockDiceRoller)
    expect(result).toBe(7) // 3 (from mockDiceRoller) + 4
  })

  test('should handle different formats of damage input', () => {
    // Test static number input
    expect(parseAndComputeDamage(20)).toBe(20)

    // Test single dice roll
    const mockDiceRollerSingle = () => 5 // Always returns 5
    expect(parseAndComputeDamage('1D8', mockDiceRollerSingle)).toBe(5)

    // Test multiple dice rolls adding up
    const mockDiceRollerMultiple = jest
      .fn()
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(4)
    expect(parseAndComputeDamage('2D6', mockDiceRollerMultiple)).toBe(7) // 3 + 4

    // Test dice roll with addition
    const mockDiceRollerAdd = jest
      .fn()
      .mockReturnValueOnce(6)
      .mockReturnValueOnce(1)
    expect(parseAndComputeDamage('1D6+2', mockDiceRollerAdd)).toBe(8) // 6 + 2

    // Test dice roll with subtraction
    const mockDiceRollerSubtract = jest
      .fn()
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)
    expect(parseAndComputeDamage('1D4-1', mockDiceRollerSubtract)).toBe(1) // 2 - 1
  })

  describe('Health Requirement Checks', () => {
    beforeEach(() => {
      // Setting up a consistent initial health state for testing.
      currentState.health = 50
      currentState.maxHealth = 100 // Assuming max health is 100 for simplicity.
    })

    test('should fail the fullHealth requirement if health is not max', () => {
      const requirements = { fullHealth: true }
      expect(checkRequirements(requirements)).toBe(false)
    })

    test('should pass the fullHealth requirement if health is max', () => {
      currentState.health = currentState.maxHealth // Set health to max
      const requirements = { fullHealth: true }
      expect(checkRequirements(requirements)).toBe(true)
    })

    test('should pass the notFullHealth requirement if health is not max', () => {
      const requirements = { notFullHealth: true }
      expect(checkRequirements(requirements)).toBe(true)
    })

    test('should fail the notFullHealth requirement if health is max', () => {
      currentState.health = currentState.maxHealth // Set health to max
      const requirements = { notFullHealth: true }
      expect(checkRequirements(requirements)).toBe(false)
    })
  })

  describe('Health Recovery Tests', () => {
    test('Health increases correctly based on Luck roll outcomes', () => {
      currentState.health = 90 // Example initial health
      displayEntry('585')
      // select the first button
      const firstButton = document.querySelector('button')
      const choiceButton = findChoiceButton('Make a Luck roll for recovery')
      choiceButton.click() // Simulate clicking the choice

      // Assuming the game logic updates the current entry after the choice
      if (currentState.currentEntry === '585a') {
        // For '585a', health should increase by 2 to 6 points
        expect(currentState.health).toBeGreaterThanOrEqual(92)
        expect(currentState.health).toBeLessThanOrEqual(96)
      } else if (currentState.currentEntry === '585b') {
        // For '585b', health should increase by 1 to 3 points
        expect(currentState.health).toBeGreaterThanOrEqual(91)
        expect(currentState.health).toBeLessThanOrEqual(93)
      }
      // Optionally, verify that the description and other elements are updated
      expect(document.getElementById('description').textContent).toContain(
        'day.',
      )
    })
  })

  test('Navigate to 585_exit if health is full', () => {
    currentState.health = 100
    currentState.maxHealth = 100

    displayEntry('585')
    expect(checkRequirements({ fullHealth: true })).toBe(true)
    displayEntry('585_exit')
    expect(document.getElementById('description').innerHTML).toContain(
      'Where to next?',
    )
  })

  test('Stay another day if health is not full', () => {
    currentState.health = 95
    currentState.maxHealth = 100

    displayEntry('585a') // Assuming 585a allows staying another day
    expect(checkRequirements({ notFullHealth: true })).toBe(true)
    expect(document.getElementById('description').innerHTML).toContain(
      'You feel much better but can still recover more.',
    )
  })
})
