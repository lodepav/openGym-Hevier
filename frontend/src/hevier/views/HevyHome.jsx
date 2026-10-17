// The fork's Home (hevier/DECISIONS.md D12): a list of widgets the user adds, removes and
// rearranges under "Edit Home". Every widget is an existing openGym piece over upstream's data
// and sheets; the layout itself is device-local (hevier/lib/home-layout.js).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { effectiveRoutines, effectiveRoutineIds, streakWeeks, lastBW } from '../../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekStartOf, weekDayOffset, DAYS } from '../../lib/format.js'
import { t, tn, dateLocale } from '../../lib/i18n.js'
import { weekTally, queueView, queueOf } from '../../lib/queue.js'
import { scheduleModeOf } from '../../lib/rotation.js'
import { fatigueOf } from '../../lib/recovery.js'
import { dayNoteOf } from '../../lib/day-notes.js'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import { useListReorder } from '../../lib/use-list-reorder.js'
import { bwSheet, dayOverrideSheet, calendarSheet, startFlow } from '../../sheets.jsx'
import { FATIGUE_LEVELS } from '../../views/Stats.jsx'
import { useConnectionTrouble } from '../../components/SyncBanner.jsx'
import LineChart from '../../components/LineChart.jsx'
import BodyMap from '../../components/BodyMap.jsx'
import QueueRow from '../../components/QueueRow.jsx'
import Icon from '../../components/Icon.jsx'
import { Switch } from '../../components/ui.jsx'
import WeeklyChart from '../components/WeeklyChart.jsx'
import { WorkoutFeed } from './Profile.jsx'
import { useHcOnly } from '../lib/weigh-in-source.js'
import { homeWidgets, storedLayout, readHome, writeHome, ALWAYS_ON, UPSTREAM_SWITCH } from '../lib/home-layout.js'

const TITLE = {
  today: 'Today & this week', streak: 'Week streak', weight: 'Body weight',
  recovery: 'Muscle recovery', weekly: 'Weekly chart', feed: 'Workouts',
}

// Upstream Home's week strip and today row, compact: the dots and a tap on a day are its own.
function TodayWidget({ S }) {
  const nav = useNavigate()
  const today = todayISO()
  const routines = effectiveRoutines(S, today)
  const name = routines.map(r => r.name).join(' + ')
  const done = S.workouts.some(w => w.d === today)
  const rotating = scheduleModeOf(S) === 'rotation'
  const queue = queueView(S, today)
  const liveQ = queueOf(S)
  const managed = !!liveQ && !!S.rotation && liveQ.rotationId === S.rotation.id
  const ws = weekStartOf(S)
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - weekDayOffset(now.getDay(), ws))
  const trained = new Set(S.workouts.map(w => w.d))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const iso = isoOf(d)
    const planned = effectiveRoutineIds(S, iso).length > 0
    const dot = trained.has(iso) ? ' done' : dayNoteOf(S, iso) ? ' noted' : S.dayPlan[iso] !== undefined && planned ? ' ovr' : planned ? ' plan' : ''
    return <div key={iso} className={'wday' + (iso === today ? ' today' : '')} {...tappable(() => dayOverrideSheet(iso))}>
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div><div className={'dot' + dot} /></div>
  })
  const go = () => (S.active ? nav('/workout') : routines.length ? startFlow(effectiveRoutineIds(S, today)) : dayOverrideSheet(today))
  return <div className="card">
    {rotating && queue ? <QueueRow S={S} today={today} managed={managed} onStart={id => (S.active ? nav('/workout') : startFlow([id]))} />
      : <div className="week">{days}</div>}
    <div className="today-row" {...tappable(go)}>
      <div style={{ minWidth: 0 }}>
        <div className="lbl2">{t('Today')}</div>
        <div className="ttl">{S.active ? t('{0} (in progress)', S.active.name) : routines.length ? name : t('Rest day')}</div>
      </div>
      {S.active ? <span className="tag">{t('Resume')}</span> : done ? <span className="tag">{t('Done')}</span>
        : routines.length ? <span className="tag acc">{t('Start')}</span> : <Icon name="plus" className="chev" />}
    </div>
  </div>
}

