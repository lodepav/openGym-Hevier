// The History tab (hevier/DECISIONS.md D126, D135): this week in three numbers, the ways into the
// statistics, then the phase filter and every workout as a feed card (D14's feed, unchanged).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { todayISO } from '../../lib/format.js'
import { DEMO } from '../../lib/demo.js'
import { historyRows } from '../../views/History.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { SettingsGear } from './Today.jsx'
import { usePhasedS } from '../lib/shared-phase-run.js'
import { anyPartOn, partOn } from '../lib/module-parts.js'
import { weekNumbers } from '../lib/history-week.js'
import { roundOf } from '../lib/today.js'
import { durationWords } from '../lib/elapsed.js'

export const HISTORY_PATH = '/history-tab'
export const PAGE = 10

export function WorkoutFeed({ S }) {
  const nav = useNavigate()
  const [n, setN] = useState(PAGE)
  const ws = historyRows(usePhasedS(S)).filter(r => r.w).map(r => r.w)   // D93
  if (!ws.length) return <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet. Your first one will land here.')}
    {!DEMO && <><br /><button type="button" className="hv-link hv-empty-import" onClick={() => nav('/settings/integrations')}>{t('Import from Hevy')}</button></>}</div>
  return <>
    <PhaseFilter />
    {ws.slice(0, n).map(w => <WorkoutCard key={w.id || w.start} w={w} />)}
    {ws.length > n && <button type="button" className="btn hv-moreb" onClick={() => setN(n + PAGE)}>{t('Show more')}</button>}
  </>
}

function Tile({ label, value, sub, className = '' }) {
  return <div className="hv-htile"><span>{label}</span><b>{value}</b><span className={className}>{sub}</span></div>
}

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const n = weekNumbers(S, todayISO())
  // Each chip goes with the module part its page goes with, as Profile's tiles and Statistics' rows did.
  const chips = [
    partOn(S, 'hvStats', 'calendar') && ['Calendar', () => nav('/calendar')],
    ['Statistics', () => nav('/stats')],
    partOn(S, 'hvStats', 'report') && ['Month report', () => nav('/report')],
    ['Sets per muscle', () => nav('/stats', { state: { at: 'sets' } })],
    anyPartOn(S, 'body') && ['Body weight', () => nav('/measures')],
    ['More', () => nav('/stats/all')],
  ].filter(Boolean)
  return <div className="narrow hv-history">
    <PageBar title={t('History')}><SettingsGear /></PageBar>
    <div className="hv-htiles">
      <Tile label={roundOf(S, todayISO())?.round ? t('This round') : t('This week')} value={n.planned ? t('{0} of {1}', n.done, n.planned) : n.done} sub={t('workouts')} />
      <Tile label={t('Time')} value={n.ms ? durationWords(n.ms) : '0'} sub={t('this week')} />
      <Tile label={t('Sets')} value={n.sets} className={n.records ? 'hv-pr' : ''}
        sub={n.records ? <><Icon name="trophy" />{n.records === 1 ? t('1 record') : t('{0} records', n.records)}</> : t('this week')} />
    </div>
    <div className="hv-chips hv-hlinks">{chips.map(([label, go]) => <button key={label} type="button" className="hv-chip" onClick={go}>{t(label)}</button>)}</div>
    <WorkoutFeed S={S} />
  </div>
}
