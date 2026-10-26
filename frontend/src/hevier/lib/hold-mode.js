// A hold starts as a hold (D55). Upstream's 1.4.3 starts a catalogue hold timed (`isHold`, from
// the fork's #694). `holdMode` answers upstream's `defaultConfig` (seam S32) when nothing else
// chose a mode: 'time' for any exercise whose last logged sets were timed (an imported Hevy
// custom hold's are). Everything else, and an entry whose settings already name a mode, stays
// upstream's.
import { lastEntryFor } from '../../lib/history.js'
import { isCardio } from '../../lib/exercises.js'

const timedSets = sets => {
  const work = (sets || []).filter(s => s && s.phase !== 'warmup')
  return work.length > 0 && work.every(s => !(s.r > 0)) && work.some(s => s.sec > 0)
}

/** 'time' when a freshly added `id` should be a timed hold, else null (upstream decides). */
export function holdMode(S, id) {
  if (!id || isCardio(id)) return null
  const last = S ? lastEntryFor(S, id) : null
  return last && timedSets(last.sets) ? 'time' : null
}
