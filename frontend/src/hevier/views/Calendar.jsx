// Hevy's Calendar (reference/SCREENS.md §11), Profile → Calendar: "N week streak · N rest days",
// Month (the months back from this one, trained days filled) or Year (twelve small months). The
// marks and taps are upstream's Calendar sheet's (sheets.jsx): a trained day opens its workout,
// several open a list, and any other day opens upstream's day sheet to plan a session there.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, tn } from '../../lib/i18n.js'
import { fmtDate, todayISO, weekStartOf, weekOrder, DAYS, MONTHS_LONG } from '../../lib/format.js'
import { streakWeeks } from '../../lib/history.js'
import { workoutDetailSheet, dayOverrideSheet, WorkoutRow } from '../../sheets.jsx'
import { Segmented } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { monthCells, monthsBack, workoutsByDay, restDays, dayMark } from '../lib/calendar.js'

const MORE = 6

export function openDay(iso, ws) {
  if (!ws) { dayOverrideSheet(iso); return }
  if (ws.length === 1) { workoutDetailSheet(ws[0]); return }
  useUI.getState().openSheet(close => <><h3>{fmtDate(iso, true)}</h3>
    <div className="list">{ws.map(w => <WorkoutRow key={w.id} w={w} onClick={() => { close(); workoutDetailSheet(w) }} />)}</div></>)
}

export function Month({ y, mo, st, byDay, today, small, onTitle }) {
  const ws = weekStartOf(st)
  const cells = monthCells(y, mo, ws)
  const n = cells.filter(iso => iso && byDay[iso]).length
  return <div className={'hv-cal-m' + (small ? ' small' : '')}>
    <button type="button" className="hv-cal-mt" onClick={onTitle} disabled={!onTitle}>
      <b>{small ? t(MONTHS_LONG[mo]) : `${t(MONTHS_LONG[mo])} ${y}`}</b>
      {!small && n > 0 && <span>{tn('{0} workout', '{0} workouts', n)}</span>}
    </button>
    <div className="hv-cal-g">
      {!small && weekOrder(ws).map(d => <span key={d} className="hv-cal-h">{t(DAYS[d])}</span>)}
      {cells.map((iso, i) => {
        if (!iso) return <span key={'b' + i} />
        const mark = dayMark(st, iso, byDay)
        const cls = 'hv-cal-d ' + mark + (iso === today ? ' today' : '')
        const day = Number(iso.slice(8))
        return small
          ? <span key={iso} className={cls} />
          : <button key={iso} type="button" className={cls} onClick={() => openDay(iso, byDay[iso])}>{day}</button>
      })}
    </div>
  </div>
}

export default function Calendar() {
  const nav = useNavigate()
  const st = useStore(s => s.S)
  const [view, setView] = useState('month')
  const today = todayISO()
  const now = new Date()
  const [from, setFrom] = useState({ y: now.getFullYear(), mo: now.getMonth() })
  const [count, setCount] = useState(MORE)
  const [year, setYear] = useState(now.getFullYear())
  const byDay = workoutsByDay(st.workouts)
  const streak = streakWeeks(st)
  const rest = restDays(st.workouts, today)
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/profile'))
  // A month tapped in the year view opens the month view on it.
  const openMonth = mo => { setFrom({ y: year, mo }); setCount(MORE); setView('month') }

  return <div className="hv-cal">
    <div className="hv-pagebar">
      <button type="button" className="iconbtn" aria-label={t('Back')} onClick={back}><Icon name="chevronLeft" /></button>
      <div className="hv-title">{t('Calendar')}</div>
      <span className="hv-cal-pad" />
    </div>
    <div className="hv-cal-streak">
      <Icon name="flame" />
      <span>{t('{0} week streak', streak)}</span>
      {rest != null && <span className="muted">· {rest === 1 ? t('1 rest day') : t('{0} rest days', rest)}</span>}
    </div>
    <Segmented options={[{ value: 'month', label: t('Month') }, { value: 'year', label: t('Year') }]} value={view} onChange={setView} />
    {view === 'month' ? <>
      {monthsBack(from.y, from.mo, count).map(m => <Month key={m.y + '-' + m.mo} {...m} st={st} byDay={byDay} today={today} />)}
      <button type="button" className="btn hv-cal-more" onClick={() => setCount(c => c + MORE)}>{t('Show earlier months')}</button>
    </> : <>
      <div className="hv-cal-yr">
        <button type="button" className="iconbtn" aria-label={t('Previous year')} onClick={() => setYear(y => y - 1)}><Icon name="chevronLeft" /></button>
        <b>{year}</b>
        <button type="button" className="iconbtn" aria-label={t('Next year')} onClick={() => setYear(y => y + 1)} disabled={year >= now.getFullYear()}><Icon name="chevronRight" /></button>
      </div>
      <div className="hv-cal-year">
        {Array.from({ length: 12 }, (_, mo) => <Month key={mo} y={year} mo={mo} st={st} byDay={byDay} today={today} small onTitle={() => openMonth(mo)} />)}
      </div>
    </>}
  </div>
}
