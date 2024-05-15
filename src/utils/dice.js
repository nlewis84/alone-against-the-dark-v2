export function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function makeSkillCheck(skill, skills, stats) {
  const roll = rollDice(100);
  const skillLevel = skills[skill] !== undefined ? skills[skill] : stats[skill];
  return roll <= skillLevel;
}
