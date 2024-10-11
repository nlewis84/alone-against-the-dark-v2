const fs = require('fs')

// Load the missingEntries.json file
const missingEntriesPath = './output/missingEntries.json' // Replace with your actual file path
const outputFilePath = './output/missingEntries.json' // Output file for the cleaned list

// City names and "Location" combinations to be removed
const citiesToRemove = [
  'New York',
  'Athens',
  'Alexandria',
  'Cairo',
  'Bremen',
  'Arkham Location',
  'Athens Location',
  'Alexandria Location',
  'Cairo Location',
  'Bremen Location',
  'New York Location',
]

// Read the missingEntries.json file
fs.readFile(missingEntriesPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err)
    return
  }

  // Parse the JSON data
  let missingEntries = JSON.parse(data)

  // Remove city names and "Location" combinations
  missingEntries = missingEntries.filter(
    (entry) => !citiesToRemove.includes(entry),
  )

  // Sort the remaining entries
  missingEntries.sort()

  // Write the cleaned and sorted entries to a new file
  fs.writeFile(
    outputFilePath,
    JSON.stringify(missingEntries, null, 2),
    'utf8',
    (err) => {
      if (err) {
        console.error('Error writing the file:', err)
        return
      }
      console.log(
        `Cleaned and sorted missing entries saved to ${outputFilePath}`,
      )
    },
  )
})
