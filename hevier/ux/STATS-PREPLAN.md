# Statistics pre-plan

Written 2026-11-18. A pre-plan for reorganising Go Hevier's statistics after the rework (D126,
D135). It is not a decision yet: the open questions below come first, then mockups through
`/ux-rework`, then a decision row. Delete this file once that decision is built.

## What the owner asked

In their words, 2026-11-18:

- Weekly sets per muscle against target ranges (D99): remove it completely.
- Stat buttons are on Lifts, some on History, and there is a separate Statistics page. It should
  be better organised.
- Lift cards could be bigger and show progress over time.
- The By muscle grouping on Lifts can show the same progress per muscle group, with compound
  exercises counted in full and isolation exercises at half (they progress more slowly and
  usually come later in the session).
- The current set-up came out of the interview's ranking, but common sense got a bit lost, and
  looking at lifts alone is not very informative.

## What is there now

Nine stats pages, reached from three places:

| Opened from | Pages |
|---|---|
| Lifts chips (`views/Lifts.jsx:66-70`) | Strength levels, Trends, Exercise time |
| History chips (`views/History.jsx:47-58`) | Calendar, Monthly report, Statistics, Sets per muscle, Body weight, All statistics |
| Statistics rows (`views/Statistics.jsx:66-73`) | Sets per muscle, Monthly report, Strength levels, Exercise time, Lift trends, All statistics, Structural balance |

Paths are under `frontend/src/hevier/` unless they start with `frontend/src/`.

- Every page Statistics links to also opens from a chip on Lifts or History. Statistics itself
  holds only the weekly chart and the last-7-days body graph, both on the interview's "rarely or
  never looked at" list (`ux/REWORK.md`, Usage).
- Exercise time also exists as upstream's card on All statistics, and Structural balance as a
  row there too.
- Sets per muscle is counted in five places: its own page, the weekly chart's week sheet, the
  Monthly report, All statistics' Muscles card and the workout cards. The owner knows their
  volume and does not check it.

## Problems, most important first

1. **No progress over time outside one exercise's page.** A Lifts row shows the last set and the
   all-time best (`lib/lifts-list.js:35-36`), which says nothing about direction.
2. **Trends is a stall alarm, not a progress page.** It reuses D95's 3-week window
   (`lib/strength-signal.js:17`, `WINDOW_DAYS = 21`), and its percent compares the first and
   last estimated 1RM in that window: two or three sessions, mostly noise.
3. **Lifts merges machine brands, Trends splits them.** Lifts keys a row on the exercise id
   (`lib/lifts-list.js:26`), so "best" can come from the other gym's machine; Trends chains by
   label (D82).
4. **Statistics is a page of links** to pages that open from elsewhere anyway.
5. **Volume is everywhere** though it is not looked at (see above).
6. **The phase filter is uneven.** It is on Statistics, Sets per muscle, Strength levels and
   Exercise time, but not on Lifts or Trends, where "how did the cut go" is asked. On Statistics
   the weekly chart sits above the filter and ignores it (`views/Statistics.jsx:61-63`).
7. **Small ones.** The Strength levels row on Statistics hides until levels are set, the Lifts
   chip always shows. Lifts-tab pages carry the aria back label "Statistics". `lib/module-parts.js:22`
   still mentions a Home widget for weekly sets (to check: none was found in `hevier/`).

## Proposed structure

Version A for the mockups. Keep the three tabs, Today, Lifts and History (D126). One home per
stat, four stats pages instead of nine.

**Lifts owns progress.**
- Bigger cards: the last set, the best, a 12-week chart of estimated 1RM and its change.
- A lift done on two brands is one card with a line per brand.
- Rising, holding or falling is a mark on the card, with a "Falling first" sort. The Trends page
  goes.
- By muscle gets a header per muscle group with its progress (see the metric below).
- The phase filter moves here.
- Strength levels becomes a sort, or one link at the end of the list.
- The chips row goes.

**History owns what was done.** The week's tiles, Calendar, Monthly report, one Statistics chip,
then the feed.

**Statistics is one real page.** Sets per muscle by period (the `/muscle-sets` page folded in, if
kept at all), the weekly chart, Exercise time and Body weight. All statistics and Structural
balance as two links at the end, or gone.

**Goes away.**
- Weekly sets against ranges: `components/WeeklySetsCard.jsx`, `lib/weekly-sets.js` and its
  test, D119's "weeks in range", the module part at `lib/module-parts.js:22`, their locale
  strings, and FEATURES.md rows.
- The last-7-days body graph.
- The `/muscle-sets` and `/lift-trends` pages (routes, chips, rows).
- History's "Numbers" row shrinks to the Statistics chip.

Versions B and C come from the `/ux-rework` run; the scores decide.

## The muscle-group progress metric

Training logic: a pure helper in `frontend/src/hevier/lib/` with a test beside it.

**Per lift.** The change in estimated 1RM over the window, as the median of the first three
sessions against the median of the last three. Sets above 12 reps have no estimate
(`frontend/src/lib/onerm.js`, `REP_CAP = 12`); for those, fall back to the session-against-session
arrows D95 already reads (`sessionVerdict`, `lib/strength-signal.js`).

