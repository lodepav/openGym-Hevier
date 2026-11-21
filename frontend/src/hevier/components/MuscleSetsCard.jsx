// Statistics' Sets per muscle card (hevier/DECISIONS.md D142, once the /muscle-sets page): the set
// count per muscle group this week, month or year against the one before; no target ranges (D139).
import { useState } from 'react'
import { t } from '../../lib/i18n.js'
import { fmtNum, weekStartOf } from '../../lib/format.js'
import { signed } from '../lib/delta.js'
import { muscleSetCounts, PERIODS } from '../lib/muscle-sets.js'
import { muscleMode } from '../lib/volume.js'
import { muscleText } from '../lib/main-muscle.js'

const PERIOD_LABEL = { week: 'Week', month: 'Month', year: 'Year' }
const SINCE = { week: 'vs last week', month: 'vs last month', year: 'vs last year' }

/** `S` is the page's: counted (D57) and phased (D93). */
export default function MuscleSetsCard({ S, today }) {
  const [kind, setKind] = useState('week')
  const { rows } = muscleSetCounts(S.workouts, kind, { today, weekStart: weekStartOf(S), mode: muscleMode(S) })
  const max = Math.max(1, ...rows.map(r => r.sets))
  // Against a period with no sets at all every row would read as a gain, so the changes are left out.
  const before = rows.some(r => r.prev > 0)
  return <div className="card hv-setcounts hv-scard">
    <h2>{t('Sets per muscle')}</h2>
    <div className="hv-chips">{PERIODS.map(k => <button key={k} type="button" className={'hv-chip' + (k === kind ? ' on' : '')}
      aria-pressed={k === kind} onClick={() => setKind(k)}>{t(PERIOD_LABEL[k])}</button>)}</div>
    {/* What the numbers count, under the chips where it is read first. */}
    <div className="small dim hv-msets-cap">{t(muscleMode(S) === 'share' ? 'Work sets, a secondary muscle counted in part' : 'Work sets, each for its main muscle')} · {t(SINCE[kind])}</div>
    {rows.length ? <div className="hv-msets">{rows.map(r => {
      const d = before ? signed(Math.round((r.sets - r.prev) * 10) / 10) : null
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
