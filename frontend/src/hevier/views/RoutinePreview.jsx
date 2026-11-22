// The routine's page is its next session's plan (hevier/DECISIONS.md D128, after D37): every set with
// last time on the left and beside it what the workout will open with, warm-ups included, built by
// upstream's own start (hevier/lib/next-plan.js). A tap on a weight or reps plans it for the next
// session only (components/PlanKeypad.jsx); the routine itself changes in the editor, one tap away.
import { Fragment, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exOr } from '../../lib/exercises.js'
import { exCount, fmtNum, todayISO, exerciseNameText } from '../../lib/format.js'
import { fmtDate } from '../lib/dates.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { supersetUnits, isBw } from '../../lib/history.js'
import { supersetMeta } from '../../lib/superset-meta.js'
import { speedUnitOf } from '../../lib/speed.js'
import { shownWeight, exUnitOf } from '../../lib/ex-unit.js'
import { mapSetWeights } from '../../lib/units.js'
import { isSideSet } from '../../lib/workout-model.js'
import { loadOfRoutine, rankOf, MUSCLE_NAME } from '../../lib/muscles.js'
import { startFlow, exerciseDetailSheet } from '../../sheets.jsx'
import { Thumb } from '../../components/Media.jsx'
import BodyMap from '../../components/BodyMap.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import PlanKeypad, { fieldWords, shownOf } from '../components/PlanKeypad.jsx'
import { restTimerText, durationWords } from '../lib/elapsed.js'
import { usualLength } from '../lib/routine-length.js'
import { workCount } from '../lib/routine-table.js'
import { folderOf } from '../lib/routine-folders.js'
import { nextPlanned } from '../lib/next-planned.js'
import { nextSession, planFields, lastText } from '../lib/next-plan.js'
import { setText } from '../lib/set-text.js'
import { isHoldRow } from '../lib/hold-set.js'
import { workNumberOf } from '../lib/routine-holds.js'
import { gymName, brandDefault, isCable, cableDefault, cableText } from '../lib/gym-labels.js'
import { startGym } from '../lib/routine-brand.js'
import { shareRoutineSheet } from '../../components/RoutineShare.jsx'
import { progressionOn } from '../lib/plain-routine.js'

export const previewPath = id => '/plan/r/' + id + '/view'

