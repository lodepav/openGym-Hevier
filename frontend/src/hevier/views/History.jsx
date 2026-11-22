// The History tab (hevier/DECISIONS.md D126, D135, D142): one row of ways into the statistics (this
// week's numbers are on Statistics and Today, the critique 2026-11-20), then the phase filter and every workout as a feed card (D14's feed, unchanged).
import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t, tn } from '../../lib/i18n.js'
import { DEMO } from '../../lib/demo.js'
import { historyRows } from '../../views/History.jsx'
import { monthName, monthLabel } from '../../lib/month-story.js'
import { todayISO } from '../../lib/format.js'
import { monthHeads } from '../lib/history-months.js'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { SettingsGear } from './Today.jsx'
import { usePhasedS, useStatsPhase } from '../lib/shared-phase-run.js'
import { partOn } from '../lib/module-parts.js'
import { useLargeText } from '../components/useLargeText.js'

// "November · 3 workouts", the year too when it is not this one.
const monthHead = ({ ym, n }) => (ym.slice(0, 4) === todayISO().slice(0, 4) ? monthName(ym) : monthLabel(ym))
  + ' · ' + tn('{0} workout', '{0} workouts', n)

export const HISTORY_PATH = '/history-tab'
export const PAGE = 25

export function WorkoutFeed({ S }) {
  const nav = useNavigate()
  const [n, setN] = useState(PAGE)
  const P = usePhasedS(S)   // D93
  const phase = useStatsPhase(s => s.phase)
  // Only the workouts are kept, so the log, the phase and its switch decide; not each copy of S (the fifth audit, 2026-11-21).
  const ws = useMemo(() => historyRows(P).filter(r => r.w).map(r => r.w), [S.workouts, phase, S.modules, S.hvModuleParts]) // eslint-disable-line react-hooks/exhaustive-deps
  const heads = useMemo(() => monthHeads(ws), [ws])
  if (!ws.length) return <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet. Your first one will land here.')}
    {!DEMO && <><br /><button type="button" className="hv-link hv-empty-import" onClick={() => nav('/settings/integrations')}>{t('Import from Hevy')}</button></>}</div>
  return <>
    <PhaseFilter />
    {ws.slice(0, n).map((w, i) => <Fragment key={w.id || w.start}>
      {heads.has(i) && <h3 className="hv-cap hv-hmonth" aria-level={2}>{monthHead(heads.get(i))}</h3>}
      <WorkoutCard w={w} />
    </Fragment>)}
    {/* How deep the feed goes, said on the button (the tenth critique, 2026-11-22). */}
    {ws.length > n && <button type="button" className="btn hv-moreb" onClick={() => setN(n + PAGE)}>{t('Show more ({0})', ws.length - n)}</button>}
  </>
}

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  // Each chip goes with the module part its page goes with; one row (D142), the rest is on Statistics.
  const chips = [
    partOn(S, 'hvStats', 'calendar') && ['Calendar', () => nav('/calendar')],
    partOn(S, 'hvStats', 'report') && ['Monthly report', () => nav('/report')],
    ['Statistics', () => nav('/stats')],
  ].filter(Boolean)
  // With large text a card's exercise lines are whole, not cut at two lines (hevier.css, the tenth audit).
  const big = useLargeText()
  return <div className={'narrow hv-history' + (big ? ' hv-big' : '')}>
    <PageBar title={t('History')}><SettingsGear back="History" /></PageBar>
    <div className="hv-hgroup">
      <h2 className="hv-cap">{t('Look back')}</h2>
      <div className="hv-chips hv-hlinks">{chips.map(([label, go]) => <button key={label} type="button" className="hv-chip" onClick={go}>{t(label)}</button>)}</div>
    </div>
    <WorkoutFeed S={S} />
  </div>
}
