---
name: emulator-check
description: Build the fork's debug APK, install it on the Android 16 emulator and check a screen or flow with real taps and screenshots. Use after UI changes, to check a milestone on device, or when asked to "check on the emulator".
---

# Emulator check

## Build, install, launch

Emulators are shared with OpenBite. Message its session (ListAgents, then SendMessage) and wait
for its OK before booting or stopping one; use only the one you booted. A subagent without those
tools asks the session that started it instead. `adb` is not on PATH: every snippet here exports it.

```bash
export PATH="$HOME/.local/opt/node/bin:$HOME/Android/Sdk/platform-tools:$PATH"
~/.claude/bin/emu list                 # what runs, whose it is, memory left
hevier/tools/emulator.sh               # vite build + cap sync + gradle + boot + install + launch
ANDROID_SERIAL=emulator-5558 hevier/tools/emulator.sh --no-build   # reinstall on your emulator
(cd frontend/android && ./gradlew --stop -q)   # after every build: the idle daemon holds 1.5 GB
```
Run it in the background (a few minutes) and wait for the notification. It boots a free 2 GB
light AVD through `~/.claude/bin/emu` (headless, 1080×2340, 420 dpi; `AVD=xperia1vi_api36` for
the 3 GB one); `emu up` fails when all are busy or under 3.5 GB is free. Its last line names the
serial ("launched … on emulator-5558"). Nothing carries over between Bash calls, so write
`ANDROID_SERIAL=<serial>` in front of every later `adb`, `cdp.mjs` and `screens.mjs` call (cdp.mjs
runs adb, which reads it). When done: `~/.claude/bin/emu down <serial>`, and tell OpenBite. The
build rewrites capacitor.build.gradle, capacitor.settings.gradle and the Podfile: never `git add -A`.
The app id is `ch.duartesantos.opengym.hevier.test`.

## Drive the WebView: `node hevier/tools/cdp.mjs …`

- `text`: the visible text of the page. Check this first; it costs fewer tokens than a screenshot.
- `shot <scratchpad>/name.png`, then Read the png to look at it. Save every screenshot to the
  session scratchpad, never in the repo.
- `nav "#/workout"`, `reload`, `click "Finish"` (the first visible element with that text).
- `eval "(() => { … })()"`: always wrap the code in an IIFE, because a top-level `const` collides
  with names already on the page.

**Prefer real taps** for anything gesture-like (swipes, drags, long presses, sheet buttons
that listen for pointer events): `ANDROID_SERIAL=<serial> ~/Android/Sdk/platform-tools/adb shell input tap X Y` and `adb shell input swipe x1 y1 x2 y2
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
workout on the emulator is left alone (the Workout tab's hub is checked on /routines); without one,
an empty workout is started, checked and discarded.

## Test data

A light AVD keeps whatever the last session left, so restore the test profile before every check
(`~/.cache/hevier/ux-profile.tar`, described in `hevier/ux/JOURNEYS.md`; the app must be installed):

```bash
export PATH="$HOME/Android/Sdk/platform-tools:$PATH"
S=emulator-5558 APP=ch.duartesantos.opengym.hevier.test
ANDROID_SERIAL=$S adb shell am force-stop $APP
ANDROID_SERIAL=$S adb shell "run-as $APP sh -c 'rm -rf app_webview shared_prefs files/opengym-state*.json'"
ANDROID_SERIAL=$S adb exec-in run-as $APP tar -xf - < ~/.cache/hevier/ux-profile.tar
ANDROID_SERIAL=$S adb shell monkey -p $APP -c android.intent.category.LAUNCHER 1
```
- An edit of `localStorage` alone is lost at the next start: the app reads
  `files/opengym-state.json` first. Change data through the store over CDP (`useStore`'s
  `getState().update(S => …)`), or through the app.
- Undo through the app where you can: **Discard Workout** for a started workout, Remove / Delete
  for something added. Or restore the profile again.
- Some pages sit behind a module part (D102, D117): /calendar opens History while Statistics'
  Calendar part is off (Settings → the module's parts).

## Report

For each step, say what was tapped and what was seen, with the screenshot path. Known upstream
quirks to ignore: exercise media renders blank white on the emulator, and a LineChart with a
single point draws a wedge.
