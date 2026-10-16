---
name: hevy-side-by-side
description: Compare a fork screen on the emulator with the matching Hevy reference screenshot and list the UX/UI differences. Use when building or polishing a Hevy-style screen (phase 2 especially), or when asked how close a screen is to Hevy.
---

# Hevy side by side

The reference is local only: `hevier/reference/` is gitignored. If it is missing, run
`hevier/reference/fetch.sh`; if that fails too, tell the user.

1. **Find the reference.** In `hevier/reference/SCREENS.md`, find the section for the screen
   (§1 Workout tab, §2 Log Workout, §3 Save/complete, §4 Home feed, §5 Profile, §6 Statistics,
   §7 Exercise details, §8 Library/picker, §9 Routine editor, §10 Settings, §11 Measures).
   Note the image files it cites, which are in `hevier/reference/web/`, and its element list.
2. **Capture the fork screen.** Use the `emulator-check` skill to reach the same state (with
   the same kind of data: a routine with sets, a finished workout…), then
   `node hevier/tools/cdp.mjs shot <scratchpad>/fork-<screen>.png`.
3. **Look at both.** Read the reference image(s) and the fork screenshot.
4. **List the differences** in a table, from the top of the screen down:
   element · Hevy · fork · kind (missing / extra / layout / spacing / type / colour / copy /
   icon) · fix (the file in `frontend/src/hevier/` and roughly what to change).
5. **Filter with the decisions.** `hevier/DECISIONS.md` overrides Hevy: mark differences a
   decision chose on purpose (e.g. D2 grey prefilled values, D8 progression behind ⋮, D16
   Settings pages, openGym extras) as *intended*, and never propose removing openGym
   functionality. Theme and accent are still open (phase 2): note colour differences but
   don't treat them as bugs until that is decided.

Fix only what the user asks for; by default, report the list and propose an order.
