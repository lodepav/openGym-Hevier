// The Today tab, the page the app opens on (hevier/DECISIONS.md D126, D134): when and where the
// next session is, its first five exercises with their sets, Start, the week in one row, the round
// and the streak in one line, the ways into planning, and the last workout. Settings is the gear.
// The next day is next-planned.js's (D124), the rest is hevier/lib/today.js.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { exOr } from '../../lib/exercises.js'
import { fmtDate, todayISO, isoOf, DAYS } from '../../lib/format.js'
import { historyRows } from '../../views/History.jsx'
import { workoutDetailSheet, dayOverrideSheet } from '../../sheets.jsx'
import { useConnectionTrouble } from '../../components/SyncBanner.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import { startFlow } from './WorkoutTab.jsx'
import { previewPath } from './RoutinePreview.jsx'
import { nextPlanned } from '../lib/next-planned.js'
import { sessionSets, weekStrip, roundOf } from '../lib/today.js'
import { streakLabel } from '../lib/streak.js'
import { partOn } from '../lib/module-parts.js'
import { gymName } from '../lib/gym-labels.js'
import { workoutTimeText, hasClock } from '../lib/workout-when.js'
import { workSets } from '../lib/volume.js'
import { workoutRecords } from '../lib/records.js'

const SHOWN = 5

/** The gear in a tab's page bar, with the connection-trouble dot Home's had. */
export function SettingsGear() {
  const nav = useNavigate()
  const trouble = useConnectionTrouble()
  return <button type="button" className="iconbtn" onClick={() => nav('/settings')} aria-label={trouble ? t('Settings') + ', ' + t('Connection problem') : t('Settings')}>
    <Icon name="gear" />{trouble && <span className="tab-dot" aria-hidden="true" />}</button>
}

// "today", "tomorrow" or nothing, before the date.
function whenText(iso, today) {
  const d = new Date(today + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  const rel = iso === today ? t('today') : iso === isoOf(d) ? t('tomorrow') : ''
  return (rel ? rel + ', ' : '') + fmtDate(iso, true)
}

function NextCard({ S, next, today }) {
  const nav = useNavigate()
  const routines = next.ids.map(id => S.routines.find(r => r.id === id)).filter(Boolean)
  const name = routines.map(r => r.name).join(' + ')
  const exs = sessionSets(S, next.ids)
  const gym = gymName(S, S.activeEquipId)
  const more = exs.length - SHOWN
  return <>
    <div className="card hv-next">
      <div className="hv-cap">{[t('Next'), whenText(next.iso, today), gym].filter(Boolean).join(' · ')}</div>
      <h2 className="hv-next-n">{name}</h2>
      {exs.slice(0, SHOWN).map(x => {
        const ex = exOr(x.id)
        return <div key={x.key} className="hv-next-ex">
          <span className={'grow ' + exerciseNameClass(ex)}>{exerciseNameFor(ex)}</span>
          <span className="hv-next-sets">{x.sets}</span>
        </div>
      })}
      <button type="button" className="hv-link hv-next-plan" onClick={() => nav(previewPath(routines[0].id))}>
        {more > 0 ? t('{0} more · open the plan', more) : t('Open the plan')}<Icon name="chevronRight" /></button>
    </div>
    <button type="button" className="btn primary hv-today-start" disabled={!exs.length} onClick={() => startFlow(next.ids)}>{t('Start {0}', name)}</button>
  </>
}

function Week({ S, today }) {
  const days = weekStrip(S, today)
  const word = d => (d.kind === 'done' ? t('Done') : d.kind === 'plan' ? d.name : d.kind === 'rest' ? t('rest') : t('Nothing planned'))
  return <div className="hv-tweek" role="group" aria-label={t('This week')}>{days.map(d =>
    <button key={d.iso} type="button" className={'hv-tday ' + d.kind + (d.next ? ' next' : '') + (d.iso === today ? ' today' : '')}
      aria-label={fmtDate(d.iso, true) + ', ' + word(d)} onClick={() => dayOverrideSheet(d.iso)}>
      <b aria-hidden="true">{d.kind === 'done' ? <Icon name="check" /> : d.kind === 'plan' ? d.short : d.kind === 'rest' ? t('rest') : '–'}</b>
      <span aria-hidden="true">{t(DAYS[d.day])}</span>
    </button>)}</div>
}

function LastWorkout({ S, w }) {
  const recs = workoutRecords(S, w).length
  return <button type="button" className="card hv-tlast" onClick={() => workoutDetailSheet(w)}>
    <span className="hv-cap">{t('Last workout')} · {fmtDate(w.d, true)}</span>
    <b>{w.name || t('Workout')}</b>
    <span className="small dim">{[hasClock(w) && workoutTimeText(w), t('{0} sets', workSets(w.entries))].filter(Boolean).join(' · ')}
      {recs > 0 && <> · <span className="hv-pr"><Icon name="trophy" />{recs === 1 ? t('1 record') : t('{0} records', recs)}</span></>}</span>
  </button>
}

export default function Today() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const today = todayISO()
  const next = nextPlanned(S, today)
  const round = roundOf(S, today)
  const streak = partOn(S, 'motivation', 'streak') && S.workouts.length > 0 && streakLabel(S, today)
  const line = [round && t(round.round ? '{0} of {1} done this round' : '{0} of {1} done this week', round.done, round.of), streak].filter(Boolean)
  const last = historyRows(S).find(r => r.w)?.w
  return <div className="narrow hv-today-page">
    <PageBar title={t('Today')}><SettingsGear /></PageBar>
    {next ? <NextCard S={S} next={next} today={today} />
      : <div className="card hv-next hv-next-none">
        <h2 className="hv-next-n">{t('Nothing planned')}</h2>
        <p className="small dim">{t('Plan your days in the Calendar, or start one of your routines.')}</p>
      </div>}
    <Week S={S} today={today} />
    {line.length > 0 && <p className="hv-tline">{line.join(' · ')}</p>}
    <div className="hv-tlinks">
      <button type="button" className="btn" onClick={() => nav('/routines')}>{t('Routines')}</button>
      {partOn(S, 'hvStats', 'calendar') && <button type="button" className="btn" onClick={() => nav('/calendar')}>{t('Calendar')}</button>}
      <button type="button" className="btn" onClick={() => startFlow([])}>{t('Empty workout')}</button>
    </div>
    {last && <LastWorkout S={S} w={last} />}
  </div>
}