function WeightWidget({ S }) {
  const hc = useHcOnly()
  const bw = lastBW(S)
  const pts = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))
  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
      {!hc && <button type="button" className="btn sm" onClick={() => bwSheet()}><Icon name="plus" />{t('Log')}</button>}</div>
    {bw ? <>
      <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
        <div className="big">{fmtNum(bw.w)} <span className="muted" style={{ fontSize: '1rem' }}>{S.unit}</span></div>
        <span className="dim small" style={{ marginInlineStart: 'auto' }}>{fmtDate(bw.d, true)}</span>
      </div>
      <div className="chart" style={{ marginTop: 8 }}><LineChart points={pts} h={110} unit={S.unit} goal={S.targetW} /></div>
    </> : <div className="muted small">{t('No weigh-ins yet. Log your weight to start the curve.')}</div>}
  </div>
}

function RecoveryWidget({ S }) {
  const nav = useNavigate()
  const fatigue = useMemo(() => fatigueOf(S.workouts, Date.now(), { unit: S.unit }), [S.workouts, S.unit])
  return <div className="card tappable" {...tappable(() => nav('/stats'))}>
    <h2>{t('Muscle recovery')}</h2>
    <BodyMap className="hm-fatigue" load={fatigue} thresholds={FATIGUE_LEVELS} body={S.body} />
  </div>
}

function Widget({ id, S }) {
  if (id === 'today') return <TodayWidget S={S} />
  if (id === 'weight') return <WeightWidget S={S} />
  if (id === 'recovery') return <RecoveryWidget S={S} />
  if (id === 'weekly') return <div className="card"><WeeklyChart /></div>
  if (id === 'feed') return <><h4 className="sec">{t('Workouts')}</h4><WorkoutFeed S={S} /></>
  if (id === 'streak') {
    const { done, planned } = weekTally(S, todayISO())
    return <div className="card tappable" {...tappable(() => calendarSheet())}>
      <div className="row" style={{ gap: 7, fontSize: 20, fontWeight: 600 }}><Icon name="flame" style={{ color: 'var(--orange)' }} />{t('{0} week streak', streakWeeks(S))}</div>
      <div className="muted small">{done}{planned ? ' / ' + planned : ''} {t('this week')} · {tn('{0} workout total', '{0} workouts total', S.workouts.length)}</div>
    </div>
  }
  return null
}

function EditHome({ widgets, setWidgets }) {
  const update = useStore(s => s.update)
  const reorder = useListReorder(widgets.length, (from, to) => setWidgets(ws => {
    const next = [...ws]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    return next
  }))
  const toggle = (id, on) => {
    if (UPSTREAM_SWITCH[id]) update(s => { UPSTREAM_SWITCH[id].set(s, on) })
    setWidgets(ws => ws.map(w => (w.id === id ? { ...w, on } : w)))
  }
  return <div className="list hv-edithome" ref={reorder.listRef}>{widgets.map((w, i) =>
    <div key={w.id} data-reorder-row className="item" style={reorder.rowStyle(i)}>
      <button type="button" className="plan-handle" aria-label={t('Move {0}', t(TITLE[w.id]))} {...reorder.handle(i)}><Icon name="grip" /></button>
      <div className="grow"><div className="tt">{t(TITLE[w.id])}</div></div>
      {!ALWAYS_ON.has(w.id) && <Switch checked={w.on} aria-label={t(TITLE[w.id])} onChange={v => toggle(w.id, v)} />}
    </div>)}
  </div>
}

export default function HevyHome() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const trouble = useConnectionTrouble()
  const [editing, setEditing] = useState(false)
  const [stored, setStored] = useState(readHome)
  const widgets = homeWidgets(stored, S)
  // Functional, so two taps before a re-render both land (each builds on the other's result).
  const setWidgets = fn => setStored(prev => {
    const next = fn(homeWidgets(prev, useStore.getState().S))
    writeHome(next)
    return storedLayout(next)
  })
  return <div className="narrow hv-home">
    <div className="hdr">
      <div><h1>{user ? t('Hi {0}', user.name) : t('Home')}</h1>
        <div className="sub">{new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <div className="hdr-actions">
        <button type="button" className="plan-textbtn" aria-pressed={editing} onClick={() => setEditing(e => !e)}>{editing ? t('Done') : t('Edit Home')}</button>
        <button className="iconbtn" onClick={() => nav('/settings')} aria-label={trouble ? t('Settings') + ', ' + t('Connection problem') : t('Settings')}>
          <Icon name="gear" />{trouble && <span className="tab-dot" aria-hidden="true" />}</button>
      </div>
    </div>
    {editing ? <>
      <p className="sect-f">{t('Drag to reorder. Switch a widget off to hide it.')}</p>
      <EditHome widgets={widgets} setWidgets={setWidgets} />
    </> : widgets.filter(w => w.on).map(w => <Widget key={w.id} id={w.id} S={S} />)}
  </div>
}
