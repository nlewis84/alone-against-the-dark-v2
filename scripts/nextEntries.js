const fs = require('fs')

// Load the entries.json file
const filePath = '../data/entries.json' // Replace with your actual file path
const outputFilePath = './output/nextEntries.json' // Output file for nextEntry values

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err)
    return
  }

  // Parse the JSON data
  const entries = JSON.parse(data)
  const nextEntries = []

  // Function to collect nextEntry values recursively
  function collectNextEntries(entry) {
    if (entry.choices) {
      entry.choices.forEach((choice) => {
        if (choice.nextEntry) {
          nextEntries.push(choice.nextEntry)
        }

        // Check if there are effects with check, success, or failure
        if (choice.effects && choice.effects.check) {
          if (
            choice.effects.check.success &&
            choice.effects.check.success.nextEntry
          ) {
            nextEntries.push(choice.effects.check.success.nextEntry)
          }
          if (
            choice.effects.check.failure &&
            choice.effects.check.failure.nextEntry
          ) {
            nextEntries.push(choice.effects.check.failure.nextEntry)
          }
        }
      })
    }
  }

  // Loop through each entry in the entries object
  Object.keys(entries).forEach((entryKey) => {
    collectNextEntries(entries[entryKey])
  })

  // Write the array of nextEntry values to the output file
  fs.writeFile(
    outputFilePath,
    JSON.stringify(nextEntries, null, 2),
    'utf8',
    (err) => {
      if (err) {
        console.error('Error writing the file:', err)
        return
      }
      console.log(`Array of nextEntry values saved to ${outputFilePath}`)
    },
  )
})
