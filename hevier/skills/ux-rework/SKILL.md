---
name: ux-rework
description: Rework Go Hevier's flows and pages into a UX of its own (D125). A product interview on how the owner uses the app and a north star came first; now every screen gets a mockup in three versions, scored against the old screen, with a grill only where something is unclear, then one build of all approved screens and a check on the emulator and the debug app. Tracked in hevier/ux/REWORK.md. Use only for /ux-rework.
argument-hint: "status | friction | interview | north-star | <screen or flow from REWORK.md> | build"
disable-model-invocation: true
---

# UX rework

Go Hevier started as openGym's logic with Hevy's UX. The rework moves past that: screens may be
changed completely and things moved until the app is the owner's logbook (D125), with openGym
and Hevy as the starting point, not the measure. This skill is how each change is agreed and
built.

- **Scope: flows and pages.** What a screen is for, what is on it, where things live, how many
  steps a task takes. Not the look: colours, type and shapes are D123 and `DESIGN.md`, and a
  mockup uses them as they are.
- **The tracker is [hevier/ux/REWORK.md](../../ux/REWORK.md).** Read it first, write to it as you
  go. It is what carries the work across sessions.
- **The order is interview, north star, mockups of every screen, then one build.** Navigation
  is the first mockup; the others follow the ranking in REWORK.md.
- **Mockups first, questions second.** The owner answers fastest with something concrete to
  correct. Ask only what a mockup cannot settle.
- **One question per message, each with a recommended answer** (step 2.6) is this skill's style
  only. Do not carry it into other work in the same chat.

## Modes

The argument picks one. With no argument, run `status`.

- `status`: read REWORK.md and report in a few lines: the interview's status, the north star,
  each screen's status (how many are approved, which one is with the user, which is next),
  friction items not yet tied to a screen, and whether the build has started. Change nothing.
- `friction`: the user gives friction notes (from the gym, a review, a screenshot). Add each as
  a row of the friction list with the next free F number and today's date, tie it to a screen,
  and put the F number in that screen's Friction cell. A note about a part of a screen (the rest
  bar, the PREVIOUS column) goes to the screen that holds it, with the part named in the text.
  Source is `gym`, `review Rn` (a ledger round) or `other`; the user's own note is `gym` unless
  they say otherwise. One note naming several problems is one row each. Ask only when a note is
  unclear. A row on a screen that is already **approved** or **built** reopens it. Re-rank only
  when the user asks.
- `interview`: the product interview (see "Interview"). Done on 2026-11-16; it can be run again
  later, by area (`interview workout`), when the app or the training has changed.
- `north-star`: see "North star". Set as D125.
- `<screen or flow>`: steps 1 to 3 below for that screen. If a screen it depends on (see
  Guardrails) has no approved mockup yet, say which one and ask whether to start there instead.
- `build`: step 4, once every screen is approved, or for the screens the user names.

## 1. Prepare a screen

1. Read REWORK.md: the north star, what Usage says about this screen's features and stats, this
   screen's row, its friction items, its open questions, and its "Agreed so far" if work on it
   already started (then carry on from there, do not start again).
2. Read the decisions for the area: grep `hevier/DECISIONS.md` for the screen, its views and its
   fields (`hevier/DECISIONS-INDEX.md` lists them all). Read the full rows of those that touch
   it. A decision whose reason is Hevy is open (D125); one that came from how the owner trains
   holds unless a friction row points at it. A row says "Hevy's" or cites the Hevy reference
   when Hevy is its reason; where a row has both (Hevy's layout, and a part "at the user's
   request"), the user's part holds. D125's list of holding decisions is examples, not the
   whole list. List the ones the mockup reopens.
3. Read the screen's code (its files in REWORK.md's Screens table, under
   `frontend/src/hevier/`; for navigation also upstream's `frontend/src/App.jsx` routes) enough
   to know what it shows, from where it is reached and where it leads, and which seams in
   `hevier/SEAMS.md` it uses.
4. Check upstream: `git fetch upstream`, then
   `git log --oneline hevier/main..upstream/<branch> -- <files>` for each `release-*` branch, on
   the upstream views the screen wraps or replaces (navigation: `frontend/src/App.jsx`,
   `components/TabBar.jsx`, `views/Home.jsx`). Upstream may be reshaping the same screen; say
   what you find when you show the mockup.
5. Score the old screen with the `before-after` skill (its picture, its main tasks' taps, its
   seven lines) and write the result into the screen's Baseline cell and under "Scores" in
   REWORK.md. The tasks are REWORK.md's "Main tasks"; navigation counts each of them that
   starts from opening the app. The emulator is shared: if
   another session is running, ask before taking it (memory "coordinate heavy runs"), or score
   from the code and say so.

Do not ask anything this answers. "Where else is X reachable from?" is a grep, not a question.

## 2. Mockup

1. **Three versions**, different in kind, not in detail: where things live, what the screen
   leads with, how the main task runs. One is the recommended one and is marked so. Each
   answers the screen's friction rows and open questions (navigation has none of its own: the
   jobs and the "may go a step deeper" list under Context), keeps what the owner looks at and
   drops or moves what is never opened (Usage). Things moved off the screen are named with
   where they land.
