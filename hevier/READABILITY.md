# Readability review

Written 2026-10-19, after upstream was called "spaghetti code". The question: what could change
so that a person new to the code understands it faster, **with the behaviour unchanged** and
without just adding comments. Part 1 is the fork's code (`frontend/src/hevier/`), part 2 is
upstream's, with a verdict on whether that is worth doing at all.

## The yardstick

openGym is a React 19 + Zustand PWA with no TypeScript, no linter and a hard "no new
dependencies" rule. One maintainer writes most of upstream (about 1,300 of its last 1,800
commits), and the fork has to merge upstream without conflicts. The principles that fit that:

- **Functional core, imperative shell.** Decisions are pure functions with tests; components
  and store code only wire them up. Upstream's CONTRIBUTING already says this for training
  logic, and both `lib/` folders follow it. The UI layer does not always follow it.
- **React's own guidance.** Split a component where the UI splits up ("Thinking in React"),
  move stateful logic into custom hooks ("Reusing logic with custom hooks"), and don't write
  derived state back to the store from an effect ("You might not need an effect").
- **Deep modules, hidden information** (Ousterhout, *A Philosophy of Software Design*). A module
  should have a small interface and hide its details. State that lives in a module and changes
  between calls is hidden *coupling*, not hidden information.
- **Names that say what they mean.** A short name is fine for a project-wide convention (`S`
  for the state) or a two-line scope. It is not fine for a value used 40 lines further down.
- **Comments say why, git says when.** A comment should give the rule and the reason. Dates,
  review numbers and "it used to be" go in DECISIONS.md and the commit history.
- **Hotspots first** (Tornhill, *Your Code as a Crime Scene*). Fix where size and churn meet.
  A big file nobody touches costs little.
- **Tidy first** (Beck). Make each change structure-only, as its own commit, with the existing
  tests unchanged and green. That is how "same behaviour" gets proven.

## Part 1: the fork

### How it stands

About 9,750 lines of fork code across roughly 150 files, plus 82 test files. Most files are
under 250 lines. The fork's `lib/` follows the pure-helper rule. The seam design (one `hooks`
object, one import in `main.jsx`, every edit listed in SEAMS.md) is its best feature and
should stay as it is. The fork's problems are local: three files are hard to read, plus a few
habits that repeat across files.

### F1. `lib/hevy-import.js` keeps hidden state between calls (do first)

This is the hardest file to follow, and the most likely place for a bug that is hard to find.
`importExercise(title, source)` reads three module variables that other code sets:

- `ctx`, which `useChoices()` sets. `index.js` calls it just before every `importExercise` call.
  The name looks like a React hook, but it is not one.
- `seen`, a list of every title asked about. `importDone` empties it.
- `asking`, reset through `queueMicrotask` so that a parse that never reached `importDone`
  doesn't leak into the next one.

There is also a `WeakMap` cache keyed by whichever `ctx` object is current. The file's
12-line header then lists the matching order in prose, (1) to (5), because the code itself
doesn't show it.

**Change:**

- Pass the choices in explicitly: `importExercise(title, source, choices)`. `index.js`
  computes them once per import, not once per title.
- Make the order a list the code walks:
  `const STEPS = [reviewChoice, earlierCustom, fixTable, oneLimb, upstreamMatch]`. Each step is
  a small named function that returns an answer or null. The header comment then shrinks to
  the reasons.
- Collect the titles in an object created per parse (`startImport()` → `{ ask, done }`)
  instead of `seen` and `asking`.
- `importId('im', source + '|' + name.toLowerCase())` appears three times. Give it one name.

`hevy-import.test.js` and `import-review.test.js` prove the behaviour is unchanged.

### F2. `components/HevyExerciseBlock.jsx`: 508 lines, 27 props, ~35 inner functions

One component draws an exercise. Inside it, the same component also:

- edits set rows (drops, bursts, sides). This is a copy of upstream `ExerciseBlock`'s closures
  in `views/Workout.jsx` around line 140.
- keeps a "touched" set and moves it along when rows shift.
- formats PREVIOUS in two near-identical functions (`prevLabel`, `sidePrev`).
- builds three menus.
- works out which records a tick just made.
- writes `inc` into the store from a `useEffect` (line 243).

Reading it means holding 30 local names in your head, many of them abbreviated (`xu`, `sw`,
`conv`, `cfg`, `eff`, `wc`, `ss`, `W`, `R`, `H`, `A`).

**Change** (each step is its own commit, tests unchanged):

1. `hevier/lib/set-rows.js`, pure and tested: `addDropRow(row, opts)`, `addBurstRow`,
   `setBurstReps`, `removeBurst`, and the others. The component calls
   `mutSet(i, row => addDropRow(row, …))`.
