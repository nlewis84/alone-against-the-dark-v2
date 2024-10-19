We should make sure that the Dark Sea trip starts in 500 and 501 (maybe others?)
Make sure that anything that goes to 500 also can go to 501 (do this LAST)
search for `skills` in entries.json and make sure it isn't supposed to be `skill`

Check health 268
check bonusDie on 397

Bremen Locations
501
510
520
530

check 488 with all the characters

300 should go to 206 instead

Go to the desert and run out of water....you will have no health but won't die and trigger end of game

Roughly every 6 entries in the pyramid should advance the time 1 hour (382)

Upgrade Player attack in handleCombatRound to use any type of weapon, as well as damage (update all combats?)....I updated most of them with handgun....need to support other types of weapons
Handle player death in combat

Cairo Locations
439b - should probably check to see if the user has a knife and remove it if they break it...may need to change routing from previous

196 - Make the flight to athens work for the same day if you are there at 3PM, code 103, same for bremen flight if you are there at 9AM
205 - code 12 noon to not advance day if it is currently, same for all buttons

Code the `endGame` effect to actually do something

Be able to select a spell from your inventory and learn it (or read a book); use entry 121.

Cunard Ship
106, 155a - code the Retrieve a weapon to let the player pick a weapon to attack with, maybe extra options for available weapons?
