// The Lifts tab (hevier/DECISIONS.md D126, D135, D140): every exercise you have trained, each with
// where it is going over a window (12 weeks, the current OpenBite phase, or all, kept in
// S.hvLiftsWindow): the change in its estimated 1RM, a chart of it, and beside the chart its last set
// and under it the best (a record the last session set in yellow). Totals of rising, holding and
// falling lifts filter the list, a hint saying so until the first tap on one (S.hvLiftsTapSeen). The most recently trained first or by muscle group, a choice kept
// in S.hvLiftsBy; under By muscle each group's header carries its change and how many of its lifts
// are rising, an isolation lift counting half (D141). A row opens the exercise's details the way the library's rows do (seam S10). The
// list is hevier/lib/lifts-list.js, the progress hevier/lib/lift-progress.js.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { exOr, searchExercises } from '../../lib/exercises.js'
import { isBw } from '../../lib/history.js'
import { todayISO } from '../../lib/format.js'
import { fmtDate, fmtDaysAgo } from '../lib/dates.js'
import { speedUnitOf } from '../../lib/speed.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import { Segmented } from '../../components/ui.jsx'
import { Thumb } from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import { SettingsGear } from './Today.jsx'
import { liftRows, liftSections, liftsBy, liftSetText } from '../lib/lifts-list.js'
import { liftsWindow, currentPhase, windowFrom, liftProgress, progressTotals, shownPct, groupProgress, chartRange } from '../lib/lift-progress.js'
import { isCompound } from '../lib/compound.js'
import { PHASE_LABEL } from '../lib/shared-phase.js'
import { dayNo, muscleGroup } from '../lib/strength-signal.js'
import { mainMuscleOf, muscleText } from '../lib/main-muscle.js'
import { brandsByExercise, brandMatches } from '../lib/exercise-picker.js'
import { labelText } from '../lib/gym-labels.js'
import { exUnitOf, shown } from '../lib/ex-unit.js'
import { signed } from '../lib/delta.js'
import { mapSetWeights } from '../../lib/units.js'
import { partOn } from '../lib/module-parts.js'
import { isOn } from '../../lib/modules.js'
import { fieldSig } from '../lib/store-watch.js'

const STATES = ['rising', 'holding', 'falling']
const WORD = { rising: 'Rising', holding: 'Holding', falling: 'Falling' }
const SHOWING = {
  rising: 'Showing rising lifts · tap Rising again for all',
  holding: 'Showing holding lifts · tap Holding again for all',
  falling: 'Showing falling lifts · tap Falling again for all',
}
const ARROW = { rising: '↑', holding: '→', falling: '↓' }
// Spoken after the scale: the window the chart covers.
const SPAN = {
  '12w': 'estimated 1RM {0} to {1} {2} over 12 weeks',
  phase: 'estimated 1RM {0} to {1} {2} in this phase',
  all: 'estimated 1RM {0} to {1} {2} over all your workouts',
}
// The same for a flat line, whose lowest and highest are one number.
const SPAN_FLAT = {
  '12w': 'estimated 1RM {0} {1} over 12 weeks',
  phase: 'estimated 1RM {0} {1} in this phase',
  all: 'estimated 1RM {0} {1} over all your workouts',
}
// One colour per machine label, the most recent first (D82); shortcut: a fourth label is not drawn, until someone logs one lift on four.
const LINE_TONES = ['var(--acc)', 'var(--yellow)', 'var(--label-2)']

const pctText = pct => (pct == null ? null : (signed(pct)?.text ?? '0') + '%')
const pctSpoken = pct => (pct == null ? null : pct > 0 ? t('up {0} %', pct) : pct < 0 ? t('down {0} %', -pct) : t('no change'))

// The estimated 1RM as a line per label over one date range and one scale (chartRange), 32 px tall at any width:
// the strokes and the end dots keep their size however wide the line is stretched.
function LiftChart({ lines, tones }) {
  const all = lines.flatMap(l => l.points)
  const { lo, hi } = chartRange(all.map(p => p.y))
  const days = all.map(p => dayNo(p.d))
  const d0 = Math.min(...days), d1 = Math.max(...days)
  const X = d => (d1 > d0 ? (dayNo(d) - d0) / (d1 - d0) * 100 : 100)
  const Y = y => 4 + (hi - y) / (hi - lo) * 24
  const xy = p => X(p.d).toFixed(2) + ' ' + Y(p.y).toFixed(2)
  const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + xy(p)).join(' ')
  const one = lines.length === 1 && lines[0].points
  return <svg className="hv-lift-chart" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    {[4, 16, 28].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} className="hv-lift-grid" vectorEffect="non-scaling-stroke" />)}
    {one && one.length > 1 && <path d={path(one) + ` L${X(one.at(-1).d)} 28 L${X(one[0].d)} 28 Z`} fill={tones[0]} fillOpacity=".12" stroke="none" />}
    {lines.map((l, k) => <g key={l.key} stroke={tones[k]} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {l.points.length > 1 && <path d={path(l.points)} strokeWidth={lines.length > 1 ? 2 : 2.25} vectorEffect="non-scaling-stroke" />}
      <path d={'M' + xy(l.points.at(-1)) + ' L' + xy(l.points.at(-1))} strokeWidth="7" vectorEffect="non-scaling-stroke" />
    </g>)}
  </svg>
}

