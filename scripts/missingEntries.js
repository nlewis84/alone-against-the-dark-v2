const fs = require('fs')

// Load the topLevelKeys.json and nextEntries.json files
const topLevelKeysPath = './output/topLevelKeys.json' // Replace with your actual file path
const nextEntriesPath = './output/nextEntries.json' // Replace with your actual file path
const outputFilePath = './output/missingEntries.json' // Output file for missing entries

// Read the top-level keys and next entries files
fs.readFile(topLevelKeysPath, 'utf8', (err, topLevelKeysData) => {
  if (err) {
    console.error('Error reading topLevelKeys file:', err)
    return
  }

  fs.readFile(nextEntriesPath, 'utf8', (err, nextEntriesData) => {
    if (err) {
      console.error('Error reading nextEntries file:', err)
      return
    }

    // Parse the JSON data
    const topLevelKeys = JSON.parse(topLevelKeysData)
    const nextEntries = JSON.parse(nextEntriesData)

    // Find nextEntries that are not in topLevelKeys
    const missingEntries = nextEntries.filter(
      (entry) => !topLevelKeys.includes(entry),
    )

    // City names and "Location" combinations to be removed
    const citiesToRemove = [
      'Arkham',
      'Boston',
      'New York',
      'Athens',
      'Alexandria',
      'Cairo',
      'Bremen',
      'Arkham Location',
      'Boston Location',
      'New York Location',
      'Athens Location',
      'Alexandria Location',
      'Cairo Location',
      'Bremen Location',
    ]

    // Remove the cities and "Location" combinations from the missing entries
    const filteredEntries = missingEntries.filter(
      (entry) => !citiesToRemove.includes(entry),
    )

    // Sort the remaining entries
    const sortedEntries = filteredEntries.sort()

    // Remove duplicates
    const uniqueEntries = [...new Set(sortedEntries)]

    // Write the missing entries to a JSON file
    fs.writeFile(
      outputFilePath,
      JSON.stringify(uniqueEntries, null, 2),
      'utf8',
      (err) => {
        if (err) {
          console.error('Error writing the file:', err)
          return
        }
        console.log(`Missing entries saved to ${outputFilePath}`)
      },
    )
  })
})