**Per muscle group.** A header like "Chest +3% · 4 of 5 up".
- The percent is the weighted mean of the lifts' changes: compound 1, isolation 0.5, as the
  owner asked. The half weight also damps the coarse steps of small dumbbells (10 to 12.5 kg is
  +25%).
- The count is unweighted. It is the honest half: it holds up when a rep range changes or a step
  is coarse.
- A lift on two brands counts once, its weight shared between its labels.
- No number until the group has two qualifying lifts.
- Exercises kept out of progression stay out (D57); the main muscle only (D74).

**Traps to keep in mind.**
- A changed rep range moves estimated 1RM without strength changing (Epley rewards 6 to 10 reps).
- Stalled lifts are the ones that get swapped, so a group's average drifts upward as they drop
  out.

**Compound or isolation.** The catalogue has no flag for it. Upstream's `isCompoundEx`
(`frontend/src/lib/warmup-ramp.js:47-57`) decides by name and can be reused unedited, with a
per-exercise override in the fork. Not yet run over the owner's lifts; custom and imported
exercises need checking.

**Grouping.** Lifts' six By muscle groups (`lib/muscle-groups.js`) put squats with calves and
biceps with triceps, too coarse for progress. D95's grouping (`lib/strength-signal.js:22-25`:
Back and Shoulders whole, the rest by muscle) fits better.

## Open questions for the owner

1. Upstream's Ranges editor in Settings and its Muscles card on All statistics: go too? Removing
   them needs a seam.
2. Sets per muscle: keep a plain count by period on Statistics, or drop it completely?
3. Progress window: a fixed 12 weeks, the current OpenBite phase, or a switch?
4. Compound or isolation: `isCompoundEx` plus a per-exercise override, or one list ticked once?
5. Muscle groups: lower back in Back and the three delt heads one Shoulders, as D95 does? Calves
   and abs shown or left out?
6. Strength levels: is a sort on Lifts enough, or keep its page?
7. All statistics and Structural balance: two links at the end, or hidden completely?

## Parts, in order

Agreed 2026-11-19: four parts, one at a time, each with its own decision row and build.

1. **Remove weekly sets against ranges (D99).** Answers: upstream's Ranges editor and its Muscles
   card on All statistics are hidden too (one seam); sets per muscle stays as a plain count by
   period, without ranges.
2. **Lift progress on the cards.** Bigger cards, 12-week chart, rising/falling mark, brands as
   lines, the phase filter; replaces Trends. Answers (2026-11-19): the window is a switch (12 weeks,
   the phase, All, remembered); Strength levels keeps its page, one link at the end of Lifts;
   mockups through `/ux-rework` first. Approved as D140; built on `hevier/stats-no-ranges` (version B2: totals that filter, rows with a 32 px chart).
3. **Muscle-group progress** in By muscle, on part 2's per-lift metric. Answers (2026-11-19):
   compound or isolation is upstream's name guess (`isCompoundEx`) wrapped by a fork helper that
   fixes its slips, with a test over the owner's lifts. The owner first chose "one muscle group is
   isolation, more is compound", but the catalogue lists secondary muscles for almost every
   exercise: run over the 2026-11-15 backup it made 133 of 134 lifts compound (leg extension: hip
   flexors; lateral raise: traps; curls: forearms). The name guess got all but 4 of the ~90 lifts
   done five times or more right; the slips: "lateral" in "lateral pulldown" (two lifts) and in
   "unilateral" (a split squat) reads as isolation, and "push up" with a space is not matched.
   D95's groups
   (Back whole, the three delt heads one Shoulders), calves and abs included.
4. **Navigation.** One real Statistics page, fewer chips on History and Lifts. Answers
   (2026-11-19): All statistics and Structural balance as two links at the end of Statistics; sets
   per muscle by period becomes a card on Statistics, its own page and History's chip go.

## How it runs

1. The owner answers the questions above. -> check: each answer written into this file.
2. `/ux-rework friction` with the owner's notes, which reopens screens 9 (History, statistics)
   and 5 (exercise details and trends) in `ux/REWORK.md`.
3. `/ux-rework` on those screens: a mockup in three versions (`ux/mockups/stats.html`), with
   `dataviz` and `impeccable` for the bigger cards and the charts, each scored with
   `before-after` against today's screens.
4. Before the owner sees them, two fresh reviewers, one Opus and one Fable, each given the
   mockup, the owner's notes and `ux/STANDARDS.md`, not the recommendation.
5. The owner picks; a new decision row (next free D number) replaces D99 and changes D119, D126
   and D135; `tools/decision-index.sh > DECISIONS-INDEX.md`.
6. Build: the metric helper and its test first, then the pages, then removal of D99's code.
   -> check: `/verify`, `seam-check` if a seam is added.
7. On the emulator: `ux-reviewer` walks J5 (looking back), then `emulator-check` and the debug
   APK. Ask the other session before taking the emulator.

## Sources

- The owner's notes, 2026-11-18.
- A fresh Fable review of the code and decisions, same day; its main claims were checked against
  the code (`REP_CAP`, `WINDOW_DAYS`, the Lifts row key, `isCompoundEx`, the Statistics layout).
