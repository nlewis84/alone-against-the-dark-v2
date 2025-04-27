import { initializeGame, gameData, currentState } from './gameState.js'
import { saveGame, loadGame, checkRequirements } from './gameActions.js'

// Add a function to create and manage the skill allocation modal
export function showSkillAllocationModal(investigatorName) {
  if (!gameData.investigators[investigatorName]) {
    console.error(`Investigator '${investigatorName}' not found in gameData.`)
    return
  }

  const investigatorData = gameData.investigators[investigatorName]
  let modal = document.getElementById('skillAllocationModal')

  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'skillAllocationModal'
    modal.className = 'modal-overlay'
    modal.style.zIndex = '1000'
    modal.style.position = 'fixed'
    modal.style.top = '50%'
    modal.style.left = '50%'
    modal.style.transform = 'translate(-50%, -50%)'
    modal.style.backgroundColor = 'white'
    modal.style.padding = '20px'
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)'
    modal.style.borderRadius = '8px'
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Allocate Skill Points</h2>
        <p>You have <span id="remainingPoints">150</span> points to allocate to your skills.</p>
        <div id="skillInputs">
          ${generateSkillInputs(investigatorData.skills)}
        </div>
        <button id="confirmSkillAllocation" class="btn-primary">Confirm</button>
      </div>
    `
    document.body.appendChild(modal)

    const skillInputs = modal.querySelectorAll('.skill-input')
    const remainingPointsDisplay = document.getElementById('remainingPoints')

    skillInputs.forEach((input) => {
      input.addEventListener('input', () => {
        const totalAllocated = Array.from(skillInputs).reduce(
          (sum, input) =>
            sum +
            Math.max(0, parseInt(input.value || 0) - parseInt(input.min || 0)),
          0,
        )

        const remainingPoints = currentState.unallocatedPoints - totalAllocated
        remainingPointsDisplay.textContent = remainingPoints

        if (remainingPoints < 0) {
          remainingPointsDisplay.style.color = 'red'
          document.getElementById('confirmSkillAllocation').disabled = true
        } else {
          remainingPointsDisplay.style.color = 'black'
          document.getElementById('confirmSkillAllocation').disabled = false
        }
      })
    })

    // Prevent assigning points to Cthulhu Mythos
    skillInputs.forEach((input) => {
      if (input.id === 'Cthulhu Mythos') {
        input.disabled = true
        input.value = 0 // Ensure it remains at 0
      }
    })

    document
      .getElementById('confirmSkillAllocation')
      .addEventListener('click', () => {
        const remainingPoints = parseInt(remainingPointsDisplay.textContent)
        if (remainingPoints === 0) {
          const allocatedSkills = {}
          skillInputs.forEach((input) => {
            allocatedSkills[input.id] = parseInt(input.value || input.min)
          })

          // Ensure the modal is hidden after confirming skill allocation
          modal.style.display = 'none'
          console.log('Skill allocation modal hidden.')

          // Update the skills side panel with the allocated skills
          const skillsPanel = document.getElementById('skillsPanel')
          if (skillsPanel) {
            const skillsContainer =
              skillsPanel.querySelector('.skills-container')
            if (skillsContainer) {
              // Ensure Cthulhu Mythos is included in the skills side panel
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
                Track: 10, // Added missing Track skill
              }

              const updatedSkills = { ...defaultBaseValues, ...allocatedSkills }
              const skillEntries = Object.entries(updatedSkills)

              skillsContainer.innerHTML = ''
              const columnCount = 2
              const skillsPerColumn = Math.ceil(
                skillEntries.length / columnCount,
              )

              for (let i = 0; i < columnCount; i++) {
                const column = document.createElement('div')
                column.className = 'skills-column'
                const start = i * skillsPerColumn
                const end = start + skillsPerColumn
                skillEntries.slice(start, end).forEach(([skill, value]) => {
                  const skillElement = document.createElement('p')
                  skillElement.textContent = `${skill}: ${value}`
                  column.appendChild(skillElement)
                })
                skillsContainer.appendChild(column)
              }
            }
          }
        } else {
          // Replace alert with a DOM-based error message
          let errorMessage = document.getElementById('errorMessage')
          if (!errorMessage) {
            errorMessage = document.createElement('p')
            errorMessage.id = 'errorMessage'
            errorMessage.style.color = 'red'
            modal.appendChild(errorMessage)
          }
          errorMessage.textContent =
            'Please allocate all skill points before confirming.'
        }
      })
    modal.style.display = 'none' // Ensure the modal is hidden after initialization
  }

  modal.style.display = 'block'
}

function generateSkillInputs(skills) {
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
    Track: 10, // Added missing Track skill
  }

  // Filter out Cthulhu Mythos only in the skill allocation modal
  const filteredSkills = Object.keys(defaultBaseValues).filter(
    (skill) => skill !== 'Cthulhu Mythos',
  )

  const skillEntries = filteredSkills.map((skill) => {
    const currentValue = skills[skill] || defaultBaseValues[skill]
    return { skill, value: currentValue, min: currentValue }
  })

  const columnCount = 3 // Adjusted to 3 columns
  const skillsPerColumn = Math.ceil(skillEntries.length / columnCount)

  const columns = Array.from({ length: columnCount }, (_, colIndex) => {
    const start = colIndex * skillsPerColumn
    const end = start + skillsPerColumn
    const columnSkills = skillEntries.slice(start, end)

    return `
      <div class="skill-column">
        ${columnSkills
          .map(
            ({ skill, value, min }) => `
          <div class="skill-row">
            <label for="${skill}">${skill}</label>
            <input type="number" id="${skill}" class="skill-input" min="${min}" max="150" value="${value}">
          </div>
        `,
          )
          .join('')}
      </div>
    `
  })

  return `<div class="skill-columns">${columns.join('')}</div>`
}

// Updated modal styling
const modalStyle = document.createElement('style')
modalStyle.textContent = `
    .modal-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 90%; /* Increased width */
      max-width: 1000px; /* Allow more space */
      height: auto;
      background-color: #fff;
      border: 2px solid #d4af37;
      border-radius: 10px;
      padding: 2rem;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      font-family: 'Cinzel', serif;
    }

    .modal-content h2 {
      font-size: 1.5rem;
      color: #333;
      margin-bottom: 1rem;
      text-transform: uppercase;
      border-bottom: 2px solid #d4af37;
      padding-bottom: 0.5rem;
    }

    .modal-content p {
      font-size: 1rem;
      color: #555;
      margin-bottom: 1.5rem;
    }

    .skill-columns {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
    }

    .skill-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0 1rem;
      border-left: 1px solid #d4af37;
    }

    .skill-column:first-child {
      border-left: none;
    }

    .btn-primary {
      background-color: #d4af37;
      color: black;
      border: 2px solid #b38e2e;
      padding: 0.5rem 1rem;
      border-radius: 5px;
      font-family: 'Cinzel', serif;
      font-size: 1rem;
      text-transform: uppercase;
      transition: background-color 0.3s, border-color 0.3s;
      cursor: pointer;
    }

    .btn-primary:hover {
      background-color: #b38e2e;
      border-color: #a07c27;
    }

    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .skill-row label {
      flex: 1;
      font-weight: bold;
      color: #333;
    }

    .skill-row input {
      flex: 0 0 50px; /* Adjusted width for square-like appearance */
      text-align: center;
      padding: 0; /* Removed unnecessary padding */
      height: 30px; /* Ensures a square-like shape */
      border: 1px solid #b38e2e;
      border-radius: 3px;
      font-size: 1rem;
    }

    .btn-confirm {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      background-color: #d4af37;
      color: black;
      border: 2px solid #b38e2e;
      padding: 0.5rem 1rem;
      border-radius: 5px;
      font-family: 'Cinzel', serif;
      font-size: 1rem;
      text-transform: uppercase;
      transition: background-color 0.3s, border-color 0.3s;
      cursor: pointer;
    }

    .btn-confirm:hover {
      background-color: #b38e2e;
      border-color: #a07c27;
    }
  `
document.head.appendChild(modalStyle)

// Add a button to toggle the visibility of the skillsDisplay
const header = document.getElementById('header')
if (header) {
  const toggleSkillsButton = document.createElement('button')
  toggleSkillsButton.id = 'toggleSkillsButton'
  toggleSkillsButton.textContent = 'Skills'
  toggleSkillsButton.className = 'btn-primary'

  header.appendChild(toggleSkillsButton)

  toggleSkillsButton.addEventListener('click', () => {
    const skillsPanel = document.getElementById('skillsPanel')
    if (skillsPanel) {
      if (skillsPanel.classList.contains('open')) {
        skillsPanel.classList.remove('open')
        toggleSkillsButton.textContent = 'Skills'
      } else {
        skillsPanel.classList.add('open')
        toggleSkillsButton.textContent = 'Close Skills'
      }
    }
  })
}

// Create the skillsPanel if it doesn't exist
let skillsPanel = document.getElementById('skillsPanel')
if (!skillsPanel) {
  skillsPanel = document.createElement('div')
  skillsPanel.id = 'skillsPanel'
  skillsPanel.className = 'skills-panel'
  document.body.appendChild(skillsPanel)

  // Populate the skillsPanel with skills in 3-4 columns
  skillsPanel.innerHTML = '<h2>Skills</h2>'
  const skillsContainer = document.createElement('div')
  skillsContainer.className = 'skills-container'

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
    Track: 10, // Added missing Track skill
  }

  const skillEntries = Object.entries(defaultBaseValues)
  const filteredSkills = skillEntries.filter(
    ([skill]) => skill !== 'Cthulhu Mythos',
  )
  const columnCount = 2
  const skillsPerColumn = Math.ceil(filteredSkills.length / columnCount) + 1

  for (let i = 0; i < columnCount; i++) {
    const column = document.createElement('div')
    column.className = 'skills-column'
    const start = i * skillsPerColumn
    const end = start + skillsPerColumn
    filteredSkills.slice(start, end).forEach(([skill, value]) => {
      const skillElement = document.createElement('p')
      skillElement.textContent = `${skill}: ${value}`
      column.appendChild(skillElement)
    })
    skillsContainer.appendChild(column)
  }

  skillsPanel.appendChild(skillsContainer)

  // Add a close button to the skillsPanel
  const closeSkillsButton = document.createElement('button')
  closeSkillsButton.id = 'closeSkillsButton'
  closeSkillsButton.className = 'close-btn'
  closeSkillsButton.textContent = '\u00D7' // Unicode for '×'
  skillsPanel.appendChild(closeSkillsButton)

  closeSkillsButton.addEventListener('click', () => {
    skillsPanel.classList.remove('open')
    toggleSkillsButton.textContent = 'Skills'
  })

  // Adjust skillsContainer to display two columns
  skillsContainer.innerHTML = ''
  for (let i = 0; i < columnCount; i++) {
    const column = document.createElement('div')
    column.className = 'skills-column'
    const start = i * skillsPerColumn
    const end = start + skillsPerColumn
    skillEntries.slice(start, end).forEach(([skill, value]) => {
      const skillElement = document.createElement('p')
      skillElement.textContent = `${skill}: ${value}`
      column.appendChild(skillElement)
    })
    skillsContainer.appendChild(column)
  }
}

export function displayEntry(entryId) {
  const entry = gameData.entries[entryId]
  if (!entry) {
    console.error(`Entry with ID ${entryId} not found`)
    document.getElementById('description').innerText =
      `Error: Entry with ID ${entryId} not found.`
    return
  }

  document.getElementById('description').innerText = entry.description

  const choicesDiv = document.getElementById('choices')
  choicesDiv.innerHTML = ''

  entry.choices.forEach((choice) => {
    if (checkRequirements(choice.requirements)) {
      const button = document.createElement('button')
      button.innerText = choice.text
      button.onclick = () => displayEntry(choice.nextEntry)
      choicesDiv.appendChild(button)
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initializeGame()

  document.getElementById('saveButton').onclick = saveGame
  document.getElementById('loadButton').onclick = loadGame
})
