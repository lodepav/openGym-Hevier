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

/** An exercise's "Rest Timer: …" as Hevy writes it, "2min 0s" or "45s": its own rest, else the
 *  default one, else `off` (no rest timer). */
export function restTimerText(own, fallback, off) {
  const n = secsOf(own) || secsOf(fallback)
  if (!n) return off
  const m = Math.floor(n / 60), s = n % 60
  return m ? m + 'min ' + s + 's' : s + 's'
}

/** A logged total as Hevy writes it, to the minute: "45min", "1h 15min", "24h 17min"; under a
 *  minute its seconds. Takes ms, as upstream's fmtDur does. */
export function durationWords(ms) {
  const sec = secsOf(Number(ms) / 1000)
  return sec < 60 ? elapsedWords(sec) : elapsedWords(Math.round(sec / 60) * 60)
}
