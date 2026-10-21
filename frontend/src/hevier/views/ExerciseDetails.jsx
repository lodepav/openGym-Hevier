// Hevy's exercise details (reference/SCREENS.md §7): Summary · History · How to.
// Seam S10 sends upstream's exerciseDetailSheet here, so every place that opens an exercise —
// the workout's blue name, the routine editor, the library, Stats — gets the same sheet. The
// numbers are upstream's read-back of the log (lib/exercise-history.js) through
// hevier/lib/exercise-summary.js, with the strength level (D19) under the records; upstream's
// own details sheet (plate loading, "weight means", the 1RM calculator) is ⋯ → All details.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, instrFor, instrTranslated, descFor, exerciseNameFor, exerciseNameClass, getLang, useLang } from '../../lib/i18n.js'
import { fmtNum, fmtDate, fmtVol, capWords } from '../../lib/format.js'
import { lastEntryFor } from '../../lib/history.js'
import { hevySetLabel } from '../lib/set-text.js'
import { isCustomEx } from '../../lib/exercises.js'
import { speedUnitOf } from '../../lib/speed.js'
import { isFav, toggleFav } from '../../lib/favourites.js'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import {
  menuSheet, detailTags, addToRoutineSheet, customExSheet, deleteCustomEx, workoutDetailSheet,
  upstreamExerciseDetailSheet,
} from '../../sheets.jsx'
import { Segmented } from '../../components/ui.jsx'
import Media from '../../components/Media.jsx'
import LineChart from '../../components/LineChart.jsx'
import Icon from '../../components/Icon.jsx'
import { hooks } from '../hooks.js'
import { exerciseSummary, inRange } from '../lib/exercise-summary.js'
import StrengthLevel from '../components/StrengthLevel.jsx'
import { labelsFor, labelText, withLabelFilter } from '../lib/gym-labels.js'
import { countedS } from '../lib/counted.js'
import { aliasesOf, shownAlias } from '../lib/ex-aliases.js'
import { aliasSheet } from '../components/AliasSheet.jsx'
import { musclesShown } from '../lib/main-muscle.js'
import { MUSCLE_NAME } from '../../lib/muscles.js'

const MAIN_LABEL = { weight: 'Heaviest Weight', reps: 'Most Reps', sec: 'Longest Hold', min: 'Minutes' }
const unitOf = (metric, unit) => (metric === 'weight' ? unit : metric === 'reps' ? t('reps') : metric === 'sec' ? 's' : t('min'))

// Hevy's lines under the picture: the name in bold, then "Primary: Chest" and "Secondary: …" as
// text. The muscles are D74's (the main one, then the others); the equipment is upstream's
// detailTags', which marks it with the kettlebell (the body part `acc`, read when an exercise has
// no muscle at all).
function ExerciseFacts({ ex }) {
  const tags = detailTags(ex)
  const of = test => tags.filter(test).map(tg => tg.label).join(', ')
  const { primary, secondary } = musclesShown(ex, s => MUSCLE_NAME[s] || s)
  const lines = [
    [t('Primary'), (primary && t(primary)) || of(tg => tg.icon === 'figureStrength') || of(tg => tg.acc)],
    [t('Secondary'), secondary.map(m => t(m)).join(', ')],
    [t('Equipment'), of(tg => tg.icon === 'kettlebell')],
  ].filter(([, v]) => v)
  return <div className="hv-xd-facts">
    <b className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</b>
    {lines.map(([k, v]) => <span key={k}>{k}: {v}</span>)}
  </div>
}