2. `columnsFor(mode, { unit, exUnit, speedUnit, … })` goes into a lib file. It is the
   `cols`/`W`/`R` block, and it can be tested.
3. `previousText(prev, side, …)` goes into `lib/set-text.js` and replaces both PREVIOUS
   formatters.
4. `useTouchedFields(entry)` becomes a custom hook that owns `touched`, `rowsSeen` and
   `typedOver`.
5. `exercise-menus.js` holds `openSetType`, `openExerciseMenu` and `openUnitMenu`.
6. `newRecordsOnTick(before, after)` goes into `lib/records.js`.
7. `<SetLine>` and `<SubRows>` become components.
8. The `inc` write moves to where the unit is chosen and where an entry is added (events), so
   the effect goes away. **Careful:** behaviour depends on this one. Check D41's "an entry added
   later takes it" with a test before moving it.
9. Give the locals real names: `exerciseUnit`, `showWeight`, `convertsUnit`, `controls`,
   `history`. Keep `S`, since that is upstream's convention.

The block should end up around 150 lines that read top to bottom.

### F3. `index.js`: 25 times `if (HEVIER)`, and the same adapter written out each time

Every line repeats the flag. Five `init*` calls each take
`() => useStore.getState().S, fn => useStore.getState().update(fn), watchS(...)` in slightly
different orders and shapes.

**Change:**

- Write one `install()` that returns early when the flag is off.
- Group it by area: workout, import, Health Connect, Android, look.
- Pass one adapter, `const store = { get, update, watch, subscribe, toast }`, to every `init*`,
  so all of them have the same signature.

### F4. Comments that carry history

