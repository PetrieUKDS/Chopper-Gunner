# Chopper Gunner

A top-down helicopter gunship game for the browser, drawn on a single canvas. There's no build step and no dependencies. Sound effects are synthesised with WebAudio. Background music plays from the MP3s in `music/`, one track after the other on a loop, starting with your first key press or click. M mutes the music along with everything else. To change the tracks, edit `MUSIC_TRACKS` in `src/audio.js`.

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

## Missions

1. **Operation Sandstorm**: militia forces hold three surface-to-air missile sites in the interior. Destroy all three. Each site is guarded by armour and light vehicles.
2. **Operation Iron Road**: an arms convoy is driving along the highway to the northern border. Destroy every truck. If more than two trucks get across, the mission fails. The escorts will call in air cover.
3. **Operation Red Talon**: hunt down RED TALON, a stolen prototype gunship hiding in the far hills under SAM cover, and destroy it.

After the third mission the campaign starts over with tougher enemies.