function Summary({ ex, sum, st, e1rmAll }) {
  const [range, setRange] = useState('1y')
  const [curve, setCurve] = useState('main')
  const unit = st.unit
  const curves = [
    { value: 'main', label: t(MAIN_LABEL[sum.metric]) },
    sum.series.e1rm && { value: 'e1rm', label: t('One Rep Max') },
    sum.series.setVol && { value: 'setVol', label: t('Best Set Volume') },
  ].filter(Boolean)
  const on = sum.series[curve] ? curve : 'main'
  const points = useMemo(() => inRange(sum.series[on], range), [sum, on, range])
  const cu = on === 'main' ? unitOf(sum.metric, unit) : unit
  const last = points.at(-1)
  const r = sum.records
  const records = [
    r.best && { k: 'best', label: t(MAIN_LABEL[sum.metric]), v: fmtNum(r.best.v) + ' ' + unitOf(sum.metric, unit), d: r.best.d },
    r.e1rm && { k: 'e1rm', label: t('Best 1RM'), v: fmtNum(r.e1rm.v) + ' ' + unit, d: r.e1rm.d },
    r.setVol && { k: 'setVol', label: t('Best Set Volume'), v: `${fmtNum(r.setVol.w)} ${unit} × ${r.setVol.r}`, d: r.setVol.d },
    r.sessionVol && { k: 'sessionVol', label: t('Best Session Volume'), v: fmtVol(r.sessionVol.v, unit), d: r.sessionVol.d },
  ].filter(Boolean)

  return <div className="hv-xd-summary">
    <Media ex={ex} />
    <ExerciseFacts ex={ex} />
    {!sum.total ? <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No sessions logged yet')}</div> : <>
      <div className="hv-xd-head">
        <div><b className="hv-xd-big">{last ? fmtNum(last.y) + ' ' + cu : '–'}</b>{last && <span className="muted"> {fmtDate(last.d, true)}</span>}</div>
        <select className="hv-xd-range" value={range} aria-label={t('Range')} onChange={e => setRange(e.target.value)}>
          <option value="3m">{t('Last 3 months')}</option>
          <option value="1y">{t('Year')}</option>
          <option value="all">{t('All time')}</option>
        </select>
      </div>
      <div className="chart"><LineChart points={points} h={150} unit={cu} color="var(--blue)" /></div>
      {curves.length > 1 && <div className="hv-xd-chips">
        {curves.map(c => <button key={c.value} type="button" className={'chip nocap' + (c.value === on ? ' on' : '')}
          aria-pressed={c.value === on} onClick={() => setCurve(c.value)}>{c.label}</button>)}
      </div>}
      {records.length > 0 && <>
        <h4 className="sec"><Icon name="trophy" /> {t('Personal Records')}</h4>
        <div className="list">{records.map(x => <div key={x.k} className="item hv-xd-rec">
          <span className="grow">{x.label}<span className="ss">{fmtDate(x.d, true)}</span></span><b>{x.v}</b>
        </div>)}</div>
      </>}
      {/* D19 reads every set, whichever label the page shows (D28). */}
      {e1rmAll && <StrengthLevel exId={ex.id} oneRm={e1rmAll.v} st={st} />}
      {sum.reps.length > 0 && <>
        <h4 className="sec">{t('Set Records')}</h4>
        <div className="hv-xd-reps">
          <div className="hv-xd-rh"><span>{t('Reps')}</span><span>{t('Personal Best')}</span></div>
          {sum.reps.map(x => <div key={x.r} className="hv-xd-rr"><span>{x.r}</span><span>{fmtNum(x.w)} {unit}<em>{fmtDate(x.d, true)}</em></span></div>)}
        </div>
      </>}
    </>}
  </div>
}

function History({ ex, sum, st }) {
  if (!sum.total) return <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No sessions logged yet')}</div>
  const byId = new Map((st.workouts || []).filter(w => w.id != null).map(w => [w.id, w]))
  return <div className="hv-xd-history">{sum.sessions.map((s, i) => {
    const w = byId.get(s.id)
    return <div key={s.id ?? i} className="card hv-xd-sess" {...tappable(w ? () => workoutDetailSheet(w) : undefined)}>
      <div className="hv-xd-st">{w?.name || t('Workout')} {s.pr && <span className="pr"><Icon name="trophy" />PR</span>}</div>
      <div className="hv-xd-sd">{fmtDate(s.d, true)}</div>
      {s.sets.map((x, k) => <div key={k} className="hv-xd-set"><span className="hv-xd-n">{k + 1}</span>{hevySetLabel(ex.id, x, s.target, speedUnitOf(st))}</div>)}
    </div>
  })}</div>
}

function HowTo({ ex, st }) {
  const steps = instrFor(ex)
  const pinned = lastEntryFor(st, ex.id)
  const note = pinned?.notePin && pinned.note
  return <div className="hv-xd-howto">
    <Media ex={ex} />
    {note && <div className="exnote hv-xd-pin"><Icon name="pin" /> {note}</div>}
    {descFor(ex) && <div className="exnote">{descFor(ex)}</div>}
    {steps.length > 0
      ? <>{getLang() !== 'en' && !instrTranslated(ex) && <div className="small dim">{t('instructions in English')}</div>}
        <ol className="steps-list">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol></>
      : !descFor(ex) && <div className="empty small">{t('No instructions yet')}</div>}
  </div>
}

