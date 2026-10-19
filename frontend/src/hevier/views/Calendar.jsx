// Hevy's Calendar (reference/SCREENS.md §11), Profile → Calendar: "N week streak · N rest days" (the streak D59's),
// Month (the months back from this one, oldest at the top and this one at the bottom, where the
// page opens, as Hevy's; trained days filled) or Year (twelve small months). The
// marks and taps are upstream's Calendar sheet's (sheets.jsx): a trained day opens its workout,
// several open a list, and any other day opens upstream's day sheet to plan a session there.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useNavigationType } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, tn } from '../../lib/i18n.js'
import { fmtDate, todayISO, weekStartOf, weekOrder, DAYS, MONTHS_LONG } from '../../lib/format.js'
import { workoutDetailSheet, dayOverrideSheet, WorkoutRow } from '../../sheets.jsx'
import { Segmented } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import { streakLabel } from '../lib/streak.js'
import { monthCells, monthsBack, workoutsByDay, restDays, dayMark, dayKind, dayTitle, planKind, planTitle } from '../lib/calendar.js'

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
        const kind = dayKind(byDay[iso])
        const plan = planKind(st, iso, byDay, today)
        const cls = 'hv-cal-d ' + mark + (kind ? ' k-' + kind : '') + (plan ? ' planned pk-' + plan : '') + (iso === today ? ' today' : '')
        const day = Number(iso.slice(8))
        // D68: a planned day names its routine, in its colour, where a trained day names its workout.
        const title = dayTitle(byDay[iso]) || (plan && !small ? planTitle(st, iso, byDay, today) : '')
        return small
          ? <span key={iso} className={cls} />
          : <button key={iso} type="button" className={'hv-cal-c' + (iso === today ? ' today' : '')} onClick={() => openDay(iso, byDay[iso])}>
            <span className={cls}>{day}</span>
            {title && <span className={'hv-cal-tl' + (plan ? ' pk-' + plan : '')}>{title}</span>}
          </button>
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
  const [ahead, setAhead] = useState(0)
  const [year, setYear] = useState(now.getFullYear())
  const byDay = workoutsByDay(st.workouts)
  const rest = restDays(st.workouts, today)
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/profile'))
  // A month tapped in the year view opens the month view on it.
  const openMonth = mo => { setFrom({ y: year, mo }); setCount(MORE); setAhead(0); setView('month') }
  // The month view opens on its newest month, scrolled to the bottom, a frame later, after upstream's
  // App has put a new page at the top; coming back (POP) keeps the place App restores. Earlier
  // months go in above: the page is moved down by what they add, so what was in view stays. Later
  // months (D68) go in below, one per tap, and the page goes down to the new one.
  const back0 = useNavigationType() === 'POP'
  const mounted = useRef(false)
  const grow = useRef(null)
  const pageH = () => document.documentElement.scrollHeight
  useEffect(() => {
    const first = !mounted.current
    mounted.current = true
    if (view !== 'month' || (first && back0)) return
    const f = requestAnimationFrame(() => window.scrollTo(0, pageH()))
    return () => cancelAnimationFrame(f)
  }, [view, from, ahead])   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (grow.current == null) return
    window.scrollBy(0, pageH() - grow.current)
    grow.current = null
  }, [count])
  const earlier = () => { grow.current = pageH(); setCount(c => c + MORE) }

  return <div className="hv-cal">
    <PageBar title={t('Calendar')} onBack={back} />
    <div className="hv-cal-streak">
      <Icon name="flame" />
      <span>{streakLabel(st)}</span>
      {rest != null && <span className="muted">· {rest === 1 ? t('1 rest day') : t('{0} rest days', rest)}</span>}
    </div>
    <Segmented options={[{ value: 'month', label: t('Month') }, { value: 'year', label: t('Year') }]} value={view} onChange={setView} />
    <div className="hv-cal-key">
      <span><i className="k-strength" />{t('Strength')}</span>
      <span><i className="k-cardio" />{t('Cardio')}</span>
      <span><i className="k-deload" />{t('Deload')}</span>
      <span><i className="k-plan" />{t('Planned')}</span>
    </div>
    {view === 'month' ? <>
      <button type="button" className="btn hv-cal-more" onClick={earlier}>{t('Show earlier months')}</button>
      {monthsBack(from.y, from.mo + ahead, count + ahead).reverse().map(m => <Month key={m.y + '-' + m.mo} {...m} st={st} byDay={byDay} today={today} />)}
      <button type="button" className="btn hv-cal-more next" onClick={() => setAhead(a => a + 1)}>{t('Show next month')}</button>
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
