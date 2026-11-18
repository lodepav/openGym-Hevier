---
name: Go Hevier
description: openGym's Android app with Hevy's layout in OpenBite's look, on AMOLED black, with an accent you choose.
colors:
  accent-green: "#34d08a"
  accent-green-pressed: "#279c68"
  on-accent: "#000000"
  hevy-blue: "#008cff"
  accent-teal: "#40c8e0"
  accent-opengym: "#a3e635"
  accent-pink: "#ff7eb6"
  cardio-green: "#2fbf5b"
  warmup-yellow: "#efab03"
  failure-red: "#ec5a45"
  danger-red: "#e34b37"
  superset-violet: "#bf5af2"
  deload-orange: "#ff9f0a"
  deload-pink: "#ff7eb6"
  cardio-teal: "#40c8e0"
  amoled-black: "#000000"
  stripe-black: "#0b0a08"
  well-grey: "#16140f"
  control-grey: "#1f1d19"
  next-tick-grey: "#48433b"
  hairline: "#38352f"
  ink-warm: "#ece8e1"
  ink-grey: "#a39e94"
  ink-faint: "#a09b91"
  ink-ghost: "rgba(163,158,148,.25)"
typography:
  display:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "96px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  readout:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "50px"
    fontWeight: 800
    lineHeight: 1.05
    fontFeature: "tnum"
  headline:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0em"
  body:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.29
  value-open:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    fontFeature: "tnum"
  stat:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    fontFeature: "tnum"
  value:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    fontFeature: "tnum"
  section:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "-0.004em"
  label:
    fontFamily: "'Nunito', Roboto, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  none: "0px"
  mark: "6px"
  well: "14px"
  tile: "20px"
  card: "26px"
  sheet: "32px"
  pill: "999px"
  round: "50%"
spacing:
  pad: "16px"
  row: "44px"
  row-open: "60px"
  col-gap: "6px"
  card-gap: "12px"
  card-pad: "16px"
  exercise-pad: "12px"
  stat-gap: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent-green}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "9px 14px"
  button-primary-active:
    backgroundColor: "{colors.accent-green-pressed}"
  button-secondary:
    backgroundColor: "{colors.well-grey}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.pill}"
    padding: "9px 14px"
  button-danger:
    backgroundColor: "{colors.well-grey}"
    textColor: "{colors.danger-red}"
    rounded: "{rounded.pill}"
    padding: "9px 14px"
  button-danger-active:
    backgroundColor: "{colors.control-grey}"
  button-finish:
    backgroundColor: "{colors.accent-green}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "32px"
  exercise-action:
    backgroundColor: "{colors.well-grey}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.well}"
    height: "48px"
  stat-tile:
    backgroundColor: "{colors.well-grey}"
    textColor: "{colors.ink-grey}"
    rounded: "{rounded.tile}"
    padding: "10px 12px"
  page-bar:
    backgroundColor: "{colors.amoled-black}"
    textColor: "{colors.ink-warm}"
    typography: "{typography.title}"
    height: "44px"
  tab-active:
    textColor: "{colors.accent-green}"
    rounded: "{rounded.pill}"
  flat-row:
    backgroundColor: "{colors.amoled-black}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.none}"
    height: "64px"
  set-row:
    backgroundColor: "{colors.amoled-black}"
    textColor: "{colors.ink-warm}"
    typography: "{typography.value}"
    rounded: "{rounded.none}"
    height: "44px"
  set-row-striped:
    backgroundColor: "{colors.stripe-black}"
  set-row-open:
    backgroundColor: "{colors.control-grey}"
    typography: "{typography.value-open}"
    height: "60px"
  set-well:
    backgroundColor: "{colors.well-grey}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.well}"
  set-tick:
    backgroundColor: "{colors.control-grey}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.round}"
    size: "30px"
  set-tick-open:
    backgroundColor: "{colors.next-tick-grey}"
    textColor: "{colors.ink-grey}"
    size: "44px"
  set-tick-on:
    backgroundColor: "{colors.accent-green}"
    textColor: "{colors.on-accent}"
  add-set:
    backgroundColor: "{colors.well-grey}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.pill}"
    height: "44px"
  rest-dock:
    backgroundColor: "{colors.amoled-black}"
    textColor: "{colors.accent-green}"
    typography: "{typography.readout}"
  chip:
    backgroundColor: "{colors.well-grey}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-on:
    backgroundColor: "{colors.accent-green}"
    textColor: "{colors.on-accent}"
  card:
    backgroundColor: "{colors.amoled-black}"
    rounded: "{rounded.card}"
    padding: "16px"
  exercise-card:
    backgroundColor: "{colors.amoled-black}"
    rounded: "{rounded.card}"
    padding: "12px 12px 8px"
  input:
    backgroundColor: "{colors.well-grey}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.tile}"
    padding: "13px 15px"
  toast:
    backgroundColor: "{colors.control-grey}"
    textColor: "{colors.ink-warm}"
  sheet:
    backgroundColor: "{colors.amoled-black}"
    rounded: "{rounded.sheet}"
    padding: "8px 18px 20px"