26 comments in the code carry dates, review numbers or "item N" ("changed 2026-10-18, after
the review", "review F1", "item 29"). These tell the reader when something changed, not what
the code does. That information is already in DECISIONS.md and in git.

**Change:**

- Remove the dates and review numbers from the code. Keep the D-number, which is the useful
  link to the rule.
- Where a long comment explains a sequence (as in F1), make the sequence visible in the code
  and cut the comment down to the reasons.

### F5. Hand-offs through module variables, and logic that lives in views

- `views/SaveWorkout.jsx` exports `presetDuration`, which sets a module variable. Then
  `lib/still-training-run.js` calls `finishWorkout()` and hopes the Save page reads it. That is
  a lib importing from a view and passing data through a global. Pass it in navigation state
  instead (`nav(SAVE_PATH, { state: { durationMin } })`), the way `DONE_PATH` already does.
- Fork code imports logic from upstream views: `setNumberAt` (Workout.jsx),
  `removeRoutineExercise` and `reorderRoutineUnit` (RoutineEdit.jsx), and `historyRows`
  (History.jsx). Fixing that is upstream's job (U4). Until then, put each such import in one
  fork file, `hevier/lib/upstream-views.js`, so the dependency is visible in one place.
- Module-level `let` appears in 11 fork lib files. That is fine in the `*-run.js` files, which
  are the imperative shells, and fine for a cache whose name says it is one. The other cases
  are F1 and `presetDuration`.

### F6. Small consistency fixes

- Component names: `HevyExerciseBlock`, `RoutineEditHevy` and `ExercisePickerHevy` put the
  prefix in different places, and the folder already says `hevier`. Pick one form.
- Write down the `x.js` (pure) / `x-run.js` (wiring) pairing in README.md, since a reader has
  to guess it today.
- 61 lines are longer than 160 characters, most of them menu items written as one ternary per
  line. Use one menu item per line and wrap at about 120 characters. No formatter, because the
  dependency rule rules one out.

### What not to change

- Stored field names (`w`, `r`, `d`, `hv*`). They are the sync and backup format, and renaming
  them is a data migration, not a readability fix.
- The `hooks` keys. Renaming `done` → `workoutSaved` would read better, but every rename edits
  a seam line in an upstream file. That is not worth it.
- `S` as the state's name. It is upstream's convention throughout, and fighting it costs more
  than it gains.

### Worth it?

Yes. Everything above is fork-owned, so it causes no merge cost. It is covered by the fork's
82 test files and can be done in small commits. Suggested order: F1, F2 (steps 1–3 first, they
are the cheapest), F3, F4, F5, F6. About two to three focused days.

## Part 2: upstream

### How it stands

About 44,000 lines of frontend code, not counting the locales and exercise data, plus a
2,700-line `api/server.js`. There are 400 test files with about 67,000 lines of tests.

**The domain core is not spaghetti.** `lib/progression.js`, `onerm.js`, `finish-workout.js`
and `sync-merge.js` are pure, tested, and open with headers that explain *why*
(progression.js's "Reading a session honestly is the whole game" is a model to copy).

The label fits the **UI and store layer**, where five files hold about 11,000 lines:

| File | Lines | Commits, last 30 days | Fork seams in it |
|---|---|---|---|
| `sheets.jsx` | 3,488 | 117 | 26 |
| `views/Workout.jsx` | 2,099 | 90 | 2 |
| `store/useStore.js` | 1,983 | 77 | 0 |
| `views/Settings.jsx` | 1,514 | — | 6 |
| `api/server.js` | 2,709 | — | 0 |

### U1. `sheets.jsx` is a drawer of about 60 unrelated sheets and flows

It holds the starter plans, body weight, every import flow, plate and dumbbell inventories,
exercise details, the picker, equipment profiles, the exercise config, plan sharing, the
calendar, and starting, finishing and repeating a workout. It has 70 import lines, some of
them 30 names long.

**Change:** move it into `sheets/` by area (workout, exercise, plan, import, body,
equipment), with `sheets.jsx` re-exporting everything so no importer changes. This is a pure
move and can be checked mechanically. It is the biggest hotspot by size × churn.

### U2. `ActiveWorkout` is one 1,170-line component, and `ExerciseBlock` takes 28 props

`views/Workout.jsx` lines 923–2095 are one function with about 60 hook calls. Its handlers
(`addSet`, `addWarmup`, `setField` with its weight cascade) are domain logic written inside the
view. That breaks upstream's own CONTRIBUTING rule ("anything that decides what you lift
next… is a pure helper in lib with a unit test"). `ExerciseBlock` draws the compact, dense and
standard variants with flags, through 28 props.

**Change:**

- Move the set edits into `lib/workout-model.js`, pure and tested. The fork's F2 step 1 would
  then import them instead of copying them.
- Split ActiveWorkout into custom hooks (rest timer, scrolling, swipe hints) and components
  (header, list, finish bar).
- Give each layout its own component.

### U3. `useStore.js`: one 1,675-line `create()` closure

It holds state, actions, localStorage persistence, server sync and polling, the mobile file
mirror, stash and adoption, and logout. That is several separate concerns.

**Change:** keep the store to state plus actions, and move sync, persistence and the mobile
mirror into modules that subscribe to it. This is the riskiest of the changes, because sync
bugs lose data.

### U4. Views that export logic

`setNumberAt`, `deleteActiveSet`, `copyActiveSet` and `removeActiveExercise` live in
Workout.jsx. `removeRoutineExercise` and `reorderRoutineUnit` live in RoutineEdit.jsx, and
`historyRows` in History.jsx. Other modules import them from there.

**Change:** move them into `lib/`, where they get tests.

### U5. Long positional signatures and very long lines

For example, `exConfigSheet(ex, existing, onSave, onDelete, routine, initial, onReplace,
saveLabel)` takes 8 positional arguments, and callers pass `null, null` to skip some. There
are 566 lines longer than 160 characters.

**Change:** use an options object for anything with more than three parameters.

### U6. `api/server.js`

It is a single file by design ("no framework"). It is already divided into named sections,
and parts of it have moved out (`passkeys-store.js`, `durable.js`, `rate-limit.js`). Route
handlers could move into `routes/*.js`, but it changes rarely and reads well enough. This is
the lowest priority.

### Is it worth the effort?

**For users: no visible gain.** Nothing above changes what the app does.

**For upstream: only a small part, and only if the maintainer does it.**

- In favour: big files that change often are where bugs are most likely, and Workout.jsx and
  sheets.jsx are both the biggest and the most changed. Smaller files also make
  outside contributions easier, and that is exactly the audience calling it spaghetti.
- Against: the maintainer lands about 14 commits a day and keeps unreleased `release-*`
  branches open (PIPELINE.md). A big refactor from anyone else would conflict with all of them
  within days, and the full value only arrives if all five files get done.

**For the fork: one painful merge, then cheaper merges.** Splitting `sheets.jsx` would move 26
fork seam markers at once. After that, smaller files mean fewer conflicts, because unrelated
upstream edits stop landing in the same file as a seam. **The fork must never do this split
itself** (rule 1: add, don't edit).

**Recommendation:** no refactoring campaign. Open one upstream issue proposing:

1. The `sheets/` split (U1) as pure-move commits at a release boundary, with the re-exporting
   index. It is cheap and mechanical, and is worth it.
2. Applying "logic out of views" (U2's set edits, U4) **as code is touched**. That is the
   project's existing rule, and it pays off on its own.
3. U5's options objects, also as code is touched.

Leave U3 until sync has a reason to change anyway, and leave U6 alone. That covers the parts
of the "spaghetti" complaint that are fair, at a cost the project can carry. The core,
`lib/`, already shows the project knows how to write clear code.
