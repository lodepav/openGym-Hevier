// A finished workout as a Hevy feed card (reference/SCREENS.md §4): title, date, Time · Volume ·
// Records, then the first exercises with their set counts. Tapping it opens upstream's workout
// details, where edit, repeat, save as routine and delete already live.
import { useStore } from '../../store/useStore.js'
import { EXIDX } from '../../lib/exercises.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtDate, fmtDur, fmtVol, exCount } from '../../lib/format.js'
import { hasCompletedWork, isWarmupRow } from '../../lib/workout-model.js'
import { workoutDetailSheet } from '../../sheets.jsx'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import { Thumb } from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'

const SHOWN = 3

export default function WorkoutCard({ w }) {
  const unit = useStore(s => s.S.unit)
  const entries = (w.entries || []).filter(e => (e.sets || []).some(hasCompletedWork))
  const ms = Math.max(0, (w.end || w.start) - w.start)
  const prs = w.prs?.length || 0
  return <div className="card hv-wcard" {...tappable(() => workoutDetailSheet(w))}>
    <div className="hv-wcard-t">{w.name || t('Workout')}</div>
    <div className="hv-wcard-d">{fmtDate(w.d, true)}</div>
    <div className="hv-wcard-stats">
      <div><span>{t('Time')}</span><b>{ms >= 60000 ? fmtDur(ms) : '–'}</b></div>
      <div><span>{t('Volume')}</span><b>{fmtVol(w.vol || 0, unit)}</b></div>
      {prs > 0 && <div><span>{t('Records')}</span><b className="hv-pr"><Icon name="trophy" />{prs}</b></div>}
    </div>
    {entries.slice(0, SHOWN).map((e, i) => {
      const ex = EXIDX[e.id]
      const n = e.sets.filter(s => hasCompletedWork(s) && !isWarmupRow(s)).length
      return <div key={i} className="hv-wcard-ex">
        <span className="hv-thumb sm">{ex && <Thumb ex={ex} />}</span>
        <span className={'grow ' + exerciseNameClass(ex)}><b>{tn('{0} set', '{0} sets', n)}</b> {ex ? exerciseNameFor(ex) : (e.n || e.id)}</span>
      </div>
    })}
    {entries.length > SHOWN && <div className="hv-wcard-more">{t('See more: {0}', exCount(entries.length - SHOWN))}</div>}
  </div>
}