function ExerciseDetails({ ex, close }) {
  useLang()
  const st = useStore(s => s.S)
  const [tab, setTab] = useState('summary')
  // The Summary leaves out sessions kept out of progression (D57); the History lists every one.
  const counted = countedS(st)
  const all = useMemo(() => exerciseSummary(counted, ex.id), [st.workouts, st.dbLoad, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // With nothing kept out (the usual case), countedS hands back `st` itself: one summary serves both.
  const same = counted === st
  const logged = useMemo(() => (same ? all : exerciseSummary(st, ex.id)), [all, same, st.workouts, st.dbLoad, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // D28: the brand · setup labels this exercise was done with (not the gym, which is only where);
  // the Summary and History follow the one picked. null: all of them.
  const labels = useMemo(() => labelsFor(st, ex.id), [st.workouts, ex.id])
  const [label, pickLabel] = useState(null)
  const on = labels.some(l => l.key === label) ? label : null
  const sum = useMemo(() => (on != null ? exerciseSummary(withLabelFilter(counted, ex.id, on), ex.id) : all), [all, on, st.workouts, st.dbLoad, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const hist = useMemo(() => (on == null ? logged : same ? sum : exerciseSummary(withLabelFilter(st, ex.id, on), ex.id)), [logged, sum, same, on, st.workouts, st.dbLoad, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const fav = isFav(st, ex.id)
  // D73: the exercise's other names; the one shown as its name is left out and its own name put in.
  const shown = shownAlias(st, ex.id)
  const aka = shown ? [isCustomEx(ex) ? ex.n : capWords(ex.n), ...aliasesOf(st, ex.id).filter(n => n !== shown)] : aliasesOf(st, ex.id)
  const more = () => menuSheet({
    title: exerciseNameFor(ex),
    sections: [
      { items: [
        { icon: fav ? 'starFill' : 'star', label: fav ? t('Remove from favourites') : t('Add to favourites'), onClick: () => {
          let now = false
          useStore.getState().update(s => { now = toggleFav(s, ex.id) })
          useUI.getState().toast(now ? t('Added to favourites') : t('Removed from favourites'))
        } },
        { icon: 'plus', label: t('Add to my plan'), onClick: () => addToRoutineSheet(ex) },
        { icon: 'pencil', label: t('Other names'), sub: aliasesOf(st, ex.id).join(', ') || t('Found by the search'), onClick: () => aliasSheet(ex) },
        { icon: 'gear', chevron: true, label: t('All details'), sub: t('Plate loading, estimated 1RM'), onClick: () => upstreamExerciseDetailSheet(ex) },
      ] },
      isCustomEx(ex) && { items: [
        { icon: 'pencil', label: t('Edit'), onClick: () => { close(); customExSheet(ex) } },
        { icon: 'trash', danger: true, label: t('Delete'), onClick: () => deleteCustomEx(ex, close) },
      ] },
    ].filter(Boolean),
  })
  return <div className="hv-xd">
    <div className="hv-xd-bar">
      <h3 className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</h3>
      <button type="button" className="iconbtn" aria-label={t('More')} onClick={more}><Icon name="more" /></button>
    </div>
    {aka.length > 0 && <button type="button" className="hv-xd-aka" onClick={() => aliasSheet(ex)}>
      {t('Also called')} <span>{aka.join(' · ')}</span></button>}
    <Segmented className="hv-xd-tabs" value={tab} onChange={setTab} options={[
      { value: 'summary', label: t('Summary') }, { value: 'history', label: t('History') }, { value: 'howto', label: t('How to') },
    ]} />
    {tab !== 'howto' && labels.length > 0 && <select className="hv-xd-label" value={on == null ? '' : 'k:' + on} aria-label={t('Machine label')}
      onChange={e => pickLabel(e.target.value ? e.target.value.slice(2) : null)}>
      <option value="">{t('All sets')}</option>
      {labels.map(l => <option key={l.key} value={'k:' + l.key}>{labelText(l, t)} ({l.n})</option>)}
    </select>}
    {tab === 'summary' && <Summary ex={ex} sum={sum} st={st} e1rmAll={all.records.e1rm} />}
    {tab === 'history' && <History ex={ex} sum={hist} st={st} />}
    {tab === 'howto' && <HowTo ex={ex} st={st} />}
  </div>
}

export const exerciseDetailsSheet = ex => useUI.getState().openSheet(close => <ExerciseDetails ex={ex} close={close} />)

/** Seam S10's hand-off: every exerciseDetailSheet opens this sheet. */
export function installExerciseDetails() { hooks.exerciseDetail = exerciseDetailsSheet }
