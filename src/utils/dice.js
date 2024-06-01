export function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1
}

export function makeSkillCheck(skill, skills, stats, difficulty = 'normal') {
  const roll = rollDice(100)
  const skillLevel = skills[skill] !== undefined ? skills[skill] : stats[skill]
  let requiredValue = skillLevel

  switch (difficulty) {
    case 'hard':
      requiredValue = Math.floor(skillLevel / 2)
      break
    case 'extreme':
      requiredValue = Math.floor(skillLevel / 5)
      break
    default:
      requiredValue = skillLevel
      break
  }

  console.log(
    `Rolled: ${roll}, Required for ${difficulty} check: ${requiredValue}`,
  )
  return roll <= requiredValue
}
