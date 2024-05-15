export function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function makeSkillCheck(skill, skills) {
  const roll = rollDice(100);
  const skillLevel = skills[skill];
  return roll <= skillLevel;
}
