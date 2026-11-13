---
name: Go Hevier
description: openGym's Android app in Hevy's dark look, flat and dense, one blue.
colors:
  hevy-blue: "#008cff"
  hevy-blue-pressed: "#0070d6"
  on-blue: "#ffffff"
  done-green: "#2fbf5b"
  warmup-yellow: "#efab03"
  failure-red: "#e34b37"
  superset-purple: "#bf5af2"
  caution-orange: "#ff9f0a"
  amoled-black: "#000000"
  card-grey: "#1b1d22"
  fill-grey: "#262930"
  control-grey: "#353941"
  next-tick-grey: "#4b505a"
  hairline: "#2a2d34"
  ink-white: "#ffffff"
  ink-grey: "#9a9ea7"
  ink-faint: "rgba(154,158,167,.8)"
  ink-ghost: "rgba(154,158,167,.25)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "96px"
    fontWeight: 700
    lineHeight: 1
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.29
  value:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    fontFeature: "tnum"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.04em"
rounded:
  none: "0px"
  finish: "6px"
  sm: "8px"
  card: "12px"
  sheet: "16px"
  pill: "999px"
  round: "50%"
spacing:
  pad: "16px"
  row: "44px"
  col-gap: "6px"
  stat-gap: "28px"
  unit-gap: "22px"
components:
  button-primary:
    backgroundColor: "{colors.hevy-blue}"
    textColor: "{colors.on-blue}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  button-primary-active:
    backgroundColor: "{colors.hevy-blue-pressed}"
  button-secondary:
    backgroundColor: "{colors.fill-grey}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  button-danger:
    backgroundColor: "{colors.fill-grey}"
    textColor: "{colors.failure-red}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  button-danger-active:
    backgroundColor: "{colors.control-grey}"
  button-finish:
    backgroundColor: "{colors.hevy-blue}"
    textColor: "{colors.on-blue}"
    rounded: "{rounded.finish}"
    padding: "0 14px"
    height: "32px"
  page-bar:
    backgroundColor: "{colors.amoled-black}"
    textColor: "{colors.ink-white}"
    typography: "{typography.title}"
    height: "44px"
  set-row:
    backgroundColor: "{colors.amoled-black}"
    textColor: "{colors.ink-white}"
    typography: "{typography.value}"
    rounded: "{rounded.none}"
    height: "44px"
  set-row-striped:
    backgroundColor: "{colors.card-grey}"
  set-row-next:
    backgroundColor: "{colors.control-grey}"
  set-tick:
    backgroundColor: "{colors.control-grey}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.sm}"
  set-tick-on:
    backgroundColor: "{colors.done-green}"
    textColor: "{colors.on-blue}"
  chip:
    backgroundColor: "{colors.fill-grey}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-on:
    backgroundColor: "{colors.hevy-blue}"
    textColor: "{colors.on-blue}"
  card:
    backgroundColor: "{colors.card-grey}"
    rounded: "{rounded.card}"
    padding: "16px"
  input:
    backgroundColor: "{colors.card-grey}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.card}"
    padding: "13px 15px"
  sheet:
    backgroundColor: "{colors.amoled-black}"
    rounded: "{rounded.sheet}"
    padding: "8px 18px 20px"
---

# Design System: Go Hevier

This records the look the fork ships today (the `VITE_HEVIER=1` build, everything under
`:root[data-ui="hevier"]`). The tokens live in `frontend/src/hevier/theme.css`, the fork's
components in `frontend/src/hevier/hevier.css`, and the base they override in
`frontend/src/index.css`. Where this file and a decision in `hevier/DECISIONS.md` differ, the
decision wins (D17 for the theme, D49 for the page bar, D2 and D71 for the set row).

## Overview

**Creative North Star: "The Familiar Rack"**

Everything is where a Hevy user's hand already goes. The look is borrowed on purpose: Hevy's
dark surfaces, its blue, its set table, its page bar. Nothing asks to be noticed. A new screen is
right when someone who trained with Hevy for years does not stop to look at it.