2. **How they are made:** one static page per screen, `hevier/ux/mockups/<slug>.html`, with
   the three versions side by side, each frame 411 × 891 CSS px (the test phone), drawn with
   the tokens of `frontend/src/hevier/theme.css` (its default accent) and the type and shapes
   of `DESIGN.md`. Where `DESIGN.md` describes the old layout (the three tabs, the page bar),
   only its look applies. The frames use the owner's routine and exercise names, which
   REWORK.md already has, and made-up numbers: nothing else from the backup goes into a
   committed file. Exercise pictures are grey placeholders: the media are never used in a
   mockup. No app code is touched and nothing is built. The slugs: `navigation`,
   `live-workout`, `workout-tab`, `picker`, `routine-editor`, `exercise-details`,
   `save-workout`, `workout-detail`, `home`, `profile-stats`, `settings`, `library`,
   `measures`.
   Navigation is about where things live, so each of its versions is several frames: every
   root page with its content as plain labelled blocks (what a block looks like belongs to
   that screen's own mockup), and a short list of where each moved thing lands.
3. **Look at it yourself first:** render the page to a picture (the Playwright browser tools,
   or `chromium --headless --screenshot`) and read it. Fix what overlaps, is cut off or cannot
   be read before the owner sees it.
4. **Score all three** against the old screen with `before-after`. A version whose total is
   lower than the old screen's is fixed or dropped. One that is worse on a single line because
   of a trade is shown, with the trade named.
5. **Show it:** the old screen (its picture, or "scored from the code" if there is none) and
   the three versions as pictures, with one short paragraph per
   version (what it changes, its taps for the main task before and after, its score) and the
   recommendation with its reason. Publish the page as a private Artifact when that tool is
   there, otherwise send the pictures.
6. **The owner comments or approves.** A comment changes the mockup, which is scored again. Ask
   a question only when a comment leaves a real choice open, one question per message, each
   with a recommended answer and what it changes elsewhere. Challenge an answer that clashes
   with the north star, a holding decision or an earlier answer: say so and ask which wins.
   "Your call" means take the recommendation and note it as yours.
7. **Save as you go:** the screen's "Agreed so far" in REWORK.md gets a line per settled point,
   so a session that ends mid-way loses nothing. Status: **mockup** while it is with the owner.
8. **Edge cases** are yours to propose once a version is chosen, from the code: two gyms and
   brands (D28, D82, D104), per side, timed and cardio sets, supersets, an empty history, a
   small phone, the system font at 200 % and TalkBack (J7), the back gesture, empty, loading
   and error states. Show the ones that change the picture as extra frames; ask only where
   there is a real choice.

## 3. Record an approved screen

1. A new decision in `hevier/DECISIONS.md`, with the next free number in `DECISIONS-INDEX.md`,
   skipping numbers that unmerged work already uses (`git grep -h "^- \*\*D1[0-9][0-9]" $(git
   branch --format='%(refname:short)') -- hevier/DECISIONS-INDEX.md | sort -u | tail -3`). The title states the behaviour ("The rest
   timer sits under the set it times"). The body is what changes, why (the F numbers it
   answers), the taps before and after, the before-after scores, which decisions it replaces,
   and what `upstream-merge` must recheck on this screen. A replaced decision gets a line
   "Replaced by Dn (date)".
2. Regenerate the index: `hevier/tools/decision-index.sh > hevier/DECISIONS-INDEX.md`.
3. Keep the approved version in `hevier/ux/mockups/<screen>.html` (the other two versions are
   removed from the page). It is what the build and later reviews are checked against.
4. Mark what the decision makes stale: LEDGER.md rows about the old screen ("superseded by
   Dn").
5. REWORK.md: the screen's status becomes **approved**, with the decision number; its "Agreed
   so far" is cleared. Commit the record on `hevier/ux-rework` if the user has agreed to
   commits there in this session; otherwise ask once.

Then start the next screen in the ranking; the user asked for all screens, so do not wait to be
told to go on.

## 4. Build and check

All approved screens are built together (D125), unless the user asks for some of them first.

1. Build with the `implement` skill on a new branch `hevier/rework` from `hevier/main` (merge
   `hevier/ux-rework` into it first, for the decisions and mockups), one unit per screen,
   navigation first.
   The fork's mechanics hold: new files under `frontend/src/hevier/`, upstream edits only at
   seams, different behaviour in a pure helper with its test. Seams added or removed go into
   `hevier/SEAMS.md`; `hevier/FEATURES.md` gets what is new; the views' tests
   (`navigation.test.jsx` and each screen's own) follow the new screens.
2. `verify`; `seam-check` if an upstream file changed; `emulator-check` on every screen; if the
   workout screen or a routine changed, `hevier/tools/routine-check.sh`.
3. Score every built screen with `before-after` against its Baseline and compare it with its
   approved mockup. The result goes in the screen's Result cell. A screen that scores worse
   than its old one, or differs from its mockup, is fixed before the user sees it; if the fix
   needs a trade, ask.
4. Update what still describes the old screens: the journeys in `hevier/ux/JOURNEYS.md` whose
   steps changed, the rules in `hevier/ux/STANDARDS.md` that name an old path or bar (G6, H4),
   and `DESIGN.md` (re-run `/impeccable document`). Then run the journeys (`ux-review`).
5. Hand over the debug APK (memory "Debug APKs to Downloads + Drive"). The user checks every
   screen on their phone. Status: **built**.
6. The user's notes come back through `friction`. A screen with no open note becomes
   **settled** on the user's word. The merge into `hevier/main` goes the usual way (`verify`
   before it), only when the user says so. There is no old screen behind a setting: the
   fallback is git.

## Interview

A product discovery interview about the whole app, before anything is redesigned: what the user
does with it, how often, what matters, what is never touched. The answers go into REWORK.md's
Usage section, which ranks the screens and is where every later grill starts.

**Prepare:**

1. Read `hevier/FEATURES.md` (the fork's features by area), `PRODUCT.md` "Users" and
   "Operating Context", and REWORK.md's Usage section (carry on where it stops). Its "Earlier
   answers" count as answered: turn each into a short confirmation folded into the step it
   belongs to, and spend the questions on going deeper ("you compare with the last session:
   which numbers, on which screen?").
2. Gather facts from the user's own data before asking. Unless one was given, the very first
   message only asks for a Go Hevier backup (the app's backup export in Settings): it has gyms,
   brands, per side, routines and the settings switched on. Without one, go on with the Hevy
   export and ask what it cannot show. The Hevy export
   `~/Downloads/workout_data.csv` (memory "Hevy CSV test data") is the older history: workouts
   per week, typical length, exercises and sets, how often supersets, warm-ups, timed or cardio
   sets, notes. If the newest source's last workout is more than 14 days before today, ask for a
   fresh one. What neither source shows is listed as "not in the data" and asked instead. Count
   with a short script; the data stays on this machine. Never use the emulator's test profile as
   the user's data.

**Ask open questions; give a guess only for a counted fact.** "You logged supersets in 3 of 254
workouts, so rarely; right?" is fine. For jobs, importance and which stats matter, ask first and
offer nothing: a guess there anchors the answer. The first message sums up the facts in a few
lines, then asks the first question. One open question per message; a short confirmation of an
earlier answer may ride along with it. A step with many topics (step 1) takes several
questions. Walk these steps in order and
finish one before the next:

1. The training week: when, where and how long they train, which gyms, phone in hand or in a
   pocket, what they do between sets, what happens before and after (planning at home, checking
   stats).
2. The jobs: the few things they come to the app for, in their words, and which one matters
   most. Which of them the app does badly now.
3. Features, area by area of FEATURES.md (skip "Statistics and history": step 4 covers it): per
   area only what is never used and what is a must keep. The rest is "nice to have" without a
   question. Ask about one feature alone only when the data and an answer disagree.
4. The stats, in more depth: this matters to the user. Before the step, list every number and
   chart the app shows, grouped by screen, from the view code and `routes.jsx` (FEATURES.md does
   not name them all): Home, the live workout, Save workout and the finished screen, workout
   detail, the routine page, exercise details, Profile, Statistics and the pages it opens
   (all statistics, structural balance, calendar, monthly report, strength levels, exercise
   time, lift trends), Measurements. Upstream's own charts count too, one line per chart.
   - First show the grouped list and ask which ones are opened at all. The rest go on the
     "Never opened" line under the Stats table.
   - Then one stat at a time, the most used first: when it is looked at (between sets, right
     after the workout, at home), how often, what it is used to decide (the next weight, a
     deload, whether a routine works), and what is missing or hard to read. "When did you last
     open X, and what were you looking for?" works well. Stats used the same way can share a
     question.
   - At the end of the step, order the Stats rows by importance and confirm that order.
5. Where things are expected: for the main tasks, where on screen they reach for it first, and
   what they look for and cannot find. Moments of hesitation, things done by habit only because
   Hevy did them, and workarounds (a note used as a field, an exercise logged twice).
6. Trade-offs: what may get one tap slower so that the main path gets faster; what may move off
   the main screens into a deeper one.
7. Other people: one confirmation that PRODUCT.md still holds (the owner decides; others may
   install the APK).

Typical product and UX questions are welcome where they fit: "walk me through your last
workout", "what did you do right after you finished", "when did you last open X and why", "if
you could change one thing". Ask about past behaviour over wishes: what they did last time beats
what they would like to do.

**When an answer and the data disagree**, show both and ask. Record both under "Facts from the
data", with the one the user stands by.

**Budget:** about 40 questions in all. The interview is done when there is enough to rank the
screens, not when every feature has been asked about. A long step can stop at a saved point and
carry on in the next session.

**Save** after each step (and each area in step 3): step 2 under Jobs; steps 1, 5, 6 and 7 under
Context; step 3 into the Features table; step 4 into Stats. A pain point that comes up in any step
is also a friction row tied to its screen, as `friction` mode does it (source `gym` if it
happened in the gym, otherwise `other`). Facts go only under "Facts from the data". Update
Usage's status line each time (in progress, with the next step; done, with the date).

**End** with a short summary of Usage (the top jobs, what is used most, the stats that are really
looked at, what is never used) and a proposed new screen ranking, changed in REWORK.md only on the
user's yes.

## North star

Set on 2026-11-16 as D125; it is at the top of REWORK.md. Run this again only if the user
reopens it.

Prepare: read REWORK.md (Usage above all), D125 in `hevier/DECISIONS.md`, `hevier/RULES.md`
"Scope", and `PRODUCT.md` "Product Purpose", "Positioning" and "Product Principles".

A reopened north star is grilled one branch at a time, each question with a recommended answer:
the aim in one sentence; what stays fixed; which decisions are open; how the rework runs (the
pace, the fallback, how mockups come about); the order of the screens. Progress is saved under a
"North star" heading in REWORK.md's "Agreed so far".

It ends with D125 reworded (dated, with what changed), the same wording at the top of REWORK.md,
and, shown to the user and changed only on their yes, whatever follows from it in
`hevier/RULES.md` "Scope", `PRODUCT.md`, `hevier/ux/STANDARDS.md` "The decisions come first",
`hevier/agents/ux-reviewer.md`, `hevier/skills/ux-review/SKILL.md`, the `before-after` skill
and this skill.

## Guardrails

- The interview asks; it does not design. A design idea that comes up goes to the open questions
  under its screen.
- One screen per mockup page. A question that belongs to another screen goes to REWORK.md's open
  questions for that screen.
- Navigation is approved before any other screen is shown, and a screen others depend on (the
  live workout above all) before the screens around it.
- Nothing is built before its mockup is approved.
- A `[heavy-usage]` WIND DOWN: save "Agreed so far" and what is with the user, and stop.
