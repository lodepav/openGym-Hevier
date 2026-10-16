<!-- Copied from upstream/release-1.4.3:CHANGELOG.md (0f8e46ee, 2026-10-16). Refresh: see ../PIPELINE.md. -->
# Changelog

Newest first. Each release is a `## vX.Y.Z (YYYY-MM-DD)` section, and the release notes on
GitHub and GitLab are that section, word for word. New work goes under `## Unreleased` until the
tag. Write it for the people using the app: what changed for them, short, no em dashes.

## Unreleased

**Gym reminder** (#614, phone app). Walk into your gym and openGym nudges you to hit Start. Add
your gyms in Settings → Reminders → Gym reminder: "I'm at the gym right now" or a pin on an
OpenStreetMap map, each with its own radius and text. Once a day at most, never after you trained,
never mid-workout, optionally only between certain hours. Off by default, and your gyms stay on
the phone (not on your server, not in backups). Android uses the system's own proximity alerts,
so no Google services are needed. Android can be slow to notice you arrived (up to half an hour),
so near a gym the phone can take a short GPS look and nudge you at the door; that needs openGym's
battery use on Unrestricted (Settings shows it as "Quick arrival check"). And if you logged a
workout on your laptop that your phone hasn't synced yet, the phone asks your server first (3
seconds at most) instead of nagging you anyway.

**Security.** Follow-ups to v1.4.2's audit.
- **Pairing the phone app asks you to confirm it's you** (passkey, or your password where that
  counts), like adding another device does. A copied browser session can no longer mint a phone
  sign-in that renews itself.
- Deleting your account from a paired phone only skips the passkey for a real phone sign-in, not
  for a browser session sent along as one.
- On iPhone the paired server's sign-in is no longer part of iCloud or computer backups. A
  restored iPhone pairs again.
- The Android updater (direct APK only) installs nothing without its checksum and only its own
  download, and the backup folder is only written to while the app still has your permission.
- Push addresses that hide a private IPv4 address inside an IPv6 one are refused like the plain
  ones.

**Support openGym.** Settings → About & updates has the coffee jar: Buy Me a Coffee, Ko-fi and
GitHub Sponsors, and on the iPhone a straight line to writing an App Store review. No pop-ups
asking for anything, promise.

## v1.4.2 (2026-10-18)

openGym comes to the App Store, with an Apple Watch app in tow. Plus everything you asked for
since v1.4.1, five reported security holes closed and a fresh look at the animations.

**openGym on the iPhone.** The App Store app is the same openGym: use it on the phone alone, or
connect it to your own server. Your data stays where it is (no account with us, nothing collected).
Want it before the App Store has it? Join the public TestFlight beta:
https://testflight.apple.com/join/RKATb61k

- **Apple Watch.** Start a workout on the wrist, or on the phone and the watch app opens with it,
  then tick off sets with a big Done button and the Digital Crown for reps and weight. Rest is a
  full-screen countdown with +15 s and Skip, holds count down, sides say Left or Right, supersets
  go in turns. Heart rate per set, a summary at the end, a Smart Stack widget and complications
  for your watch face. It speaks the app's language, asks for a weigh-in at the start if you like,
  makes weights quick to change, and you pick what the set screen shows. No phone in reach? Your
  ticks wait on the watch and catch up later.
- **Widgets and a Live Activity.** Today's workout on the Home Screen and the Lock Screen, your
  streak too. A running workout sits on the Lock Screen and in the Dynamic Island, with a Done
  button that logs the set and starts the rest without opening the app.
- **Apple Health.** Finished workouts and weigh-ins go to Apple Health, the same switch Android
  has for Health Connect, offered once at the start. Delete a workout in openGym (on any of your
  devices) and it leaves Apple Health too.
- **Sharper animations, your choice.** Settings → Workout → Animation quality: Still only, built in
  (180 px), or 240, 360, 480, 720 and 1080 px, downloaded from the App Store when you pick them.
  Auto takes 360 on a phone and 720 on an iPad, over Wi-Fi. Female and male figures download
  separately, so you only get the one you use.
- **No more boxes.** The animations in the app showed faint rectangles around the moving parts.
  They are re-made from the original files, frame by frame, and look like the originals now. The
  APKs get the same fix (180, 240 or 360 px built in, see Android below).
