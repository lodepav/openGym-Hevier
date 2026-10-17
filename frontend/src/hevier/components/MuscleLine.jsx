// The line under a workout's stats in sets mode (hevier/DECISIONS.md D18): "Chest 8 · Triceps 5",
// each ticked work set once, for its exercise's main muscle, or a secondary one in part as
// Settings → Muscle sets says (D42; hevier/lib/volume.js).
import { t } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { useStore } from '../../store/useStore.js'
import { muscleSets, muscleMode } from '../lib/volume.js'

// `reserve` keeps the line's height while it is empty, so the live workout does not jump on the
// first tick.
export default function MuscleLine({ entries, mode, reserve = false }) {
  const own = useStore(s => muscleMode(s.S))
  const list = muscleSets(entries, mode || own)
  if (!list.length) return reserve ? <div className="hv-mline" aria-hidden="true">{'\u00a0'}</div> : null
  return <div className="hv-mline">{list.map((m, i) => <span key={m.muscle}>
    {i > 0 && ' · '}{t(m.muscle)} <b>{fmtNum(m.sets)}</b>
  </span>)}</div>
}
