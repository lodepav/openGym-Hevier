// Hevy's routine page (hevier/DECISIONS.md D37): a tap on a routine on the Workout tab opens what it
// holds before it starts — the exercises with their sets as the routine editor's table draws them
// (D15, hevier/lib/routine-table.js), read-only, Start Routine, and the muscles it hits. Editing is
// one tap away in the bar. Nothing is stored; starting is upstream's startFlow.
import { progressionOn } from '../lib/plain-routine.js'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { exOr } from '../../lib/exercises.js'
import { fmtNum, exCount } from '../../lib/format.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { supersetUnits, isBw } from '../../lib/history.js'
import { supersetMeta } from '../../lib/superset-meta.js'
import { speedUnitOf, toSpeed } from '../../lib/speed.js'
import { loadOfRoutine, rankOf, MUSCLE_NAME } from '../../lib/muscles.js'
import { startFlow, exerciseDetailSheet } from '../../sheets.jsx'
import { Thumb } from '../../components/Media.jsx'
import BodyMap from '../../components/BodyMap.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import { restTimerText } from '../lib/elapsed.js'
import { tableShape, routineRows, workCount } from '../lib/routine-table.js'
import { folderOf } from '../lib/routine-folders.js'

export const previewPath = id => '/plan/r/' + id + '/view'

function PreviewExercise({ r, i, units, S }) {
  const e = r.ex[i]
  const ex = exOr(e.id)
  const shape = tableShape(e, r)
  const speedUnit = speedUnitOf(S)
  const cols = shape.mode === 'cardio'
    ? [{ f: 'min', hd: t('MIN') }, { f: 'speed', hd: speedUnit === 'mph' ? t('MPH') : t('KM/H'), view: v => fmtNum(toSpeed(v, speedUnit)) }]
    : [{ f: 'w', hd: (isBw(e) ? '+' : '') + S.unit.toUpperCase() },
      shape.mode === 'time' ? { f: 'sec', hd: t('SEC') } : { f: 'reps', hd: shape.ranged ? t('REP RANGE') : t('REPS') }]
  // The editor's cells (RoutineEditHevy.jsx), as text: warm-ups' weights are worked out at the start.
  const cell = (row, c) => {
    if (row.kind === 'warm') return <span key={c.f} className="hv-rt-auto">{c.f === 'w' && progressionOn(r) ? t('Auto') : '–'}</span>
    if (c.f === 'w' && row.fixed) return <span key={c.f} className="hv-rt-fixed">{fmtNum(row.w)}</span>
    const v = c.f === 'reps' ? (row.max ? t('Max') : shape.ranged ? `${row.repsMin}–${row.reps}` : row.reps)
      : c.f === 'w' ? (row.w ? fmtNum(row.w) : '–') : c.view && row[c.f] != null ? c.view(row[c.f]) : row[c.f]
    return <span key={c.f} className="hv-rv-v">{v ?? '–'}</span>
  }
  const mark = row => (row.kind === 'warm' ? <span className="hv-w">W</span> : row.failure ? <span className="hv-f">F</span> : row.k + 1)
  const grid = { '--nc': cols.length }
  const unit = units.find(u => u.includes(i))
  const meta = unit?.length > 1 && unit[0] === i ? supersetMeta(r.ex, unit) : null
  const rest = restTimerText(e.restSec, S.restSec, t('Off'))
  return <div className={'hv-ex' + (e.sg ? ' hv-in-ss' : '')}>
    {meta && <div className="hv-ss"><span className="hv-sspill"><Icon name="link" />{meta.name || t('Superset')}</span>
      {meta.rest > 0 && <span className="hv-sub">{t('{0} rest', restTimerText(meta.rest, 0, ''))}</span>}</div>}
    <div className="hv-exhd">
      <button type="button" className="hv-thumb" aria-label={t('How to do it')} onClick={() => exerciseDetailSheet(ex)}><Thumb ex={ex} /></button>
      <button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => exerciseDetailSheet(ex)}>{exerciseNameFor(ex)}</button>
    </div>
    {e.note && <p className="hv-notes">{e.note}</p>}
    <div className="hv-rest hv-rv-rest"><Icon name="timer" />{t('Rest Timer: {0}', rest)}</div>
    <div className="hv-rt-row hv-rt-head" style={grid} aria-hidden="true">
      <span>{t('SET')}</span>{cols.map(c => <span key={c.f}>{c.hd}</span>)}
    </div>
    {routineRows(e, r, S.unit).map((row, n) => <div key={n} className="hv-rt-row" style={grid}>
      <span className="hv-set">{mark(row)}</span>
      {cols.map(c => cell(row, c))}
    </div>)}
  </div>
}

export default function RoutinePreview() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const r = S.routines.find(x => x.id === id)
  useEffect(() => { if (!r) nav('/workout', { replace: true }) }, [!!r])
  if (!r) return null
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/routines'))
  const units = supersetUnits(r.ex)
  const load = r.ex.length ? loadOfRoutine(r) : null
  const sets = r.ex.reduce((n, e) => n + workCount(e), 0)
  // A session already open is resumed, as the Workout tab's own Start does (upstream's startFlow).
  const start = () => (S.active ? nav('/workout') : startFlow([r.id]))
  return <div className="hv-routine hv-rview">
    <PageBar title={t('Routine')} onBack={back}>
      <button type="button" className="iconbtn" aria-label={t('Edit routine')} onClick={() => nav('/plan/r/' + r.id)}><Icon name="pencil" /></button>
    </PageBar>
    <h2 className="hv-rv-name">{r.name}</h2>
    <p className="hv-sub">{[folderOf(r), exCount(r.ex.length), r.ex.length ? t('{0} sets', sets) : null].filter(Boolean).join(' · ')}</p>
    <button type="button" className="btn primary hv-rv-start" disabled={!r.ex.length} onClick={start}>
      {S.active ? t('Resume') : t('Start Routine')}
    </button>
    <h4 className="sec">{t('Exercises')}</h4>
    <div className="hv-units">
      {units.map(u => <section key={u.map(i => r.ex[i].id).join('-') + ':' + u[0]} className={'hv-unit' + (u.length > 1 ? ' ss' : '')}>
        {u.map(i => <PreviewExercise key={i + ':' + r.ex[i].id} r={r} i={i} units={units} S={S} />)}
      </section>)}
    </div>
    {load && <div className="card hv-rmap">
      <h2>{t('What this session hits')}</h2>
      <BodyMap load={load} body={S.body} />
      <div className="mchips">{rankOf(load).worked.slice(0, 6).map(m => <span key={m} className="mchip">{t(MUSCLE_NAME[m])}</span>)}</div>
    </div>}
    <div className="workout-end-spacer" />
  </div>
}
