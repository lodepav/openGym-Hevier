// A running session's time as Hevy writes it: the workout's stats row reads "8s", "18min 19s" and
// "1h 15min" (seconds dropped from an hour up, as Hevy does), and the resume bar a clock,
// "4:07" or "1:15:02". Upstream's Elapsed counts minutes past 60 ("598:38").

const secsOf = sec => Math.max(0, Math.floor(Number(sec) || 0))

/** "8s", "18min 19s", "18min", "1h 15min", "2h". */
export function elapsedWords(sec) {
  const n = secsOf(sec)
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60
  if (h) return h + 'h' + (m ? ' ' + m + 'min' : '')
  if (m) return m + 'min' + (s ? ' ' + s + 's' : '')
  return s + 's'
}

/** "0:08", "18:19", "1:15:02". */
export function elapsedClock(sec) {
  const n = secsOf(sec)
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60
  const ss = String(s).padStart(2, '0')
  return h ? h + ':' + String(m).padStart(2, '0') + ':' + ss : m + ':' + ss
}

/** A rest as the rest panel's clock reads it, "2:00" or "0:45", in every fork screen: its own
 *  rest, else the fallback one, else `off` (no rest timer). */
export function restTimerText(own, fallback, off) {
  const n = secsOf(own) || secsOf(fallback)
  return n ? elapsedClock(n) : off
}

/** A logged time in the fork's one duration style, spaced as the Finish sheet writes it (the ninth
 *  critique, 2026-11-22): "2 min 30 s", "1 h 15 min". The running session's stats row keeps Hevy's "18min 19s". */
export const elapsedSpaced = sec => elapsedWords(sec).replace(/(\d)([a-z])/g, '$1 $2')

/** A logged total to the minute: "45 min", "1 h 15 min", "24 h 17 min"; under a minute its
 *  seconds, "40 s". Takes ms, as upstream's fmtDur does. */
export function durationWords(ms) {
  const sec = secsOf(Number(ms) / 1000)
  return elapsedSpaced(sec < 60 ? sec : Math.round(sec / 60) * 60)
}
