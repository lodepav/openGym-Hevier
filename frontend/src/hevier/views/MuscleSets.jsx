// Sets per muscle, a page of its own behind History's chip and Statistics' row (D14, D135): the set
// count per muscle group (week, month, year, against the one before) and upstream's weekly sets
// against a range, counted the fork's way (D99).
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { fmtNum, todayISO, weekStartOf } from '../../lib/format.js'
import { signed } from '../lib/delta.js'
import { muscleSetCounts, PERIODS } from '../lib/muscle-sets.js'
import { muscleMode } from '../lib/volume.js'
import { muscleText } from '../lib/main-muscle.js'
import { countedS } from '../../lib/counted-log.js'
import { usePhasedS } from '../lib/shared-phase-run.js'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { partOn } from '../lib/module-parts.js'
import WeeklySetsCard from '../components/WeeklySetsCard.jsx'
import { BackTo } from './Statistics.jsx'

const PERIOD_LABEL = { week: 'Week', month: 'Month', year: 'Year' }
const SINCE = { week: 'vs last week', month: 'vs last month', year: 'vs last year' }

function SetCounts({ S, today }) {
  const [kind, setKind] = useState('week')
  const { rows } = muscleSetCounts(S.workouts, kind, { today, weekStart: weekStartOf(S), mode: muscleMode(S) })
  const max = Math.max(1, ...rows.map(r => r.sets))
  return <div className="card hv-setcounts">
    <h2>{t('Set count per muscle group')}</h2>
    <div className="hv-chips">{PERIODS.map(k => <button key={k} type="button" className={'hv-chip' + (k === kind ? ' on' : '')}
      aria-pressed={k === kind} onClick={() => setKind(k)}>{t(PERIOD_LABEL[k])}</button>)}</div>
    {/* What the numbers count, under the chips where it is read first. */}
    <div className="small dim hv-msets-cap">{t(muscleMode(S) === 'share' ? 'Work sets, a secondary muscle counted in part' : 'Work sets, each for its main muscle')} · {t(SINCE[kind])}</div>
    {rows.length ? <div className="hv-msets">{rows.map(r => {
      const d = signed(Math.round((r.sets - r.prev) * 10) / 10)
      return <div key={r.muscle} className="hv-mset">
        <span className="hv-mset-n">{muscleText(r.muscle)}</span>
        <span className="hv-mset-bar"><i style={{ width: Math.round((r.sets / max) * 100) + '%' }} /></span>
        <b>{fmtNum(r.sets)}</b>
        <span className={'hv-mset-d' + (d ? (d.up ? ' up' : ' down') : '')}>{d?.text}</span>
      </div>
    })}
    </div> : <div className="muted small" style={{ marginTop: 10 }}>{t('No sets in this period yet.')}</div>}
  </div>
}

export default function MuscleSets() {
  // Exercises kept out of progression are kept out of these numbers too (D57).
  const S = usePhasedS(countedS(useStore(s => s.S)))
  return <div className="narrow hv-statpage">
    <BackTo label={t('Statistics')} to="/stats" title={t('Sets per muscle')} />
    <PhaseFilter />
    <SetCounts S={S} today={todayISO()} />
    {partOn(S, 'strength', 'weekly') && <WeeklySetsCard S={S} />}
  </div>
}
