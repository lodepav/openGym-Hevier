---
name: ux-rework
description: Rework Go Hevier's flows and pages past Hevy's UX. A product interview on how the owner uses the app, then a grill-style north star and one grill per screen (one question at a time, each with a recommended answer) until every branch is settled, then the decision, the build and a before/after check. Tracked in hevier/ux/REWORK.md. Use only for /ux-rework.
argument-hint: "status | friction | interview | north-star | <screen or flow from REWORK.md>"
disable-model-invocation: true
---

# UX rework

Go Hevier started as openGym's logic with Hevy's UX. The rework moves past that: screens may be
changed completely and things moved until the app is more intuitive, with openGym and Hevy as the
starting point, not the measure. This skill is how each change is agreed and built.

- **Scope: flows and pages.** What a screen is for, what is on it, where things live, how many
  steps a task takes. Not the look: colours, type and shapes come from the move to OpenBite's
  look (D123, merged from `hevier/look-openbite`) and `DESIGN.md`, and a rework uses them as they
  are. Until D123 is on `hevier/main`, only grill; build nothing.
- **The tracker is [hevier/ux/REWORK.md](../../ux/REWORK.md).** Read it first, write to it as you
  go. It is what carries the work across sessions.
- **The order is interview, north star, then screens**, navigation first. The interview finds out
  how the app is really used; the north star sets the aim from that; the screens follow it.
- **The grill style is for this skill only.** Do not carry it into other work in the same chat.

## Modes

The argument picks one. With no argument, run `status`.

- `status`: read REWORK.md and report in a few lines: the interview's status, the north star (or
  that it is not set), the screen being grilled and its open branch, the next screen (the highest
  ranked that is not started or reopened), friction items not yet tied to a screen, and whether
  builds still wait for D123 on `hevier/main`. Change nothing.
- `friction`: the user gives friction notes (from the gym, a review, a screenshot). Add each as
  a row of the friction list with the next free F number and today's date, tie it to a screen,
  and put the F number in that screen's Friction cell. A note about a part of a screen (the rest
  bar, the PREVIOUS column) goes to the screen that holds it, with the part named in the text.
  Source is `gym`, `review Rn` (a ledger round) or `other`; the user's own note is `gym` unless
  they say otherwise. One note naming several problems is one row each. Ask only when a note is
  unclear. Re-rank only when the user asks.
- `interview`: the product interview (see "Interview"). It comes first and can be run again
  later, by area (`interview workout`), when the app or the training has changed.
- `north-star`: it must come before any screen. First check Usage's status in REWORK.md: if the
  interview is not done, say so and offer it, before any other reading; go on without it only
  if the user says so. See "North star".
- `<screen or flow>`: a grill on that screen, then the record, build, check and try steps. If
  the north star is not set, say so, offer `/ux-rework north-star`, and change nothing. If a
  screen it depends on (see Guardrails) is not agreed yet, say which one and ask whether to
  start there instead.

## 1. Prepare a screen (before the first question)

1. Read REWORK.md: the north star, what Usage says about this screen's features and stats, this
   screen's row, its friction items, its "Agreed so far" if the grill already started (then
   carry on from its open branch, do not start again).
2. Read the decisions for the area: grep `hevier/DECISIONS.md` for the screen, its views and its
   fields (`hevier/DECISIONS-INDEX.md` lists them all). Read the full rows of those that touch
   it. A decision whose reason is that Hevy does it ("Hevy's X", "as Hevy does", a Hevy
   reference, or a code comment or `reference/SCREENS.md` entry that names Hevy as the reason)
   is open to change now; the others hold unless the user reopens them. The north
   star may narrow this.
3. Read the screen's code (its files in REWORK.md's Screens table, under
   `frontend/src/hevier/`; for navigation also upstream's `frontend/src/App.jsx` routes) enough to know what it shows, from where it is reached and
   where it leads, and which seams in `hevier/SEAMS.md` it uses.
4. Check upstream: `git fetch upstream`, then look for changes to the screen's upstream views on
   upstream's branches and in `hevier/PIPELINE.md`. Upstream has a designer at work, so it may be
   reshaping the same screen; say what you find before the first question.
5. Count the baseline: the taps and steps of the screen's main task on its journeys
   (`hevier/ux/JOURNEYS.md`), from the code or, if the emulator is free (no other session is
   using it, memory "coordinate heavy runs"), on screen with `hevier/tools/cdp.mjs`, with a
   screenshot, with the user's own settings where they change the count (the weigh-in sheet,
   the last gym). Write it into the screen's Baseline cell as `task: n taps`, one per main task.
   Navigation's main tasks are the top jobs from Usage, each counted from opening the app.

Do not ask anything this answers. "Where else is X reachable from?" is a grep, not a question.

## 2. Grill

Interview the user about the screen until there is a shared understanding of every part of it.

- **One question per message.** Each comes with:
  - your recommended answer, and the reason in a sentence or two;
  - what the answer settles or changes elsewhere (another screen, a decision, a journey).
- **When the question is "how should X work", give 2 or 3 options** that differ in kind, not in
  detail, and recommend one. A layout option can be a plain text mockup.
