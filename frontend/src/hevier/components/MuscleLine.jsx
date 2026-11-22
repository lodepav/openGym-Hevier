// The line under a workout's stats in sets mode (hevier/DECISIONS.md D18): "Chest 8 sets · Triceps 5 sets",
// each ticked work set once, for its exercise's main muscle, or a secondary one in part as
// Settings → Muscle sets says (D42; hevier/lib/volume.js). The feed card shows the top three (the critique, 2026-11-22).
import { fmtNum } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import { useStore } from '../../store/useStore.js'
import { muscleSets, muscleMode } from '../lib/volume.js'
import { muscleText } from '../lib/main-muscle.js'

// "4 sets", seen and spoken, not a bare 4 (the ninth critique, 2026-11-22); a share count reads "2.5 sets".
const setsText = n => (n === 1 ? t('{0} set', fmtNum(n)) : t('{0} sets', fmtNum(n)))

// `top`: show only that many, the most sets first, and "+5 more muscles" for the rest; TalkBack still hears every one, "Upper back, 4 sets".
export default function MuscleLine({ entries, mode, top }) {
  const own = useStore(s => muscleMode(s.S))
  const list = muscleSets(entries, mode || own)
  if (!list.length) return null
  const cut = top > 0 && list.length > top
  const shown = cut ? list.slice(0, top) : list
  const line = shown.map((m, i) => <span key={m.muscle}>
    {i > 0 && ' · '}{muscleText(m.muscle)} <b>{fmtNum(m.sets)}</b> {m.sets === 1 ? t('set') : t('sets')}
  </span>)
  return <div className="hv-mline">
    <span aria-hidden="true">{line}{cut && ' · ' + (list.length - top === 1 ? t('+1 more muscle') : t('+{0} more muscles', list.length - top))}</span>
    <span className="hv-sr">{list.map(m => muscleText(m.muscle) + ', ' + setsText(m.sets)).join(', ')}</span>
  </div>
}