function LiftRow({ r, S, today, p, win, half }) {
  const ex = exOr(r.id)
  const muscle = mainMuscleOf(ex)
  const unit = exUnitOf(S, r.id)
  // A set as the workout's PREVIOUS column writes it, without the unit, in the exercise's own (D41),
  // without the effort, a per-side set as two lines, L over R.
  // The set is converted whole, so a per-side set, a hold and a carry follow the unit too. No weight reads "12 reps".
  const text = set => liftSetText(mapSetWeights(set, w => shown(w, S.unit, unit)),
    { mode: r.mode, bw: isBw({ id: r.id }), unit: '', id: r.id, target: r.target, speedUnit: speedUnitOf(S) })
  const name = exerciseNameFor(ex)
  const sub = [muscle && muscleText(muscle), r.d && fmtDaysAgo(r.d, today)].filter(Boolean).join(' · ')
  const lines = (p?.lines || []).slice(0, LINE_TONES.length)
  const tones = lines.length > 1 ? LINE_TONES : [p?.state === 'rising' ? 'var(--acc)' : p?.state === 'falling' ? 'var(--hv-fail,var(--red))' : 'var(--label-2)']
  const pct = shownPct(p?.state, p?.pct)
  const change = [ARROW[p?.state], pctText(pct)].filter(Boolean).join(' ')
  const ys = lines.flatMap(l => l.points.map(x => x.y))
  // The labels name the drawn range's edges (chartRange may pad a small change), so they sit on the outer grid lines;
  // a flat line is drawn mid-height, so its one number sits there.
  const span = ys.length ? (Math.min(...ys) === Math.max(...ys) ? { lo: ys[0], hi: ys[0] } : chartRange(ys)) : null
  // The scale stays in the profile's unit, which the page's hint names once, whatever the lift is shown in (the critique, 2026-11-21).
  const scale = span ? [span.lo, span.hi].map(Math.round) : null
  const flat = scale && scale[0] === scale[1]
  // Spoken: what the lift itself did, not the padded edges.
  const said = ys.length ? [Math.min(...ys), Math.max(...ys)].map(Math.round) : null
  const brand = l => labelText({ brand: l.key.split('|')[0], cable: l.key.split('|')[1] }, t)
  // A record of weeks ago says when it was set, not "New" (the critique, 2026-11-20).
  const bestWord = r.newBest && (dayNo(today) - dayNo(r.d) <= 14 ? t('New best')
    : t('PR: {0}', fmtDate(r.d, false, r.d.slice(0, 4) !== today.slice(0, 4))))
  const lastBest = r.last && <span className="hv-lift-r">
    <b>{text(r.last)}</b>
    {r.newBest ? <small className="hv-pr"><Icon name="trophy" />{bestWord}</small>
      : r.best && <small>{t('best {0}', text(r.best))}</small>}
  </span>
  const spoken = s => s.replace(/\n/g, ', ')
  const label = [
    name, sub,
    said && (said[0] === said[1] ? t(SPAN_FLAT[win], said[0], S.unit) : t(SPAN[win], said[0], said[1], S.unit)),
    p?.state && t(WORD[p.state]),
    pctSpoken(pct),
    ...(lines.length > 1 ? lines.map(l => [brand(l), pctSpoken(shownPct(l.state, l.pct))].filter(Boolean).join(' ')) : []),
    r.last && t('last {0}', spoken(text(r.last))),
    r.newBest ? bestWord : r.best && t('best {0}', spoken(text(r.best))),
    half && t('isolation, counts half in its group'),
  ].filter(Boolean).join(', ')
  return <button type="button" className="item hv-lift" aria-label={label} onClick={() => exerciseDetailSheet(ex)}>
    <span className="hv-thumb"><Thumb ex={ex} /></span>
    <span className="grow">
      <span className="hv-lift-hd">
        <span className="hv-lift-nm">
          <span className={'tt ' + exerciseNameClass(ex)}>{name}</span>
          {half && <span className="hv-lift-half" aria-hidden="true">½</span>}
          {sub && <span className="ss">{sub}</span>}
        </span>
        {change && !scale && <span className={'hv-lift-ch ' + (p.state || '')}>{change}</span>}
        {!scale && lastBest}
      </span>
      {scale && <span className="hv-lift-mid">
        <span className={'hv-lift-scale' + (flat ? ' flat' : '')}>{flat ? <span>{scale[0]}</span> : <><span>{scale[1]}</span><span>{scale[0]}</span></>}</span>
        <LiftChart lines={lines} tones={tones} />
        {/* The change sits beside the line it describes. */}
        {change && <span className={'hv-lift-ch ' + (p.state || '')}>{change}</span>}
        {lastBest}
      </span>}
      {lines.length > 1 && <span className="hv-lift-legend">{lines.map((l, k) => <span key={l.key}>
        <i style={{ background: tones[k] }} />{brand(l)}{shownPct(l.state, l.pct) != null && ' ' + pctText(shownPct(l.state, l.pct))}
      </span>)}</span>}
    </span>
  </button>
}

