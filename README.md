# Chopper Gunner

A top-down helicopter gunship game for the browser, drawn on a single canvas. There's no build step and no dependencies. All sound, music included, is synthesised live with WebAudio, so there are no audio files.

## Music

Each mission has its own original synth soundtrack, in the style of 80s TV action themes. Each one plays a short intro, then loops a groove section and a lead melody section:

| Mission | Track | Tempo | Key |
| --- | --- | --- | --- |
| Operation Sandstorm (also the title screen) | Sandstorm | 132 BPM | A minor |
| Operation Iron Road | Iron Road | 144 BPM | E minor |
| Operation Frostbite | Frostbite | 124 BPM | F# minor |
| Operation Green Hell | Green Hell | 138 BPM | G minor |
| Operation Black Gold | Black Gold | 150 BPM | C minor |
| Operation Red Talon | Red Talon | 116 BPM | D minor |

The music starts with your first key press or click, because browsers won't play sound before that. M mutes it along with the sound effects, and it pauses while the tab is hidden. The songs are written as note data in `src/music.js`: chords, bass and drum patterns, and the melody, one bar of sixteenth notes per line. They were composed for this game, so you're free to use, change and redistribute them with it.

## Running it

Open `index.html` in a modern browser.

If your browser blocks local files, serve the folder instead:

```bash
npx serve .
```

or

```bash
python -m http.server 8000
```

Then go to http://localhost:8000 (or whatever port `serve` prints).

Your best score, key bindings and chosen aircraft are saved in the browser's `localStorage`.

## Controls

| Action | Keys |
| --- | --- |
| Fly | W / A / S / D |
| Turn | ← / → or Q / E |
| Chain guns | Space (or ↑) |
| Missiles | ↓ or K |
| Flares | F (or L) |
| Turbo | Shift |
| Pause | P or Esc |
| Mute | M |
| Rebind keys | C (on the title screen or while paused) |

The mouse also works for aiming and firing. On phones and tablets you get twin-stick touch controls: the left half of the screen moves, the right half aims and fires, and there are on-screen buttons for missiles, flares, turbo and pause.

Land on your base pad to repair and rearm. Your guns overheat if you hold the trigger too long. Flares break enemy missile locks.

## Aircraft

After the title screen, the hangar lets you pick your aircraft. Use ← / → (or A / D) to browse and Space to launch. With a mouse or on a touchscreen, click or tap the sides of the screen to browse and the middle to launch. Esc goes back to the title. The game remembers your choice next time.

| Aircraft | Role | Strengths | Weaknesses |
| --- | --- | --- | --- |
| **Stormwolf** | Attack helicopter | All-rounder: solid armour, 8 missiles, twin wing guns | Doesn't excel at anything |
| **Kestrel** | Scout helicopter | Fastest and most agile, quick-firing gun, 7 flares, small target | Light armour, only 4 missiles |
| **Titan** | Heavy twin-rotor gunship | Huge armour, 14 missiles, hardest-hitting guns | Slow, turns sluggishly, big target |

Each aircraft is an entry in the `VEHICLES` list in `src/entities.js`. An entry sets how the aircraft looks (its draw function and colours) and how it handles: armour, missiles, flares, cruise and turbo speed, turn rate, hitbox size, gun position, fire rate, damage and heat, and where missiles launch from. Add an entry and it appears in the hangar automatically.

## Sprites

Every sprite is drawn in code in `src/entities.js`, lit from the top-left to match the shadows. Open `sprites.html` (served the same way as the game) to see them all at 2× size.

## Missions

Each mission is fought in its own theatre, with its own island layout, ground and sea colours, and plant life. Enemy vehicles are painted in matching camouflage.

| # | Mission | Theatre | Objective |
| --- | --- | --- | --- |
| 1 | **Operation Sandstorm** | Southern Desert: sand, palm oases, turquoise shallows | Destroy the three SAM sites in the interior. Each is guarded by armour and light vehicles. |
| 2 | **Operation Iron Road** | Central Valleys: green farmland and woods | Destroy the arms convoy on the highway. If more than two trucks reach the border, the mission fails. |
| 3 | **Operation Frostbite** | Northern Tundra: snow, pack ice, snowy pines | Destroy five fuel depots ringed by anti-aircraft guns. Depots explode violently and damage anything close by. |
| 4 | **Operation Green Hell** | Eastern Jungle: dense canopy, muddy shores | Sink six gunboats patrolling the coast. Two of them fire anti-air missiles. |
| 5 | **Operation Black Gold** | Volcanic Oil Fields: ash, rust-red ridges, dead trees | A shield protects the command bunker. Destroy its three generators to drop the shield, then destroy the bunker. |
| 6 | **Operation Red Talon** | Red Canyons: red rock and cacti | Hunt down RED TALON, a stolen prototype gunship, and destroy it. |

After the sixth mission the campaign starts over with tougher enemies.

Theatres are defined in `THEATRES` in `src/terrain.js`, and missions in `src/missions.js`.
