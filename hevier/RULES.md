# Working rules

How the fork is built and kept mergeable. The decisions themselves are in
[DECISIONS.md](DECISIONS.md); every upstream edit is a seam in [SEAMS.md](SEAMS.md).

The original implementation plan (pre-work, phase 1 UX, phase 2 UI design, and the feature backlog
with each request's original wording) is done. It is in git history: `git show c20ee364:hevier/PLAN.md`.

## Scope

**openGym's functionality, Hevy's UX and UI.** A Hevy element is built as a new way to show or
reach something openGym already has. Where openGym and Hevy differ in *behaviour* (openGym's
progression prefill against Hevy's empty fields, for example), openGym's behaviour wins,
presented Hevy's way. New behaviour gets a decision in DECISIONS.md first.

## Facts about upstream

- **Upstream moves fast**, often 10 or more commits a day. Its hottest files are the 18 locale
  packs, `frontend/src/sheets.jsx`, `views/Workout.jsx`, `index.css`, `views/Settings.jsx`,
  `store/useStore.js` and `lib/history.js`. Every edit to one of them is a future conflict, so
  the fork's code goes next to them, not inside them.
- **The app is one web bundle in a Capacitor shell.** Changing the Android UI means changing the
  React frontend. The native side needs only the fork's own plugins, resources and identity.
- **English is the source language and has no locale file.** `t('New string')` renders as
  itself, so fork-only strings need no locale entries and the fork stays out of the locale packs.

## Branches

| Branch | Purpose |
|---|---|
| `main` | A pure mirror of `upstream/main`, fast-forward only, never a fork commit. |
| `hevier/main` | The fork's trunk. Merges `main` (or, better, upstream's release tags) and the fork's feature branches, `--no-ff`. |
| `hevier/<topic>` | One branch per feature or fix, merged into `hevier/main` when done. |
| `hevier-upstream/<topic>` | A pull request to upstream, branched from `main`, only with the user's go. |

Sync is always **upstream → `main` → `hevier/main`**, by merge, never rebase: a merge solves a
conflict once, and `rerere` (enabled with `merge.conflictStyle zdiff3`) remembers it. Prefer
upstream's release tags (`git merge v1.4.2`) over the tip of `main`: their CHANGELOG entry
explains the intent that conflict resolution needs. The procedure is [CONFLICTS.md](CONFLICTS.md).

On GitHub, disable the fork's `mirror.yml` and CLA workflows rather than deleting them (deleted files
conflict on every upstream edit to them).

## Fork identity

- **App id** `ch.duartesantos.opengym.hevier` (the debug build adds `.test`), set in
  `frontend/android/app/hevier.gradle` (seam S7), so it installs beside the official openGym.
  Its data is separate: move it across with Settings → Data & backup → Export / Import.
- **Name** Go Hevier (D39). **Updater** reads `VITE_UPDATE_REPO=lodepav/openGym-Hevier` (S6).
- **Version** Go Hevier's own, in `hevier/VERSION` (D52), shown beside upstream's openGym
  version ("Go Hevier 1.0.0 · based on openGym 1.4.1"); it is the APK's `versionName`/`versionCode`
  (S7), the build's `__APP_VERSION__` (S29) and the updater's, whose releases are tagged
  `gohevier-vX.Y.Z`. `release-apk.sh` raises it, commits, tags and, asked, publishes the GitHub release the updater reads; debug builds add their commit and never check for updates.
- **Signing key**: updates install only over an app signed with the same key. The keystore lives
  outside the repo; its certificate's SHA-256 is pinned beside it, in `~/.config/hevier/apk-cert.txt`, also
  outside the repo (D38).

## The build flag and the overlay

- Everything the fork adds is in `frontend/src/hevier/` (`lib/` pure helpers with a test beside
  each, `components/`, `views/`, `hevier.css` and `theme.css`), switched on by
  `VITE_HEVIER=1` (`flag.js`). `index.js` is the only module the seams import.
- `VITE_HEVIER` is unset in `npm test`, so **upstream's tests keep testing upstream's UI**,
  unmodified. The fork's tests render its components directly or stub the flag
  (`vi.stubEnv('VITE_HEVIER', '1')`). `contract.test.js` asserts the upstream exports and props
  the overlay depends on.
- With the flag on, `document.documentElement.dataset.ui = 'hevier'`, and all fork CSS hangs off
  that attribute, so it never leaks into upstream's look. Upstream's pages are restyled by
  selector in `theme.css`, not by editing `index.css`.
- **Build scripts stay out of `frontend/package.json`** (its `version` line changes every
  release). `hevier/tools/emulator.sh` runs the steps of `build:mobile` with the fork's flags; if
  upstream changes `build:mobile`, mirror it there (CONFLICTS.md, "silent drift").

## Test rig

- `hevier/tools/emulator.sh` builds the debug APK (which keeps x86_64), boots AVD
  `xperia1vi_api36` (Android 16, 1080×2340, 420 dpi), installs and launches it.
- `hevier/tools/cdp.mjs` drives the WebView over the DevTools protocol (`click`, `text`, `shot`,
  `eval`). No new dependencies.
- `cd frontend && npm test` runs upstream's suite and the fork's `src/hevier/**` tests; both pass
  before a merge. On this machine run it gently: `nice -n 19 npm test -- --maxWorkers=2`.
- [reference/SCREENS.md](reference/SCREENS.md) describes Hevy's screens element by element, with
  the screenshots `reference/fetch.sh` downloads (not committed).

## Every change

- Ask "can this be a new file?" before editing an upstream file. If not, add the seam to
  SEAMS.md in the same commit, wrapped in `[hevier] Sxx` markers.
- Training logic: a pure helper in `frontend/src/hevier/lib/` with a test beside it. Never edit
  `progression.js`, `finish-workout.js`, `onerm.js` or `workout-model.js` for a UX reason.
- Don't add persisted fields to `S` unless unavoidable. A device-only preference goes in
  `localStorage` under a `hevier_` key. A field that must sync gets an `hv` prefix and a test
  showing it survives `sync-merge`.
- No new dependencies (upstream's hard rule, and each one is a `package.json` conflict).
- Commit messages start with `hevier:`, so `git log --grep '^hevier:'` lists the fork's work.
- Fixes to upstream bugs go upstream as pull requests, from a branch off `main`. Every fix
  upstream takes is one less divergence to carry.

## Risks

| Risk | Mitigation |
|---|---|
| Upstream restructures `Workout.jsx` around `blockProps` / layouts | `contract.test.js` fails loudly; the fix is in the fork's adapter, not in upstream code. |
| Upstream adds a workout-screen feature the Hevy layout doesn't render | Read each sync's CHANGELOG for workout-screen items and add them to `HevyWorkout` (CONFLICTS.md, "silent drift"). |
| `S.workoutView = 'hevy'` reaches an upstream build (a shared server, a backup imported into official openGym) | Upstream reads unknown values as `cards`, so it degrades safely. Keep that test. |
| Upstream renames a class or CSS variable and an override silently stops matching | Nothing conflicts, the look just regresses: a screenshot pass per upstream sync (CONFLICTS.md step 6). |
