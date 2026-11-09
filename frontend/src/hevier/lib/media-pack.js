// The exercise pictures as a download of their own (hevier/DECISIONS.md D115). The release ships a
// lean APK without exercise-media/ and, beside it, the media as one zip that is published once per
// media version. The phone keeps the media in the app's own storage, which survives updates, and
// downloads them again only when the build expects a newer version. A full APK (media inside)
// still exists for a first install offline; it never needs the download.
//
// THE CONTRACT
//
// Build: VITE_HEVIER_MEDIA is a JSON string written by hevier/tools/media-zip.mjs, unset in debug
// builds (which carry their media, so nothing is ever downloaded):
//   { version: '<12 hex>', url: 'https://github.com/<repo>/releases/download/gohevier-media-<version>/go-hevier-media-<version>.zip',
//     sha256: '<64 hex of the zip>', bytes: <zip size> }
//
// Native: the HevierMedia plugin (frontend/android/app/src/hevier/java/.../HevierMediaPlugin.java):
//   status()                                → { bundled, version, bytes }
//       bundled: the APK carries public/exercise-media (the full APK, or a debug build);
//       version: the media installed in storage (no_backup/exercise-media/: kept by an update, left out of Auto Backup and its 25 MB cap), or null; bytes: their size
//   network()                               → { metered }  the active connection is metered (mobile data)
//   download({ url, sha256, version, bytes }) → resolves { version } once installed;
//       'progress' events { phase: 'download' | 'unpack', fraction }; rejects with a code:
//       'checksum', 'space', 'cancelled', 'failed'. A second call while one runs joins it.
//   cancel()
// The full APK (bundled) deletes any downloaded copy at launch: it carries its own.
// While the APK does not carry them, https://localhost/exercise-media/... is answered from
// storage (a 404, never cached, for a file that is not there), so the web code's URLs never change.

/** The media this build wants, from VITE_HEVIER_MEDIA; null when the build carries its own. An
 *  https address, or http://localhost for a test zip served through `adb reverse`. */
export function wantedMedia(raw) {
  if (!raw) return null
  let m
  try { m = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null }
  const ok = m && /^[0-9a-f]{12}$/.test(m.version) && /^(https:\/\/|http:\/\/localhost[:/])/.test(m.url) && /^[0-9a-f]{64}$/.test(m.sha256) && m.bytes > 0
  return ok ? { version: m.version, url: m.url, sha256: m.sha256, bytes: m.bytes } : null
}

/**
 * What to do at launch: 'none' (the build or the APK carries the media, or they are installed),
 * 'ask' (missing or another version: offer the download), 'later' (asked, and Not now for this
 * version: the Settings row still offers it).
 */
export function mediaPlan(want, status, declined) {
  if (!want || !status || status.bundled) return 'none'
  if (status.version === want.version) return 'none'
  return declined === want.version ? 'later' : 'ask'
}

/** "217 MB", for the question and the row. */
export const mbText = bytes => Math.max(1, Math.round(bytes / (1024 * 1024))) + ' MB'
