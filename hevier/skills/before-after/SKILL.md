---
name: before-after
description: Score a screen as it is now and a new version of it (a mockup or a build) on ease of use, what matters to the owner counted first, and say whether the new one is better. A new version that scores worse is fixed, or asked about if the trade is unclear. Use in the UX rework for every mockup and every built screen, or when asked whether a changed screen is better than the old one.
---

# Before and after

The measure of a reworked screen is the screen it replaces, not Hevy (D125). Both are scored
the same way, the old one first, so the old score cannot drift towards the new design.

What matters to the owner comes from `hevier/ux/REWORK.md`: "Usage" (the jobs, the stats in
their order, the trade-offs under Context) and the friction list. Read it before scoring.

## 1. The old screen

1. Take it from the app as it is on `hevier/main` (in another worktree, check that
   `git diff hevier/main -- frontend` is empty). If the emulator runs that build, capture it
   with `emulator-check` and `node hevier/tools/cdp.mjs shot`, with the owner's own data loaded
   (memory "User test data" says how), in the state the main task starts from. Snapshot the app
   before loading it and restore the snapshot after ("Before and after a round" in
   `hevier/ux/JOURNEYS.md`). If the emulator is in use or runs another build, score from the
   code and say so: there is then no old picture, and the sizes and contrast are not measured.
2. Keep the picture in `~/.local/state/go-hevier/before-after/<slug>-old.png` (the slugs are
   in the `ux-rework` skill). It shows the owner's data, so it is never committed, and it has
   to outlive the session: the built screen is compared with it later.
3. Score it (section 3). Write the short form into the screen's Baseline cell in REWORK.md,
   `25/33 (2·2·3·3 | 1·2·2); T1 1 tap, T6 4 taps`, and the table with its evidence under
   "Scores" there, one heading per screen. An old screen is scored once; later versions are
   compared with that table.

## 2. The new version

A mockup (`hevier/ux/mockups/<screen>.html`, each of its versions) or the built screen on the
emulator. Same data, same state, same phone size as the old picture.

## 3. The score

Each line is scored 0 to 3 (0 fails, 1 poor, 2 fine, 3 as good as it gets on a phone), with one
sentence of evidence: a count, a measured size, or what the picture shows. No evidence, no
score. Lines 1 to 4 are what the owner named and count double.

| # | Line | How it is measured |
|---|---|---|
| 1 | The main tasks' steps | The taps of each of REWORK.md's "Main tasks" that passes through the screen, from the task's start to its end. Per task: 3 no step could be saved, 2 one step more than needed, 1 two or more, 0 it needs a search or a detour through another tab. The line is the lowest of its tasks. |
| 2 | Read at a glance | The one thing the screen is opened for (the next set's weight and reps in a workout, the last sessions on an exercise; for navigation, what is next today on the page the app opens on) is on screen without a tap or a scroll, and is the largest text there. In the workout it must be readable with the phone lying nearby: measure its font size. |
| 3 | Nothing that must stay fast got slower | Each task on the "must never get slower" list under Context that passes through this screen: its taps, before and after. One slower task makes this line 0. The old screen is the reference: it scores 3, and its taps are written down. |
| 4 | Its friction rows | Each F row tied to the screen: gone (3), eased (2), still there (0 or 1). A screen with no friction row leaves this line out, for the old and the new alike, and the total is out of 27. |
| 5 | What is looked at is in view | Of what the screen shows, how much the owner said they look at (Usage's Stats and Features tables) against what they never open or agreed could go deeper (Context). What is never opened is gone or a step deeper. |
| 6 | Found where it is expected | Actions have a visible control with a label or a plain icon, in the place the owner reaches first; nothing needed often sits in the middle of a menu. |
| 7 | The standing rules | `hevier/ux/STANDARDS.md` on the screen: 48 dp targets, measured contrast, the system font at 200 % (the A and G rules), the back gesture (P1). A rule that names the old layout (G6's path, H4's page bar) is scored by what it is for. For a mockup, what can be read off it. |

Total: lines 1 to 4 doubled plus lines 5 to 7, out of 33.

## 4. The verdict

Show old and new side by side: the two pictures, then the table with both scores per line and
the totals.

- **Better:** the total is higher and no line from 1 to 4 is lower. Say so and go on.
- **Worse on a line the design can fix** (a control too small, a step that can be saved): fix
  it and score again. Do not ask.
- **Worse on a line because of a trade** (a stat moved a step deeper to make room, a task one
  tap slower so another gets faster): ask the owner, with both scores and what was traded. Do
  not decide it.
- **The same or lower in total:** the version is not an improvement. Say so plainly; it does
  not go forward as the recommended one.

With three versions of a mockup, score all three in one table. The recommended version is the
one the scores back; if you recommend another, say why.

## Rules

- Never raise the old screen's score after the fact, and never score the new one before the
  old one is written down.
- The exercise pictures are licensed: a mockup uses a grey placeholder, never the media.
- Say openly what could not be measured (a mockup has no TalkBack, a code-only score has no
  picture).
