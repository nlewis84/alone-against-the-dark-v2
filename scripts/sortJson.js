const fs = require('fs')

// Read the JSON file
const jsonData = require('../data/entries.json')

// Function to recursively sort object keys
function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObject)
  }
  const sortedKeys = Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObject(obj[key])
      return result
    }, {})
  return sortedKeys
}

// Sort the JSON data
const sortedJson = sortObject(jsonData)

// Write the sorted JSON back to file
fs.writeFileSync('./sorted_output.json', JSON.stringify(sortedJson, null, 2))
