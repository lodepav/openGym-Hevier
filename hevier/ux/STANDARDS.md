# Go Hevier UX standards

What a screen of the fork is held to. A UX review (the `ux-reviewer` agent, [JOURNEYS.md](JOURNEYS.md))
cites these by id (`A3`, `H6`, `G2`…). A finding without an id is an opinion: it may still be worth
raising, as a note.

Adapted on 2026-10-25 from the OpenNutriTracker fork's `fork/UX_STANDARDS.md` (the A, P, H and C
rules and the severities; the food-logging rules became the gym rules, G). Sources, checked
2026-10-24:
[Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality),
[Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps),
[Android touch target size](https://support.google.com/accessibility/android/answer/7101858),
[WCAG 2.2, what's new](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/),
[NN/g ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

## The decisions come first

The app works the way the user wants it to. [DECISIONS.md](../DECISIONS.md) records those choices
(D1, D2…), and a standard never overrules one. A finding that a decision caused, such as Hevy's
compact set rows (D4, D15), the dark-only theme (D17) or the grey prefilled values (D2), is a
**note that names the decision**, not a finding. The only exception is an A rule that fails on a
main path: it stays a finding, marked `touches Dn`, so it can be discussed.

Every suggested fix is one of:

- **minor**: a label, wording, a spoken name, a colour step, a size or spacing that keeps the
  layout, a missing heading role. It can be fixed without asking.
- **discuss**: anything the user would notice: a moved, added or removed control, a changed flow,
  layout or default, or anything a decision describes. It is fixed only after the user agrees.

## How to measure in a WebView

The app is a web page in Android's WebView, so measure it through the page (`hevier/tools/cdp.mjs`
`eval`), not Android's UI dump:

- **Sizes**: CSS pixels are dp. `el.getBoundingClientRect()` gives them directly, and 48 dp is 48.
- **Colours**: `getComputedStyle(el).color` and the background of the nearest ancestor that sets
  one. Work out the contrast ratio from those values, not from screenshot pixels.
- **Spoken names**: the accessibility tree, through `Accessibility.getFullAXTree` over CDP, or
  `aria-label`, `aria-labelledby`, `alt` and the text content.
- **Headings**: `h1`–`h6` or `role="heading"`.
- **Font scale**: `adb shell settings put system font_scale 2.0`, then force-stop and relaunch the
  app (the WebView reads it at start). Put it back to `1.0` the same way.

## A. Accessibility (pass/fail)

| Id | Rule | How to check |
|---|---|---|
| A1 | Every touch target is at least 48×48 dp, or has 48 dp of tappable area around it, with 8 dp between targets (Android). WCAG 2.5.8's 24×24 px is the floor below which it is always a finding. | `getBoundingClientRect()` of each `button`, `a`, `input`, `[role=button]`, `[onclick]`. |
| A2 | Text contrast at least 4.5:1. Large text (≥ 18.66 px, or ≥ 14 px bold) and icons/graphics need at least 3:1 (WCAG 1.4.3, 1.4.11). Hevy blue behind white text is a known 3.4:1 (D17), so it is a note unless the text is small. | Computed colours. |
| A3 | Every control without visible text has a spoken name that says what it does, not what it looks like, and without the word "button" (WCAG 4.1.2). | AX tree: a button or link with an empty name fails. |
| A4 | A control's spoken name contains the text it shows (WCAG 2.5.3). | AX name compared with the text. |
| A5 | Numbers and abbreviations are spoken as words a listener understands: "100 kilograms, 8 reps", not "100 KG 8". The same goes for `W`, `F` and `D` set labels, `RIR`, `1RM` and `×2`. | AX names of set rows and stats. |
| A6 | At 200% font scale nothing that matters is cut off or overlaps: text wraps rather than truncating, and every screen still scrolls to everything (WCAG 1.4.4, 1.4.10). | `font_scale 2.0`, relaunch, screenshot. |
| A7 | Section titles and group names are headings, so TalkBack can jump between them (WCAG 1.3.1). | `h1`–`h6` or `role=heading`. |
| A8 | Anything done by a drag, a swipe or a long press also has a plain tap path (WCAG 2.5.7). The fork's long-press reorder (D13, D15), swipe-to-delete (D9) and long-press backups order (D86) each have one: check that it still works. | Find the same action in a menu, a sheet or a handle. |
| A9 | Content is not hidden behind sticky bars, the tab bar, the resume bar, the rest timer or the keyboard when it has focus or is the last item (WCAG 2.4.11; D2 scrolls the set being typed into clear). | Scroll to the end of each list, focus the last field: it must be fully visible and tappable. |
| A10 | Focus is visible and moves in reading order when using a keyboard or switch access (WCAG 2.4.7, 2.4.3). Low priority on a phone. | Tab through a sheet over CDP (`Input.dispatchKeyEvent`). |

## P. Android platform

| Id | Rule |
|---|---|
| P1 | System back always works and goes where the user expects: it closes the sheet, keyboard or full-screen page on top first, then goes back a page, and it never discards a workout without asking (Back_Button_Nav). |
| P2 | Leaving and coming back (Recents, screen off, a phone call) returns to the same state, with typed input kept. A running workout, rest timer or set timer carries on (State_Preservation). |
| P3 | Material conventions where the fork has no Hevy reference: dialogs have sentence-case actions with the confirming one on the right, a toast or snackbar shows a transient result, and a switch acts at once. |
| P4 | Text blocks stay within about 45–75 characters a line (Line_Length). |
| P5 | Images are sharp and show what they claim to: exercise thumbnails and animations, body maps, share cards (Graphic_Quality). |
| P6 | Notifications (rest over, the heart-rate strap's ongoing one) say what they are about in their first line and open the right screen when tapped. |

## H. Usability heuristics (NN/g)

| Id | Heuristic | What it means here |
|---|---|---|
| H1 | Visibility of system status | After every action the user sees that it happened: a ticked set turns green, a rest starts, an import says what it did, a sync or a send to Hevy shows when it last ran. |
| H2 | Match the real world | Gym words, not code words: "set", "rest", "warm-up", "routine", never ids, field names or enum values. Weights in the unit the user chose, dates as the locale writes them. |
| H3 | User control and freedom | Every destructive or bulk action can be undone or is confirmed: delete a set, discard a workout, delete a routine or folder, an import. Every sheet can be left with back or a tap outside. |
| H4 | Consistency and standards | The same thing looks the same and has the same name everywhere: set-type letters, weight and duration formats, muscle names, button wording and capitalisation, the page bar (D49). |
| H5 | Error prevention | Inputs reject what cannot be right before saving: negative or absurd weights and reps, a rep range typed backwards, an empty routine name. |
| H6 | Recognition rather than recall | What the user needs is on screen: last time's numbers (PREVIOUS), the current setting on its row, the rest in force, and the reason a button is disabled. |
| H7 | Flexibility and efficiency | Shortcuts for the frequent path (tap PREVIOUS to copy, Start Routine, the Today card, recents in the picker) without hiding the slow path. |
| H8 | Aesthetic and minimalist design | Every element earns its place: no repeated information, no pile of identical controls. |
| H9 | Help users recover from errors | Errors say what went wrong in plain words and what to do next (an import, location, the Hevy key, the strap), never only "Error" or a code. |
| H10 | Help and documentation | Where a feature is not obvious, a short subtitle explains it in place: progression off (D61, D69), muscle-set counting (D42), brand labels (D28). |

## G. Gym logging

| Id | Rule |
|---|---|
| G1 | Logging a set that matches its prefilled values takes one tap, the tick. Logging one that differs takes at most the value fields and the tick. |
| G2 | What to lift is visible on the set row without opening anything: last time's numbers (PREVIOUS), the target, and the set to do next (D71). |
| G3 | The rest timer is visible and adjustable from the workout without hiding the next set or the field being typed into. |
| G4 | Number fields open the numeric keypad, accept the locale's decimal separator, and keep what was typed when the keyboard is hidden (D2). |
| G5 | A workout is never lost by accident: back, leaving the app, a restart or the "Still training?" prompt (D60) keeps it, and discarding it asks first. |
| G6 | Starting the planned workout takes at most two taps from opening the app: the Today card, or Workout tab → Start Routine. |
| G7 | Numbers that are read mid-set (weights, reps, the timer) are legible at arm's length: at least 16 px and in the card's full contrast once they are touched. |
| G8 | A finished workout's numbers agree everywhere they show: the live stats row, Save Workout, "Nice work!", the feed card, Workout Detail, and Statistics for that week (sets, volume, duration, records). |

## C. Copy

| Id | Rule |
|---|---|
| C1 | Plain, short sentences, and sentence case for titles, buttons and labels, except where Hevy's reference uses title case and the fork follows it on purpose (D49). |
| C2 | Say what happens, not how it works: "Send to Hevy" rather than "Run export". |
| C3 | No zero counts or empty clauses ("0 records"): leave the part out. |
| C4 | Singular and plural agree with the count ("1 set", "2 sets"; "1 workout"). |
| C5 | The same word for the same thing throughout: gym or profile, brand or label, routine or plan, measure or measurement. |
| C6 | Fork text is translated wherever the screen around it is; English inside a translated screen is a finding. |

## Severity

- **high**: a user cannot finish a task, loses data, or an A rule fails on a main path (logging a
  set, starting or finishing a workout, the routine editor, Home).
- **medium**: a task is slower or confusing for most users, or an A rule fails off the main path.
- **low**: polish, such as wording, alignment or consistency that costs the user nothing real.

Upstream's own screens (Settings pages, exercise settings) are in scope. A finding there is fixed
at a seam ([SEAMS.md](../SEAMS.md)) or by CSS in `theme.css`, or offered upstream: say which.