// A muscle group's header (D141): its lifts' state as the rows draw theirs, the weighted change
// beside it unless it points the other way or the group holds (shownPct), and how many of its lifts are rising; no
// number until two lifts have a change.
function GroupHead({ label, ids, progress }) {
  const g = groupProgress(progress, ids)
  const state = g.pct == null ? null : g.state
  const pct = g.pct == null ? null : shownPct(state, g.pct)
  const count = g.pct != null && g.judged > 0 && t('{0} of {1} rising', g.rising, g.judged)
  // The lifts with a change in the window, not every lift the group has ever had; the group's own
  // number waits for two (the critique, 2026-11-21: plain words, not the rule).
  const none = g.pct == null && [g.changed === 1 ? t('1 lift changed') : g.changed ? t('{0} lifts changed', g.changed) : t('No lift changed')]
  const spoken = [label,
    ...(none || [pct != null ? pctSpoken(pct) : state && t(WORD[state])]),
    count && (g.judged === 1 ? t('{0} of 1 lift rising', g.rising) : t('{0} of {1} lifts rising', g.rising, g.judged)),
  ].filter(Boolean).join(', ')
  return <h2 className="sec hv-lifts-gh" aria-label={spoken}>
    <b>{label}</b>
    {(state || pct != null) && <span className={'hv-lift-ch ' + (state || '')}>{[ARROW[state], pctText(pct)].filter(Boolean).join(' ')}</span>}
    {count && <small>{count}</small>}
    {none && <small>{none.join(' · ')}</small>}
  </h2>
}

function weeksText(days) {
  if (days >= 7) { const w = Math.floor(days / 7); return w === 1 ? t('1 week') : t('{0} weeks', w) }
  return days === 1 ? t('1 day') : t('{0} days', days)
}