- **Swipe from the left edge to go back**, with the page you came from sliding in underneath.
- **Notifications are asked for at the start**, not in the middle of your first rest.
- The Vibrate switch works on the iPhone, and a server or Coach on your home network works over
  plain http, like on Android (#428).
- **A logo instead of a black screen** while the app starts, loading its plates.

**Android.** The app now targets Android 16 and needs Android 7.0 or newer (6.0 is out). The APK
you know stays and updates itself, now in three sizes: **Standard** (`openGym-1.4.2.apk`,
animations built in at 180 px, the small one), **Plus** (`openGym-Plus-1.4.2.apk`, 240 px) and
**HD** (`openGym-HD-1.4.2.apk`, 360 px, sharp and hungry). Each one updates to its own kind, so
nobody gets a surprise download twice the size. Phones on v1.4.1 update to Standard; want Plus or
HD? Install it on top, your data stays (same goes for going back). A Google Play version is ready for the store too: it updates through Play and gets
the sharper animations as Play downloads, like the iPhone, and an APK phone can move to it later
without losing anything.

**Your account, your call.**
- **Delete your account** from Settings → Account. It offers your backup first, asks you to type
  your name, and then a passkey or password (on the phone: Face ID, Touch ID or the passcode).
  The server's last admin hears straight away why they can't, instead of after all that.
- **The Coach asks before anything leaves.** The first time the Coach would send your training to
  an AI service, it says which one and what goes there. You can take it back in the Coach menu.
  A model on your home network doesn't ask; it's yours.
- **Sign in on a computer from the phone app** (#551): Settings → Account → Add another device
  makes the same one-time code a browser does.

**Reminders that know you trained.** Logged a workout on another device? Before the missed-day
nudge goes out, the phone checks with your server and keeps quiet. (On the iPhone, iOS decides
when the app may check in the background; opening the app always catches up.)

**Your data, safer**
- A running workout is saved the moment it changes and again when the app goes to the background,
  so a crash or a dead battery costs you nothing.
- Taps from the watch or the Lock Screen wait until your saved data is loaded, and offline changes
  count as sent only once they're safely on disk. Saving swaps the file in one go, never half.
- Importing a backup without an account now offers "Merge them in" instead of wiping what's there.

**In the workout**
- **Backups for an exercise** (Discord): in the routine editor, up to five exercises to do instead
  when the machine is taken. A swap lists them first.
- **Rest between warm-ups** (Discord): Settings → Workout sets it for every exercise (no timer,
  or a time of its own). One exercise can still do its own thing, and get a rest between sides.
- **Your bars** (Discord): Settings → Equipment sets your bar weight once per bar type, say the
  15 kg women's Olympic bar, and every exercise on it loads plates from that. The plate editor
  gets quick picks (20/15/10/7.5 kg, 45/35/25/15 lb).
- **Skip finished exercises** in Cards and Focus, a new switch next to Collapse completed (#523).
- **Timed exercises move on by themselves**: when the last rest after a plank runs out, the next
  exercise comes up (#532).
- **Per-side sets can be warm-ups** and back again (#575).
- **Bodyweight exercises** stop asking for a weight step (#583).
- **Change plates** of 2, 1.5 and 1 kg, and 1 and 0.5 lb, for gyms that stock them (#510).

**Small things**
- **Progress photos for any day**, several at once, each on the day it was taken (#557), and a
  photo can be removed from the gallery, with Undo (#558).
- **Muscle balance**: tap an untrained muscle to see its exercises (#553), and the Week view lines
  up. The status bar no longer covers the page on more Android phones (#573).
- The Coach's questionnaire has a clearer days screen and the same time wheels for session length.
- The Coach's message box grows with your text and opens into a tall editor for long ones. A
  reload on the intake no longer sends you home, and dates follow your day, not UTC's.
- The Undo after a delete has an × to send it away, on the far side from Undo.
- Day notes (sick, travelling...) show icon and word on one line.
- The swipe hint no longer swallows a quick tap on the first set (found by the new iPhone tests).
- The pairing code field no longer hides behind the keyboard on iPhone.

**From the community** (thanks!)
- Body weight for an earlier day, like measurements (#570, @smist37).
- Warm-ups on assisted machines ramp down from more help (#581, @lntvan166).
- Effort stats average the whole training, and your logged RIR tunes the anchor (#539, @sg41).
- 15 rowing exercises stop counting as chest and triceps (#503, @sg41).
- German exercise texts (#578, @ThatsMeGIT).
- A shared plan keeps a superset's name and rest (#564, @pawell67).
- Push reminders show the routine's emoji (#548, @mzspicoli).
- The swap icon shows on picker rows (#579, @Totopo27).
- `.env.example`: CF_CONNECTING_IP quoted so Compose keeps it (#565, @APN-Carmine).
- Skip finished exercises, the change plates and the untrained-muscle shortcut were first sent as
  pull requests by @anshuman83-40 (#526, #530) and @tfdmendes (#543). The CLA wasn't signed yet,
  so we built our own take for this release, but the ideas are theirs. Thank you!

**Security.** Five private reports, all fixed, plus our own audit. Thanks to Boris Kurktchiev
for the reports, each with a patch and a test. Self-hosters: please update.

- **A crafted link could send your sign-in to another server** (GHSA-375x-wfvj-jf7q). A link to
  your own instance with an odd path made the app talk to a host named in that path. It can't
  leave your instance any more.
- **Another site could sign you into its account** (GHSA-48ff-v63h-99xr). The passkey sign-in
  routes now check where a request comes from like every other route, and the API only takes JSON.
- **Push notifications could be taken over** by someone who knew your device's push address
  (GHSA-568g-hg5j-h53q). The address now only moves to another account with its own keys.
- **The Coach's sandbox check was skipped** on the admin's test button, the status card and jobs
  queued before a provider switch (GHSA-w724-p4hx-jfv9).
- **One profile could slow the server down for everyone** with a huge queue (GHSA-69j8-85pp-mf8j),
  or with many accounts and large saved states. The reminder check now reads a state only when a
  reminder could actually go out.
- Rest timers and test pushes are limited per account, disabled accounts get no reminders and no
  Coach reviews, and signing up with someone's e-mail as the name counts against your address
  like the e-mail field does.
- A browser's sign-in cookie can no longer be turned into a phone token that renews forever.
- Deleting your account from a paired phone only skips the passkey for a real phone sign-in, not
  for a browser session sent along as one.
- Push addresses that hide a private IPv4 address inside an IPv6 one are refused like the plain
  ones.
- The Coach forgets a stored API key when its server address moves to another host. Enter it again.
- Request paths the server would have to tidy up (`..`, backslashes) are refused, nginx stops
  naming its version, and Android backups no longer include the paired server's sign-in.
- **One owner, many admins.** Any admin could delete every other admin and then clear the activity
  log. Now one admin is the owner: only they make or remove admins, delete an admin, clear the log
  or hand the role on (Admin, tap a user). Existing instances: the oldest admin is the owner.
- **The web container sends a real Content-Security-Policy.** Scripts only run from your own
  instance, so an injected one does nothing. If your proxy adds analytics, see
  `CONTENT_SECURITY_POLICY` in docs/SELF_HOSTING.md.

