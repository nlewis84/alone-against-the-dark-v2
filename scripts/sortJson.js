const fs = require('fs')
const path = require('path')

// Load JSON data
const jsonData = require(path.join(__dirname, '../data/entries.json'))

// Custom sorting function for enhanced alphanumeric sorting
function customSort(a, b) {
  const regex = /^(\d+)(\D*)/ // This will capture any non-digit characters following the initial number sequence.

  const matchA = a.match(regex)
  const matchB = b.match(regex)

  const numA = parseInt(matchA[1], 10)
  const numB = parseInt(matchB[1], 10)
  if (numA !== numB) return numA - numB

  const suffixA = matchA[2]
  const suffixB = matchB[2]
  return suffixA.localeCompare(suffixB)
}

// Sort the top-level keys of jsonData and rebuild the JSON object
const sortedKeys = Object.keys(jsonData).sort(customSort)
console.log(sortedKeys) // Debug: print sorted keys

const sortedJson = {}
sortedKeys.forEach((key) => {
  sortedJson[key] = jsonData[key]
})

// Write the sorted JSON back to the file
fs.writeFileSync(
  path.join(__dirname, '../data/sorted_entries.json'),
  JSON.stringify(sortedJson, null, 2),
  'utf8',
)
console.log('Top-level entries sorted and saved to sorted_entries.json')
