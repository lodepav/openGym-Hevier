// The routine's page is its next session's plan (hevier/DECISIONS.md D128, after D37): every set with
// last time on the left and beside it what the workout will open with, warm-ups included, built by
// upstream's own start (hevier/lib/next-plan.js). A tap on a weight or reps plans it for the next
// session only (components/PlanKeypad.jsx); the routine itself changes in the editor, one tap away.
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exOr } from '../../lib/exercises.js'
import { exCount, fmtNum, todayISO } from '../../lib/format.js'
import { fmtDate } from '../lib/dates.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
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
import { gymName, brandDefault, isCable, cableDefault, cableText } from '../lib/gym-labels.js'
import { startGym } from '../lib/routine-brand.js'
import { shareRoutineSheet } from '../../components/RoutineShare.jsx'

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
  const rest = restTimerText(e?.restSec, S.restSec, t('Off'))
  const num = f => {
    const text = fmtNum(shownOf(S, f))
    return <button type="button" className={'hv-np-num' + (f.planned ? ' chg' : '')} onClick={() => onPlan(f.id)}
      aria-label={fieldWords(f) + ' ' + text + (f.field === 'w' ? ' ' + unit : '') + (f.planned ? ', ' + t('planned') : '')}>{text}</button>
  }
  const field = (set, side, f) => fields.get([x.key, set.key, side || '', f].join('|'))
  // A set's lines: last time, then what opens, its weight and reps as buttons when it can be planned.
  const lines = set => {
    const [row] = set.rows
    if (set.plannable) return (isSideSet(row) ? ['L', 'R'] : [null]).map(side => ({
      side, last: lastText(set.last[0], { cfg, side, speedUnit, show, unit }),
      next: <>{isBw(cfg) && '+'}{num(field(set, side, 'w'))} {unit} × {num(field(set, side, 'r'))}</>,
    }))
    const pair = set.rows.length > 1
    return set.rows.map((s, i) => {
      const side = pair ? (i ? 'R' : 'L') : null
      return { side, last: lastText(set.last[i], { cfg, side, speedUnit, show, unit }), next: <span className="hv-np-ro">{setText(x.id, mapSetWeights(s, show), cfg, speedUnit, unit)}</span> }
    })
  }
  const mark = set => (set.kind === 'warm' ? <span className="hv-w">W</span> : set.rows[0].failure ? <span className="hv-f">F</span> : set.n + 1)
  const sideMark = side => side && <span className="hv-np-side" aria-label={side === 'L' ? t('Left') : t('Right')}>{side}</span>
  return <div className={'hv-ex' + (e?.sg ? ' hv-in-ss' : '')}>
    {meta && <div className="hv-ss"><span className="hv-sspill"><Icon name="link" />{meta.name || t('Superset')}</span>
      {meta.rest > 0 && <span className="hv-sub">{t('{0} rest', restTimerText(meta.rest, 0, ''))}</span>}</div>}
    <div className="hv-exhd">
      <button type="button" className="hv-thumb" aria-label={t('How to do it')} onClick={() => exerciseDetailSheet(ex)}><Thumb ex={ex} /></button>
      <button type="button" className={'hv-name ' + exerciseNameClass(ex)} onClick={() => exerciseDetailSheet(ex)}>{exerciseNameFor(ex)}</button>
      {label && <span className="hv-chip hv-np-label">{label}</span>}
    </div>
    {e?.note && <p className="hv-notes">{e.note}</p>}
    <div className="hv-rest hv-rv-rest"><Icon name="timer" />{t('Rest Timer: {0}', rest)}</div>
    <div className="hv-np-tbl">
    <div className="hv-np-row hv-np-head" aria-hidden="true"><span>{t('SET')}</span><span>{t('LAST TIME')}</span><span>{t('NEXT')}</span></div>
    {x.sets.map(set => {
      const ls = lines(set)
      return <div key={set.key} className="hv-np-row">
        <span className="hv-set">{mark(set)}</span>
        <span className="hv-np-last">{ls.map((l, i) => <span key={i}>{sideMark(l.side)}{l.last}</span>)}</span>
        <span className="hv-np-next">{ls.map((l, i) => <span key={i}>{sideMark(l.side)}{l.next}</span>)}</span>
      </div>
    })}
    </div>
    {note && <p className="hv-np-note"><b>{t('Planned for next time.')}</b> {t('The routine is not changed. Warm-ups stay as last time until you change them.')}</p>}
  </div>
}

export default function RoutinePreview() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const r = S.routines.find(x => x.id === id)
  useEffect(() => { if (!r) nav('/routines', { replace: true }) }, [!!r])
  if (!r) return null
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/routines'))
  const units = supersetUnits(r.ex)
  const load = r.ex.length ? loadOfRoutine(r) : null
  const sets = r.ex.reduce((n, e) => n + workCount(e), 0)
  const usual = usualLength(S, r)
  const session = nextSession(S, r.id)
  const fields = new Map(planFields(session).map(f => [f.id, f]))
  // The note that the routine is not changed, under the first exercise with a plan.
  const noted = session.find(x => x.sets.some(s => s.plan))?.key
  const next = nextPlanned(S, todayISO())
  const when = next?.ids.includes(r.id) ? fmtDate(next.iso, true) : null
  const gym = startGym(S)
  const plan = fid => useUI.getState().openSheet(close => <PlanKeypad rid={r.id} start={fid} close={close} />)
  // A session already open is resumed, as the Workout tab's own Start does (upstream's startFlow).
  const start = () => (S.active ? nav('/workout') : startFlow([r.id]))
  return <div className="hv-routine hv-rview">
    <PageBar title={r.name} onBack={back}>
      {/* D37's 1.4.4 note: upstream's Share a routine, a link a friend taps to add it. */}
      <button type="button" className="iconbtn" aria-label={t('Share with a friend')} disabled={!r.ex.length} onClick={() => shareRoutineSheet(r)}><Icon name="share" /></button>
      <button type="button" className="hv-link hv-rv-edit" onClick={() => nav('/plan/r/' + r.id)} aria-label={t('Edit routine')}>{t('Edit')}</button>
    </PageBar>
    <p className="hv-cap hv-rv-when">{[when ? t('Next') : t('Next session'), when, usual && t('about {0}', durationWords(usual))].filter(Boolean).join(' · ')}</p>
    <div className="hv-chips hv-rv-chips">
      {gym && <span className="hv-chip">{gymName(S, gym)}</span>}
      <span className="hv-chip hv-rv-count">{[folderOf(r), exCount(r.ex.length), r.ex.length ? t('{0} sets', sets) : null].filter(Boolean).join(' · ')}</span>
    </div>
    <button type="button" className="btn primary hv-rv-start" disabled={!r.ex.length} onClick={start}>
      {S.active ? t('Resume') : t('Start')}
    </button>
    <div className="hv-units">
      {units.map(u => <section key={u.map(i => r.ex[i].id).join('-') + ':' + u[0]} className={'hv-unit' + (u.length > 1 ? ' ss' : '')}>
        {u.map(i => session[i] && <PlanExercise key={i + ':' + r.ex[i].id} r={r} x={session[i]} units={units} S={S} gym={gym}
          fields={fields} onPlan={plan} note={session[i].key === noted} />)}
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
