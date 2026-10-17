---
name: emulator-check
description: Build the fork's debug APK, install it on the Android 16 emulator and check a screen or flow with real taps and screenshots. Use after UI changes, to check a milestone on device, or when asked to "check on the emulator".
---

# Emulator check

## Build, install, launch

```bash
export PATH="$HOME/.local/opt/node/bin:$HOME/Android/Sdk/platform-tools:$PATH"
HEADLESS=1 hevier/tools/emulator.sh            # vite build + cap sync + gradle + install + launch
HEADLESS=1 hevier/tools/emulator.sh --no-build # reinstall the last APK
```
Run it in the background (it takes a few minutes) and wait for the notification. The app id is
`ch.duartesantos.opengym.hevier.test`, and the AVD is `xperia1vi_api36` (1080×2340, 420 dpi).

## Drive the WebView: `node hevier/tools/cdp.mjs …`

- `text`: the visible text of the page. Check this first; it costs fewer tokens than a screenshot.
- `shot <scratchpad>/name.png`, then Read the png to look at it. Save every screenshot to the
  session scratchpad, never in the repo.
- `nav "#/workout"`, `reload`, `click "Finish"` (the first visible element with that text).
- `eval "(() => { … })()"`: always wrap the code in an IIFE, because a top-level `const` collides
  with names already on the page.

**Prefer real taps** for anything gesture-like (swipes, drags, long presses, sheet buttons
that listen for pointer events): `adb shell input tap X Y` and `adb shell input swipe x1 y1 x2 y2
300`. Device px = CSS px × 2.625. Get the CSS coordinates from
`eval "(() => { const r = document.querySelector('…').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })()"`.

## Screen sizes: `node hevier/tools/screens.mjs --out <scratchpad>/screens`

Resizes the running emulator to each phone profile (`--list`: 320 to 690 dp wide, 16:9 to 21:9,
a foldable, 130% font), restarts the app, visits every main screen plus the first routine's page
and editor, screenshots each into `<out>/<profile>/`, and writes `<out>/report.md`. Checks: the
page scrolling sideways, anything past the screen edge, cut-off text, overlapping controls (notes:
tap targets under 24 px). Exits 1 on a finding. `--only small,fold` and `--screens /home,/stats`
narrow it. The display is reset afterwards, also on an error. Run it with `nice -n 19` after a UI
change, and look at the screenshots of the screens you changed, not only the report. An open
workout on the emulator is left alone (then the Workout tab's hub is not checked); without one,
an empty workout is started, checked and discarded.

## Test data

The state is in `localStorage.gym_state_v1`. The emulator's data has the routines Push
`mvb4ura0xf0oq`, Pull `mvb4ura0bo1ca` and Leg `mvb4ura0uvo91`, and one workout (Leg Day,
2026-10-16).
- Before a flow that writes data (finishing a workout, deleting something), save a copy:
  `eval "localStorage.gym_state_v1"`, written to the scratchpad.
- To inject or restore state, the app's own save must not overwrite it during reload. Run, in
  one eval: `localStorage.setItem('gym_state_v1', DATA); Storage.prototype.setItem = () => {};
  location.reload()`. The reload restores the real `setItem`.
- Afterwards, restore the saved copy so the next check starts from the same data.
- The APK also keeps the state in a native file (`lib/mobile.js` nativeSave) and reloads from
  it, so the localStorage trick above may not stick: check `localStorage.gym_state_v1` after the
  reload. Undo through the app where you can instead: **Discard Workout** for a started workout,
  Remove / Delete for something added.

## Report

For each step, say what was tapped and what was seen, with the screenshot path. Known upstream
quirks to ignore: exercise media renders blank white on the emulator, and a LineChart with a
single point draws a wedge.
