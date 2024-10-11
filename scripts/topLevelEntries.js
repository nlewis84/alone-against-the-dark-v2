const fs = require('fs')

// Load the entries.json file
const filePath = '../data/entries.json' // Replace with your actual file path
const outputFilePath = './output/topLevelKeys.json' // Output file for top-level keys

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err)
    return
  }

  // Parse the JSON data
  const entries = JSON.parse(data)
  const topLevelKeys = Object.keys(entries) // Collect all top-level keys

  // Write the array of top-level keys to the output file
  fs.writeFile(
    outputFilePath,
    JSON.stringify(topLevelKeys, null, 2),
    'utf8',
    (err) => {
      if (err) {
        console.error('Error writing the file:', err)
        return
      }
      console.log(`Array of top-level keys saved to ${outputFilePath}`)
    },
  )
})
