// The Lifts tab (hevier/DECISIONS.md D126, D135): every exercise you have trained, each with its last
// set and under it the best (a record the last session set in yellow), the most recently trained
// first or by muscle group, a choice kept in S.hvLiftsBy. A row opens the exercise's details the way
// the library's rows do (seam S10). The list is hevier/lib/lifts-list.js.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { exOr, searchExercises } from '../../lib/exercises.js'
import { isBw } from '../../lib/history.js'
import { fmtDaysAgo, todayISO } from '../../lib/format.js'
import { speedUnitOf } from '../../lib/speed.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import { Segmented } from '../../components/ui.jsx'
import { Thumb } from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import { SettingsGear } from './Today.jsx'
import { liftRows, liftSections, liftsBy } from '../lib/lifts-list.js'
import { mainMuscleOf } from '../lib/main-muscle.js'
import { brandsByExercise, brandMatches } from '../lib/exercise-picker.js'
import { previousCell } from '../lib/set-text.js'
import { exUnitOf, shown } from '../lib/ex-unit.js'
import { partOn } from '../lib/module-parts.js'
import { isOn } from '../../lib/modules.js'
import { fieldSig } from '../lib/store-watch.js'

function LiftRow({ r, S, today }) {
  const ex = exOr(r.id)
  const muscle = mainMuscleOf(ex)
  // A set as the workout's PREVIOUS column writes it, without the unit, in the exercise's own (D41),
  // without the effort, a per-side set as two lines, L over R.
  const text = set => previousCell(set, { mode: r.mode, bw: isBw({ id: r.id }), unit: '', id: r.id, target: r.target,
    show: w => shown(w, S.unit, exUnitOf(S, r.id)), speedUnit: speedUnitOf(S) })
  return <button type="button" className="item hv-lift" onClick={() => exerciseDetailSheet(ex)}>
    <span className="hv-thumb"><Thumb ex={ex} /></span>
    <span className="grow">
      <span className={'tt ' + exerciseNameClass(ex)}>{exerciseNameFor(ex)}</span>
      <span className="ss">{[muscle && t(muscle), r.d && fmtDaysAgo(r.d, today)].filter(Boolean).join(' · ')}</span>
    </span>
    {r.last && <span className="hv-lift-r">
      <b>{text(r.last)}</b>
      {r.newBest ? <small className="hv-pr"><Icon name="trophy" />{t('New best')}</small>
        : r.best && <small>{t('best {0}', text(r.best))}</small>}
    </span>}
  </button>
}

export default function Lifts() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [q, setQ] = useState('')
  const today = todayISO()
  const by = liftsBy(S)
  // Records are part of a row, so the list follows the log and what decides a record (records.js's key).
  const rows = useMemo(() => liftRows(S), [fieldSig(S, 'workouts'), fieldSig(S, 'hvModuleParts'), fieldSig(S, 'modules')]) // eslint-disable-line react-hooks/exhaustive-deps
  // By name, and by the brand it was logged on (D36), as the picker searches.
  const trained = rows.map(r => exOr(r.id))
  const keep = q.trim() ? new Set([...searchExercises(trained, q),
    ...(partOn(S, 'hvGyms', 'brands') ? brandMatches(trained, brandsByExercise(S), q, searchExercises).map(m => m.ex) : [])].map(e => e.id)) : null
  const sections = liftSections(rows, { by, keep, muscleOf: id => mainMuscleOf(exOr(id)) })
  const chips = [
    partOn(S, 'hvStats', 'levels') && isOn(S, 'strength') && ['Strength levels', '/strength'],
    partOn(S, 'hvStats', 'trends') && ['Trends', '/lift-trends'],
    partOn(S, 'hvStats', 'time') && ['Exercise time', '/exercise-time'],
  ].filter(Boolean)
  return <div className="narrow hv-lifts">
    <PageBar title={t('Lifts')}><SettingsGear /></PageBar>
    <div className="picker-search"><div className="search-row"><div className={'search' + (q ? ' has-clear' : '')}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search exercises')} aria-label={t('Search exercises')} value={q} onChange={e => setQ(e.target.value)} />
      {q && <button type="button" className="clear" onClick={() => setQ('')} aria-label={t('Clear')}><Icon name="xmark" /></button>}</div></div></div>
    <Segmented className="hv-lifts-by" value={by} onChange={v => update(s => { s.hvLiftsBy = v })}
      options={[{ value: 'recent', label: t('Recent') }, { value: 'muscle', label: t('By muscle') }]} />
    {chips.length > 0 && <div className="hv-chips">{chips.map(([label, to]) => <button key={to} type="button" className="hv-chip" onClick={() => nav(to)}>{t(label)}</button>)}</div>}
    {sections.map(sec => <section key={sec.key}>
      <h4 className="sec">{t(sec.label)}</h4>
      <div className="list">{sec.rows.map(r => <LiftRow key={r.id} r={r} S={S} today={today} />)}</div>
    </section>)}
    {!rows.length && <div className="empty"><div className="ico"><Icon name="dumbbell" /></div>{t('No exercises trained yet. They show here after your first workout.')}</div>}
    {rows.length > 0 && !sections.length && <div className="muted small hv-lifts-none">{t('No exercise you trained matches “{0}”.', q.trim())}</div>}
    <button type="button" className="hv-link hv-lifts-all" onClick={() => nav('/library')}>{t('All exercises · Create')}<Icon name="chevronRight" /></button>
  </div>
}
