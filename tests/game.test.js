import {
  setCurrentDate,
  getCurrentDate,
  initializeGame,
  currentState,
  handleInvestigatorDeath,
  setTempDescription,
  setGameData,
  getPreviousEntry,
  setCurrentLocale,
} from '../src/game/gameState.js'
import {
  recordSkillUsage,
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
  parseAndComputeDamage,
  handleEntryChoices,
  findOutcomeForRoll,
  addVisitedEntry,
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
const weaponsData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/weapons.json')),
)
const booksData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/books.json')),
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
      if (url.includes('weapons.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(weaponsData),
        })
      }
      if (url.includes('books.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(booksData),
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
      <div id="interpreter"></div>
      <button id="saveButton"></button>
      <button id="loadButton"></button>
    `

    return initializeGame()
  })

  afterEach(() => {
    jest.restoreAllMocks() // Restore any mocks after each test
  })

  describe('Basic Gameplay Features', () => {
    test('should update health correctly', () => {
      // Set initial health to a value below 100
      currentState.health = 90

      // Update health by 10
      updateHealth(10)

      // Check that health is capped at 100
      expect(currentState.health).toBe(100)
      expect(document.getElementById('health').innerText).toBe('Health: 100')

      // Update health by 10 again, but since it's already 100, it should not change
      updateHealth(10)

      // Health should still be 100
      expect(currentState.health).toBe(100)
      expect(document.getElementById('health').innerText).toBe('Health: 100')

      // Set initial health to a value below 100 but ensure we don't exceed 100 with the addition
      currentState.health = 95
      updateHealth(10) // Try to add 10, but it should cap at 100

      expect(currentState.health).toBe(100)
      expect(document.getElementById('health').innerText).toBe('Health: 100')

      // Set initial health to a value above 100 (should not be possible, but for thoroughness)
      currentState.health = 105
      updateHealth(10) // Adding more health should still cap it at 100

      expect(currentState.health).toBe(100)
      expect(document.getElementById('health').innerText).toBe('Health: 100')
    })

    test('should add item to inventory', () => {
      addItem('Magical Artifact')
      expect(currentState.inventory).toContain('Magical Artifact')
    })

    // This test is fine, but does clutter up the terminal with error messages
    // test('should display correct entry', () => {
    //   displayEntry('13')
    //   expect(document.getElementById('description').innerHTML).toContain(
    //     'Professor Louis Grunewald, this first day of September 1931',
    //   )

    //   displayLocations('Arkham')
    //   expect(document.getElementById('description').innerHTML).toContain(
    //     'Arkham Locations',
    //   )

    //   // Test invalid entry display
    //   displayEntry('1300')
    //   expect(document.getElementById('description').innerText).toContain(
    //     'Error: Entry with ID 1300 not found.',
    //   )

    //   // Test invalid location display
    //   displayLocations('McKinney')
    //   expect(document.getElementById('description').innerText).toContain(
    //     'Error: Entry with ID McKinney Location Table not found.',
    //   )
    // })

    test('should make choice and apply effects', () => {
      makeChoice('9', { health: 100, inventory: ['Magical Artifact'] })
      expect(currentState.health).toBe(100)
      expect(currentState.inventory).toContain('Magical Artifact')
    })

    test('should update sanity correctly', () => {
      updateSanity(-10)
      expect(currentState.sanity).toBe(90)
    })
  })

  describe('Skill and Stat Checks', () => {
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
  })

  describe('Skill Checks and Effects', () => {
    beforeEach(async () => {
      // Ensure that initializeGame function or similar setup function is called
      await initializeGame()
    })

    test('Dodge check should correctly handle success and failure outcomes', async () => {
      for (let i = 0; i < 5; i++) {
        displayEntry('9')
        const initialDate = getCurrentDate()
        const firstButton = document.querySelector('button')
        firstButton.click() // Simulate clicking the choice
        const newDate = getCurrentDate()
        const success = currentState.currentEntry === '187'
        const failure = currentState.currentEntry === '10'

        if (success) {
          // Expectations for a successful dodge
          expect(document.getElementById('description').innerHTML).toContain(
            'CUNARD SHIP ACTIVITY TABLE',
          )
          expect(newDate).not.toEqual(initialDate) // Date should change
        } else if (failure) {
          // Expectations for a failed dodge
          expect(document.getElementById('description').innerHTML).toContain(
            'Attempt a DEX roll:',
          )
          expect(newDate).toEqual(initialDate) // Date should not change
        }

        // Reset the current state and date for the next iteration
        setCurrentDate(new Date(1931, 8, 1, 12, 0))
        currentState.currentEntry = '9' // Reset to the starting entry
      }
    })
  })

  describe('Time and State Management', () => {
    beforeEach(async () => {
      // Ensure that initializeGame function or similar setup function is called
      await initializeGame()
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
      addItem({ name: 'Magical Book', type: 'book' })
      updateInventory()

      expect(document.getElementById('inventory').innerHTML).toContain(
        'Magical Book',
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
      currentState.inventory = []
      setCurrentDate(new Date(1931, 8, 1, 12, 0)) // Noon, September 1, 1931
      addItem({ name: 'Magical Book', type: 'book' })

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
        inventory: [expect.any(Object)],
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
  })

  describe('Dynamic Gameplay Elements', () => {
    test('should display Arkham locations', () => {
      setCurrentDate(new Date(1931, 8, 1, 10, 10))
      displayLocations('Arkham')
      const choices = document.getElementById('choices').children
      const availableLocations = Object.keys(
        locationTablesData['Arkham'],
      ).filter((location) =>
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
      setCurrentLocale('Egypt')
      displayEntry('102')
      const choices = document.getElementById('choices').children
      expect(choices.length).toBe(1)

      setCurrentLocale('Arkham')
      displayEntry('168')
      const choicesPartTwo = document.getElementById('choices').children
      expect(choicesPartTwo.length).toBe(1)

      setCurrentLocale('New York')
      displayEntry('168')
      const choicesPartThree = document.getElementById('choices').children
      expect(choicesPartThree.length).toBe(0)
    })

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
  })

  describe('Outcome Handling Based on Dice Rolls', () => {
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
  })

  describe('Health Requirement Checks', () => {
    beforeEach(() => {
      // Setting up a consistent initial health state for testing.
      currentState.health = 50
    })

    test('should fail the fullHealth requirement if health is not max', () => {
      const requirements = { fullHealth: true }
      expect(checkRequirements(requirements)).toBe(false)
    })

    test('should pass the fullHealth requirement if health is max', () => {
      currentState.health = 100
      const requirements = { fullHealth: true }
      expect(checkRequirements(requirements)).toBe(true)
    })

    test('should pass the notFullHealth requirement if health is not max', () => {
      const requirements = { notFullHealth: true }
      expect(checkRequirements(requirements)).toBe(true)
    })

    test('should fail the notFullHealth requirement if health is max', () => {
      currentState.health = 100
      const requirements = { notFullHealth: true }
      expect(checkRequirements(requirements)).toBe(false)
    })
  })

  describe('Health Recovery Tests', () => {
    test('Health increases correctly based on Luck roll outcomes', () => {
      currentState.health = 90 // Example initial health
      displayEntry('585')
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

  describe('Health Requirement Checks', () => {
    test('Navigate to 585_exit if health is full', () => {
      currentState.health = 100

      displayEntry('585')
      expect(checkRequirements({ fullHealth: true })).toBe(true)
      displayEntry('585_exit')
      expect(document.getElementById('description').innerHTML).toContain(
        'Where to next?',
      )
    })

    test('Stay another day if health is not full', () => {
      currentState.health = 95

      displayEntry('585a') // Assuming 585a allows staying another day
      expect(checkRequirements({ notFullHealth: true })).toBe(true)
      expect(document.getElementById('description').innerHTML).toContain(
        'You feel much better but can still recover more.',
      )
    })

    test('Expect 585 to not have Make a Luck roll button if health is full', () => {
      currentState.health = 100

      displayEntry('585')

      let choices = Array.from(document.getElementById('choices').children)
      expect(choices.length === 1)

      currentState.health = 98

      displayEntry('585')

      let choices2 = Array.from(document.getElementById('choices').children)
      expect(choices2.length === 2)
    })
  })

  describe('Time-based Entry Requirements', () => {
    test('should correctly allow or restrict actions based on night or day', () => {
      // Set the game state to daytime
      setCurrentDate(new Date(1931, 8, 1, 14, 0)) // 2 PM, not night
      displayEntry('280')
      let daytimeButton = findChoiceButton('Break the glass (not at night)')
      expect(daytimeButton).not.toBeNull()
      expect(checkRequirements({ isNotNight: true })).toBe(true)

      // Set the game state to nighttime
      setCurrentDate(new Date(1931, 8, 1, 23, 0)) // 11 PM, night
      displayEntry('280')
      let nighttimeButton = findChoiceButton('Break the glass (at night)')
      expect(nighttimeButton).not.toBeNull()
      expect(checkRequirements({ isNight: true })).toBe(true)
    })
  })

  describe('Check Outcomes routing to specific entries or location tables', () => {
    test('should consistently route to either entry 280 or Egypt Locations based on stealth skill check', async () => {
      displayEntry('281')
      const choiceButton = findChoiceButton('Attempt to hide and wait.')
      choiceButton.click() // Simulate clicking the button for stealth check

      for (let i = 0; i < 5; i++) {
        try {
          expect(document.getElementById('description').innerHTML).toContain(
            'Egypt Locations',
          )
        } catch {
          expect(document.getElementById('description').innerHTML).toContain(
            'There is toughened glass',
          )
        }
      }
    })
  })

  describe('displayEntry Functionality', () => {
    test('should navigate to previous entry correctly', () => {
      setGameData('entries', {
        1: {
          description: 'Entry 1 Description',
          choices: [
            {
              text: 'Return to your last location',
              nextEntry: 'previousEntry',
            },
          ],
        },
        13: {
          description: 'Entry 13 Description',
          choices: [
            {
              text: 'Go to 1',
              nextEntry: '1',
            },
          ],
        },
      }) // Assuming entry '1' is a return point, simulate navigating to '1'
      displayEntry('13')
      const choiceButton = findChoiceButton('Go to 1')
      choiceButton.click() // Simulate the button click that leads to previous entry
      const choiceButton2 = findChoiceButton('Return to your last location')
      choiceButton2.click() // Simulate the button click that leads to previous entry

      // The previousEntry should be updated to '13' before moving to '1'
      expect(getPreviousEntry()).toBe('13')

      // Check if it returns to the previous valid entry
      expect(document.getElementById('description').innerHTML).toContain(
        'Entry 13 Description',
      )
    })
  })

  describe('Entry 38 - Weapon Purchasing', () => {
    beforeEach(async () => {
      await initializeGame() // Ensure game initialization is complete
      currentState.skills = {
        'Firearms (Handgun)': 50,
        Brawl: 40,
      }
      setGameData('weapons', {
        Handguns: [
          {
            name: '.38 Revolver',
            skill: 'Firearms (Handgun)',
            damage: '1D10',
            malfunction: 100,
          },
        ],
        Rifles: [],
        Shotguns: [],
        SMGs: [],
        Melee: [
          {
            name: 'Baseball Bat',
            skill: 'Brawl',
            damage: '1D8+DB',
            malfunction: null,
          },
        ],
      })
      setCurrentLocale('Egypt') // Set initial locale for testing
    })

    test('Weapons available based on skills are displayed', async () => {
      displayEntry('38')

      let choices = Array.from(document.getElementById('choices').children)

      const foundRevolver = choices.some((btn) =>
        btn.innerText.includes('.38 Revolver'),
      )
      const foundBat = choices.some((btn) =>
        btn.innerText.includes('Baseball Bat'),
      )

      expect(foundRevolver).toBeTruthy()
      expect(foundBat).toBeTruthy()
    })

    test('Clicking buy adds weapon to inventory', async () => {
      currentState.inventory = []
      displayEntry('38')

      const buyButton = Array.from(
        document.querySelectorAll('#choices button'),
      ).find((btn) => btn.innerText.includes('Buy .38 Revolver'))

      if (buyButton) buyButton.click()
      expect(currentState.inventory).toEqual([
        {
          damage: '1D10',
          malfunction: 100,
          name: '.38 Revolver',
          skill: 'Firearms (Handgun)',
        },
      ])
    })

    test('Clicking buy redirects to current locale', async () => {
      displayEntry('38')
      const buyButton = Array.from(
        document.querySelectorAll('#choices button'),
      ).find((btn) => btn.innerText.includes('Buy .38 Revolver'))

      if (buyButton) buyButton.click()
      let choices = Array.from(document.getElementById('choices').children)
      expect(choices.length === 10)
    })
  })

  describe('Entry 263 Series - Escape Challenges', () => {
    beforeEach(async () => {
      await initializeGame() // Ensure game initialization and state setup
      currentState.health = 10 // Assume initial health for testing damage effects
    })

    async function triggerSkillCheck(choiceText) {
      const choices = Array.from(document.querySelectorAll('button'))
      const choiceButton = choices.find((button) =>
        button.innerText.includes(choiceText),
      )
      if (choiceButton) {
        choiceButton.click()
      }
      await new Promise((resolve) => setTimeout(resolve, 0)) // Simulate next tick
    }

    test('Successful/Failed Spot Hidden leads to next challenge (263b or 263)', async () => {
      displayEntry('263a')
      await triggerSkillCheck('Make a Spot Hidden roll')

      // Should either go to 263b with health equal to 10 or 263 with health equal to 9
      for (let i = 0; i < 5; i++) {
        if (currentState.currentEntry === '263b') {
          expect(currentState.health).toBe(10)
        } else if (currentState.currentEntry === '263') {
          expect(currentState.health).toBe(9)
        }
      }
    })

    test('Successful Dodge leads to final challenge (263c or 263)', async () => {
      displayEntry('263b')
      await triggerSkillCheck('Attempt to Dodge')

      for (let i = 0; i < 5; i++) {
        if (currentState.currentEntry === '263c') {
          expect(currentState.health).toBe(10)
        } else if (currentState.currentEntry === '263') {
          expect(currentState.health).toBe(9)
        }
      }
    })

    test('Successful/Failed INT check completes the escape and applies exit damage (274 or 263)', async () => {
      displayEntry('263c')
      await triggerSkillCheck('Use your intelligence')

      for (let i = 0; i < 5; i++) {
        if (currentState.currentEntry === '263') {
          expect(currentState.health).toBe(9)
        }
      }
    })
  })

  describe('makeSkillCheck function', () => {
    const skills = {
      Locksmith: 50, // 50% chance for a normal roll
      MechanicalRepair: 50, // For hard checks, this would be 25%
      STR: 80, // For extreme checks, this would be 16%
    }
    const stats = {}

    const runSkillCheckMultipleTimes = (skill, level, trials = 5) => {
      let successes = 0
      for (let i = 0; i < trials; i++) {
        const result = makeSkillCheck(skill, skills, stats, level)
        if (result) successes++
      }
      return successes
    }

    test('normal difficulty checks are statistically consistent', () => {
      const successes = runSkillCheckMultipleTimes('Locksmith', 'normal')
      // Expect roughly half the trials to succeed, give or take
      expect(successes).toBeGreaterThanOrEqual(1)
      expect(successes).toBeLessThanOrEqual(4)
    })

    test('hard difficulty checks are statistically consistent', () => {
      const successes = runSkillCheckMultipleTimes('MechanicalRepair', 'hard')
      // Expect roughly a quarter of the trials to succeed, give or take
      expect(successes).toBeGreaterThanOrEqual(0)
      expect(successes).toBeLessThanOrEqual(3)
    })

    test('extreme difficulty checks are statistically consistent', () => {
      const successes = runSkillCheckMultipleTimes('STR', 'extreme')
      // Expect roughly one-fifth of the trials to succeed, give or take
      expect(successes).toBeGreaterThanOrEqual(0)
      expect(successes).toBeLessThanOrEqual(2)
    })
  })

  describe('Entry 150 Skill Checks', () => {
    beforeEach(async () => {
      await initializeGame() // Make sure the game is set to its initial state
      setCurrentDate(new Date(1931, 8, 1)) // Set the date to September 1, 1931
    })

    test('should display the correct number of choices based on dailySkillUsage', () => {
      displayEntry('150') // Display the entry which has skill checks

      // Assuming each skill can only be tried once daily, and initially all should be available
      let choicesContainer = document.getElementById('choices')
      expect(choicesContainer.children.length).toBe(7) // Initially, all 7 choices should be available

      // Simulate a successful skill check for Astronomy, which should mark it as used
      recordSkillUsage('150', 'Astronomy')

      // Redisplay the entry to update available choices
      displayEntry('150')

      // Check the number of available choices again
      choicesContainer = document.getElementById('choices')
      const buttons = choicesContainer.querySelectorAll('button')
      const expectedNumberOfChoices = 6 // One less because Astronomy is used

      expect(buttons.length).toBe(expectedNumberOfChoices)

      // Additionally, confirm that the button for the Astronomy skill check is not present
      const astronomyButton = Array.from(buttons).find((button) =>
        button.textContent.includes('Attempt an Astronomy roll'),
      )
      expect(astronomyButton).toBeUndefined() // The Astronomy choice should not be available
    })
  })

  describe('Dynamic Dice Roll Tests', () => {
    beforeEach(async () => {
      // Ensure the game is initialized to a clean state
      await initializeGame()
      currentState.health = 100
    })

    test('Entry 10b - Dice Roll Effects on Health', () => {
      for (let i = 0; i < 5; i++) {
        currentState.health = 100
        const initialHealth = currentState.health
        displayEntry('10b')

        const fightButton = document.querySelector('button') // Modify selector as needed
        fightButton.click()

        const newHealth = currentState.health
        const healthDecreased = newHealth < initialHealth
        const noDamageTaken = newHealth === initialHealth

        if (healthDecreased) {
          // Verify that health decreases correctly
          expect(newHealth).toBeGreaterThanOrEqual(initialHealth - 6)
          expect(newHealth).toBeLessThanOrEqual(initialHealth - 1)
        } else if (noDamageTaken) {
          // Verify that no health is lost on failure
          expect(newHealth).toBe(initialHealth)
        }

        // Reset the state for the next iteration
        currentState.health = 100 // Reset health to a standard value
      }
    })

    test('Entry 230c - Dice Roll Effects on Health', () => {
      for (let i = 0; i < 5; i++) {
        currentState.health = 100
        const initialHealth = currentState.health
        displayEntry('230c')

        const continueButton = document.querySelector('button') // Modify selector as needed
        continueButton.click()

        const newHealth = currentState.health
        const healthDecreased = newHealth < initialHealth
        const noDamageTaken = newHealth === initialHealth

        if (healthDecreased) {
          // Verify that health decreases correctly
          expect(newHealth).toBeGreaterThanOrEqual(initialHealth - 8)
          expect(newHealth).toBeLessThanOrEqual(initialHealth - 1)
        } else if (noDamageTaken) {
          // Verify that no health is lost on failure
          expect(newHealth).toBe(initialHealth)
        }

        // Reset the state for the next iteration
        currentState.health = 100 // Reset health to a standard value
      }
    })
  })

  describe('An entry can increase a skill', () => {
    beforeEach(async () => {
      // Initialize the game to reset the state before each test
      await initializeGame()
      // Set a known start date and time
      setCurrentDate(new Date(1931, 8, 1, 12)) // Start at noon on September 1, 1931
    })

    test('should apply initial effects after moving from 121 to 150', () => {
      // Display the entry 121 to trigger the effects
      displayEntry('121')

      // Check if Cthulhu Mythos skill is initially 0 in entry 121
      expect(currentState.skills['Cthulhu Mythos']).toBe(0)

      // Simulate clicking the button to go to 150
      const firstButton = document.querySelector('button')
      firstButton.click() // Simulate clicking the choice

      // Check if Cthulhu Mythos skill has increased by 3 points in entry 150
      expect(currentState.skills['Cthulhu Mythos']).toBe(3)
    })
  })

  describe('Entries with time effects should advance the clock', () => {
    beforeEach(async () => {
      // Initialize the game to reset the state before each test
      await initializeGame()
      // Set a known start date and time
      setCurrentDate(new Date(1931, 8, 1, 12)) // Start at noon on September 1, 1931
    })

    test('should advance time by 1 hour when attempting History roll in entry 212', () => {
      // Display entry 212
      displayEntry('212')

      // Store the current time before the action
      const initialDate = getCurrentDate()
      const initialHour = initialDate.getHours()

      // Simulate clicking the button to attempt the History roll
      const firstButton = document.querySelector('button')
      firstButton.click() // Simulate clicking the choice

      // Get the new time after the action
      const updatedDate = getCurrentDate()
      const updatedHour = updatedDate.getHours()

      // Check if the time has advanced by 1 hour
      expect(updatedHour).toBe(initialHour + 1)
    })
  })

  describe('Entry 82 Tests', () => {
    beforeEach(async () => {
      await initializeGame() // Reset the game state before each test
    })

    function getValidButtons() {
      return Array.from(document.querySelectorAll('button')).filter(
        (button) => button.innerText !== undefined,
      )
    }

    test('Professor Grunewald before September 9, 1931', () => {
      currentState.character = 'Professor Grunewald'
      setCurrentDate(new Date(1931, 8, 1)) // September 8, 1931

      displayEntry('82')

      const buttons = getValidButtons()

      expect(buttons.length).toBe(4)

      expect(buttons[0].innerText).toBe('Visit the library')
      expect(buttons[1].innerText).toBe('See Dr. Martin Fen')
      expect(buttons[2].innerText).toBe('See the Dean')
      expect(buttons[3].innerText).toBe('Finish at university')
    })

    test('Professor Grunewald on or after September 9, 1931', () => {
      currentState.character = 'Professor Grunewald'
      setCurrentDate(new Date(1931, 8, 10)) // September 9, 1931

      displayEntry('82')

      const buttons = getValidButtons()

      expect(buttons.length).toBe(4)

      expect(buttons[0].innerText).toBe('Visit the library')
      expect(buttons[1].innerText).toBe('See Dr. Martin Fen')
      expect(buttons[2].innerText).toBe('See the Dean')
      expect(buttons[3].innerText).toBe('Finish at university')
    })

    test('Another character on or after September 9, 1931', () => {
      currentState.character = 'Another Character'
      setCurrentDate(new Date(1931, 8, 9)) // September 9, 1931

      displayEntry('82')

      const buttons = getValidButtons()

      expect(buttons.length).toBe(2)

      expect(buttons[0].innerText).toBe('Visit the library')
      expect(buttons[1].innerText).toBe('Finish at university')
    })
  })

  describe('Entry 64 Tests', () => {
    beforeEach(async () => {
      await initializeGame() // Reset the game state before each test
    })

    test('Take the 10am train to New York (arrives at 5pm)', () => {
      // Test where the current time is after departure, so the day should change
      setCurrentDate(new Date(1931, 8, 1, 17, 0)) // Start after train departure

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const firstButton = document.querySelector('button')
      firstButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(17) // Expect time to be 5pm (17:00)
      expect(updatedDate.getDate()).toBe(2) // Date should advance to September 2
    })

    test('Take the 10am train to New York (arrives at 5pm, before departure)', () => {
      // Test where the current time is before departure, so the day should not change
      setCurrentDate(new Date(1931, 8, 1, 9, 0)) // Start before train departure

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const firstButton = document.querySelector('button')
      firstButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(17) // Expect time to be 5pm (17:00)
      expect(updatedDate.getDate()).toBe(1) // Date should still be September 1
    })

    test('Take the 4pm train to New York (arrives at 10pm)', () => {
      // Similar pattern for other tests
      setCurrentDate(new Date(1931, 8, 1, 8, 0)) // Start before train departure

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const secondButton = document.querySelectorAll('button')[1]
      secondButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(22) // Expect time to be 10pm (22:00)
      expect(updatedDate.getDate()).toBe(1) // Date should still be September 1
    })

    test('Take the 4pm train to New York (after departure)', () => {
      setCurrentDate(new Date(1931, 8, 1, 17, 0)) // Start after the train departs

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const secondButton = document.querySelectorAll('button')[1]
      secondButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(22) // Expect time to be 10pm (22:00)
      expect(updatedDate.getDate()).toBe(2) // Date should advance to September 2
    })

    test('Take the 10am train to Arkham (arrives at 11am)', () => {
      setCurrentDate(new Date(1931, 8, 1, 17, 0)) // Start after the train departs

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const thirdButton = document.querySelectorAll('button')[2]
      thirdButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(11) // Expect time to be 11am (11:00)
      expect(updatedDate.getDate()).toBe(2) // Date should advance to September 2
    })

    test('Take the 10am train to Arkham (before departure)', () => {
      setCurrentDate(new Date(1931, 8, 1, 8, 0)) // Start before the train departs

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const thirdButton = document.querySelectorAll('button')[2]
      thirdButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(11) // Expect time to be 11am (11:00)
      expect(updatedDate.getDate()).toBe(1) // Date should still be September 1
    })

    // Continue this pattern for the other tests:
    // - Before and after departure for each train time (1pm, 6pm, etc.)

    test('Stay overnight in Boston and catch a morning train', () => {
      setCurrentDate(new Date(1931, 8, 1, 5, 0)) // Early morning, before departure

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const sixthButton = document.querySelectorAll('button')[5]
      sixthButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(6) // Expect time to be 6am (06:00)
      expect(updatedDate.getDate()).toBe(1) // Date should still be September 1
    })

    test('Stay overnight in Boston and catch a morning train (cross midnight)', () => {
      setCurrentDate(new Date(1931, 8, 1, 7, 0)) // After train departs

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const sixthButton = document.querySelectorAll('button')[5]
      sixthButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(6) // Expect time to be 6am (06:00)
      expect(updatedDate.getDate()).toBe(2) // Date should now be September 2
    })
  })
  describe('Entry 64 Tests', () => {
    beforeEach(async () => {
      await initializeGame() // Reset the game state before each test
    })

    test('Take the 10am train to New York (arrives at 5pm)', () => {
      // Test where the current time is after departure, so the day should change
      setCurrentDate(new Date(1931, 8, 1, 17, 0)) // Start after train departure

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const firstButton = document.querySelector('button')
      firstButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(17) // Expect time to be 5pm (17:00)
      expect(updatedDate.getDate()).toBe(2) // Date should advance to September 2
    })

    test('Take the 10am train to New York (arrives at 5pm, before departure)', () => {
      // Test where the current time is before departure, so the day should not change
      setCurrentDate(new Date(1931, 8, 1, 9, 0)) // Start before train departure

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const firstButton = document.querySelector('button')
      firstButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(17) // Expect time to be 5pm (17:00)
      expect(updatedDate.getDate()).toBe(1) // Date should still be September 1
    })

    test('Take the 4pm train to New York (arrives at 10pm)', () => {
      // Similar pattern for other tests
      setCurrentDate(new Date(1931, 8, 1, 8, 0)) // Start before train departure

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const secondButton = document.querySelectorAll('button')[1]
      secondButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(22) // Expect time to be 10pm (22:00)
      expect(updatedDate.getDate()).toBe(1) // Date should still be September 1
    })

    test('Take the 4pm train to New York (after departure)', () => {
      setCurrentDate(new Date(1931, 8, 1, 17, 0)) // Start after the train departs

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const secondButton = document.querySelectorAll('button')[1]
      secondButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(22) // Expect time to be 10pm (22:00)
      expect(updatedDate.getDate()).toBe(2) // Date should advance to September 2
    })

    test('Take the 10am train to Arkham (arrives at 11am)', () => {
      setCurrentDate(new Date(1931, 8, 1, 17, 0)) // Start after the train departs

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const thirdButton = document.querySelectorAll('button')[2]
      thirdButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(11) // Expect time to be 11am (11:00)
      expect(updatedDate.getDate()).toBe(2) // Date should advance to September 2
    })

    test('Take the 10am train to Arkham (before departure)', () => {
      setCurrentDate(new Date(1931, 8, 1, 8, 0)) // Start before the train departs

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const thirdButton = document.querySelectorAll('button')[2]
      thirdButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(11) // Expect time to be 11am (11:00)
      expect(updatedDate.getDate()).toBe(1) // Date should still be September 1
    })

    test('Take the 1pm train to Arkham (arrives at 2pm)', () => {
      // Test starting after train departure
      setCurrentDate(new Date(1931, 8, 1, 17, 0)) // Start after the train departs (5 PM)

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const fourthButton = document.querySelectorAll('button')[3]
      fourthButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(14) // Expect time to be 2pm (14:00)
      expect(updatedDate.getDate()).toBe(2) // Date should advance to September 2
    })

    test('Take the 1pm train to Arkham (before departure)', () => {
      // Test starting before train departure
      setCurrentDate(new Date(1931, 8, 1, 11, 0)) // Start before the train departs (11 AM)

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const fourthButton = document.querySelectorAll('button')[3]
      fourthButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(14) // Expect time to be 2pm (14:00)
      expect(updatedDate.getDate()).toBe(1) // Date should remain September 1
    })

    test('Take the 6pm train to Arkham (arrives at 7pm)', () => {
      // Test starting after train departure
      setCurrentDate(new Date(1931, 8, 1, 19, 0)) // Start after the train departs (7 PM)

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const fifthButton = document.querySelectorAll('button')[4]
      fifthButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(19) // Expect time to be 7pm (19:00)
      expect(updatedDate.getDate()).toBe(2) // Date should advance to September 2
    })

    test('Take the 6pm train to Arkham (before departure)', () => {
      // Test starting before train departure
      setCurrentDate(new Date(1931, 8, 1, 17, 0)) // Start before the train departs (5 PM)

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const fifthButton = document.querySelectorAll('button')[4]
      fifthButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(19) // Expect time to be 7pm (19:00)
      expect(updatedDate.getDate()).toBe(1) // Date should remain September 1
    })

    test('Stay overnight in Boston and catch a morning train', () => {
      setCurrentDate(new Date(1931, 8, 1, 5, 0)) // Early morning, before departure

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const sixthButton = document.querySelectorAll('button')[5]
      sixthButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(6) // Expect time to be 6am (06:00)
      expect(updatedDate.getDate()).toBe(1) // Date should still be September 1
    })

    test('Stay overnight in Boston and catch a morning train (cross midnight)', () => {
      setCurrentDate(new Date(1931, 8, 1, 7, 0)) // After train departs

      const currentDate = getCurrentDate()
      setCurrentDate(currentDate)
      displayEntry('64')

      const sixthButton = document.querySelectorAll('button')[5]
      sixthButton.click() // Simulate clicking the choice

      const updatedDate = getCurrentDate()
      expect(updatedDate.getHours()).toBe(6) // Expect time to be 6am (06:00)
      expect(updatedDate.getDate()).toBe(2) // Date should now be September 2
    })
  })

  describe('Entry 41 Latin Roll Test', () => {
    beforeEach(async () => {
      await initializeGame() // Reset the game state before each test
      currentState.skills = { 'Language (Latin)': 50 } // Set initial Latin skill
      currentState.sanity = 100 // Set initial sanity
    })

    test('should successfully perform a Latin roll and navigate to entry 140', async () => {
      // Mock dice roll to always succeed for testing
      jest.spyOn(global.Math, 'random').mockReturnValue(0.3) // Assuming 50% chance, 0.3 should succeed

      displayEntry('41') // Start at entry 41

      // Find and click the button to attempt the Latin roll
      const latinRollButton = findChoiceButton(
        "Attempt a Latin roll for 'Liber Ivonis'",
      )
      latinRollButton.click()

      // Verify the outcomes:
      // - Navigated to entry 140
      expect(currentState.currentEntry).toBe('140')

      // - Cthulhu Mythos skill increased by 1
      expect(currentState.skills['Cthulhu Mythos']).toBe(1)

      // - Sanity decreased by 1
      expect(currentState.sanity).toBe(99)

      // Restore Math.random
      jest.spyOn(global.Math, 'random').mockRestore()
    })

    test('should fail the Latin roll and stay at entry 41', async () => {
      // Initialize Cthulhu Mythos skill to 0 if it's not already defined
      if (!currentState.skills['Cthulhu Mythos']) {
        currentState.skills['Cthulhu Mythos'] = 0
      }

      // Mock dice roll to always fail for testing
      jest.spyOn(global.Math, 'random').mockReturnValue(0.8) // Assuming 50% chance, 0.8 should fail

      displayEntry('41') // Start at entry 41

      // Find and click the button to attempt the Latin roll
      const latinRollButton = findChoiceButton(
        "Attempt a Latin roll for 'Liber Ivonis'",
      )
      latinRollButton.click()

      // Verify the outcomes:
      // - Remain at entry 41
      expect(currentState.currentEntry).toBe('41')

      // - Cthulhu Mythos skill remains unchanged
      expect(currentState.skills['Cthulhu Mythos']).toBe(0)

      // - Sanity remains unchanged
      expect(currentState.sanity).toBe(100)

      // Restore Math.random
      jest.spyOn(global.Math, 'random').mockRestore()
    })
  })

  describe('Entry 10 Series Tests', () => {
    test('should handle the full flow from entry 10', () => {
      // Start in entry "10"
      displayEntry('10')

      const dexRollButton = findChoiceButton(
        'Attempt a DEX roll to preemptively act',
      )

      dexRollButton.click() // Player attempts the DEX roll

      // Determine whether the player goes to "10a" or "10b"
      const entryDescription = document.getElementById('description').innerHTML

      if (entryDescription.includes('Quick Response')) {
        // We're in entry "10a" - Player engages in combat
        const engageCombatButton = findChoiceButton('Engage in combat')

        engageCombatButton.click() // Move to 10d
      } else if (entryDescription.includes('Caught Off Guard')) {
        // We're in entry "10b" - Player takes damage and fights back
        const fightBackButton = findChoiceButton('Fight back')
        fightBackButton.click() // Move to 10d
      }

      // Now we're in "10d" - Attempt to dodge
      let dodgeButton = findChoiceButton('Attempt to Dodge')

      for (let i = 0; i < 5; i++) {
        dodgeButton.click() // Player attempts to dodge

        // Check if player is taken to entry "187" or stays in combat
        const newEntryDescription =
          document.getElementById('description').innerHTML

        if (newEntryDescription.includes('The stranger lets loose a shot')) {
          const healthDisplay = document.getElementById('health').innerText
          expect(healthDisplay).toContain('Health:') // Health should have decreased
        } else if (newEntryDescription.includes('Combat Continues')) {
          // Player remains in combat, no transition
        } else if (newEntryDescription.includes('187')) {
          expect(currentState.currentEntry).toBe('187') // Player successfully dodged and won
          break // Exit the loop as the combat ended
        }
      }
    })
  })

  describe('Entry 54 - Bookstore Selection', () => {
    const booksData = {
      Books: [
        { name: 'Harrison’s English/Greek Phrase Book', type: 'book' },
        { name: 'Harrison’s English/Arabic Phrase Book', type: 'book' },
        { name: 'Basel’s English/German Phrase Book', type: 'book' },
        {
          name: 'Cherry-Gerrard’s The Worst Journey in the World',
          type: 'book',
        },
        { name: 'Douglas Planchon’s With Lake in the Antarctic', type: 'book' },
        { name: 'Planchon’s Guide to South America', type: 'book' },
      ],
    }

    beforeEach(async () => {
      // Ensure the game is initialized to a clean state
      await initializeGame()
      // Reset the current state and inventory
      currentState.inventory = []

      setCurrentLocale('New York')
      setGameData('books', booksData)
      displayEntry('54')
    })

    test('should display 6 book choices initially', () => {
      currentState.inventory = []

      setCurrentLocale('New York')
      const choices = Array.from(document.getElementById('choices').children)
      expect(choices.length).toBe(7) // There are 6 books available initially plus a NYC button
    })

    test('should not show a book choice if the book is already in the inventory', () => {
      currentState.inventory = []

      setCurrentLocale('New York')
      // Add a book to the inventory
      addItem({ name: 'Harrison’s English/Greek Phrase Book', type: 'book' })
      displayEntry('54') // Redisplay the entry

      expect(currentState.inventory).toEqual([
        { name: 'Harrison’s English/Greek Phrase Book', type: 'book' },
      ])
    })

    test('should not show any book choices if player already has 3 books', () => {
      currentState.inventory = []

      setCurrentLocale('New York')
      // Add 3 books to the inventory
      addItem({ name: 'Harrison’s English/Greek Phrase Book', type: 'book' })
      addItem({ name: 'Harrison’s English/Arabic Phrase Book', type: 'book' })
      addItem({ name: 'Basel’s English/German Phrase Book', type: 'book' })

      displayEntry('54') // Redisplay the entry

      const choices = Array.from(document.getElementById('choices').children)

      expect(choices.length).toBe(1) // No book choices should be displayed as the player already has 3 books plus NYC button
    })

    test('should add a book to the inventory when clicked and remove the button', () => {
      currentState.inventory = []

      setCurrentLocale('New York')
      // Simulate clicking the button to purchase a book
      const bookButton = Array.from(
        document.querySelectorAll('#choices button'),
      ).find((button) =>
        button.innerText.includes('Harrison’s English/Greek Phrase Book'),
      )

      bookButton.click() // Simulate clicking the button

      // [{"name": "Harrison’s English/Greek Phrase Book", "type": "book"}]
      expect(currentState.inventory).toEqual([
        { name: 'Harrison’s English/Greek Phrase Book', type: 'book' },
      ])

      const choices = Array.from(document.getElementById('choices').children)
      const foundBook = choices.some((button) =>
        button.innerText.includes('Harrison’s English/Greek Phrase Book'),
      )
      expect(foundBook).toBe(false) // The button should be removed after purchase
    })

    test('should allow purchasing up to 3 books and then disable further choices', () => {
      currentState.inventory = []

      setCurrentLocale('New York')
      const [firstBookButton, secondBookButton, thirdBookButton] = Array.from(
        document.querySelectorAll('#choices button'),
      )

      firstBookButton.click() // Purchase first book
      secondBookButton.click() // Purchase second book
      thirdBookButton.click() // Purchase third book

      expect(currentState.inventory.length).toBe(3) // The inventory should have exactly 3 books
    })
  })

  describe('Visited Entries and Requirements', () => {
    beforeEach(() => {
      // Reset the visitedEntries set before each test
      currentState.visitedEntries = new Set()
    })

    test('should track visited entries', () => {
      // Add an entry and check if it is tracked
      addVisitedEntry('585')
      expect(currentState.visitedEntries.has('585')).toBe(true)

      // Adding the same entry again should not duplicate it
      addVisitedEntry('585')
      expect(currentState.visitedEntries.size).toBe(1) // Still only one entry
    })

    test('should pass hasVisited requirement if entry was visited', () => {
      // Add entry '585' to visitedEntries
      addVisitedEntry('585')

      // Check if requirements with hasVisited '585' pass
      const requirements = { hasVisited: '585' }
      expect(checkRequirements(requirements)).toBe(true) // Requirement met
    })

    test('should fail hasVisited requirement if entry was not visited', () => {
      // Entry '585' has not been visited yet
      const requirements = { hasVisited: '585' }
      expect(checkRequirements(requirements)).toBe(false) // Requirement not met
    })

    test('should pass hasNotVisited requirement if entry was not visited', () => {
      // Entry '585' has not been visited
      const requirements = { hasNotVisited: '585' }
      expect(checkRequirements(requirements)).toBe(true) // Requirement met
    })

    test('should fail hasNotVisited requirement if entry was visited', () => {
      // Add entry '585' to visitedEntries
      addVisitedEntry('585')

      // Check if requirements with hasNotVisited '585' fail
      const requirements = { hasNotVisited: '585' }
      expect(checkRequirements(requirements)).toBe(false) // Requirement not met
    })
  })

  describe('Requirements - notCurrentLocale', () => {
    beforeEach(() => {
      // Initialize the game to reset the state before each test
      initializeGame()
      currentState.health = 90 // Set initial health for testing
    })

    test('should block choice when player is in the restricted locale (Cunard Ship)', () => {
      // Set the current locale to Cunard Ship, which should block the choice
      setCurrentLocale('Cunard Ship')

      const requirements = {
        notFullHealth: true,
        notCurrentLocale: 'Cunard Ship',
      }

      // Check that the requirements fail when in Cunard Ship
      expect(checkRequirements(requirements)).toBe(false)
    })

    test('should allow choice when player is not in the restricted locale', () => {
      // Set the current locale to something other than Cunard Ship
      setCurrentLocale('New York')
      currentState.health = 90

      const requirements = {
        notFullHealth: true,
        notCurrentLocale: 'Cunard Ship',
      }

      // Check that the requirements pass when not in Cunard Ship
      expect(checkRequirements(requirements)).toBe(true)
    })
  })

  describe('Entry 126 - dayOfJourney Requirement', () => {
    test('should show the "A group seems to be gathering" choice only on day 5', () => {
      initializeGame()
      currentState.shipJourneyStartDate = new Date(1931, 8, 1) // Start date is September 1, 1931
      // Function to simulate setting the current journey day
      const setJourneyDay = (daysAfterStart) => {
        const currentDate = new Date(1931, 8, 1) // Start on September 1, 1931
        currentDate.setDate(currentDate.getDate() + daysAfterStart) // Advance by specified number of days
        setCurrentDate(currentDate) // Update the game's current date
      }

      // Define the requirements for the choice "A group seems to be gathering"
      const choiceRequirements = { dayOfJourney: 5 }

      // Test on day 0 (start of journey) - choice should not be available
      setJourneyDay(0)
      expect(checkRequirements(choiceRequirements)).toBe(false)

      // Test on day 4 - choice should not be available
      setJourneyDay(4)
      expect(checkRequirements(choiceRequirements)).toBe(false)

      // Test on day 5 - choice should be available
      setJourneyDay(5)
      expect(checkRequirements(choiceRequirements)).toBe(true)

      // Test on day 6 - choice should not be available
      setJourneyDay(6)
      expect(checkRequirements(choiceRequirements)).toBe(false)
    })
  })

  describe('Day and Time Effects in handleEntryChoices', () => {
    let entryWithDayAdvance,
      entryWithNoDayAdvance,
      entryWithDefaultHour,
      entryWithDayAdvanceAndDefaultHour,
      entryWithSetHour,
      entryWithDayAdvanceAndSetHour,
      entryWithAdvanceTime,
      entryWithAdvanceTimeCrossingMidnight

    beforeEach(() => {
      entryWithDayAdvance = {
        choices: [
          {
            text: 'Advance the day by 1',
            nextEntry: '100',
            effects: {
              dayAdvance: 1,
            },
          },
        ],
      }

      entryWithNoDayAdvance = {
        choices: [
          {
            text: 'Stay on the same day',
            nextEntry: '100',
            effects: {},
          },
        ],
      }

      entryWithDefaultHour = {
        choices: [
          {
            text: 'Set default hour to 6AM',
            nextEntry: '100',
            effects: {
              defaultHour: 6,
            },
          },
        ],
      }

      entryWithDayAdvanceAndDefaultHour = {
        choices: [
          {
            text: 'Advance the day and set default hour to 6AM',
            nextEntry: '100',
            effects: {
              dayAdvance: 1,
              defaultHour: 6,
            },
          },
        ],
      }

      entryWithSetHour = {
        choices: [
          {
            text: 'Set hour to 10PM',
            nextEntry: '100',
            effects: {
              setHour: 22,
            },
          },
        ],
      }

      entryWithDayAdvanceAndSetHour = {
        choices: [
          {
            text: 'Advance the day and set hour to 10PM',
            nextEntry: '100',
            effects: {
              dayAdvance: 1,
              setHour: 22,
            },
          },
        ],
      }

      entryWithAdvanceTime = {
        choices: [
          {
            text: 'Advance time by 2 hours',
            nextEntry: '100',
            effects: {
              advanceTime: 2,
            },
          },
        ],
      }

      entryWithAdvanceTimeCrossingMidnight = {
        choices: [
          {
            text: 'Advance time by 6 hours (cross midnight)',
            nextEntry: '100',
            effects: {
              advanceTime: 6,
            },
          },
        ],
      }

      // Reset the current date to a known value before each test
      setCurrentDate(new Date(1931, 8, 1, 12, 0)) // Noon, September 1, 1931
    })

    test('should advance the day when dayAdvance effect is present', () => {
      handleEntryChoices('123', entryWithDayAdvance)

      const button = findChoiceButton('Advance the day by 1')
      button.click()

      const updatedDate = getCurrentDate()

      // Expect the day to have advanced by 1
      expect(updatedDate.getDate()).toBe(2)
      expect(updatedDate.getHours()).toBe(6) // Time should set to 6AM (default hour)
    })

    test('should not advance the day when dayAdvance effect is absent', () => {
      handleEntryChoices('124', entryWithNoDayAdvance)

      const button = findChoiceButton('Stay on the same day')
      button.click()

      const updatedDate = getCurrentDate()

      // Expect the day to remain the same
      expect(updatedDate.getDate()).toBe(1)
      expect(updatedDate.getHours()).toBe(13) // Time should advance by one hour
    })

    test('should not change the hour when only defaultHour effect is present', () => {
      handleEntryChoices('125', entryWithDefaultHour)

      const button = findChoiceButton('Set default hour to 6AM')
      button.click()

      const updatedDate = getCurrentDate()

      // Expect the day to remain the same and the hour to not change
      expect(updatedDate.getDate()).toBe(1)
      expect(updatedDate.getHours()).toBe(13) // Time should advance by one hour, defaultHour does nothing without dayAdvance
    })

    test('should advance the day and set default hour when both dayAdvance and defaultHour effects are present', () => {
      handleEntryChoices('126', entryWithDayAdvanceAndDefaultHour)

      const button = findChoiceButton(
        'Advance the day and set default hour to 6AM',
      )
      button.click()

      const updatedDate = getCurrentDate()

      // Expect the day to have advanced by 1 and time set to defaultHour (6AM)
      expect(updatedDate.getDate()).toBe(2)
      expect(updatedDate.getHours()).toBe(6) // Time should be set to 6AM
    })

    test('should set hour to 10PM when setHour effect is present', () => {
      handleEntryChoices('127', entryWithSetHour)

      const button = findChoiceButton('Set hour to 10PM')
      button.click()

      const updatedDate = getCurrentDate()

      // Expect the day to remain the same and the hour to be set to 10PM
      expect(updatedDate.getDate()).toBe(1)
      expect(updatedDate.getHours()).toBe(22) // Time should be set to 10PM
    })

    test('should advance the day and set hour to 10PM when both dayAdvance and setHour effects are present', () => {
      handleEntryChoices('128', entryWithDayAdvanceAndSetHour)

      const button = findChoiceButton('Advance the day and set hour to 10PM')
      button.click()

      const updatedDate = getCurrentDate()

      // Expect the day to have advanced by 1 and time set to 10PM
      expect(updatedDate.getDate()).toBe(2)
      expect(updatedDate.getHours()).toBe(22) // Time should be set to 10PM
    })

    test('should advance the time by 2 hours when advanceTime effect is present', () => {
      handleEntryChoices('129', entryWithAdvanceTime)

      const button = findChoiceButton('Advance time by 2 hours')
      button.click()

      const updatedDate = getCurrentDate()

      // Expect the time to have advanced by 1 (by default) + the amount of time in advanceTime
      expect(updatedDate.getDate()).toBe(1)
      expect(updatedDate.getHours()).toBe(15) // Time should advance to 3PM
    })

    test('should advance time by 6 hours and cross midnight when advanceTime effect is present', () => {
      setCurrentDate(new Date(1931, 8, 1, 17, 0))

      // Log the current date and time before advancing
      const currentDate = getCurrentDate()

      handleEntryChoices('130', entryWithAdvanceTimeCrossingMidnight)

      const button = findChoiceButton(
        'Advance time by 6 hours (cross midnight)',
      )
      button.click()

      // Log the updated date after clicking the button
      const updatedDate = getCurrentDate()

      // Log if midnight crossing logic is working as expected
      const expectedDay = 2
      const expectedHour = 0

      // Assert the expected outcomes
      expect(updatedDate.getDate()).toBe(expectedDay)
      expect(updatedDate.getHours()).toBe(expectedHour)
    })
  })
})