---

# Design System: Go Hevier

This records the look the fork ships today (the `VITE_HEVIER=1` build, everything under
`:root[data-ui="hevier"]`). The tokens live in `frontend/src/hevier/theme.css`, the fork's
components in `frontend/src/hevier/hevier.css`, and the base they override in
`frontend/src/index.css`. The accents are in `frontend/src/hevier/lib/accents.js`, the meaning
colours and their backups in `frontend/src/hevier/lib/meaning-colours.js`, the way a set is
written in `frontend/src/hevier/lib/set-text.js`, the boot screen and the font in
`frontend/src/hevier/build/boot-look.js`. Where this file and a decision in `hevier/DECISIONS.md`
differ, the decision wins (D123 for the look and the accent, D17 for the dark-only black page, D83
for the boot screen, D49 for the page bar, D126 for the tabs, D127 for the live workout, D132 for
Finish, D134 for Today, D135 for History and Lifts).

The accent is the user's pick. Every value this file gives as `accent-green` is the default; the
page reads it from upstream's `--acc`, `--acc-2` and `--on-acc`, which follow the pick.

## Overview

**Creative North Star: "The Familiar Rack"**

Everything is where a Hevy user's hand already goes. The layout starts from Hevy's on purpose: its
set table, its page bar, its list of finished workouts. The skin is OpenBite's
(D123): Nunito, warm greys, round shapes, each exercise in its own card on a pure black page. A new
screen is right when someone who trained with Hevy for years finds every control where they expect
it, and someone who uses OpenBite knows the look.

The mood is dark, calm and dense. Rows stay compact, parts are split by hairlines, and there is
no decoration. The numbers are the content. Cards are black with a hairline drawn inside, not
grey slabs, so the page stays one black surface and the cards read as outlines on it. Buttons
and chips are full pills; set values sit in small rounded wells; ticks are circles.

It is not upstream openGym's iOS look: no large titles, no tinted icon tiles, no Apple system
colours. It is not a gamified fitness app either: no gradients, no glow, no badges, no confetti,
no hero numbers for show. Control sizes are Hevy's; D123 changed the skin, not the hit targets.

**Key Characteristics:**
- A pure black page. An exercise in a workout, a finished workout, Today's next session and its
  last workout each sit in a black card with a hairline. Lists of exercises and routines run flat
  between hairlines; fills are kept for controls, wells and stat tiles.
- One accent, which the user chooses. It means "tap this", "this is next" and "this is done".
- The other colours carry meanings (warm-up, failure, drop set, superset, cardio, deload, record,
  note), and each steps aside when the accent or another meaning comes too close.
- Warm greys and warm white text, never cool blue-greys.
- Tabular numbers everywhere, so a column of sets lines up, and one way of writing a set.
- One page bar on every screen: a bare chevron, a small centred title, plain actions.

## Colors

A black page, two steps of warm grey, warm white and grey text, and one accent the user picks.
The other hues are meanings, each with one job.

### Primary
- **Accent** (`accent-green`, the default): OpenBite's green. Primary buttons and Finish, links
  and text actions, an exercise's name in a workout, the open tab and its pill, a picked chip,
  chart bars, a done set's tick and band, the opened set's edge and ring, the running rest clock
  and its bar, a trained day, "better than last time". On it the ink is black (`on-accent`) for
  every offered accent.
