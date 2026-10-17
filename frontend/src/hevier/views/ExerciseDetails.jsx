// Hevy's exercise details (hevier/PLAN.md M5; reference/SCREENS.md §7): Summary · History · How to.
// Seam S10 sends upstream's exerciseDetailSheet here, so every place that opens an exercise —
// the workout's blue name, the routine editor, the library, Stats — gets the same sheet. The
// numbers are upstream's read-back of the log (lib/exercise-history.js) through
// hevier/lib/exercise-summary.js, with the strength level (D19) under the records; upstream's
// own details sheet (plate loading, "weight means", the 1RM calculator) is ⋯ → All details.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, instrFor, instrTranslated, descFor, exerciseNameFor, exerciseNameClass, getLang, useLang } from '../../lib/i18n.js'
import { fmtNum, fmtDate, fmtVol } from '../../lib/format.js'
import { setLabel, lastEntryFor } from '../../lib/history.js'
import { isCustomEx } from '../../lib/exercises.js'
import { speedUnitOf } from '../../lib/speed.js'
import { isFav, toggleFav } from '../../lib/favourites.js'
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

const MAIN_LABEL = { weight: 'Heaviest Weight', reps: 'Most Reps', sec: 'Longest Hold', min: 'Minutes' }
const unitOf = (metric, unit) => (metric === 'weight' ? unit : metric === 'reps' ? t('reps') : metric === 'sec' ? 's' : t('min'))

function Summary({ ex, sum, st }) {
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
    <div className="hv-xd-tags">
      {detailTags(ex).map(tg => <span key={tg.key} className={'tag' + (tg.acc ? ' acc' : '')}>{tg.icon && <Icon name={tg.icon} />}{tg.label}</span>)}
    </div>
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
      {r.e1rm && <StrengthLevel exId={ex.id} oneRm={r.e1rm.v} st={st} />}
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
    return <div key={s.id ?? i} className="card hv-xd-sess" onClick={w ? () => workoutDetailSheet(w) : undefined}>
      <div className="hv-xd-st">{w?.name || t('Workout')} {s.pr && <span className="pr"><Icon name="trophy" />PR</span>}</div>
      <div className="hv-xd-sd">{fmtDate(s.d, true)}</div>
      {s.sets.map((x, k) => <div key={k} className="hv-xd-set"><span className="hv-xd-n">{k + 1}</span>{setLabel(ex.id, x, s.target, speedUnitOf(st))}</div>)}
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
  const sum = useMemo(() => exerciseSummary(st, ex.id), [st.workouts, st.dbLoad, ex.id])
  const fav = isFav(st, ex.id)
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
    <Segmented className="hv-xd-tabs" value={tab} onChange={setTab} options={[
      { value: 'summary', label: t('Summary') }, { value: 'history', label: t('History') }, { value: 'howto', label: t('How to') },
    ]} />
    {tab === 'summary' && <Summary ex={ex} sum={sum} st={st} />}
    {tab === 'history' && <History ex={ex} sum={sum} st={st} />}
    {tab === 'howto' && <HowTo ex={ex} st={st} />}
  </div>
}

export const exerciseDetailsSheet = ex => useUI.getState().openSheet(close => <ExerciseDetails ex={ex} close={close} />)

/** Seam S10's hand-off: every exerciseDetailSheet opens this sheet. */
export function installExerciseDetails() { hooks.exerciseDetail = exerciseDetailsSheet }
