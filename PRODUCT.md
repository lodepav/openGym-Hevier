# Product

<!-- impeccable:product-schema 1 -->

This file describes Go Hevier, the fork's Android app (the build with `VITE_HEVIER=1`).
Upstream openGym's own web UI, iPhone app, watch apps and website are out of scope: the fork
does not design them. The fork's rules are in [hevier/README.md](hevier/README.md).

## Platform

android

## Users

One person first: the fork's owner. An experienced lifter who trained with Hevy for years,
switched to openGym for self-owned data, and logs every workout on an Android phone in the gym,
often one-handed and between sets. Decisions follow that use. Other people may install the APK,
and the seven people in [hevier/ux/JOURNEYS.md](hevier/ux/JOURNEYS.md) are how the app is
reviewed, but they do not outvote the owner's choices.

## Product Purpose

Go Hevier gives openGym's Android app the user experience and look of Hevy, and keeps openGym's
training logic (progression, 1RM, recovery, sync, storage) as it is. Success is that logging a
workout feels like Hevy did, the data stays on the owner's phone and server, and a new upstream
release still merges without a fight.

## Positioning

openGym's functionality, Hevy's UX and UI. A Hevy element is a new way to show or reach
something openGym already has. Where the two differ in behaviour, openGym's behaviour wins,
presented Hevy's way. No account, no telemetry, no third-party service is needed.

## Operating Context

- Used in the gym, during a workout: the set table, the rest timer, the PREVIOUS column and the
  exercise picker are the main path (J1 in JOURNEYS.md).
- Several gyms, each with its own equipment, machine brands and cable setups; numbers are kept
  per gym and per machine (D28, D82, D104).
- Hevy stays connected: CSV and API import, match review, and with an API key new workouts and
  changed routines go back to Hevy (D29 to D35).
- Health Connect and a Bluetooth heart-rate strap feed heart rate and weigh-ins (D27, D79).
- OpenBite, the owner's nutrition app, exchanges the training phase and strength feedback (D93, D95).
- The app is one React bundle in a Capacitor WebView. It is checked on the Android 16 emulator
  through `hevier/tools/` and released as a signed APK from GitHub releases, not a store.

## Capabilities and Constraints

- What the fork adds is listed in [hevier/FEATURES.md](hevier/FEATURES.md). Every design choice
  is a numbered decision in [hevier/DECISIONS.md](hevier/DECISIONS.md) (index:
  [hevier/DECISIONS-INDEX.md](hevier/DECISIONS-INDEX.md)). A decision overrides a standard, the
  spec and any design advice; changing one is discussed with the owner first.
- The Hevy reference, screen by screen, is [hevier/reference/SCREENS.md](hevier/reference/SCREENS.md).
- Upstream files are edited only at the seams in [hevier/SEAMS.md](hevier/SEAMS.md). New UI goes
  in `frontend/src/hevier/`. Upstream's tests stay green, unmodified.
- One layout (D1), three tabs Home, Workout, Profile (D11), portrait only (D24), Android 13 and
  later (D116).
- The design language is Hevy's, drawn in a WebView, not Material Design 3 components. What
  Android itself guarantees still holds: the system bars and insets, the back gesture, the
  system text size, TalkBack.
- Progression is off unless a routine switches it on (D61, D69).
- English only in the fork's own strings; they need no locale entries.
- Dependency-light: a new dependency is a hard sell.
- Exercise media are licensed separately: 180 px only in the repo, never fed to an AI tool.
- The owner is happy with the app. Minor fixes (a label, a spoken name, a colour step, spacing
  that keeps the layout) can be made unasked. Anything the owner would notice is discussed first.

## Brand Commitments

- Name: Go Hevier (D39). App id `ch.duartesantos.opengym.hevier`.
- Hevy's dark theme with Hevy blue, and no other theme (D17). The boot screen is upstream's
  barbell in Hevy blue on AMOLED black (D83).
- Voice: plain and human, short sentences, no em dashes.

## Evidence on Hand

- Hevy reference screenshots: `hevier/reference/fetch.sh` downloads the ones SCREENS.md cites.
- A real training history for emulator checks: the owner's Hevy CSV export (outside the repo).
- UX review rounds and their outcomes: [hevier/ux/LEDGER.md](hevier/ux/LEDGER.md).
- No testimonials, user numbers or benchmarks exist. Do not invent any.

## Product Principles

1. Hevy's way to show it, openGym's way to work it out.
2. The decisions come first. The app works the way its owner wants it to.
3. Add, don't edit: a change that makes the next upstream merge harder needs a strong reason.
4. The gym is the test: one hand, a glance, mid-set.
5. The data is the owner's: on the phone, on their server, exportable.

## Accessibility & Inclusion

The rules a review cites are in [hevier/ux/STANDARDS.md](hevier/ux/STANDARDS.md), after WCAG 2.2,
Android's guidelines and NN/g: 48 dp touch targets, contrast measured from computed colours,
spoken names for every control. J7 (low vision, one hand, in the gym) is a standing journey. A
finding a decision caused is a note that names the decision, except an accessibility rule that
fails on a main path.
