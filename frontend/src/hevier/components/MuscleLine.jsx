// The line under a workout's stats in sets mode (hevier/DECISIONS.md D18): "Chest 8 · Triceps 5",
// each ticked work set once, for its exercise's main muscle (hevier/lib/volume.js).
import { t } from '../../lib/i18n.js'
import { muscleSets } from '../lib/volume.js'

export default function MuscleLine({ entries }) {
  const list = muscleSets(entries)
  if (!list.length) return null
  return <div className="hv-mline">{list.map((m, i) => <span key={m.muscle}>
    {i > 0 && ' · '}{t(m.muscle)} <b>{m.sets}</b>
  </span>)}</div>
}
