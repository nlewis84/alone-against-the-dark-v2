If you need to set a specific date/time for a choice use this format:

"104": {
    "title": "PIER 56: CUNARD LINES",
    "description": "The representative informs you that a liner departs each Saturday at noon, reaching Athens at noon nine days later, and Alexandria at 1pm one day later. Tickets are available and include all meals.",
    "choices": [
      {
        "text": "Take the Saturday noon liner to Athens (arrives nine days later at noon)",
        "effects": {
          "setDay": "Saturday",
          "setHour": 12,
          "advanceTime": 215
        },
        "nextEntry": "187"
      },
      {
        "text": "Take the Saturday noon liner to Alexandria (arrives ten days later at 1pm)",
        "effects": {
          "setDay": "Saturday",
          "setHour": 12,
          "advanceTime": 240
        },
        "nextEntry": "187"
      },
      {
        "text": "Go to any New York Location",
        "nextEntry": "New York Location"
      }
    ],
    "traceNumbers": ["187", "New York Location"]
  },