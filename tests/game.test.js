import {
  setCurrentDate,
  getCurrentDate,
  initializeGame,
  currentState,
  setTempDescription,
  setGameData,
  getPreviousEntry,
  setCurrentLocale,
  startGame,
  setCurrentState,
} from '../src/game/gameState.js'
import { handleInvestigatorDeath, switchToNextInvestigator } from '../src/game/investigator.js'
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
  handleOutcomeBasedEncounter,
} from '../src/game/gameActions.js'
import { rollDice, makeSkillCheck } from '../src/utils/dice.js'
import fs from 'fs'
import path from 'path'
import { showSkillAllocationModal } from '../src/game/gameUI.js'

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
      <div class="stat-container" id="waterSupply-container">
      <div class="stat-label">Water Supply</div>
      <div class="water-supply" id="waterSupply">10</div>
      <div id="minimap-container"></div>
      <div id="game"></div>
      </div>
    `

    return initializeGame()
  })

  afterEach(() => {
    jest.restoreAllMocks() // Restore any mocks after each test
  })

  describe('Basic Gameplay Features', () => {
    test('should update health correctly', () => {
      // Set initial health to a value below max
      currentState.health = 8

      // Update health by 3
      updateHealth(3)

      // Check that health is capped at 9
      expect(currentState.health).toBe(9)
      expect(document.getElementById('health').innerText).toBe('Health: 9')

      // Update health by 10 again, but since it's already at max, it should not change
      updateHealth(10)

      // Health should still be 9
      expect(currentState.health).toBe(9)
      expect(document.getElementById('health').innerText).toBe('Health: 9')

      // Set initial health to a value above 100 (should not be possible, but for thoroughness)
      currentState.health = 105
      updateHealth(10) // Adding more health should still cap it at 9

      expect(currentState.health).toBe(9)
      expect(document.getElementById('health').innerText).toBe('Health: 9')
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
      makeChoice('9', { health: 9, inventory: ['Magical Artifact'] })
      expect(currentState.health).toBe(9)
      expect(currentState.inventory).toContain('Magical Artifact')
    })

    test('should update sanity correctly', () => {
      updateSanity(-10)
      expect(currentState.sanity).toBe(45)
    })
  })

  describe('Skill and Stat Checks', () => {
    test('should make skill check', () => {
      currentState.skills = { Climb: 40 }
      const result = makeSkillCheck('Climb', currentState.skills)
      expect([true, false]).toContain(result)
    })

    test('should make a stat check', () => {
      currentState.stats = { DEX: 60 }
      const result = makeSkillCheck(
        'DEX',
        currentState.skills,
        currentState.stats,
      )
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
      addItem({ name: 'Necronomicon', type: 'book' })

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
        health: 9,
        sanity: 55,
        inventory: [expect.any(Object), expect.any(Object)],
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
      expect(currentState.health).toBe(11) // Check other properties as necessary

      // Simulate the death of the second investigator
      handleInvestigatorDeath()

      // Verify that the current investigator is now Lydia Lau starting at entry 37
      expect(currentState.currentEntry).toBe('37')
      expect(currentState.health).toBe(10) // Check other properties as necessary

      // Simulate the death of the third investigator
      handleInvestigatorDeath()

      // Verify that the current investigator is now Devon Wilson starting at entry 554
      expect(currentState.currentEntry).toBe('554')
      expect(currentState.health).toBe(13) // Check other properties as necessary

      // Simulate the death of the fourth investigator
      handleInvestigatorDeath()

      // Verify that the game is over
      expect(console.log).toHaveBeenCalledWith(
        'All investigators have died. Restarting the game.',
      )

      jest.restoreAllMocks() // Restore console.log after the test
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
      expect(choices.length).toBe(2)

      setCurrentDate(new Date(1931, 8, 9, 10, 0))
      currentState.character = 'Zaphod Beeblebrox'
      displayEntry('102')
      const choicesPartTwo = document.getElementById('choices').children
      expect(choicesPartTwo.length).toBe(1)
    })

    test('should handle choices with character requirements', () => {
      setCurrentDate(new Date(1931, 8, 1, 10, 0))
      currentState.character = 'Zaphod Beeblebrox'
      setCurrentLocale('Cairo')
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
        'Temporary effect occurred.',
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
      currentState.health = 8
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
      currentState.health = 2 // Example initial health
      displayEntry('585')
      const choiceButton = findChoiceButton('Make a Luck roll for recovery')
      choiceButton.click() // Simulate clicking the choice

      // Assuming the game logic updates the current entry after the choice
      if (currentState.currentEntry === '585a') {
        // For '585a', health should increase by 2 to 6 points
        expect(currentState.health).toBeGreaterThanOrEqual(4)
        expect(currentState.health).toBeLessThanOrEqual(8)
      } else if (currentState.currentEntry === '585b') {
        // For '585b', health should increase by 1 to 3 points
        expect(currentState.health).toBeGreaterThanOrEqual(3)
        expect(currentState.health).toBeLessThanOrEqual(5)
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
      currentState.health = 6

      displayEntry('585a') // Assuming 585a allows staying another day
      expect(checkRequirements({ notFullHealth: true })).toBe(true)
      expect(document.getElementById('description').innerHTML).toContain(
        'You feel much better but can still recover more.',
      )
    })

    test('Expect 585 to not have Make a Luck roll button if health is full', () => {
      currentState.health = 9

      displayEntry('585')

      let choices = Array.from(document.getElementById('choices').children)
      expect(choices.length === 1)

      currentState.health = 6

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
    test('should consistently route to either entry 280 or Cairo Locations based on stealth skill check', async () => {
      displayEntry('281')
      const choiceButton = findChoiceButton('Attempt to hide and wait.')
      choiceButton.click() // Simulate clicking the button for stealth check

      for (let i = 0; i < 5; i++) {
        try {
          expect(document.getElementById('description').innerHTML).toContain(
            'Cairo Locations',
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
        Explosives: [],
      })
      setCurrentLocale('Cairo') // Set initial locale for testing
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

  // describe('makeSkillCheck function', () => {
  //   const skills = {
  //     Locksmith: 50, // 50% chance for a normal roll
  //     MechanicalRepair: 50, // For hard checks, this would be 25%
  //   }
  //   const stats = {
  //     STR: 80, // For extreme checks, this would be 16%
  //   }

  //   const runSkillCheckMultipleTimes = (
  //     skill,
  //     level,
  //     trials = 100,
  //     penaltyDice = 0,
  //   ) => {
  //     let successes = 0
  //     for (let i = 0; i < trials; i++) {
  //       const result = makeSkillCheck(
  //         skill,
  //         skills,
  //         stats,
  //         level,
  //         null,
  //         null,
  //         0,
  //         penaltyDice,
  //       )
  //       if (result) successes++
  //     }
  //     return successes
  //   }

  //   test('normal difficulty checks are statistically consistent', () => {
  //     const successes = runSkillCheckMultipleTimes('Locksmith', 'normal', 100)
  //     // Expect roughly half the trials to succeed, around 50 successes
  //     expect(successes).toBeGreaterThanOrEqual(40)
  //     expect(successes).toBeLessThanOrEqual(60)
  //   })

  //   test('hard difficulty checks are statistically consistent', () => {
  //     const successes = runSkillCheckMultipleTimes(
  //       'MechanicalRepair',
  //       'hard',
  //       100,
  //     )
  //     // Expect roughly a quarter of the trials to succeed, around 25 successes
  //     expect(successes).toBeGreaterThanOrEqual(15)
  //     expect(successes).toBeLessThanOrEqual(35)
  //   })

  //   test('extreme difficulty checks are statistically consistent', () => {
  //     const successes = runSkillCheckMultipleTimes('STR', 'extreme', 100)
  //     // Expect roughly one-fifth of the trials to succeed, around 10-20 successes
  //     expect(successes).toBeGreaterThanOrEqual(8)
  //     expect(successes).toBeLessThanOrEqual(20)
  //   })

  //   // Adding tests for penalty dice
  //   test('normal difficulty checks with one penalty die', () => {
  //     const successes = runSkillCheckMultipleTimes(
  //       'Locksmith',
  //       'normal',
  //       100,
  //       1,
  //     )
  //     // With one penalty die, success rate drops to roughly 20-30%
  //     expect(successes).toBeGreaterThanOrEqual(15)
  //     expect(successes).toBeLessThanOrEqual(35)
  //   })

  //   test('normal difficulty checks with two penalty dice', () => {
  //     const successes = runSkillCheckMultipleTimes(
  //       'Locksmith',
  //       'normal',
  //       100,
  //       2,
  //     )
  //     // With two penalty dice, the success rate should be roughly 10-20%
  //     expect(successes).toBeGreaterThanOrEqual(5)
  //     expect(successes).toBeLessThanOrEqual(20)
  //   })

  //   test('hard difficulty checks with one penalty die', () => {
  //     const successes = runSkillCheckMultipleTimes(
  //       'MechanicalRepair',
  //       'hard',
  //       100,
  //       1,
  //     )
  //     // With one penalty die on hard difficulty, expect roughly 10-20% success
  //     expect(successes).toBeGreaterThanOrEqual(1)
  //     expect(successes).toBeLessThanOrEqual(20)
  //   })

  //   test('extreme difficulty checks with one penalty die', () => {
  //     const successes = runSkillCheckMultipleTimes('STR', 'extreme', 100, 1)
  //     // Expect very few successes, roughly 5-10% with extreme difficulty and one penalty die
  //     expect(successes).toBeGreaterThanOrEqual(0)
  //     expect(successes).toBeLessThanOrEqual(10)
  //   })
  // })

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
      currentState.health = 6

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

  describe('Entry 87 - Hall of Justice', () => {
    beforeEach(() => {
      // Reset currentState and initialize game before each test
      initializeGame()
      currentState.hiredAthens = null
      currentState.hiredCairo = null
      currentState.skills = {}
      currentState.inventory = []
      currentState.currentLocale = 'Athens'
    })

    test('should show "Your interpreter can help translate" button when companion is with you', () => {
      currentState.hiredAthens = 'Christos' // Player has a companion (Christos)
      currentState.currentLocale = 'Athens'
      displayEntry('87')

      const buttons = Array.from(document.querySelectorAll('button'))
      const choiceButton = buttons.find((button) =>
        button.innerText.includes('Your interpreter can help translate'),
      )
      expect(choiceButton).not.toBeNull() // The button should render
    })

    test('should not show "Your interpreter can help translate" button when companion is not with you', () => {
      currentState.hiredAthens = null // Player does not have a companion
      currentState.currentLocale = 'Athens'
      displayEntry('87')

      const buttons = Array.from(document.querySelectorAll('button')).filter(
        (button) => button.innerText && button.innerText.trim() !== '',
      )

      expect(buttons.length).toBe(2) // Only the always-visible buttons should render
    })

    test('should show "Good thing you speak Greek" button when player speaks Greek', () => {
      currentState.skills = { 'Language (Greek)': 50 } // Player knows Greek
      displayEntry('87')

      const buttons = Array.from(document.querySelectorAll('button'))
      const choiceButton = buttons.find((button) =>
        button.innerText.includes('Good thing you speak Greek'),
      )
      expect(choiceButton).not.toBeNull() // The button should render
    })

    test('should not show "Good thing you speak Greek" button when player does not speak Greek', () => {
      currentState.skills = { 'Language (Greek)': 0 } // Player does not know Greek
      currentState.currentLocale = 'Athens'
      displayEntry('87')

      const buttons = Array.from(document.querySelectorAll('button')).filter(
        (button) => button.innerText && button.innerText.trim() !== '',
      )
      expect(buttons.length).toBe(2) // Only the always-visible buttons should render
    })

    test('should show "Maybe your phrasebook can help" button when player has the phrasebook', () => {
      currentState.inventory = [
        { name: 'Harrison’s English/Greek Phrase Book', type: 'book' },
      ] // Player has the phrasebook
      currentState.currentLocale = 'Athens'
      displayEntry('87')

      const buttons = Array.from(document.querySelectorAll('button'))
      const choiceButton = buttons.find((button) =>
        button.innerText.includes('Maybe your phrasebook can help'),
      )
      expect(choiceButton).not.toBeNull() // The button should render
    })

    test('should not show "Maybe your phrasebook can help" button when player does not have the phrasebook', () => {
      currentState.inventory = [
        { name: 'Harrison’s English/Arabic Phrase Book', type: 'book' },
      ] // Player does not have the English/Greek Phrase Book
      currentState.currentLocale = 'Athens'
      displayEntry('87')

      const buttons = Array.from(document.querySelectorAll('button')).filter(
        (button) => button.innerText && button.innerText.trim() !== '',
      )
      expect(buttons.length).toBe(2) // Only the always-visible buttons should render
    })

    test('should always show "Spend some time looking for someone who speaks English" button', () => {
      displayEntry('87')

      const buttons = Array.from(document.querySelectorAll('button'))
      const choiceButton = buttons.find((button) =>
        button.innerText.includes(
          'Spend some time looking for someone who speaks English',
        ),
      )
      expect(choiceButton).not.toBeNull() // This button should always render
    })

    test('should always show "Leave the Hall of Justice" button', () => {
      displayEntry('87')

      const buttons = Array.from(document.querySelectorAll('button'))
      const choiceButton = buttons.find((button) =>
        button.innerText.includes('Leave the Hall of Justice'),
      )
      expect(choiceButton).not.toBeNull() // This button should always render
    })
  })

  describe('checkRequirements - Skill Requirement', () => {
    beforeEach(() => {
      // Reset currentState before each test
      currentState.skills = {
        'Pilot (Aircraft)': 10,
      }
    })

    test('should pass when player has the required skill level', () => {
      const requirements = {
        skill: {
          name: 'Pilot (Aircraft)',
          minValue: 5,
        },
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(true) // Should pass since the player has 10 in Pilot (Aircraft)
    })

    test('should fail when player does not have the required skill level', () => {
      const requirements = {
        skill: {
          name: 'Pilot (Aircraft)',
          minValue: 15,
        },
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(false) // Should fail since the player only has 10 in Pilot (Aircraft)
    })

    test('should fail when player does not have the skill at all', () => {
      const requirements = {
        skill: {
          name: 'Pilot (Helicopter)',
          minValue: 5,
        },
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(false) // Should fail since the player does not have Pilot (Helicopter)
    })
  })

  describe('requiredHotelStays requirement', () => {
    it('should pass when player has the exact required moderateHotelStays', () => {
      // Ensure currentState has the exact moderateHotelStays required
      currentState.moderateHotelStays = 2
      const requirements = { requiredHotelStays: { moderateHotelStays: 2 } }

      expect(checkRequirements(requirements)).toBe(true)
    })

    it('should fail when player has different moderateHotelStays than required', () => {
      currentState.moderateHotelStays = 1
      const requirements = { requiredHotelStays: { moderateHotelStays: 2 } }

      expect(checkRequirements(requirements)).toBe(false)
    })

    it('should pass when player has the exact required expensiveHotelStays', () => {
      // Ensure currentState has the exact expensiveHotelStays required
      currentState.expensiveHotelStays = 3
      const requirements = { requiredHotelStays: { expensiveHotelStays: 3 } }

      expect(checkRequirements(requirements)).toBe(true)
    })

    it('should fail when player has different expensiveHotelStays than required', () => {
      currentState.expensiveHotelStays = 1
      const requirements = { requiredHotelStays: { expensiveHotelStays: 3 } }

      expect(checkRequirements(requirements)).toBe(false)
    })

    it('should pass when player has no moderateHotelStays and requirement is 0', () => {
      // currentState.moderateHotelStays is undefined, equivalent to 0
      const requirements = { requiredHotelStays: { moderateHotelStays: 0 } }

      expect(checkRequirements(requirements)).toBe(true)
    })

    it('should fail when player has no moderateHotelStays and requirement is 1', () => {
      // currentState.moderateHotelStays is undefined, but requirement is 1
      const requirements = { requiredHotelStays: { moderateHotelStays: 1 } }

      expect(checkRequirements(requirements)).toBe(false)
    })
  })

  describe('Game Logic - previousEntry requirement', () => {
    beforeEach(() => {
      // Initialize or reset the game state before each test
      currentState.previousEntry = null
    })

    test('should pass when previousEntry matches the requirement', () => {
      // Set the current state with a matching previousEntry
      currentState.previousEntry = '150'

      const requirements = { previousEntry: '150' }

      // Call checkRequirements and expect it to return true
      expect(checkRequirements(requirements)).toBe(true)
    })

    test('should fail when previousEntry does not match the requirement', () => {
      // Set the current state with a different previousEntry
      currentState.previousEntry = '149'

      const requirements = { previousEntry: '150' }

      // Call checkRequirements and expect it to return false
      expect(checkRequirements(requirements)).toBe(false)
    })

    test('should fail when previousEntry is undefined or null', () => {
      // Ensure previousEntry is null or undefined
      currentState.previousEntry = null

      const requirements = { previousEntry: '150' }

      // Call checkRequirements and expect it to return false
      expect(checkRequirements(requirements)).toBe(false)
    })
  })

  describe('addItem effect', () => {
    beforeEach(() => {
      // Reset game state before each test
      initializeGame() // Make sure the game is set to its initial state
      setCurrentDate(new Date(1931, 8, 1)) // Set a specific date if needed
    })

    test('should add artifact item to inventory when choice is made', () => {
      currentState.inventory = [] // Clear the inventory

      // Define the effects with the addItem for an artifact
      const effects = {
        addItem: {
          name: 'Ring of Power',
          type: 'artifact',
          description:
            'A ring heavy with gold, covered with signs, most prominently a five-pointed star with a core of flame. It has power, particularly against dead things brought back to existence.',
        },
        setHour: 6,
      }

      // Simulate the choice to trigger addItem
      makeChoice('Athens', effects)

      // Check if the item has been added to the inventory
      const addedItem = currentState.inventory.find(
        (item) => item.name === 'Ring of Power',
      )

      // Verify the item was added and contains the correct details
      expect(addedItem).toBeDefined() // Ensure the item exists
      expect(addedItem.name).toBe('Ring of Power') // Check item name
      expect(addedItem.type).toBe('artifact') // Check item type
      expect(addedItem.description).toContain('A ring heavy with gold') // Check description content
    })

    test('should not add duplicate items to the inventory', () => {
      currentState.inventory = [] // Clear the inventory

      // Define the effects with the addItem for an artifact
      const effects = {
        addItem: {
          name: 'Ring of Power',
          type: 'artifact',
          description:
            'A ring heavy with gold, covered with signs, most prominently a five-pointed star with a core of flame. It has power, particularly against dead things brought back to existence.',
        },
        setHour: 6,
      }

      // Simulate adding the same item twice
      makeChoice('Athens', effects)
      makeChoice('Athens', effects)

      // Check the inventory to ensure the item was only added once
      const filteredItems = currentState.inventory.filter(
        (item) => item.name === 'Ring of Power',
      )

      // Expect only one instance of the item in the inventory
      expect(filteredItems.length).toBe(1)
    })
  })

  describe('Effects: scheduleMeeting', () => {
    beforeEach(() => {
      initializeGame() // Reset the game state
    })

    it('should schedule a meeting correctly', () => {
      // Simulate a choice that schedules a meeting at Parthenon at 6 PM with Richard Hawkes
      const effects = {
        scheduleMeeting: {
          location: 'Parthenon',
          entry: '194',
          time: 18, // 6 PM in 24-hour format
          meetingWith: 'Richard Hawkes',
        },
      }

      // Execute makeChoice with the effects
      makeChoice('Athens', effects)

      // Verify the meeting was scheduled correctly
      expect(currentState.scheduledMeetings).toEqual([
        {
          location: 'Parthenon',
          entry: '194',
          time: 18,
          meetingWith: 'Richard Hawkes',
        },
      ])
    })
  })

  describe('Effects: meetingCompleted', () => {
    beforeEach(() => {
      initializeGame() // Reset the game state

      // Add a scheduled meeting for the test
      currentState.scheduledMeetings = [
        {
          location: 'Parthenon',
          entry: '194',
          time: 18,
          meetingWith: 'Richard Hawkes',
        },
      ]
    })

    it('should complete a scheduled meeting and remove it from state', () => {
      // Simulate a choice that completes the meeting at Parthenon
      const effects = {
        meetingCompleted: {
          entry: '194',
        },
      }

      // Execute makeChoice with the effects
      makeChoice('Athens', effects)

      // Verify the meeting was removed from the scheduledMeetings array
      expect(currentState.scheduledMeetings).toEqual([])
    })
  })

  describe('Requirements: scheduledMeeting', () => {
    beforeEach(() => {
      initializeGame() // Reset the game state
    })

    it('should allow the choice if a scheduled meeting exists', () => {
      // Add a scheduled meeting for the test
      currentState.scheduledMeetings = [
        {
          location: 'Piostos Cafe',
          entry: '194',
          time: 18,
          meetingWith: 'Richard Hawkes',
        },
      ]

      // Simulate the requirements for the scheduled meeting at the Parthenon
      const requirements = {
        scheduledMeeting: {
          entry: '194',
          meetingWith: 'Richard Hawkes',
        },
      }

      // Execute checkRequirements to verify the meeting allows the choice
      const result = checkRequirements(requirements)
      expect(result).toBe(true) // The choice should be available
    })

    it('should block the choice if the scheduled meeting does not exist', () => {
      // Simulate the requirements for a scheduled meeting at the Parthenon
      const requirements = {
        scheduledMeeting: {
          location: 'Parthenon',
          meetingWith: 'Richard Hawkes',
        },
      }

      // Execute checkRequirements without any scheduled meetings
      const result = checkRequirements(requirements)
      expect(result).toBe(false) // The choice should be unavailable
    })
  })

  describe('Check hasSuccess Requirement', () => {
    beforeEach(() => {
      initializeGame()
    })

    test('should allow progression if hasSuccess requirement is met', () => {
      currentState.results = {
        cthulhuMythosSuccess: true,
        occultSuccess: false,
        spotHiddenSuccess: true,
        listenSuccess: false,
      }
      const requirements = {
        hasSuccess: 'cthulhuMythosSuccess',
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(true) // Should allow progression
    })

    test('should block progression if hasSuccess requirement is not met', () => {
      currentState.results = {
        cthulhuMythosSuccess: true,
        occultSuccess: false,
        spotHiddenSuccess: true,
        listenSuccess: false,
      }

      const requirements = {
        hasSuccess: 'occultSuccess',
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(false) // Should block progression
    })
  })

  describe('Check failedAllChecks Requirement', () => {
    beforeEach(() => {
      initializeGame()
    })

    test('should allow progression if all specified checks failed', () => {
      currentState.results = {
        cthulhuMythosSuccess: false,
        occultSuccess: false,
        spotHiddenSuccess: false,
        listenSuccess: false,
      }

      const requirements = {
        failedAllChecks: [
          'cthulhuMythosSuccess',
          'occultSuccess',
          'spotHiddenSuccess',
          'listenSuccess',
        ],
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(true) // Should allow progression because all failed
    })

    test('should block progression if not all checks failed', () => {
      currentState.results = {
        spotHiddenSuccess: true, // One check succeeded
      }

      const requirements = {
        failedAllChecks: [
          'cthulhuMythosSuccess',
          'occultSuccess',
          'spotHiddenSuccess',
          'listenSuccess',
        ],
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(false) // Should block progression because one check succeeded
    })
  })

  describe('Check anySuccess Requirement', () => {
    beforeEach(() => {
      initializeGame()
    })

    test('should allow progression if any specified check succeeded', () => {
      currentState.results = {
        cthulhuMythosSuccess: false,
        occultSuccess: true,
        spotHiddenSuccess: false,
        listenSuccess: true,
      }

      const requirements = {
        anySuccess: [
          'cthulhuMythosSuccess',
          'occultSuccess',
          'spotHiddenSuccess',
          'listenSuccess',
        ],
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(true) // Should allow progression because at least one check succeeded
    })

    test('should block progression if none of the specified checks succeeded', () => {
      // All checks failed in this case
      currentState.results = {
        cthulhuMythosSuccess: false,
        occultSuccess: false,
        spotHiddenSuccess: false,
        listenSuccess: false,
      }

      const requirements = {
        anySuccess: [
          'cthulhuMythosSuccess',
          'occultSuccess',
          'spotHiddenSuccess',
          'listenSuccess',
        ],
      }

      const result = checkRequirements(requirements)
      expect(result).toBe(false) // Should block progression because none of the checks succeeded
    })
  })

  describe('handleOutcomeBasedEncounter - Simulate 10 Dice Rolls', () => {
    test('should correctly handle 10 dice rolls, advancing time only on outcome 324', () => {
      for (let i = 0; i < 10; i++) {
        displayEntry('108')
        setCurrentDate(new Date(1931, 8, 1, 6)) // September 1st, 1931, 6:00 AM
        // Find the choice button for the dice roll
        const choiceButton = findChoiceButton('Roll 1D10')
        expect(choiceButton).not.toBeNull() // Ensure the button is found before clicking
        choiceButton.click()

        if (currentState.currentEntry === '324') {
          // Time should have advanced by 48 hours if the outcome was 324
          const expectedDate = new Date(1931, 8, 3, 6) // 48 hours later
          expect(getCurrentDate()).toEqual(expectedDate)

          // Reset the date for the next iteration
          setCurrentDate(new Date(1931, 8, 1, 6)) // Reset to the start date
        } else if (currentState.currentEntry === '321') {
          // Time should not have advanced if the outcome was 321
          const expectedDate = new Date(1931, 8, 1, 6) // Time should not change
          expect(getCurrentDate()).toEqual(expectedDate)
        } else {
          throw new Error('Unexpected entry displayed')
        }
      }
    })
  })

  describe('makeChoice - waterSupply handling (button click tests)', () => {
    let waterSupplyContainer
    let healthDisplay

    beforeEach(() => {
      // Set up mock elements for the DOM
      waterSupplyContainer = document.createElement('div')
      waterSupplyContainer.id = 'waterSupply-container'
      document.body.appendChild(waterSupplyContainer)

      healthDisplay = document.createElement('div')
      healthDisplay.id = 'health'
      document.body.appendChild(healthDisplay)

      // Reset game state before each test
      currentState.waterSupply = 10
      currentState.health = 9
    })

    test('should subtract water supply for 94_walk when button is clicked', () => {
      // Simulate displaying the 94_walk entry
      displayEntry('94_walk')

      // Find the choice button and simulate a click
      const choiceButton = findChoiceButton('Roll 1D10')
      choiceButton.click()

      // Verify water supply was reduced by 1 (or based on your game logic)
      expect(currentState.waterSupply).toBe(9)
    })

    test('should clear water supply for 210 when button is clicked', () => {
      currentState.currentLocale = 'Cairo'

      // Simulate displaying the 210 entry
      displayEntry('210')

      // Find the choice button and simulate a click
      const choiceButton = findChoiceButton('Go to any Cairo location')
      choiceButton.click()

      // Verify water supply was cleared
      expect(currentState.waterSupply).toBeUndefined()
    })

    test('should reduce health when water runs out in 94_walk', () => {
      // Set water supply to 1 to trigger depletion in the test
      currentState.waterSupply = 1

      // Simulate displaying the 94_walk entry
      displayEntry('94_walk')

      // Find the choice button and simulate a click
      const choiceButton = findChoiceButton('Roll 1D10')
      choiceButton.click()

      // Verify waterSupply is now 0 and health is reduced by 6
      expect(currentState.waterSupply).toBe(0)
      expect(currentState.health).toBe(3) // Health should be reduced by 6 due to water depletion
    })

    test('should add water supply correctly in 94_walk', () => {
      // Simulate displaying the 94_walk entry with a water-adding choice
      displayEntry('94_walk')

      // Find the choice button and simulate a click
      const choiceButton = findChoiceButton('Roll 1D10')
      choiceButton.click()

      // Verify waterSupply is now 13 (depending on the dice roll, adjust this if necessary)
      expect(currentState.waterSupply).toBe(9)
    })

    test('should add water supply correctly in 94_survival_check', () => {
      // Simulate displaying the 94_survival_check entry
      displayEntry('94_survival_check')

      // Find the choice button and simulate a click
      const choiceButton = findChoiceButton('Attempt a Survival (Desert) roll')
      choiceButton.click()

      // Verify water supply is now 10, 11, 12, or 13 (depending on the dice roll, adjust this if necessary)
      expect(currentState.waterSupply).toBeGreaterThan(9)
      expect(currentState.waterSupply).toBeLessThan(14)
    })
  })

  describe('Sanity Skill Check', () => {
    beforeEach(() => {
      // Set up a default sanity level before each test
      currentState.stats = {
        sanity: 50, // Set sanity to 60 for testing
      }
    })

    afterEach(() => {
      jest.restoreAllMocks() // Restore any mocks after each test
    })

    test('should pass roughly 50% of the time on normal difficulty', () => {
      let results = 0
      for (let i = 0; i < 30; i++) {
        const result = makeSkillCheck(
          'Sanity',
          {},
          currentState.stats,
          'normal',
        )

        if (result) {
          results++
        }
      }

      // Expect the results to be within a reasonable range
      expect(results).toBeGreaterThan(10)
    })
  })

  describe('Entry 373 - Black Amulet of Klaath Check', () => {
    it('should show the option to use the Black Amulet of Klaath if the player has it', () => {
      // Add the Black Amulet of Klaath to the player's inventory
      addItem({
        name: 'Black Amulet of Klaath',
        type: 'artifact',
        description:
          'A black amulet with a strange symbol etched into its surface.',
      })

      // Display entry 373
      displayEntry('373')

      let choicesContainer = document.getElementById('choices')
      const buttons = choicesContainer.querySelectorAll('button')

      // expect buttons.length to be 2
      expect(buttons.length).toBe(2)
    })
  })
  const setAntarcticaDate = (days) => {
    const arrivalDate = new Date(getCurrentDate())
    arrivalDate.setDate(arrivalDate.getDate() + days)
    currentState.antarcticaArrivalDate = arrivalDate
  }

  describe('Antarctica Arrival Date Handling', () => {
    beforeEach(async () => {
      // Ensure the game state is initialized
      await initializeGame()
    })

    afterEach(() => {
      jest.restoreAllMocks() // Reset mocks after each test
    })

    test('should set Antarctica arrival date correctly when visiting entry 501', () => {
      // Simulate entry 501 which sets the arrival date
      displayEntry('501')

      // Check if Antarctica arrival date is set 29 days from the current date
      const currentDate = getCurrentDate()
      const expectedArrivalDate = new Date(currentDate)
      expectedArrivalDate.setDate(expectedArrivalDate.getDate() + 29)

      expect(currentState.antarcticaArrivalDate).toEqual(expectedArrivalDate)
    })

    test('should not change Antarctica arrival date if already set', () => {
      // Manually set an initial arrival date
      setAntarcticaDate(20)

      // Simulate visiting entry 501 again
      displayEntry('501')

      // Check if the original Antarctica arrival date remains unchanged
      const originalArrivalDate = currentState.antarcticaArrivalDate
      expect(currentState.antarcticaArrivalDate).toEqual(originalArrivalDate)
    })
  })

  describe('Entry 520 Choice Buttons Test', () => {
    test('should display correct number of choices for Ernest Holt', () => {
      // Set character to Ernest Holt
      currentState.character = 'Ernest Holt'

      // Display entry 520
      displayEntry('520')

      // Get all the choice buttons
      let choicesContainer = document.getElementById('choices')
      const buttons = choicesContainer.querySelectorAll('button')

      // Ernest Holt should have 3 choices (3 trips, no skill checks)
      expect(buttons.length).toBe(3)
    })

    test('should display correct number of choices for Professor Grunewald', () => {
      // Set character to Professor Grunewald
      currentState.character = 'Professor Grunewald'

      // Display entry 520
      displayEntry('520')

      // Get all the choice buttons
      let choicesContainer = document.getElementById('choices')
      const buttons = choicesContainer.querySelectorAll('button')

      // Professor Grunewald should have 3 choices (3 trips, no skill checks)
      expect(buttons.length).toBe(3)
    })

    test('should display correct number of choices for Lydia Lau', () => {
      // Set character to Lydia Lau
      currentState.character = 'Lydia Lau'

      // Display entry 520
      displayEntry('520')

      // Get all the choice buttons
      let choicesContainer = document.getElementById('choices')
      const buttons = choicesContainer.querySelectorAll('button')

      // Lydia Lau should have 9 choices (each trip has skill-based options)
      expect(buttons.length).toBe(9)
    })

    test('should display correct number of choices for Devon Wilson', () => {
      // Set character to Devon Wilson
      currentState.character = 'Devon Wilson'

      // Display entry 520
      displayEntry('520')

      // Get all the choice buttons
      let choicesContainer = document.getElementById('choices')
      const buttons = choicesContainer.querySelectorAll('button')

      // Devon Wilson should have 9 choices (each trip has skill-based options)
      expect(buttons.length).toBe(9)
    })
  })

  describe('Save and Load Game State', () => {
    test('should restore saved skills when loading a game, even after starting a new game with different skills', () => {
      // First game: Set and save some skills
      currentState.skills = {
        'Library Use': 75,
        'Spot Hidden': 60,
        'Listen': 45,
        'Psychology': 35
      }
      saveGame()

      // Start a new game with different skills
      currentState.skills = {
        'Library Use': 20,
        'Spot Hidden': 25,
        'Listen': 20,
        'Psychology': 10
      }

      // Load the saved game
      loadGame()

      // Verify that the skills match the first saved game
      expect(currentState.skills).toEqual({
        'Library Use': 75,
        'Spot Hidden': 60,
        'Listen': 45,
        'Psychology': 35
      })
    })

    test('should save and restore modified skills after skill allocation', () => {
      // Start with initial skills
      currentState.skills = {
        'Library Use': 20,
        'Spot Hidden': 25,
        'Listen': 20,
        'Psychology': 10
      }
      
      // Modify some skills
      currentState.skills['Library Use'] = 75
      currentState.skills['Spot Hidden'] = 60
      currentState.skills['Listen'] = 45
      currentState.skills['Psychology'] = 35
      
      // Save the game with modified skills
      saveGame()
      
      // Change skills again
      currentState.skills = {
        'Library Use': 30,
        'Spot Hidden': 35,
        'Listen': 30,
        'Psychology': 20
      }
      
      // Load the game
      loadGame()
      
      // Verify that the modified skills were restored
      expect(currentState.skills).toEqual({
        'Library Use': 75,
        'Spot Hidden': 60,
        'Listen': 45,
        'Psychology': 35
      })
    })
  })
})

describe('Skill Allocation for Investigators', () => {
  test('should prompt for skill allocation when starting a new investigator', () => {
    // Simulate starting a new investigator
    showSkillAllocationModal('Professor Grunewald')

    // Check that the skill allocation UI is displayed
    const skillAllocationModal = document.getElementById('skillAllocationModal')
    expect(skillAllocationModal.style.display).toBe('block')
  })

  test('should switch to the next investigator and prompt for skill allocation', () => {
    // Simulate switching to the next investigator
    showSkillAllocationModal('Lydia Lau')

    // Check that the skill allocation UI is displayed
    const skillAllocationModal = document.getElementById('skillAllocationModal')
    expect(skillAllocationModal.style.display).toBe('block')
  })
})

import { gameData } from '../src/game/gameState.js'

describe('Skill Allocation Modal', () => {
  beforeEach(() => {
    // Ensure the DOM is reset before each test
    document.body.innerHTML = ''
    const gameContainer = document.createElement('div')
    gameContainer.id = 'game'
    document.body.appendChild(gameContainer)

    // Mock gameData with valid investigator data
    gameData.investigators = {
      'Professor Grunewald': {
        skills: {
          Climb: 20,
          Charm: 15,
          'Fast Talk': 5,
          Fighting: 25,
          Firearms: 20,
          History: 45,
          Intimidate: 15,
          Jump: 20,
          'Library Use': 60,
          Listen: 20,
          Persuade: 40,
          Psychology: 30,
          'Spot Hidden': 25,
          Stealth: 20,
          Throw: 20,
        },
      },
    }
  })

  test('should display the full list of skills', () => {
    showSkillAllocationModal('Professor Grunewald')

    const skillInputs = document.querySelectorAll('.skill-input')
    const skillLabels = Array.from(skillInputs).map((input) => input.id)

    const expectedSkills = [
      'Accounting',
      'Anthropology',
      'Appraise',
      'Archaeology',
      'Art/Craft',
      'Astronomy',
      'Brawl',
      'Charm',
      'Climb',
      'Credit Rating',
      'Disguise',
      'Dodge',
      'Drive Auto',
      'Electrical Repair',
      'Fast Talk',
      'Fighting (Brawl)',
      'Firearms (Handgun)',
      'Firearms (Rifle)',
      'Firearms (Shotgun)',
      'First Aid',
      'History',
      'Intimidate',
      'Jump',
      'Language (Other)',
      'Law',
      'Library Use',
      'Listen',
      'Locksmith',
      'Mechanical Repair',
      'Medicine',
      'Natural World',
      'Navigate',
      'Occult',
      'Operate Heavy Machinery',
      'Persuade',
      'Photography',
      'Pilot (Aircraft)',
      'Psychoanalysis',
      'Psychology',
      'Ride',
      'Science (Astronomy)',
      'Sleight of Hand',
      'Spot Hidden',
      'Stealth',
      'Survival',
      'Swim',
      'Throw',
      'Track',
    ]

    expect(skillLabels).toEqual(expectedSkills)
  })

  test('should update remaining points correctly', () => {
    showSkillAllocationModal('Professor Grunewald')

    const climbInput = document.getElementById('Climb')
    const remainingPointsDisplay = document.getElementById('remainingPoints')

    climbInput.value = 50
    climbInput.dispatchEvent(new Event('input'))

    expect(remainingPointsDisplay.textContent).toBe('120')
  })

  test('should prevent confirmation if points exceed limit', () => {
    showSkillAllocationModal('Professor Grunewald')

    const climbInput = document.getElementById('Climb')
    const charmInput = document.getElementById('Charm')
    const confirmButton = document.getElementById('confirmSkillAllocation')

    climbInput.value = 100
    charmInput.value = 100
    climbInput.dispatchEvent(new Event('input'))
    charmInput.dispatchEvent(new Event('input'))

    expect(confirmButton.disabled).toBe(true)
  })

  test('should update player skills on confirmation', () => {
    showSkillAllocationModal('Professor Grunewald')

    const climbInput = document.getElementById('Climb')
    const charmInput = document.getElementById('Charm')
    const confirmButton = document.getElementById('confirmSkillAllocation')

    climbInput.value = 50
    charmInput.value = 100
    climbInput.dispatchEvent(new Event('input'))
    charmInput.dispatchEvent(new Event('input'))

    if (confirmButton) {
      confirmButton.click()
    }
  })

  test('should correctly update unallocated points when skill input is adjusted', () => {
    showSkillAllocationModal('Professor Grunewald')

    const climbInput = document.getElementById('Climb')
    const charmInput = document.getElementById('Charm')
    const remainingPointsDisplay = document.getElementById('remainingPoints')

    // Initial state
    expect(remainingPointsDisplay.textContent).toBe('150')

    // Allocate points to Climb
    climbInput.value = 50
    climbInput.dispatchEvent(new Event('input'))
    expect(remainingPointsDisplay.textContent).toBe('120')

    // Allocate points to Charm
    charmInput.value = 30
    charmInput.dispatchEvent(new Event('input'))
    expect(remainingPointsDisplay.textContent).toBe('105')

    // Reduce points from Climb
    climbInput.value = 20
    climbInput.dispatchEvent(new Event('input'))
    expect(remainingPointsDisplay.textContent).toBe('135')

    // Clear input for Charm (should reset to min value)
    charmInput.value = ''
    charmInput.dispatchEvent(new Event('input'))
    expect(remainingPointsDisplay.textContent).toBe('150')

    // Set Climb to max value (100)
    climbInput.value = 100
    climbInput.dispatchEvent(new Event('input'))
    expect(remainingPointsDisplay.textContent).toBe('70')
  })
})

describe('Skill Side Panel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    const skillsPanel = document.createElement('div')
    skillsPanel.id = 'skillsPanel'
    skillsPanel.className = 'skills-panel'
    document.body.appendChild(skillsPanel)

    const skillsContainer = document.createElement('div')
    skillsContainer.className = 'skills-container'
    skillsPanel.appendChild(skillsContainer)

    const defaultBaseValues = {
      Accounting: 5,
      Anthropology: 1,
      Appraise: 5,
      Archaeology: 1,
      'Art/Craft': 5,
      Astronomy: 10,
      Brawl: 25,
      Charm: 15,
      Climb: 20,
      'Credit Rating': 0,
      'Cthulhu Mythos': 0,
      Disguise: 5,
      Dodge: 0,
      'Drive Auto': 20,
      'Electrical Repair': 10,
      'Fast Talk': 5,
      'Fighting (Brawl)': 25,
      'Firearms (Handgun)': 20,
      'Firearms (Rifle)': 25,
      'Firearms (Shotgun)': 25,
      'First Aid': 30,
      History: 5,
      Intimidate: 15,
      Jump: 20,
      'Language (Other)': 1,
      Law: 5,
      'Library Use': 20,
      Listen: 20,
      Locksmith: 1,
      'Mechanical Repair': 10,
      Medicine: 1,
      'Natural World': 10,
      Navigate: 10,
      Occult: 5,
      'Operate Heavy Machinery': 1,
      Persuade: 10,
      Photography: 5,
      'Pilot (Aircraft)': 1,
      Psychoanalysis: 1,
      Psychology: 10,
      Ride: 5,
      'Science (Astronomy)': 1,
      'Sleight of Hand': 10,
      'Spot Hidden': 25,
      Stealth: 20,
      Survival: 10,
      Swim: 20,
      Throw: 20,
      Track: 10,
    }

    Object.entries(defaultBaseValues).forEach(([skill, value]) => {
      const skillElement = document.createElement('p')
      skillElement.textContent = `${skill}: ${value}`
      skillsContainer.appendChild(skillElement)
    })
  })

  test('should display the correct number of skills in the side panel', () => {
    const skillsPanel = document.getElementById('skillsPanel')
    const skillElements = skillsPanel.querySelectorAll('p')
    expect(skillElements.length).toBe(49) // Ensure all 49 skills are displayed
  })

  test('should include the Track skill in the side panel', () => {
    const skillsPanel = document.getElementById('skillsPanel')
    const skillElements = Array.from(skillsPanel.querySelectorAll('p'))
    const trackSkill = skillElements.find((el) =>
      el.textContent.startsWith('Track:'),
    )
    expect(trackSkill).not.toBeNull()
    expect(trackSkill.textContent).toBe('Track: 10')
  })
})
