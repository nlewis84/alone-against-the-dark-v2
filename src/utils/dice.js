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

export function makeSkillCheck(
  skill,
  skills,
  stats,
  difficulty = 'normal',
  tries = null,
  opposedValue = null,
  bonus = 0,
) {
  let skillValue = skills[skill] !== undefined ? skills[skill] : stats[skill]

  skillValue += bonus

  let difficultyModifier = 1

  if (difficulty === 'hard') difficultyModifier = 0.5
  if (difficulty === 'extreme') difficultyModifier = 0.2

  // Function to check if the player wins the opposed roll
  const isOpposedSuccess = (diceRoll, opposedValue) => {
    return (
      diceRoll <= skillValue * difficultyModifier && diceRoll <= opposedValue
    )
  }

  // Handle tries if provided
  if (tries !== null) {
    const parsedTries = rollDice(tries)
    let remainingTries = parsedTries
    while (remainingTries > 0) {
      const diceRoll = rollDice(100)
      const success = opposedValue
        ? isOpposedSuccess(diceRoll, opposedValue)
        : diceRoll <= skillValue * difficultyModifier

      const rollMessage = `${diceRoll}`
      const resultMessage = success ? 'Pass' : 'Fail'

      if (success) {
        updateMarker(
          'skillCheckMarker',
          `${rollMessage} ${resultMessage} (passed on try ${parsedTries - remainingTries + 1})`,
        )
        return success // Return true if success
      }

      remainingTries--
    }

    updateMarker('skillCheckMarker', `Failed ${parsedTries} times.`)
    return false // Return false if all tries fail
  } else {
    // Standard single roll case
    const diceRoll = rollDice(100)
    const success = opposedValue
      ? isOpposedSuccess(diceRoll, opposedValue)
      : diceRoll <= skillValue * difficultyModifier

    const rollMessage = `${diceRoll}`
    const resultMessage = success ? 'Pass' : 'Fail'

    updateMarker('skillCheckMarker', `${rollMessage} ${resultMessage}`)
    return success // Return true/false based on the check
  }
}

export function updateMarker(markerId, message) {
  const markers = document.querySelectorAll(
    '#healthMarker, #sanityMarker, #skillCheckMarker',
  )

  // Hide all other markers
  markers.forEach((marker) => {
    marker.style.opacity = '0' // Set opacity to 0 to fade out
    marker.style.display = 'none' // Make sure it's hidden
  })

  // Display the new marker
  const marker = document.getElementById(markerId)
  if (marker) {
    marker.innerText = message
    marker.style.opacity = '1' // Fade in
    marker.style.display = 'block' // Make sure it's visible

    // Fade out after 6 seconds
    setTimeout(() => {
      marker.style.opacity = '0' // Fade out
    }, 6000)

    // Hide after the transition is complete
    setTimeout(() => {
      marker.style.display = 'none'
    }, 7000)
  }
}