function PlanExercise({ r, x, units, S, gym, fields, onPlan, note }) {
  const e = r.ex[x.idx]
  const ex = exOr(x.id)
  const { cfg } = x
  const speedUnit = speedUnitOf(S)
  const show = w => shownWeight(S, x.id, w)
  const unit = exUnitOf(S, x.id)
  // The brand (D28) and cable setup (D43) last time is read on, at the gym the session starts at.
  const label = [brandDefault(S, x.id, gym), isCable(x.id) && cableText(cableDefault(S, x.id, gym))].filter(Boolean).join(' · ')
  const unit2 = units.find(u => u.includes(x.idx))
  const meta = unit2?.length > 1 && unit2[0] === x.idx ? supersetMeta(r.ex, unit2) : null
  // An exercise's own rest only where it differs from the usual one, which the page names once at the top (the critique, 2026-11-20).
  const ownRest = e?.restSec != null && e.restSec !== S.restSec ? restTimerText(e.restSec, S.restSec, t('Off')) : null
  const num = (f, pre = '') => {
    // A weight of nothing reads "–", as the workout's grey KG does, not "0".
    const none = f.field === 'w' && !(shownOf(S, f) > 0)
    const text = none ? '–' : fmtNum(shownOf(S, f))
    // Said "no weight" in the place of "Weight", not "Weight – kg" (the eighth audit, 2026-11-22).
    const words = fieldWords(f)
    const said = none ? words.slice(0, words.lastIndexOf(t('Weight'))) + t('no weight') : words + ' ' + text + (f.field === 'w' ? ' ' + unit : '')
    return <button type="button" className={'hv-np-num' + (f.field === 'w' ? ' w' : '') + (f.planned ? ' chg' : '') + (none ? ' none' : '')} onClick={() => onPlan(f.id)}
      aria-label={said + (f.planned ? ', ' + t('planned') : '')}>{pre}{text}</button>
  }
  const field = (set, side, f) => fields.get([x.key, set.key, side || '', f].join('|'))
  // A set's lines: last time, then what opens, its weight and reps as buttons when it can be planned.
  const lines = set => {
    const [row] = set.rows
    if (set.plannable) return (isSideSet(row) ? ['L', 'R'] : [null]).map(side => ({
      side, last: lastText(set.last[0], { cfg, side, speedUnit, show, unit }),
      // An added weight's "+" only once one is planned: before a "–" it read as an add button (the eighth critique, 2026-11-22).
      next: <>{num(field(set, side, 'w'), isBw(cfg) && shownOf(S, field(set, side, 'w')) > 0 ? '+' : '')}{shownOf(S, field(set, side, 'w')) > 0 && ' ' + unit} × {num(field(set, side, 'r'))}</>,
    }))
    const pair = set.rows.length > 1
    return set.rows.map((s, i) => {
      const side = pair ? (i ? 'R' : 'L') : null
      return { side, last: lastText(set.last[i], { cfg, side, speedUnit, show, unit }), next: <span className="hv-np-ro">{setText(x.id, mapSetWeights(s, show), cfg, speedUnit, unit)}</span> }
    })
  }
  // W and F said as words, as Workout detail does (the fresh audit, 2026-11-21). A timed hold,
  // planned or carried over from last time, reads H and the other sets count on (D5, D146).
  const held = set => set.kind === 'work' && isHoldRow(set.rows[0])
  const mark = set => (set.kind === 'warm' ? <span className="hv-w" role="img" aria-label={t('Warm-up')}>W</span>
    : held(set) ? <span className="hv-h" role="img" aria-label={t('Hold')}>{t('H')}</span>
    : set.rows[0].failure ? <span className="hv-f" role="img" aria-label={t('Failure set')}>F</span>
    : workNumberOf(x.sets, set))
  // No weight last time reads "× 8" and is said "8 reps" (the ninth audit, 2026-11-22).
  const repsSaid = text => (m => (m ? <><span aria-hidden="true">{text}</span><span className="hv-sr">{tn('{0} rep', '{0} reps', Number(m[1]))}</span></> : text))(/^× (\d+)$/.exec(text))
  // With auto warm-ups on (D69) the warm-ups ramp to the work weight, not last time's (the tenth critique, 2026-11-22).
  const ramps = progressionOn(r)
  const lastWarm = ramps ? x.sets.findLastIndex(set => set.kind === 'warm') : -1
  const sideMark = side => side && <span className="hv-np-side" role="img" aria-label={side === 'L' ? t('Left') : t('Right')}>{side}</span>
  return <div className={'hv-ex' + (e?.sg ? ' hv-in-ss' : '')}>
    {meta && <div className="hv-ss"><span className="hv-sspill"><Icon name="link" />{meta.name || t('Superset')}</span>
      {meta.rest > 0 && <span className="hv-sub">{t('{0} rest', restTimerText(meta.rest, 0, ''))}</span>}</div>}
    <div className="hv-exhd">
      <button type="button" className="hv-thumb" aria-label={t('How to do it') + ', ' + exerciseNameText(ex)} onClick={() => exerciseDetailSheet(ex)}><Thumb ex={ex} /></button>
      <span role="heading" aria-level="2" className="hv-namehd"><button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => exerciseDetailSheet(ex)}>{exerciseNameFor(ex)}</button></span>
      {label && <span className="hv-chip hv-np-label">{label}</span>}
    </div>
    {e?.note && <p className="hv-notes">{e.note}</p>}
    {ownRest && <div className="hv-rest hv-rv-rest"><Icon name="timer" />{t('Rest Timer: {0}', ownRest)}</div>}
    <div className="hv-np-tbl">
    <div className="hv-np-row hv-np-head" aria-hidden="true"><span>{t('SET')}</span><span>{t('LAST TIME')}</span><span>{t('NEXT')}</span></div>
    {x.sets.map((set, n) => {
      const ls = lines(set)
      return <Fragment key={set.key}><div className="hv-np-row">
        <span className="hv-set">{mark(set)}</span>
        {/* The column head is hidden, so each cell names its column (the fifth audit, 2026-11-21). */}
        <span className="hv-np-last">{ls.map((l, i) => <span key={i}>{i === 0 && <span className="hv-sr">{t('Last time')}: </span>}{sideMark(l.side)}{repsSaid(l.last)}</span>)}</span>
        <span className="hv-np-next">{ls.map((l, i) => <span key={i}>{i === 0 && <span className="hv-sr">{t('Next')}: </span>}{sideMark(l.side)}{l.next}</span>)}</span>
      </div>{n === lastWarm && <p className="hv-cap hv-np-warmcap">{t('Auto warm-up, ramps to the work weight')}</p>}</Fragment>
    })}
    </div>
    {note && <p className="hv-np-note"><b>{t('Planned for next time.')}</b> {ramps ? t('The routine is not changed.') : t('The routine is not changed. Warm-ups stay as last time until you change them.')}</p>}
  </div>
}

