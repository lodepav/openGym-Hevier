// Weekly sets per muscle against a target range, counted the fork's way (hevier/DECISIONS.md D99):
// a card on Statistics. Upstream 1.4.4's look (StatBars' BarRow, the
// range band, the status) and its Ranges editor (muscleTargetsSheet); the sets are the fork's
// (lib/weekly-sets.js), so the page shows one number for a muscle's week.
import { t } from '../../lib/i18n.js'
import { fmtNum, todayISO } from '../../lib/format.js'
import { BarRow } from '../../components/StatBars.jsx'
import { muscleTargetsSheet } from '../../components/WeeklySets.jsx'
import { Button } from '../../components/ui.jsx'
import { forkWeeklySets, weeksInRange } from '../lib/weekly-sets.js'
import { muscleMode } from '../lib/volume.js'

const STATUS = { below: () => t('room for more'), in: () => t('in range'), above: () => t('above range') }

export default function WeeklySetsCard({ S }) {
  const rows = forkWeeklySets(S, todayISO())
  const past = weeksInRange(S, todayISO())
  const top = Math.max(1, ...rows.map(r => Math.max(r.sets, r.hi)))
  return <div className="card hv-wsets">
    <h2>{t('Weekly sets per muscle')}</h2>
    <div className="small dim hv-msets-cap">{t(muscleMode(S) === 'share' ? 'Work sets, a secondary muscle counted in part' : 'Work sets, each for its main muscle')} · {t('This week')}</div>
    <div className="sbar-list">{rows.map(r => {
      const name = t(r.name)
      const p = past[r.slug]
      return <BarRow key={r.slug} label={name} tone={r.status} fill={r.sets / top} band={[r.lo / top, r.hi / top]}
        value={<><b>{fmtNum(r.sets)}</b><span className="sbar-of"> / {r.lo}–{r.hi}</span>
          {/* Of the last complete weeks trained, how many were in range; spoken in the row's label. */}
          {p && <span className="hv-wsets-past" aria-hidden="true">{p.hit}/{p.of}</span>}</>}
        ariaLabel={[name + ': ' + t('{0} sets', fmtNum(r.sets)), t('Target range') + ' ' + r.lo + '–' + r.hi, STATUS[r.status](),
          p && t('In range {0} of {1} weeks', p.hit, p.of)].filter(Boolean).join(', ')} />
    })}</div>
    <div className="hv-wsets-ft"><Button size="sm" variant="ghost" icon="slider" onClick={muscleTargetsSheet}>{t('Ranges')}</Button></div>
  </div>
}
