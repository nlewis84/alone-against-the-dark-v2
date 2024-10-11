# 🌑 **Alone Against the Dark v2**

## 🕯️ Overview

_Alone Against the Dark v2_ is an interactive, web-based choose-your-own-adventure game inspired by the rich mythos of **Call of Cthulhu**. Players navigate through a series of scenarios and make choices that determine their fate in the face of cosmic horrors.

## ⚙️ Features

- 🎮 **Interactive gameplay**: Make choices that impact the story and your survival.
- 📜 **Rich narrative**: Inspired by the cosmic horror of the Call of Cthulhu universe.
- 🔄 **Dynamic outcomes**: Your choices shape the world around you.

## 🚀 Getting Started

### 💻 Prerequisites

Ensure you have the following to run the game:

- A modern web browser (supports HTML5, CSS3, and JavaScript).

### ▶️ Running the Game

To start playing _Alone Against the Dark v2_, follow these steps:

1. **Open `index.html`:**

   - Locate the `index.html` file in the project directory.
   - Open `index.html` in your web browser to start the game.

2. **Optional - Live Server**:
   - For a better development experience:
     - Install the "Live Server" extension in your code editor (**recommended for VS Code**).
     - Right-click on `index.html` and select "Open with Live Server".
     - This allows hot refresh, automatically reloading the game when changes are detected.

### 🔧 Utility Scripts

#### 📝 Sorting JSON Data

The project includes a script to sort `entries.json`, maintaining the structured format of the game entries.

- **To Run the Sorting Script:**

  ```bash
  yarn sort
  ```

### 🔎 Generate Missing Entries

This command will:

- **Generate `nextEntries.json`**: Extracts all `nextEntry` references from `entries.json`.
- **Generate `topLevelKeys.json`**: Extracts all top-level entry keys from `entries.json`.
- **Generate `missingEntries.json`**: Compares the two lists and identifies any `nextEntry` references that don't have a corresponding top-level entry key.

Additionally, once the `missingEntries.json` file is generated, it will automatically open in **VSCode** for review.

- **Command to run:**

  ```bash
  yarn missing
  ```
