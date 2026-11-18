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
  // Each chip goes with the module part its page goes with, as Profile's tiles and Statistics' rows did;
  // two labelled rows (D135, 2026-11-17), a row with no chip left is not drawn.
  const groups = [
    ['Look back', [
      partOn(S, 'hvStats', 'calendar') && ['Calendar', () => nav('/calendar')],
      partOn(S, 'hvStats', 'report') && ['Monthly report', () => nav('/report')],
    ]],
    ['Numbers', [
      ['Statistics', () => nav('/stats')],
      ['Sets per muscle', () => nav('/muscle-sets')],
      anyPartOn(S, 'body') && ['Body weight', () => nav('/measures')],
      ['All statistics', () => nav('/stats/all')],
    ]],
  ].map(([cap, chips]) => [cap, chips.filter(Boolean)]).filter(([, chips]) => chips.length)
  return <div className="narrow hv-history">
    <PageBar title={t('History')}><SettingsGear /></PageBar>
    <div className="hv-htiles">
      <Tile label={roundOf(S, todayISO())?.round ? t('This round') : t('This week')} value={n.planned ? t('{0} of {1}', n.done, n.planned) : n.done} sub={t('workouts')} />
      <Tile label={t('Time')} value={n.ms ? durationWords(n.ms) : '0'} sub={t('this week')} />
      <Tile label={t('Sets')} value={n.sets} className={n.records ? 'hv-pr' : ''}
        sub={n.records ? <><Icon name="trophy" />{n.records === 1 ? t('1 record') : t('{0} records', n.records)}</> : t('this week')} />
    </div>
    {groups.map(([cap, chips]) => <div key={cap} className="hv-hgroup">
      <span className="hv-cap">{t(cap)}</span>
      <div className={'hv-chips hv-hlinks' + (cap === 'Numbers' ? ' hv-hscroll' : '')}>{chips.map(([label, go]) => <button key={label} type="button" className="hv-chip" onClick={go}>{t(label)}</button>)}</div>
    </div>)}
    <WorkoutFeed S={S} />
  </div>
}