- **Accent, pressed** (`accent-green-pressed`): the accent mixed 25% toward black, computed by
  upstream's `customAccentVars` for any pick.
- **The other offered accents**, in the picker's order after green: Hevy's blue (`hevy-blue`),
  teal (`accent-teal`), openGym green (`accent-opengym`), pink (`accent-pink`), and a colour of
  the user's own. Each kept preset sits at least 0.12 (OKLab) from every meaning colour and from
  the others; `accents.test.js` proves it. A pick is stored as a custom colour in upstream's
  synced fields (D123), so the notification, the rest countdown and the widgets follow it.

### Secondary: meaning colours
Each has a first colour and a backup (`MEANINGS` in `meaning-colours.js`). A colour is free when it
sits at least 0.12 OKLab from the accent and from the colours the other meanings already wear.
Warm-up, failure, drop set, superset, cardio and deload never share a colour: each keeps its first
when free, else its backup, else teal, pink or lime (the extra accents' colours), else the text
colour. Record and note always wear the warm-up's colour.
They are set on the root as `--hv-cardio`, `--hv-warmup`, `--hv-fail`, `--hv-drop`,
`--hv-superset`, `--hv-deload`, `--hv-record` and `--hv-note`.
- **Warm-up Yellow** (`warmup-yellow`): the W of a warm-up set, a record's trophy and number, a
  note's mark. Next in line: teal (under an orange accent).
- **Failure Red** (`failure-red`): the F of a failure set, "less than last time" and a falling
  count, lighter than the danger red so the F reads at 4.5:1 on a done set's band and on the opened
  row. Next in line: teal (under a red accent). Red as such (`--red`, `danger-red`) marks Discard,
  danger buttons' text and the live heart; that red does not step aside.
- **Drop Blue** (`hevy-blue`): the D of a drop set and a hold's mark. Backup: violet.
- **Superset Violet** (`superset-violet`): the rule down a superset's card and its pill. Next in
  line: teal or pink.
- **Cardio Green** (`cardio-green`): a cardio day in the calendar. Backup: Hevy's blue, else teal.
  Under the default green accent cardio wears teal (`cardio-teal`), as the blue is the drop set's.
- **Deload Orange** (`deload-orange`): a deload day, but only when the warm-up is not yellow: the
  two sit 0.04 apart. Its backup is violet; when the superset holds violet, as under the default
  green, deload wears pink (`deload-pink`). Orange as such (`--orange`) also marks a warning line
  (the Finish sheet's unticked sets among them) and the streak flame.

### Tertiary
- The five heart-rate zones on the strap screen have their own ramp, grey to red (`#8e9aaf`,
  `#0a84ff`, `#30d158`, `#ff9f0a`, `#ff453a`; `--hv-zone-1` to `--hv-zone-5` in theme.css). They
  belong to that screen only.

### Neutral
- **AMOLED Black** (`amoled-black`): the page, the bars, the sheets, the tab bar, the docked rest,
  and the inside of every card (D17).
- **Stripe Black** (`stripe-black`): the alternate set row, a breath above the page.
- **Well Grey** (`well-grey`): set value wells, secondary and danger buttons, chips, the open
  exercise's action buttons, stat tiles and Today's week days, upstream's fields and grouped
  lists, the pressed state of a card or a flat row.
- **Control Grey** (`control-grey`): an unticked tick, the opened set's row, the segmented track,
  dialogs, the toast and the floating timer, the avatar disc, the rest bar's empty track.
- **Next Tick Grey** (`next-tick-grey`): the opened set's unticked tick and the segmented
  control's picked segment, one step above control grey.
- **Hairline** (`hairline`): every divider at half a pixel, and every card's 1px inner edge.
- **Ink Warm** (`ink-warm`): text and bare icons.
- **Ink Grey** (`ink-grey`): secondary text, column heads, section headings, captions.
- **Ink Faint** (`ink-faint`): prefilled values nobody has touched, the PREVIOUS column, empty
  notes, an unticked tick's mark. Solid, so it keeps 4.5:1 on the opened set's row too.
- **Ink Ghost** (`ink-ghost`): the faintest tint, for disabled marks.

### Named Rules
**The One Accent Rule.** The accent is the only colour that means "tap", "next" or "done". A
thing that is none of those never wears it.

**The Step Aside Rule.** A meaning colour never takes the accent's place. When the user's accent, or another meaning, is too close
to one, the meaning moves to its backup or an extra hue; done and "better than last time" always
wear the accent.

**The Earned Colour Rule.** Meaning colours show up because something is so: a set was warm-up,
failed or dropped, a record fell, a day was cardio. They never decorate a resting screen.

**The Grey Until Touched Rule.** A value the app filled in is faint grey and medium weight. It
turns white and bold once it is typed or its set is ticked (D2). The opened set is the one
exception: its prefilled values are already white and bold, since they are what you lift now
(D127).

## Typography

**Body Font:** Nunito (SIL OFL 1.1), shipped as `public/hevier/fonts/Nunito.ttf`, one variable
file from 200 to 1000, preloaded with the boot screen, with Roboto and the system sans behind it.
**Display Font:** the same. There is no second family.

**Character:** One rounded family, small sizes, weight doing the work. Body text is 500, titles,
labels and buttons 700, big numbers 800. Grey steps a line back. Numbers are tabular everywhere.

### Hierarchy
- **Display** (700, 96px, line-height 1, tabular): the live heart rate on the strap screen, with
  the clock at 84px. The clock sheet's dial is 64px/800. Nothing else is this big.
- **Readout** (800, 50px, 1.05, tabular): the docked rest's countdown, in the accent. The plan
  keypad's value is 34px/800.
- **Value, opened** (700, 26px, tabular): the opened set's weight and reps; 20px on a phone 400px
  wide or narrower, and for a time.
- **Headline** (700, 22px, 1.2): a routine's name on its page and in its editor, a saved
  workout's title, the next set on the docked rest and Today's next session (800). Upstream's page titles are brought down
  to this size.
- **Title** (700, 17px, 1.2): the page bar's title, an exercise's name, a card's title, a
  sheet's title (centred).
- **Body** (500, 15px, 1.29): rows, list lines, buttons (700). 14px for notes and secondary lines,
  13px for captions. Upstream's own rows keep its 17px.
- **Stat** (800, 16px, tabular): a workout's Duration, Volume and Sets under its header. Stat
  tiles take 20px/800 on History and 18px/800 in the record colour on an exercise's page.
- **Value** (600, 16px, tabular): the weight and reps in a set's wells.
- **Section** (400, 13px, grey): the heading over a part of a page, an h2 under the page's
  title (h3 under a page's own h2), flush with the content's edge; also the small line over
  Today's cards, History's link groups and a routine preview's Next line.
- **Label** (700, 11px, tracking 0.04em, caps): the set table's column heads (SET, PREVIOUS, KG,
  REPS) and the small caps over a saved workout's parts (12px there).

### Named Rules
**The No Large Title Rule.** A page names itself in the 17px bar. Nothing on a page is set above
22px except a number you act on now: the opened set's values, the rest countdown, the plan
keypad's value, the strap's live readouts (D127).

**The Tabular Rule.** Any number that can change or sit in a column uses tabular figures.

**The One Set Format Rule.** A set is written one way everywhere: "80 × 8", spaced. Where no
KG or LB column head names the unit, it comes once, after the weight: "80 kg × 8". Repeats lead
with their count, "2 × 80 × 8, 80 × 7". PREVIOUS in the live table carries no unit, since its
column head does. Only the share cards keep Hevy's "80kg × 8 reps".

## Layout

One layout, portrait only, a phone's width (D1, D24). The page has 16px side padding. Cards sit
inside it, 12px apart. Inside an exercise card the set rows run to the card's edges, stopping
1px short where its hairline is, so a done set is a band across the whole card. On a phone 400px
wide or narrower the exercise card reaches to 4px from the screen's edge, so PREVIOUS keeps its
text; at 360px or less its head shortens to PREV. Lists of exercises and routines, Settings and
the weekly chart run flat, and Settings bleeds to the screen's edges.

Three tabs, by what is opened most (D126). **Today** (D134) fits on one screen: a card with the
next session (when and where, its name, its exercises with the sets it opens with, then a
full-width Start), the week as seven filled days in one row, one grey line for the round and the
streak, the links Routines, Calendar and Empty workout as three pills, and the last workout as a
small card. **Lifts** is a flat list of exercises. **History** (D135) has filled stat tiles, two
rows of link chips, then the finished workouts as cards.

Rhythm is tight. A set row is 44px tall with 6px between columns, the opened set 60px; an
exercise card pads 12px on top and sides and 8px below (20px below when it ends on a set row, so
the band clears the curve); other cards pad 16px. Stats sit in a row with 28px between them, a
12px grey caption over the value. Two side-by-side buttons share a 1fr 1fr grid with an 8 to
10px gap.

The set table's grid is fixed: 34px for the set number, a flexible PREVIOUS, then value columns
of 40 to 58px (54px with effort on, which adds a 40px effort track), then a 36px tick. A timed set
adds a 34px start button before the tick. Above 400px, with effort on, the opened set's value
columns widen to 56 to 72px, from PREVIOUS's share.

Sticky parts carry the system insets themselves: the page bar pads the status bar's height, and
the docked rest, the tab bar and a sheet's sticky footer pad the navigation bar's. The live
workout keeps room at its end (148px, 210px while the rest is docked) so the last set and the
toast's Undo stay above them.

Every hit target is 44px or more. Where the visible control is smaller (the tick, chips, the
resume bar's buttons, 36px icon buttons) an invisible `::before` or `::after` extends it, so the
layout stays as dense as Hevy's. With large text, rows of buttons wrap rather than cut their words.

## Elevation & Depth

Flat. Depth is told by edge and tone, not shadow. The page, the cards, the bars and the sheets
are all the same black; a card is told apart by its hairline, a sheet by its top hairline and
the scrim. Inside a card, tone steps up from stripe black to well grey to control grey.

### Shadow Vocabulary
- **Card hairline** (`box-shadow: inset 0 0 0 1px var(--sep)`, the `--hv-card-line` token): the
  edge of every card, the toast and a row being dragged. Drawn inside, so no box grows.
- **Sheet edge** (`box-shadow: inset 0 1px 0 var(--sep)`): a sheet's top over the black page.
- **Inset rings** (`box-shadow: inset 0 0 0 2px var(--acc)`): today's date, the opened set's tick
  or effort button, a focused field. 1.5px for the next day in Today's week and an equipment group
  partly picked. A ring marks state; it never lifts.
- **Opened-set edge** (`box-shadow: inset 4px 0 0 var(--acc)`): the accent bar down the left of
  the set to do now (D127).
- **Sticky fade** (`box-shadow: 0 -8px 16px var(--bg-el)`): the picker's Add bar fading the list
  beneath it into the sheet's own black.

### Named Rules
**The Flat At Rest Rule.** Nothing casts a shadow. Every box-shadow in the fork's CSS is inset,
a line, or the one sticky fade.

## Shapes

Round. Buttons, chips, the add-set pills and the tab pill are full pills. Cards take 26px;
stat tiles, grouped lists and fields 20px; the set value wells, the open exercise's action
buttons, Today's week days and the keypad's keys 14px; a sheet's top corners 32px; the superset
pill and the Finish sheet's checkbox 6px. Ticks, avatars, thumbnails, calendar days and icon
buttons are circles. Set rows inside a card and flat list rows are square, so a done or opened
set reads as a band.

Lines are half-pixel hairlines in the warm hairline grey; a card's edge is a full pixel. A
thicker line is always a signal: the 3px violet rule of a superset, the 4px accent edge of the
opened set, the 2px accent underline of the open tab in the clock sheet.

Icons are bare outline glyphs in warm white. They never sit in a tinted tile, and a header's
icons never sit in a filled circle; the open tab's pill is the one accent fill behind an icon.
Exercise thumbnails are circles on white.

## Components

Round, quiet and dense.

### Buttons
- **Shape:** full pill, 15px/700 text, 9px by 14px padding. Small buttons are 14px text at 6px
  by 12px.
- **Primary:** the accent with black 700 text. Pressed, it darkens to the pressed accent and
  scales to 0.97. Start, Save and Skip are 48px tall and full width or in a grid.
- **Secondary:** well grey with warm white text; Today's links are 40px.
- **Exercise actions:** the open exercise's six buttons (Swap, Note, History, Rest, Reorder,
  More), equal widths in one row, 48px tall, well grey, 14px corners, an icon over an 11px word.
- **Danger:** well grey with red text, never a red fill or a red tint. In a sheet's footer
  Discard is bare red text.
- **Finish:** the page bar's own primary: a 32px pill, 14px text.
- **Text and icon buttons:** bare. A text action in the bar is the accent at 16px; an icon
  button is a white glyph with no background and a 44px target.

### Chips
- **Style:** well-grey pill, warm white 13px/700 text, 6px by 12px. History's link chips are
  48px tall at 14px, the second row scrolling sideways.
- **State:** picked is the accent with black text, with no border. An equipment group chip shows
  a part pick with a 1.5px accent ring.

### Cards / Containers
- **Corner Style:** 26px.
- **Background:** black, the same as the page; pressed, well grey.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** the 1px hairline drawn inside (`--hv-card-line`), never a CSS border.
- **Internal Padding:** 12px in an exercise card, 14px by 16px in a workout card, 16px elsewhere.
- **Use:** a card holds an exercise in a workout, a finished workout on History, Today's next
  session and its last workout. Lists, the weekly chart, Measurements and Settings are flat on
  the page between hairlines instead.
- **Stat tiles:** filled, not outlined. Well grey, 20px corners, 10px by 12px, a bold number
  with 12px grey captions, two or three in a row (History, an exercise's best sets).

### Flat Lists
Exercises in Lifts, the picker, Exercise time and the month's report, and the routines list
(D130), are flat rows split by hairlines, no fill and no corners. A picker row is at least 64px:
a round thumbnail, the name, and a 24px check circle that fills with the accent when picked. A
routine row is at least 56px: its name and day, a 44px Start pill, the next routine's Start in
the accent. A pressed row takes well grey.

### Inputs / Fields
- **Style:** a well-grey fill, 20px corners, no border, 13px by 15px padding.
- **Focus:** an inset 2px accent ring.
- **In a set row:** the number sits in a 14px-cornered well, centred, 16px/600, with the
  prefilled value as its faint placeholder. A done set's wells drop their fill onto its band.
- **Title fields** (a workout's or routine's name): plain 20 to 22px text over a hairline.

### Navigation
- **Page bar:** sticky, black, 44px under the status bar, ending in a hairline. A bare warm-white
  chevron on the left (none on a tab root), the title centred on the screen at 17px/700 whatever
  the sides hold, plain icons or one text action on the right.
- **Tab bar:** three tabs, Today, Lifts, History (D126). Opaque black with a hairline on top, no
  blur. Labels 700, grey at rest; the open tab is the accent, its icon on a soft pill (the accent
  at 20% over black).
- **Workout in progress:** a slim bar riding on top of the tab bar: the title and running time,
  Resume in the accent, Discard in red.
- **Sheets:** black, 32px top corners, a top hairline, a centred 17px/700 title. Rows are grouped
  into one 20px well-grey group with hairlines inset 48px past the leading glyph, each row at
  least 50px.
- **In-page tabs:** plain words over a hairline; the open one is the accent with a 2px accent
  underline (the clock sheet). Upstream's segmented controls sit on a control-grey track with a
  next-tick-grey pick.
- **Toast:** control grey with the card hairline, above the tab bar, the workout's foot or the
  docked rest. A removal the user can take back (a drop, a routine set, a folder, a routine copy,
  gym swaps) says so in a toast with Undo.

### Set Table (signature)
The screen the whole look is built around, inside the exercise's card (D127). A header line of
11px grey caps, then one flat 44px row per set: the set number (or a W, an F, a D in their meaning
colours), last time's set in faint grey and without its unit, the values in their wells, and a
round 30px tick. Alternate sets are striped in stripe black. Ticking a set fills its tick with the
accent (black check) and lays the accent at 14% over black across the card's width; its PREVIOUS
and untouched values turn grey.

The set to do now is opened without a tap: a 60px control-grey row with a 4px accent edge, its
values white and 700 at the opened size, and a 44px tick in next-tick grey with an accent ring.
With effort on, an unticked set has a pill-shaped effort button in the tick's place, ringed by a
hairline (by the accent when opened). A drop row sits indented under its set, with its own menu
to remove it. Where swipes are on, a swipe left deletes a set. Under the last row, "+ Set" and
"+ Warm-up" sit side by side as 44px well-grey pills.

### Rest Dock
While resting, a black panel docks across the bottom of the live workout under a hairline (D127):
the countdown on the left in the accent at 50px/800 with a 12px grey caption, the next set beside
it on its own 22px/800 line, a 4px accent bar on a control-grey track, then +1 min, +2 min and
Skip (primary) as three 48px buttons. Upstream's slim rest bar steps aside while it shows.

### Finish Sheet
Finish opens a short sheet over the workout (D132), never a page: a centred "Finish ...?" title
with the workout's set count and bests, the duration on a 48px row between hairlines (a tap edits it, in the accent),
then, when sets are unticked, an orange warning line with a grey explanation and a "Show them"
link. A 24px square checkbox (6px corners, the accent when on) updates the routine; a full-width
48px Save follows, and under it "Title, gym, note" in grey and Discard in red.

### Workout Card
A finished workout on History, in its own card: 26px corners, hairline, 14px by 16px padding, 12px
below. A 40px round avatar (the accent's initial on control grey) and the date, a 17px/700
title, four equal stat columns (11px grey caption over a 15px regular value), then the first
exercises as 40px round thumbnails with 15px names.

### Boot Screen
Before any script runs, upstream's barbell is painted in the saved accent on AMOLED black (D83,
D123), green until an accent is saved. The same build step preloads Nunito, so the first screen
draws in it.

## Do's and Don'ts

### Do:
- **Do** put a new screen's title in the one page bar: bare chevron, centred 17px/700, plain
  actions (D49).
- **Do** put an exercise in a workout, or a finished workout, in a black 26px card with the card
  hairline (`--hv-card-line`), and let its rows run to the card's edges.
- **Do** list exercises and routines as flat rows split by hairlines.
- **Do** write every set through `setFormat` or `setRuns`: "80 × 8", the unit once where no
  column head names it.
- **Do** draw the accent from `--acc`, `--acc-2` and `--on-acc`, never from a hex: the user
  chooses it.
- **Do** read a meaning colour from its `--hv-*` variable (`var(--hv-warmup, var(--yellow))`),
  so it steps aside from the accent.
- **Do** draw with the tokens in `theme.css` (`--bg`, `--surface`, `--surface-2`, `--surface-3`,
  `--label`, `--label-2`, `--label-3`, `--sep`, `--r-sm`, `--r`, `--r-card`, `--r-xl`),
  scoped under `:root[data-ui="hevier"]`.
- **Do** head a part of a page with a 13px grey section heading (h2, or h3 under an h2).
- **Do** keep every target at 44px by extending it invisibly, not by making the control bigger.
- **Do** set every changing number in tabular figures.
- **Do** keep the faint grey (`--label-3`) at 4.5:1 on the opened set's row.

### Don't:
- **Don't** bring back upstream's iOS look: large titles, tinted icon tiles, filled circles
  behind header icons, Apple's system colours.
- **Don't** add what a gamified fitness app has: gradients, glow, badges, confetti, big numbers
  for decoration.
- **Don't** give anything a drop shadow; an edge is a hairline.
- **Don't** fill a danger button red or tint it; red is its text on well grey.
- **Don't** set an accent value in `theme.css`: it would beat every pick (D123).
- **Don't** add a preset accent that sits under 0.12 OKLab from a meaning colour or another
  preset.
- **Don't** offer a light theme (D17). The light token block exists only for upstream's timer
  flash.
- **Don't** use cool blue-greys; the greys are warm.
- **Don't** add a second typeface, or set anything above 22px that is not a number you act on now.
- **Don't** outline a card, a chip or a field with a CSS border; a card's edge is the inset
  hairline, a title field's the hairline under it.
- **Don't** write a set as "80kg x 8" or "80×8", or repeat the unit under a KG or LB head.
