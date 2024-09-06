export function rollDice(input) {
  // Check if the input is a string, indicating a complex dice roll like "2D6"
  if (typeof input === 'string') {
    const parts = input.split('D')
    if (parts.length === 2) {
      const numDice = parseInt(parts[0], 10)
      const diceSides = parseInt(parts[1], 10)
      let total = 0
      for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * diceSides) + 1
      }
      return total
    }
    // If the format is incorrect, log an error and return a default safe value (such as 0)
    console.error(
      "Invalid dice format. Expected format 'XDY' where X and Y are numbers.",
    )
    return 0
  } else if (typeof input === 'number') {
    // Handle the case where input is a number, implying a roll of a single die with that many sides
    return Math.floor(Math.random() * input) + 1
  }

  // Log an error if the input type is neither a string nor a number
  console.error(
    "Invalid input for rollDice. Expected a number or a string in the format 'XDY'.",
  )
  return 0
}

export function makeSkillCheck(skill, skills, stats, difficulty = 'normal') {
  const skillValue = skills[skill] !== undefined ? skills[skill] : stats[skill]
  let difficultyModifier = 1
  if (difficulty === 'hard') difficultyModifier = 0.5
  if (difficulty === 'extreme') difficultyModifier = 0.2
  const diceRoll = rollDice(100)
  const success = diceRoll <= skillValue * difficultyModifier
  // Construct roll message and result message
  const rollMessage = `Rolled ${diceRoll} against a ${skill} value of ${skillValue * difficultyModifier}`
  const resultMessage = success ? 'Skill check passed!' : 'Skill check failed!'

  // Update the skill check marker with the roll result and outcome
  updateMarker('skillCheckMarker', `${rollMessage}. ${resultMessage}`)

  return success
}

export function updateMarker(markerId, message) {
  const marker = document.getElementById(markerId)

  if (marker) {
    marker.innerText = message
    marker.style.display = 'block'
    setTimeout(() => {
      marker.style.display = 'none'
    }, 6000)
  }
}