The mood is flat, dense and quiet. Rows are compact, parts are split by hairlines, and there is
no decoration. The numbers are the content and the interface gets out of their way. Buttons, rows
and fields are plain and compact: bare glyphs, grey fills, small corners, small text, styled no
more than it takes to find them and hit them.

It is not upstream openGym's iOS look: no large titles, no inset rounded cards on every screen,
no tinted icon tiles, no Apple system colours. It is not a gamified fitness app either: no
gradients, no glow, no badges, no confetti, no hero numbers for show.

**Key Characteristics:**
- A black page with flat content on it. Cards are the exception, not the frame.
- One accent. Blue means "you can tap this" or "this is next".
- Colour appears with state: green when a set is done, yellow for a warm-up or a record, red for
  failure or a destructive action.
- Tabular numbers everywhere, so a column of sets lines up.
- One page bar on every screen: a bare chevron, a small centred title, plain actions.

## Colors

A black page, three steps of cool grey, white and grey text, and one blue. The other hues are
signals, each with one job.

### Primary
- **Hevy Blue** (`hevy-blue`): the accent. Primary buttons, links, an exercise's name in a
  workout, the open tab, the bars of a chart, the picked chip, the blue edge of the next set.
  Measured from Hevy's own screenshots. White on it is 3.4:1, which D17 accepts as measured.
- **Hevy Blue, pressed** (`hevy-blue-pressed`): a primary button while it is held.

### Secondary
- **Done Green** (`done-green`): a ticked set's box, and the ticked row's band at 22% over the
  page. Also "better than last time" (the up arrow).
- **Warm-up Yellow** (`warmup-yellow`): the W of a warm-up set, a personal record's trophy, the
  PR line on a feed card.
- **Failure Red** (`failure-red`): the F of a failure set, Discard, danger buttons' text, the
  heart beside a live heart rate, "less than last time".

### Tertiary
- **Superset Purple** (`superset-purple`): the rule down the left of a superset and its pill.
  Upstream's value, kept.
- **Caution Orange** (`caution-orange`): a warning line. Upstream's value, kept.
- The five heart-rate zones on the strap screen have their own ramp, grey to red (`#8e9aaf`,
  `#0a84ff`, `#30d158`, `#ff9f0a`, `#ff453a`). They belong to that screen only.

### Neutral
- **AMOLED Black** (`amoled-black`): the page, the bars, the sheets, the tab bar.
- **Card Grey** (`card-grey`): cards, grouped lists, the striped alternate set row, input fills.
- **Fill Grey** (`fill-grey`): secondary buttons, chips, the pressed state of a row, nested fills.
- **Control Grey** (`control-grey`): the tick box, a switch that is off, the next set's row.
- **Hairline** (`hairline`): every divider, at half a pixel.
- **Ink White** (`ink-white`): text and bare icons.
- **Ink Grey** (`ink-grey`): secondary text, column heads, captions.
- **Ink Faint** (`ink-faint`): prefilled values nobody has touched, the PREVIOUS column, empty
  notes. Kept at 4.5:1 on the cards.
- **Ink Ghost** (`ink-ghost`): the faintest tint, for disabled marks.

### Named Rules
**The One Blue Rule.** Blue is the only colour that means "tap" or "next". A thing that is not
tappable and not next is never blue.

**The Earned Colour Rule.** Green, yellow and red show up because something happened: a set was
ticked, a record fell, a set failed. They are never used to decorate a resting screen.

**The Grey Until Touched Rule.** A value the app filled in is faint grey and medium weight. It
turns white and bold once it is typed or its set is ticked (D2).

## Typography

**Body Font:** the system sans (Roboto on Android), through upstream's stack.
**Display Font:** the same. There is no second family.

**Character:** One family, small sizes, weight doing the work. 600 names a thing, 400 or 500
describes it, and grey steps it back. Numbers are tabular everywhere.

### Hierarchy
- **Display** (700, 96px, line-height 1): the live heart rate on the strap screen, with the
  clock at 84px/600. Nothing else is this big.
- **Headline** (700, 22px, 1.2): a routine's name on its page and in its editor. Upstream's own
  page titles are brought down to this size.
