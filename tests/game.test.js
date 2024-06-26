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
const weaponsData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/weapons.json')),
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

  describe('Basic Gameplay Features', () => {
    test('should update health correctly', () => {
      updateHealth(10)
      expect(currentState.health).toBe(110)
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
          expect(document.getElementById('date').innerText).toContain(
            'Wed Sep 02 1931',
          ) // Date should advance by one day
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
      displayEntry('102')
      const choices = document.getElementById('choices').children
      expect(choices.length).toBe(1)

      displayEntry('168')
      const choicesPartTwo = document.getElementById('choices').children
      expect(choicesPartTwo.length).toBe(1)
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
      displayEntry('38')

      const buyButton = Array.from(
        document.querySelectorAll('#choices button'),
      ).find((btn) => btn.innerText.includes('Buy .38 Revolver'))

      if (buyButton) buyButton.click()
      expect(currentState.inventory).toContain('.38 Revolver')
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
})
