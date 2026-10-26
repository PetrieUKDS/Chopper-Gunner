# Chopper Gunner

A top-down helicopter gunship game for the browser, drawn on a single canvas. There's no build step and no dependencies. All sound, music included, is synthesised live with WebAudio, so there are no audio files.

## Music

Each mission has its own original synth soundtrack, in the style of 80s TV action themes. Each one plays a short intro, then loops a groove section and a lead melody section:

| Mission | Track | Tempo | Key |
| --- | --- | --- | --- |
| Operation Sandstorm (also the title screen) | Sandstorm | 132 BPM | A minor |
| Operation Iron Road | Iron Road | 144 BPM | E minor |
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

Your best score and key bindings are saved in the browser's `localStorage`.

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

## Sprites and vehicles

Every sprite is drawn in code in `src/entities.js`, lit from the top-left to match the shadows. Open `sprites.html` (served the same way as the game) to see them all at 2× size.

The player's helicopter is defined in the `VEHICLES` list in `src/entities.js`. Each entry sets how the aircraft looks (its draw function and colours) and how it handles (armour, missiles, flares, cruise speed and turbo speed). Stormwolf is the only one so far. A vehicle selector can add more entries and pass the chosen one to `new Player(x, y, vehicle)`.

## Missions

1. **Operation Sandstorm**: militia forces hold three surface-to-air missile sites in the interior. Destroy all three. Each site is guarded by armour and light vehicles.
2. **Operation Iron Road**: an arms convoy is driving along the highway to the northern border. Destroy every truck. If more than two trucks get across, the mission fails. The escorts will call in air cover.
3. **Operation Red Talon**: hunt down RED TALON, a stolen prototype gunship hiding in the far hills under SAM cover, and destroy it.

After the third mission the campaign starts over with tougher enemies.