export default function Lifts() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState(null)
  const today = todayISO()
  const by = liftsBy(S)
  const log = fieldSig(S, 'workouts')
  // Records are part of a row, so the list follows the log and what decides a record (records.js's key).
  const rows = useMemo(() => liftRows(S), [log, fieldSig(S, 'hvModuleParts'), fieldSig(S, 'modules')]) // eslint-disable-line react-hooks/exhaustive-deps
  const phase = useMemo(() => (partOn(S, 'integrations', 'openbite') ? currentPhase(S) : null), [log, fieldSig(S, 'hvModuleParts'), fieldSig(S, 'modules')]) // eslint-disable-line react-hooks/exhaustive-deps
  // A stored Phase reads as 12 weeks while there is no phase to show.
  const win = liftsWindow(S) === 'phase' && !phase ? '12w' : liftsWindow(S)
  const from = windowFrom(S, win, today)
  const progress = useMemo(() => liftProgress(S, { from }), [log, fieldSig(S, 'routines'), from]) // eslint-disable-line react-hooks/exhaustive-deps
  const totals = progressTotals(progress)
  // By name, and by the brand it was logged on (D36), as the picker searches.
  const trained = rows.map(r => exOr(r.id))
  let keep = q.trim() ? new Set([...searchExercises(trained, q),
    ...(partOn(S, 'hvGyms', 'brands') ? brandMatches(trained, brandsByExercise(S), q, searchExercises).map(m => m.ex) : [])].map(e => e.id)) : null
  if (filter) keep = new Set(rows.filter(r => progress.get(r.id)?.state === filter && (!keep || keep.has(r.id))).map(r => r.id))
  const sections = liftSections(rows, { by, keep, groupOf: id => muscleGroup(exOr(id)) })
  // How to filter shows until the first tap on a total (S.hvLiftsTapSeen); what ½ means always shows under By muscle.
  const hint = [filter ? t(SHOWING[filter]) : !S.hvLiftsTapSeen && t('Tap a total to show only those lifts'),
    by === 'muscle' && t('½ counts half in its group'),
    // The charts' numbers named once for the page, in its unit for every lift (the critique, 2026-11-21).
    rows.some(r => progress.get(r.id)?.lines?.length) && t('Est. 1RM') + ' (' + S.unit + ')'].filter(Boolean).join(' · ')
  const ends = [
    partOn(S, 'hvStats', 'levels') && isOn(S, 'strength') && ['Strength levels', '/strength'],
  ].filter(Boolean)
  return <div className="narrow hv-lifts">
    <PageBar title={t('Lifts')}><SettingsGear /></PageBar>
    <div className="picker-search"><div className="search-row"><div className={'search' + (q ? ' has-clear' : '')}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search exercises')} aria-label={t('Search exercises')} value={q} onChange={e => setQ(e.target.value)} />
      {q && <button type="button" className="clear" onClick={() => setQ('')} aria-label={t('Clear')}><Icon name="xmark" /></button>}</div></div></div>
    {rows.length > 0 && <span id="hv-lifts-win-l" className="hv-sr">{t('Time window')}</span>}
    <div className="hv-lifts-ctl">
      <Segmented className="hv-lifts-by" value={by} onChange={v => update(s => { s.hvLiftsBy = v })}
        options={[{ value: 'recent', label: t('Recent') }, { value: 'muscle', label: t('By muscle') }]} />
      {rows.length > 0 && <Segmented className="hv-lifts-win" ariaLabelledby="hv-lifts-win-l" value={win} onChange={v => update(s => { s.hvLiftsWindow = v })}
        options={[{ value: '12w', label: t('12 weeks') }, phase && { value: 'phase', label: t('Phase') }, { value: 'all', label: t('All') }].filter(Boolean)} />}
    </div>
    {rows.length > 0 && <>
      {win === 'phase' && <div className="small dim hv-lifts-phase">
        {t('{0} since {1}', t(PHASE_LABEL[phase.phase]), fmtDate(phase.since))} · {weeksText(dayNo(today) - dayNo(phase.since))}
      </div>}
      <div className="hv-lifts-totals">{STATES.map(st => <button key={st} type="button" className={'hv-lifts-total ' + st + (filter === st ? ' on' : '')}
        aria-pressed={filter === st} onClick={() => { setFilter(f => (f === st ? null : st)); if (!S.hvLiftsTapSeen) update(s => { s.hvLiftsTapSeen = true }) }}
        aria-label={(totals[st] === 1 ? t('{0}, 1 lift', t(WORD[st])) : t('{0}, {1} lifts', t(WORD[st]), totals[st])) + (filter === st ? ', ' + t('filter on') : '')}>
        <b>{totals[st]}</b><small>{t(WORD[st])}</small>
      </button>)}</div>
      {hint && <div className="small dim hv-lifts-hint">{hint}</div>}
    </>}
    {sections.map(sec => <section key={sec.key}>
      {by === 'muscle' ? <GroupHead label={muscleText(sec.label)} ids={sec.ids} progress={progress} /> : <h2 className="sec">{t(sec.label)}</h2>}
      <div className="list hv-flat">{sec.rows.map(r => <LiftRow key={r.id} r={r} S={S} today={today} p={progress.get(r.id)} win={win}
        half={by === 'muscle' && !isCompound(exOr(r.id))} />)}</div>
    </section>)}
    {!rows.length && <div className="empty"><div className="ico"><Icon name="dumbbell" /></div>{t('No exercises trained yet. They show here after your first workout.')}</div>}
    {rows.length > 0 && !sections.length && q.trim() && <div className="muted small hv-lifts-none">{t('No exercise you trained matches “{0}”.', q.trim())}</div>}
    <div className="hv-lifts-ends">
      {ends.map(([label, to]) => <button key={to} type="button" className="hv-link hv-lifts-link" onClick={() => nav(to)}>{t(label)}<Icon name="chevronRight" /></button>)}
      <button type="button" className="hv-link hv-lifts-link hv-lifts-all" onClick={() => nav('/library')}>{t('All exercises · Create')}<Icon name="chevronRight" /></button>
    </div>
  </div>
}