- **Walk the tree in this order**, and finish a branch before opening the next. Skip what does
  not apply.
  1. The job (start from Usage and ask only what it does not answer; for navigation, the top
     jobs and how often each comes up): what the user comes to
     this screen to do, in which journey (J1 to J7), how often, and in which hand and moment
     (between sets, at home).
  2. What stays, what goes, what merges with something else.
  3. Where each moved thing lands, and how it is reached from there (within what navigation
     agreed).
  4. The steps of the main task: the baseline, and a target ("start routine to first set: 4 taps
     to 2").
  5. What it breaks: other screens that link here or show the same thing, decisions it
     replaces, seams it adds or removes, upstream merge cost and what upstream is changing
     there. The Hevy import and sync to Hevy (D29, D30, D31, D33, D34) and openGym's logic are
     not in scope to change. D35's "Update routine?" prompt is UX and is in scope.
  6. Edge cases and states: propose them yourself from the code (two gyms and brands, D28, D82,
     D104; per side; timed and cardio sets; supersets; an empty history; a small phone; the
     system font at 200 % and TalkBack, J7; the back gesture; empty, loading and error states).
     Ask only where there is a real choice.
- **Challenge.** When an answer clashes with a decision, the north star or an earlier answer,
  say so plainly and ask which one wins. Do not agree to keep things moving.
- **"Your call"** means take your recommendation. Note it as yours in "Agreed so far".
- **Save after each settled branch**: append it to the screen's "Agreed so far" in REWORK.md, so
  a session that ends mid-grill loses nothing.
- **No code during the grill**, and no implementation detail the user would not see, unless
  they ask for it.
- **End the grill** when no branch is open. Sum up the whole agreed screen in one message (what
  the user sees, the steps before and the target, what it replaces) and ask for a yes. Changes
  after that go back into the tree where they belong.

## 3. Record

1. A new decision in `hevier/DECISIONS.md`, with the next free number in `DECISIONS-INDEX.md`,
   skipping numbers that unmerged or uncommitted work already uses (D123 is the OpenBite look,
   on `hevier/look-openbite`). If unsure, ask. The title states the behaviour ("The rest timer
   sits under the set it times"), never "like Hevy". The body is what changes, why (the F
   numbers it answers), the target steps, which decisions it replaces, and what `upstream-merge`
   must recheck on this screen. A replaced decision gets a line "Replaced by Dn (date)".
2. Regenerate the index: `hevier/tools/decision-index.sh > hevier/DECISIONS-INDEX.md`.
3. `hevier/FEATURES.md` for anything new it adds.
4. Mark what the decision makes stale: LEDGER.md rows about the old screen ("superseded by Dn"),
   and the screen's section in `hevier/reference/SCREENS.md` ("reworked in Dn, no longer the
   reference").
5. REWORK.md: the screen's status becomes **agreed**, with the decision number.

## 4. Build and check

1. Build it with the `implement` skill on `hevier/rework-<screen>`. The fork's four rules hold:
   new files under `frontend/src/hevier/`, upstream edits only at seams, logic stays upstream's
   or in a pure helper with its test. Seams added or removed go into `hevier/SEAMS.md`; the
   views' tests (`navigation.test.jsx` and the screen's own) follow the new screen.
2. `verify`; `seam-check` if an upstream file changed; `emulator-check` on the screen; if the
   workout screen or a routine changed, `hevier/tools/routine-check.sh`. The last two use the
   emulator: if another session is running, ask before taking it.
3. Count again: the same journeys' taps and steps as the baseline, and the STANDARDS G rules
   (G6 above all). The result goes in the screen's Result cell. Missing the target is said
   plainly and goes back to the grill, not into the merge.
4. Update the journeys in `hevier/ux/JOURNEYS.md` whose steps changed, so later reviews follow
   the new screen.
5. The merge into `hevier/main` goes the usual way (`verify` before it), only when the user
   says so. REWORK.md status becomes **built**, with the branch or merge commit.

## 5. Try

The user uses it in real workouts. Their notes come back through `friction`. With no new
friction after a week of workouts and the target met, the status becomes **settled**.

- A settled screen reopens only on new friction rows, not on a new idea; an idea goes to the
  screen's open questions until friction backs it.
- A screen reopened twice goes back to the north star: something about its job is not agreed.

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

Prepare: read REWORK.md (Usage above all), `hevier/RULES.md` "Scope", `PRODUCT.md` "Product
Purpose", "Positioning" and "Product Principles", and `hevier/DECISIONS-INDEX.md` whole.

The `north-star` grill settles, one branch at a time, each question with a recommended answer:

- the aim in one sentence (the current draft is in REWORK.md);
- (whether the three tabs stay is left to the Navigation grill, unless the user wants it fixed
  here);
- what stays fixed: openGym's logic, the four fork rules, the Hevy import and sync to Hevy, the
  look from D123, one layout and portrait (D1, D24);
- which existing decisions are open: by default every decision whose reason is Hevy (grep `Hevy`
  in `hevier/DECISIONS.md` for the list);
- in one question: how much may change per release, and whether a reworked screen keeps the old
  one as a setting (default: no, as D123 kept no old look);
- the order of the screens, navigation first.

It ends with a decision that names itself the rework's north star, and with new wording, shown to
the user and changed only on their yes, for:

- `hevier/RULES.md` "Scope", `PRODUCT.md` "Product Purpose", "Positioning" and "Product
  Principles";
- the review's standing rules, which still say the user is happy and nothing is redesigned:
  `hevier/ux/STANDARDS.md` "The decisions come first", `hevier/agents/ux-reviewer.md` and
  `hevier/skills/ux-review/SKILL.md`;
- `hevier/skills/hevy-side-by-side/SKILL.md` and `hevier/reference/SCREENS.md`: a reworked screen
  is no longer compared with Hevy.

The north star goes at the top of REWORK.md. Its progress is saved like a screen's, under a
"North star" heading in "Agreed so far".

## Guardrails

- The interview asks; it does not design. A design idea that comes up goes to the open questions
  under its screen.
- One screen per grill. A question that belongs to another screen goes to REWORK.md's open
  questions for that screen.
- Navigation is agreed before any screen, and a screen others depend on (the live workout above
  all) before the screens around it.
- A `[heavy-usage]` WIND DOWN: save "Agreed so far" or the interview's point and the open branch,
  and stop.