- **Title** (600, 17px, 1.2): the page bar's title, an exercise's name, a card's title, a
  sheet's title (500, centred).
- **Body** (400, 15px): rows, feed lines, buttons (500, and 600 on a primary). 14px for notes and
  secondary lines, 13px for captions.
- **Value** (600, 16px, tabular): the weight and reps in a set row. 700 on the next set.
- **Label** (400, 11px, tracking 0.04em): the set table's column heads (SET, PREVIOUS, KG, REPS)
  and the small caps over a workout's parts (12px/600 there).

### Named Rules
**The No Large Title Rule.** A page names itself in the 17px bar. Nothing on a page is set above
22px except a live readout that is the page's whole point.

**The Tabular Rule.** Any number that can change or sit in a column uses tabular figures.

## Layout

One layout, portrait only, a phone's width (D1, D24). The page has 16px side padding. Content
that is a list or a table runs edge to edge by pulling out of that padding: set rows, feed cards
and Settings groups all bleed to the screen's edges.

Rhythm is tight. A set row is 44px tall with 6px between columns; an exercise block is followed
by 22px; stats sit in a row with 28px between them, a 12px grey caption over a 16px value. Two
side-by-side buttons share a 1fr 1fr grid with an 8 to 10px gap.

The set table's grid is fixed: 34px for the set number, a flexible PREVIOUS, then value columns
of 40 to 58px, then a 36px tick. A timed set adds a 34px start button before the tick.

Sticky parts carry the system insets themselves: the page bar pads the status bar's height, and
the rest bar, the tab bar and a sheet's sticky footer pad the navigation bar's.

Every hit target is 44px or more. Where the visible control is smaller (the tick, the rest bar's
buttons, chips, 36px icon buttons) an invisible `::before` extends it, so the layout stays as
dense as Hevy's.

## Elevation & Depth

Flat. Depth is told by tone, not shadow: black page, then card grey, then fill grey, then
control grey. Bars and sheets are the same black as the page and are set off by a hairline.

### Shadow Vocabulary
- **Inset rings** (`box-shadow: inset 0 0 0 2px var(--acc)`): today's date, the next set's tick,
  a focused field. A ring marks state; it never lifts.
- **Next-set edge** (`box-shadow: inset 4px 0 0 var(--acc)`): the blue bar down the left of the
  set to do next.
- **Drag lift** (`filter: brightness(1.25) drop-shadow(0 10px 18px rgba(0,0,0,.55))`): a row
  while it is being dragged to a new place. The only real shadow in the fork's own CSS.
- **Sticky fade** (`box-shadow: 0 -8px 16px var(--bg-el)`): the picker's Add bar fading the list
  beneath it into the sheet's own colour.

### Named Rules
**The Flat At Rest Rule.** Nothing at rest casts a shadow. A shadow means the thing is in the
user's hand.

## Shapes

Small corners and a lot of none. Rows that run edge to edge are square. Buttons, the tick box
and small fills take 8px; the header's Finish takes 6px. Cards and grouped lists take 12px, a
sheet's top corners 16px. Chips and hint pills are full pills. Avatars, thumbnails, calendar
days and icon buttons are circles.

Lines are half-pixel hairlines in the hairline grey. A thicker line is always a signal: the 3px
purple rule of a superset, the 4px blue edge of the next set, the 2px blue underline of the open
tab in exercise details.

Icons are bare outline glyphs in white. They never sit in a filled circle or a tinted tile.

## Components

Plain and compact.

### Buttons
- **Shape:** gently squared (8px), 15px text, 9px by 14px padding. Small buttons are 14px text at
  6px by 12px.
- **Primary:** Hevy blue with white 600 text. Pressed, it darkens to the pressed blue and scales
  to 0.97.
- **Secondary:** fill grey with white 500 text. Tiles and the routine buttons are this, 40px tall.
- **Danger:** fill grey with red text, never a red fill or a red tint.
- **Finish:** the page bar's own primary: 32px tall, 6px corners, 14px text.
- **Text and icon buttons:** bare. A text action in the bar is blue 16px; an icon button is a
  white glyph with no background and a 44px target.