export default function RoutinePreview() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const r = S.routines.find(x => x.id === id)
  useEffect(() => { if (!r) nav('/routines', { replace: true }) }, [!!r])
  // Upstream's start plan, once per copy of S, not on every redraw (the fresh audit, 2026-11-21).
  const session = useMemo(() => (r ? nextSession(S, r.id) : null), [S, id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return null
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/routines'))
  const units = supersetUnits(r.ex)
  const load = r.ex.length ? loadOfRoutine(r) : null
  const sets = r.ex.reduce((n, e) => n + workCount(e), 0)
  const usual = usualLength(S, r)
  const fields = new Map(planFields(session).map(f => [f.id, f]))
  // The note that the routine is not changed, under the first exercise with a plan.
  const noted = session.find(x => x.sets.some(s => s.plan))?.key
  const next = nextPlanned(S, todayISO())
  const when = next?.ids.includes(r.id) ? fmtDate(next.iso, true) : null
  const gym = startGym(S)
  const plan = fid => {
    if (!useStore.getState().S.hvPlanTapSeen) useStore.getState().update(s => { s.hvPlanTapSeen = true })
    useUI.getState().openSheet(close => <PlanKeypad rid={r.id} start={fid} close={close} />)
  }
  // A session already open is resumed, as the Workout tab's own Start does (upstream's startFlow).
  const start = () => (S.active ? nav('/workout') : startFlow([r.id]))
  const startBtn = <button type="button" className="btn primary hv-rv-start" disabled={!r.ex.length} onClick={start}>
    {S.active ? t('Resume') : t('Start')}
  </button>
  return <div className="hv-routine hv-rview">
    <PageBar title={r.name} onBack={back}>
      {/* D37's 1.4.4 note: upstream's Share a routine, a link a friend taps to add it. */}
      <button type="button" className="iconbtn" aria-label={t('Share with a friend')} disabled={!r.ex.length} onClick={() => shareRoutineSheet(r)}><Icon name="share" /></button>
      <button type="button" className="hv-link hv-rv-edit" onClick={() => nav('/plan/r/' + r.id)} aria-label={t('Edit routine')}>{t('Edit')}</button>
    </PageBar>
    <p className="hv-cap hv-rv-when">{[when ? t('Next') : t('Next session'), when, usual && t('about {0}', durationWords(usual))].filter(Boolean).join(' · ')}</p>
    <div className="hv-chips hv-rv-chips">
      {gym && <span className="hv-chip">{gymName(S, gym)}</span>}
      {S.restSec > 0 && <span className="hv-chip hv-rv-usual"><Icon name="timer" />{t('{0} rest', restTimerText(S.restSec, 0, ''))}</span>}
      <span className="hv-chip hv-rv-count">{[folderOf(r), exCount(r.ex.length), r.ex.length ? t('{0} sets', sets) : null].filter(Boolean).join(' · ')}</span>
    </div>
    {startBtn}
    {/* D128's tap, said until it is first used, as Lifts' totals hint is (S.hvPlanTapSeen; the sixth audit, 2026-11-22). */}
    {!S.hvPlanTapSeen && fields.size > 0 && <p className="small dim hv-rv-hint">{t('Tap a number under NEXT to change it for the next session only.')}</p>}
    <div className="hv-units">
      {units.map(u => <section key={u.map(i => r.ex[i].id).join('-') + ':' + u[0]} className={'hv-unit' + (u.length > 1 ? ' ss' : '')}>
        {u.map(i => session[i] && <PlanExercise key={i + ':' + r.ex[i].id} r={r} x={session[i]} units={units} S={S} gym={gym}
          fields={fields} onPlan={plan} note={session[i].key === noted} />)}
      </section>)}
    </div>
    {load && <div className="card hv-rmap">
      <h2>{t('What this session hits')}</h2>
      {/* Hidden from TalkBack: the muscle names under it say what it draws (the eighth audit, 2026-11-22). */}
      <div aria-hidden="true"><BodyMap load={load} body={S.body} /></div>
      {/* Plain text, not upstream's filled chips, which read as buttons (the ninth critique, 2026-11-22). */}
      <p className="hv-rmap-names">{rankOf(load).worked.slice(0, 6).map(m => t(MUSCLE_NAME[m])).join(' · ')}</p>
    </div>}
    {/* Start again at the end, reached after reading the plan (the critique, 2026-11-20). */}
    {r.ex.length > 0 && startBtn}
    <div className="workout-end-spacer" />
  </div>
}
