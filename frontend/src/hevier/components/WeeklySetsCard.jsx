// Weekly sets per muscle against a target range, counted the fork's way (hevier/DECISIONS.md D99):
// a card on Statistics and an optional Home widget. Upstream 1.4.4's look (StatBars' BarRow, the
// range band, the status) and its Ranges editor (muscleTargetsSheet); the sets are the fork's
// (lib/weekly-sets.js), so the page shows one number for a muscle's week.
import { t } from '../../lib/i18n.js'
import { fmtNum, todayISO } from '../../lib/format.js'
import { BarRow } from '../../components/StatBars.jsx'
import { muscleTargetsSheet } from '../../components/WeeklySets.jsx'
import { Button } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { forkWeeklySets, mostRoom } from '../lib/weekly-sets.js'
import { muscleMode } from '../lib/volume.js'

const STATUS = { below: () => t('room for more'), in: () => t('in range'), above: () => t('above range') }

export default function WeeklySetsCard({ S }) {
  const rows = forkWeeklySets(S, todayISO())
  const top = Math.max(1, ...rows.map(r => Math.max(r.sets, r.hi)))
  return <div className="card hv-wsets">
    <h2>{t('Weekly sets per muscle')}</h2>
    <div className="small dim hv-msets-cap">{t(muscleMode(S) === 'share' ? 'Work sets, a secondary muscle counted in part' : 'Work sets, each for its main muscle')} · {t('This week')}</div>
    <div className="sbar-list">{rows.map(r => {
      const name = t(r.name)
      return <BarRow key={r.slug} label={name} tone={r.status} fill={r.sets / top} band={[r.lo / top, r.hi / top]}
        value={<><b>{fmtNum(r.sets)}</b><span className="sbar-of"> / {r.lo}–{r.hi}</span></>}
        ariaLabel={[name + ': ' + t('{0} sets', fmtNum(r.sets)), t('Target range') + ' ' + r.lo + '–' + r.hi, STATUS[r.status]()].join(', ')} />
    })}</div>
    <div className="hv-wsets-ft"><Button size="sm" variant="ghost" icon="slider" onClick={muscleTargetsSheet}>{t('Ranges')}</Button></div>
  </div>
}

/** Home's line (upstream's Weekly sets on Home), as a fork widget: the muscle with the most room. */
export function WeeklySetsWidget({ S, onOpen }) {
  const rows = forkWeeklySets(S, todayISO())
  const room = mostRoom(rows)
  return <button type="button" className="card hv-wsets-home" onClick={onOpen}>
    <Icon name="figureStrength" />
    <span>{!rows.some(r => r.sets > 0) ? t('No sets this week yet.')
      : room ? t('Most room this week: {0}, {1} of {2}–{3} sets', t(room.name), fmtNum(room.sets), room.lo, room.hi)
        : t('Every main muscle is in range this week. Tidy.')}</span>
    <Icon name="chevronRight" className="chev" />
  </button>
}