### Chips
- **Style:** fill-grey pill, white 13px text, 6px by 12px.
- **State:** picked is Hevy blue with white text. No border in either state.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** card grey on the black page.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none.
- **Internal Padding:** 16px.
- **Use:** a card holds a routine, a history session or a grouped menu. Home, the feed, the
  weekly chart and Settings are flat on the page between hairlines instead.

### Inputs / Fields
- **Style:** a card-grey fill, 12px corners, no border, 13px by 15px padding. The search field is
  fill grey at 10px.
- **Focus:** an inset 2px blue ring.
- **In a set row:** no fill and no border at all. The number is the field: centred, 16px/600,
  with the prefilled value as its faint placeholder.
- **Title fields** (a workout's or routine's name): plain 20 to 22px text over a hairline.

### Navigation
- **Page bar:** sticky, black, 44px under the status bar, ending in a hairline. A bare white
  chevron on the left (none on a tab root), the title centred on the screen at 17px/600 whatever
  the sides hold, plain icons or one text action on the right.
- **Tab bar:** three tabs, Home, Workout, Profile. Black with a hairline on top, a 25px glyph
  over a 10px label, grey at rest and blue when open.
- **Workout in progress:** a slim bar riding on top of the tab bar: the title and running time,
  Resume in blue, Discard in red.
- **Sheets:** black, 16px top corners, a centred 17px/500 title. Rows are grouped into one 12px
  card with hairlines inset 48px past the leading glyph, each row at least 50px.
- **In-page tabs:** plain words over a hairline; the open one is blue with a 2px blue underline.

### Set Table (signature)
The screen the whole look is built around. A header line of 11px grey caps, then one flat 44px
row per set: the set number (or a yellow W, a red F, a blue D), last time's value in faint grey,
the value fields, and a grey tick box. Alternate sets are striped in card grey. Ticking a set
fills its box green and lays a green band (22% green) across the full width of the screen. The
set to do next is one step lighter with a 4px blue edge, its values white and 700. A swipe left
deletes a set. Under the last row, a full-width grey "+ Add Set".

### Rest Bar
One slim black bar across the bottom of a workout, under a hairline: −15, the clock centred at
24px, +15, Skip. No card, no radius, no shadow.

### Feed Card
A finished workout on Home: full width, no radius, 14px by 16px padding. A 40px round avatar and
the date, a 17px/600 title, four equal stat columns (11px grey caption over a 15px regular
value), then the first exercises as 40px round thumbnails with 15px names.

## Do's and Don'ts

### Do:
- **Do** put a new screen's title in the one page bar: bare chevron, centred 17px/600, plain
  actions (D49).
- **Do** let lists, tables and feed cards run edge to edge, split by half-pixel hairlines.
- **Do** keep blue for what can be tapped and what is next, and let green, yellow and red appear
  only with state.
- **Do** draw with the tokens in `theme.css` (`--bg`, `--surface`, `--surface-2`, `--surface-3`,
  `--label`, `--label-2`, `--label-3`, `--sep`, `--acc`), scoped under `:root[data-ui="hevier"]`.
- **Do** keep every target at 44px by extending it invisibly, not by making the control bigger.
- **Do** set every changing number in tabular figures.
- **Do** keep the faint grey (`--label-3`) at 4.5:1 on a card.

### Don't:
- **Don't** bring back upstream's iOS look: large titles, inset rounded cards as a page's frame,
  tinted icon tiles, filled circles behind header icons, Apple's system colours.
- **Don't** add what a gamified fitness app has: gradients, glow, badges, confetti, big numbers
  for decoration.
- **Don't** give anything at rest a shadow.
- **Don't** fill a danger button red or tint it; red is its text on fill grey.
- **Don't** offer a light theme or an accent choice (D17). The light token block exists only for
  upstream's timer flash.
- **Don't** add a second typeface, or set anything above 22px that is not a live readout.
- **Don't** put a border around a card, a chip or a field.
