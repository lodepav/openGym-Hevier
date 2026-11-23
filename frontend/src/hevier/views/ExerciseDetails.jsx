// An exercise's page (hevier/DECISIONS.md D131): one page, no tabs. The animation, the filter (phase
// and brand), the last sessions one line each, the best sets, the best at each rep count, the chart,
// then the strength level, the time a session takes, and rows into brand compare and How to. "All history" opens the
// full list of sessions. Seam S10 sends upstream's exerciseDetailSheet here, so every place that
// opens an exercise gets the same page. The numbers are upstream's read-back of the log
// (lib/exercise-history.js) through hevier/lib/exercise-summary.js and exercise-page.js; upstream's
// own details sheet (plate loading, "weight means", the 1RM calculator) is ⋯ → All details.
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, tn, instrFor, instrTranslated, descFor, exerciseNameFor, exerciseNameClass, getLang, useLang } from '../../lib/i18n.js'
import { exConverted, exUnitOf, shownWeight } from '../../lib/ex-unit.js'
import { mapSetWeights } from '../../lib/units.js'
import { fmtNum, fmtVol, capWords, todayISO } from '../../lib/format.js'
import { fmtDate } from '../lib/dates.js'
import { pinnedNoteFor, EFFORT } from '../../lib/history.js'
import { setText, setFormat, noEffort } from '../lib/set-text.js'
import { historyRows, setMark } from '../lib/history-rows.js'
import { isCustomEx } from '../../lib/exercises.js'
import { isSideSet } from '../../lib/workout-model.js'
import { formulaOf } from '../../lib/onerm.js'
import { speedUnitOf } from '../../lib/speed.js'
import { isFav, toggleFav } from '../../lib/favourites.js'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import {
  menuSheet, addToRoutineSheet, customExSheet, deleteCustomEx, workoutDetailSheet,
  upstreamExerciseDetailSheet,
} from '../../sheets.jsx'
import { Button, MenuButton } from '../../components/ui.jsx'
import { youtubeSearchUrl } from '../../lib/youtube.js'
import { openExternal } from '../../components/CustomMedia.jsx'
import Media from '../../components/Media.jsx'
import LineChart from '../../components/LineChart.jsx'
import Icon from '../../components/Icon.jsx'
import { hooks } from '../hooks.js'
import { exerciseSummary, inRange } from '../lib/exercise-summary.js'
import { lastSessions, repBests, curveIn } from '../lib/exercise-page.js'
import { detailRows, effortScale, effortShown } from '../lib/side-rows.js'
import { sideBalance } from '../lib/side-balance.js'
import StrengthLevel, { comparePending } from '../components/StrengthLevel.jsx'
import { comparePair, labelsFor, labelText, withLabelFilter } from '../lib/gym-labels.js'
import { countedS } from '../../lib/counted-log.js'
import { usePhasedS, useStatsPhase } from '../lib/shared-phase-run.js'
import PhaseFilter from '../components/PhaseFilter.jsx'
import TrendMark, { trendWords } from '../components/TrendMark.jsx'
import { aliasesOf, shownAlias } from '../lib/ex-aliases.js'
import { aliasSheet } from '../components/AliasSheet.jsx'
import { musclesShown, mainMuscleOf, muscleText } from '../lib/main-muscle.js'
import { mainMuscleSheet } from '../components/MuscleChoice.jsx'
import { MUSCLE_NAME } from '../../lib/muscles.js'
import { partOn } from '../lib/module-parts.js'
import { isOn } from '../../lib/modules.js'
import { setNoteOf } from '../../lib/set-notes.js'
import { workoutAs, currentDbLoad } from '../../lib/dumbbells.js'
import { timedSessions, timeSections } from '../lib/exercise-time.js'
import { elapsedSpaced } from '../lib/elapsed.js'
import { spoken1rm, spokenSet } from '../lib/set-spoken.js'
import { chartTapIndex } from '../lib/chart-tap.js'
import { useLargeText } from '../components/useLargeText.js'

// A date of another year says its year: the history reaches back further than one (H6).
const notThisYear = d => !!d && d.slice(0, 4) !== String(new Date().getFullYear())
const dateOf = d => fmtDate(d, true, notThisYear(d))
// The page's lines and tiles share one short form, "17 Jul" (the critique, 2026-11-20); a session card keeps its weekday.
const shortDate = d => fmtDate(d, false, notThisYear(d))

const MAIN_LABEL = { weight: 'Heaviest Weight', reps: 'Most Reps', sec: 'Longest Hold', min: 'Minutes' }
const TILE_LABEL = { weight: 'Heaviest', reps: 'Most Reps', sec: 'Longest Hold', min: 'Minutes' }
// The tag a session line names its best with (exercise-page.js KINDS), the tiles' own words.
const KIND_LABEL = { ...TILE_LABEL, e1rm: 'Best 1RM', setVol: 'Best set' }
const unitOf = (metric, unit) => (metric === 'weight' ? unit : metric === 'reps' ? t('reps') : metric === 'sec' ? 's' : t('min'))
const repsWord = n => n + ' ' + (n === 1 ? t('rep') : t('reps'))

// Under the picture, one line: the main muscle, the others and the equipment. The muscles are D74's
// (the main one, then the others; with none, the exercise's own muscle in upstream's words, else
// its body part); the equipment is the exercise's own. The name is the page's title.
function ExerciseFacts({ ex }) {
  const { primary, secondary } = musclesShown(ex, s => MUSCLE_NAME[s] || s)
  const other = MUSCLE_NAME[ex.tg] || ex.tg || ex.bp
  const lines = [
    [t('Primary'), (primary && muscleText(primary)) || (other ? t(other) : '')],
    [t('Secondary'), secondary.map(muscleText).join(', ')],
    // The catalogue's word is lower case; a capital as the muscles beside it have (the critique, 2026-11-22).
    [t('Equipment'), ex.eq ? t(ex.eq).replace(/^\p{Ll}/u, c => c.toUpperCase()) : ''],
  ].filter(([, v]) => v)
  return <div className="hv-xd-facts">{lines.map(([k, v]) => <span key={k}>{k}: {v}</span>)}</div>
}

// A set with its weights in the exercise's own unit (D41), as Lifts and the workout show it.
const inUnit = (st, id, s) => (exConverted(st, id) ? mapSetWeights(s, w => shownWeight(st, id, w)) : s)

// A set as one line of the last sessions: the fork's set format with its unit, without the effort
// (it has its own place), a per-side set's two sides on one line.
const shortSet = (ex, s, target, st) => {
  const text = setText(ex.id, inUnit(st, ex.id, noEffort(s)), target, speedUnitOf(st), exUnitOf(st, ex.id))
  if (isSideSet(s)) return text.replace(' · ', ' ')
  // Reps alone read "8 reps", not a bare "8" or "× 8" after the star (the critique, 2026-11-21).
  return text.replace(/^(?:0 )?(?:× )?(\d+)$/, (_, n) => tn('{0} rep', '{0} reps', Number(n)))
}

// The last sessions, one line each (D131): the date, the sets, the effort, and an arrow against the
// session before, or "best" with a star on each set that holds one of the page's bests.
function LastSessions({ ex, sum, kept, st, onAll }) {
  const byId = new Map((st.workouts || []).filter(w => w.id != null).map(w => [w.id, w]))
  // The stars only on sessions the bests count (D57): `kept` is the counted summary.
  const lines = lastSessions(sum, ex.id, { formula: formulaOf(st), kept: kept && kept !== sum ? new Set(kept.sessions.map(s => s.id)) : undefined })
  const scale = effortScale(st)
  return <section className="hv-xd-last">
    <div className="hv-xd-cap"><h4 className="sec">{t('Last sessions')}</h4>
      {/* How many it holds, all of them listed there (the tenth critique, 2026-11-22). */}
      <button type="button" className="hv-link" onClick={onAll}>{t('All history ({0})', sum.sessions.length)}<Icon name="chevronRight" /></button></div>
    {lines.map((l, k) => {
      const w = byId.get(l.id)
      const effort = l.effort.map(e => effortShown(e, scale)).filter(v => v != null)
      // Its date, first set, count, best and trend, in words; the whole line was one long button name (the fifth audit, 2026-11-21; the tenth critique).
      const said = w && [shortDate(l.d), l.sets[0] && spokenSet(shortSet(ex, l.sets[0].s, l.target, st)), l.sets.length > 1 && tn('{0} set', '{0} sets', l.sets.length),
        l.bestKind && spoken1rm(t(KIND_LABEL[l.bestKind])), trendWords(l.trend)].filter(Boolean).join(', ')
      return <div key={l.id ?? k} className="hv-xd-ls" aria-label={said || undefined} {...tappable(w ? () => workoutDetailSheet(w) : undefined)}>
        <span className="hv-xd-ld">{shortDate(l.d)}</span>
        {/* Each set is whole on a line that wraps ("80 kg × 6", not "80 kg" over "× 6"); the line breaks between sets. */}
        <span className="hv-xd-lsets">{l.sets.map((x, j) => <Fragment key={j}>{j > 0 && ' · '}<span className="hv-xd-lset">{x.star
          ? <em className="hv-xd-star"><span aria-hidden="true">★ </span><span className="hv-sr">{x.kinds.map(k => t(KIND_LABEL[k])).join(', ')}: </span>{shortSet(ex, x.s, l.target, st)}</em>
          : shortSet(ex, x.s, l.target, st)}</span></Fragment>)}
          {effort.length > 0 && <small> {t(EFFORT[scale].hd)} {effort.map(fmtNum).join(' · ')}</small>}</span>
        {/* The star already names the best on its set: the line's end keeps the arrow only (the tenth critique, D131). */}
        <TrendMark v={l.trend} />
      </div>
    })}
  </section>
}

// A narrow tile breaks "102.5 kg × 12" before its "×" only, never inside "102.5 kg" or "× 12".
const wholeParts = text => text.split(/ (?=× )/).map((p, i) => <Fragment key={i}>{i > 0 && ' '}<span className="hv-xd-whole">{p}</span></Fragment>)

// The best sets (D131): three tiles, the best session's volume under them, then the best at each
// rep count, the ones from the last month in yellow with "new".
// `children` (the chart) goes between the best sets and the rep counts: the long list comes last (the critique, 2026-11-21).
function Bests({ ex, sum, st, children }) {
  const unit = exUnitOf(st, ex.id)
  const show = w => shownWeight(st, ex.id, w)
  const weight = sum.metric === 'weight'
  const r = sum.records
  // A best 1RM that is the heaviest single itself shares its tile, not a second one with the same number.
  const oneSet = weight && r.best && r.e1rm && r.best.d === r.e1rm.d && Math.abs(r.best.v - r.e1rm.v) < 0.01
  const tiles = [
    r.best && { k: 'best', label: t(TILE_LABEL[sum.metric]) + (oneSet ? ' · ' + t('Best 1RM') : ''), v: fmtNum(weight ? show(r.best.v) : r.best.v) + ' ' + unitOf(sum.metric, unit), d: r.best.d },
    !oneSet && r.e1rm && { k: 'e1rm', label: t('Best 1RM'), v: fmtNum(show(r.e1rm.v)) + ' ' + unit, d: r.e1rm.d },
    r.setVol && { k: 'setVol', label: t('Best set'), v: wholeParts(setFormat(`${fmtNum(show(r.setVol.w))}×${r.setVol.r}`, unit)), d: r.setVol.d },
  ].filter(Boolean)
  const reps = repBests(sum.reps, todayISO())
  return <>
    {tiles.length > 0 && <section>
      <h4 className="sec">{t('Best sets')}</h4>
      <div className="hv-xd-tiles">{tiles.map(x => <div key={x.k} className="hv-xd-tile">
        {/* "Best 1RM" is spoken "Best one rep max" (the ninth critique, 2026-11-22). */}
        {spoken1rm(x.label) === x.label ? <small>{x.label}</small> : <small role="img" aria-label={spoken1rm(x.label)}>{x.label}</small>}<b>{x.v}</b><small>{shortDate(x.d)}</small></div>)}</div>
      {r.sessionVol && <div className="hv-xd-svol small dim">{t('Best Session Volume')} {fmtVol(show(r.sessionVol.v), unit)} · {shortDate(r.sessionVol.d)}</div>}
    </section>}
    {children}
    {reps.length > 0 && <section>
      <h4 className="sec">{t('Best at each rep count')}</h4>
      <div className="hv-xd-reps">{reps.map(x => <div key={x.r} className={'hv-xd-rr' + (x.isNew ? ' new' : '')}>
        <span>{repsWord(x.r)}</span><b>{fmtNum(show(x.w))} {unit}</b>{x.isNew && <span className="hv-xd-new">{t('new')}</span>}<em>{shortDate(x.d)}</em>
      </div>)}</div>
    </section>}
  </>
}

// The chart (D131) with its switch: heaviest, 1RM, set volume; left against right under it.
function Chart({ ex, sum, st }) {
  const [range, setRange] = useState('1y')
  const [curve, setCurve] = useState('main')
  const unit = exUnitOf(st, ex.id)
  const curves = [
    { value: 'main', label: t(TILE_LABEL[sum.metric]), title: t(MAIN_LABEL[sum.metric]) },
    // Lifts' word for the same estimate (the tenth critique, 2026-11-22).
    sum.series.e1rm && { value: 'e1rm', label: t('Est. 1RM'), spoken: t('Estimated one rep max'), title: t('One Rep Max') },
    sum.series.setVol && { value: 'setVol', label: t('Set volume'), title: t('Best Set Volume') },
  ].filter(Boolean)
  const on = sum.series[curve] ? curve : 'main'
  const lb = exConverted(st, ex.id)
  const points = useMemo(() => { const p = inRange(sum.series[on], range); return lb ? curveIn(p, on, sum.metric, w => shownWeight(st, ex.id, w)) : p }, [sum, on, range, lb]) // eslint-disable-line react-hooks/exhaustive-deps
  const cu = on === 'main' ? unitOf(sum.metric, unit) : unit
  const sides = useMemo(() => sideBalance(sum.sessions, ex.id), [sum, ex.id])
  // A weight curve names its unit, the exercise's own (the critique, 2026-11-22); reps, holds and minutes say theirs in the title already.
  const title = curves.find(c => c.value === on).title + (on !== 'main' || sum.metric === 'weight' ? ' (' + unit + ')' : '')
  // A tap shows the chart's readout; a second tap on the same point opens that session (the tenth critique, 2026-11-22).
  const picked = useRef({ points: null, i: null })
  const tap = e => {
    const i = chartTapIndex(e.currentTarget)
    const was = picked.current.points === points ? picked.current.i : null
    picked.current = { points, i }
    if (i == null || i !== was) return
    const sess = sum.sessions.find(x => x.t === points[i]?.t)
    const w = sess && (st.workouts || []).find(x => x.id != null && x.id === sess.id)
    if (w) workoutDetailSheet(w)
  }
  return <section>
    <div className="hv-xd-cap"><h4 className="sec">{title}</h4>
      {/* Upstream's picker sheet, not a native select's white system list (the fresh audit, 2026-11-21). */}
      <MenuButton className="hv-xd-range" title={t('Range')} value={range} onChange={setRange}
        options={[{ value: '3m', label: t('Last 3 months') }, { value: '1y', label: t('Year') }, { value: 'all', label: t('All time') }]} /></div>
    {/* Touch only: the chart is one picture to TalkBack, and Last sessions opens the same workouts. */}
    <div className="chart hv-xd-chart" role="img" aria-label={t('{0} chart', title)} onClick={tap}><LineChart points={points} h={150} unit={cu} /></div>
    {curves.length > 1 && <div className="hv-xd-chips">
      {curves.map(c => <button key={c.value} type="button" className={'chip nocap' + (c.value === on ? ' on' : '')}
        aria-pressed={c.value === on} aria-label={c.spoken || (spoken1rm(c.label) === c.label ? undefined : spoken1rm(c.label))} onClick={() => setCurve(c.value)}>{c.label}</button>)}
    </div>}
    {sides && <div className="hv-xd-sides">{sides.even ? t('Left and right are even')
      : t(sides.side === 'R' ? 'Right is {0}% stronger (last {1} sessions)' : 'Left is {0}% stronger (last {1} sessions)', sides.pct, sides.n)}</div>}
  </section>
}

// The full list of sessions, as the History tab had it: each session a card with every set, a
// per-side set an L row and an R row (D133), each side with its own effort.
function History({ ex, sum, st }) {
  if (!sum.total) return <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No sessions logged yet')}</div>
  const byId = new Map((st.workouts || []).filter(w => w.id != null).map(w => [w.id, w]))
  return <div className="hv-xd-history">{sum.sessions.map((s, i) => {
    const w = byId.get(s.id)
    const rows = historyRows(workoutAs(w, ex.id, currentDbLoad(st, ex.id)), ex.id, s)
    const sets = rows.map(y => y.s)
    return <div key={s.id ?? i} className="card hv-xd-sess" {...tappable(w ? () => workoutDetailSheet(w) : undefined)}>
      <div className="hv-xd-st">{w?.name || t('Workout')} {s.pr && <span className="pr"><Icon name="trophy" />{t('PR')}</span>}</div>
      <div className="hv-xd-sd">{dateOf(s.d)}</div>
      {/* The holds of a reps session too (D89), marked H as a warm-up is W. */}
      {detailRows(sets).map(row => {
        const mark = row.head ? setMark(sets, row.i) : ''
        return <div key={row.i + (row.side || '')} className="hv-xd-set"><span className={'hv-xd-n' + (mark === 'H' ? ' hv-xd-h' : '')}
          {...(mark === 'W' || mark === 'H' ? { role: 'img', 'aria-label': t(mark === 'W' ? 'Warm-up' : 'Hold') } : {})}>{mark === 'H' ? t('H') : mark}</span>
          <span>{row.side && <span className="hv-lr" role="img" aria-label={t(row.side === 'L' ? 'Left' : 'Right')}>{row.side === 'L' ? t('L') : t('R')}</span>}{row.undone ? '–' : setText(ex.id, inUnit(st, ex.id, row.s), rows[row.i].target, speedUnitOf(st), exUnitOf(st, ex.id))}</span>
          {/* A set's note (upstream 1.4.4, D5). */}
          {row.last && setNoteOf(sets[row.i]) && <span className="hv-xd-note"><Icon name="note" />{setNoteOf(sets[row.i])}</span>}</div>
      })}
    </div>
  })}</div>
}

// The sessions as the page's filters leave them: `label` the brand picked (null: all), read live
// so a sheet on top follows the phase filter (D93).
function useListed(ex, label) {
  const st = useStore(s => s.S)
  const listed = usePhasedS(st)
  // A filtered log is a new copy on each write: key on what it is made from (the sixth audit, 2026-11-21).
  const phase = useStatsPhase(s => s.phase)
  return useMemo(() => exerciseSummary(label != null ? withLabelFilter(listed, ex.id, label) : listed, ex.id),
    [st.workouts, phase, st.modules, st.hvModuleParts, st.dbLoad, st.volumeWarmups, st.customEx, ex.id, label]) // eslint-disable-line react-hooks/exhaustive-deps
}

function AllHistory({ ex, label }) {
  const st = useStore(s => s.S)
  const sum = useListed(ex, label)
  return <div className="hv-xd hv-xd-sub">
    <div className="hv-xd-bar"><h3>{t('All history')}</h3></div>
    <PhaseFilter />
    <History ex={ex} sum={sum} st={st} />
  </div>
}

// D96: two labels' histories side by side, each column its own sessions, newest first. `base` is
// the log the History reads, so the phase filter (D93) narrows both.
function CompareColumn({ ex, base, st, labels, value, other, onPick }) {
  // `base` is a new copy on each write: key on what it is made from (the sixth audit, 2026-11-21).
  const phase = useStatsPhase(s => s.phase)
  const sum = useMemo(() => exerciseSummary(withLabelFilter(base, ex.id, value), ex.id),
    [st.workouts, phase, st.modules, st.hvModuleParts, st.dbLoad, st.volumeWarmups, st.customEx, ex.id, value]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="hv-xd-cmpcol">
    <MenuButton className="hv-xd-label" title={t('Brand')} value={value} onChange={onPick}
      options={labels.filter(l => l.key !== other).map(l => ({ value: l.key, label: labelText(l, t) }))} />
    <History ex={ex} sum={sum} st={st} />
  </div>
}

function CompareHistory({ ex }) {
  const st = useStore(s => s.S)
  const base = usePhasedS(st)
  const labels = useMemo(() => labelsFor(st, ex.id), [st.workouts, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [picks, setPicks] = useState([null, null])
  const [a, b] = comparePair(labels, picks[0], picks[1])
  return <div className="hv-xd hv-xd-sub">
    <div className="hv-xd-bar"><h3>{t('Compare brands')}</h3></div>
    <PhaseFilter />
    <div className="hv-xd-cmp">
      <CompareColumn ex={ex} base={base} st={st} labels={labels} value={a} other={b} onPick={k => setPicks([k, b])} />
      <CompareColumn ex={ex} base={base} st={st} labels={labels} value={b} other={a} onPick={k => setPicks([a, k])} />
    </div>
  </div>
}

// A catalogue picture or clip is marked once drawn; its "tap to pause" waits for it (hevier.css, the seventh critique, 2026-11-22).
const DRAWN = 'data-hv-drawn'
function useMediaDrawn() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const mark = e => { if (e.target?.matches?.('.exmedia > :is(img, video)')) e.target.setAttribute(DRAWN, '') }
    el.querySelectorAll('.exmedia > img').forEach(img => { if (img.complete && img.naturalWidth > 0) img.setAttribute(DRAWN, '') })
    el.addEventListener('load', mark, true)
    el.addEventListener('loadeddata', mark, true)
    return () => { el.removeEventListener('load', mark, true); el.removeEventListener('loadeddata', mark, true) }
  }, [])
  return ref
}

function HowTo({ ex }) {
  const st = useStore(s => s.S)
  const steps = instrFor(ex)
  // The note pinned last time (upstream's pinnedNoteFor; lastEntryFor's answer carries no note, so
  // the pin never showed here before 2026-11-03).
  const note = pinnedNoteFor(st, ex.id)?.note || ''
  const demos = partOn(st, 'hvWorkout', 'demos') // D117: off leaves the text and pictures
  const media = useMediaDrawn()
  return <div className={'hv-xd-howto hv-xd-sub' + (isCustomEx(ex) ? '' : ' hv-xd-cat')} ref={media}>
    <div className="hv-xd-bar"><h3>{t('How to')}</h3></div>
    {/* D101: a YouTube link in the pinned note plays here too, as upstream's Media plays a routine note's. */}
    <Media ex={ex} notes={(demos && note) || undefined} />
    {note && <div className="exnote hv-xd-pin"><Icon name="pin" /> {note}</div>}
    {descFor(ex) && <div className="exnote">{descFor(ex)}</div>}
    {steps.length > 0
      ? <>{getLang() !== 'en' && !instrTranslated(ex) && <div className="small dim">{t('instructions in English')}</div>}
        <ol className="steps-list">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol></>
      : !descFor(ex) && <div className="empty small">{t('No instructions yet')}</div>}
    {/* D101: upstream 1.4.4's YouTube search for the exercise (#613), opened only on the tap. */}
    {demos && youtubeSearchUrl(ex) && <Button variant="ghost" icon="play" className="hv-xd-yt" onClick={() => openExternal(youtubeSearchUrl(ex))}>{t('Watch on YouTube')}</Button>}
  </div>
}

// A row into another page or sheet, drawn as Statistics' rows are (its LinkRow; importing that page
// here would close an import loop through the tab bar).
const LinkRow = ({ icon, title, sub, onClick }) => <button type="button" className="card hv-linkrow" onClick={onClick}>
  <Icon name={icon} />
  <span className="hv-linkrow-t"><b>{title}</b>{sub && <span className="hv-sub">{sub}</span>}</span>
  <Icon name="chevronRight" />
</button>

const openSub = node => useUI.getState().openSheet(() => node)

function ExerciseDetails({ ex, close }) {
  useLang()
  const st = useStore(s => s.S)
  // The bests and the chart leave out sessions kept out of progression (D57); the sessions list
  // every one. The filter by OpenBite's phase (D93) narrows both.
  const counted = usePhasedS(countedS(st))
  const listed = usePhasedS(st)
  // Both are new copies on each write: the summaries key on what they are made from and read (the fifth audit, 2026-11-21).
  const phase = useStatsPhase(s => s.phase)
  const made = [st.workouts, st.routines, phase, st.modules, st.hvModuleParts, st.dbLoad, st.volumeWarmups, st.customEx]
  const all = useMemo(() => exerciseSummary(counted, ex.id), [...made, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // With nothing kept out (the usual case), both are the same copy of S: one summary serves both.
  const same = counted === listed
  const logged = useMemo(() => (same ? all : exerciseSummary(listed, ex.id)), [all, same, ...made, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // D28: the brand · setup labels this exercise was done with (not the gym, which is only where);
  // the page follows the one picked. null: all of them.
  const labels = useMemo(() => labelsFor(st, ex.id), [st.workouts, ex.id])
  const [label, pickLabel] = useState(null)
  const brands = labels.length > 0 && partOn(st, 'hvGyms', 'brands')
  const on = brands && labels.some(l => l.key === label) ? label : null
  const sum = useMemo(() => (on != null ? exerciseSummary(withLabelFilter(counted, ex.id, on), ex.id) : all), [all, on, ...made, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const hist = useMemo(() => (on == null ? logged : same ? sum : exerciseSummary(withLabelFilter(listed, ex.id, on), ex.id)), [logged, sum, same, on, ...made, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // D88: this exercise's time a session, from its sets' tick times, as Exercise time reads it.
  const time = useMemo(() => (partOn(st, 'hvStats', 'time')
    ? timeSections(timedSessions(listed.workouts, '', listed.routines).filter(x => x.id === ex.id))[0]?.rows[0] : null), [...made, ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const e1rm = sum.records.e1rm
  const [asked] = useState(() => comparePending(ex.id))   // opened from Strength levels → Set a level
  const media = useMediaDrawn()
  // With large text the best tiles go to fewer columns and keep their numbers whole (hevier.css, the tenth critique).
  const big = useLargeText()
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
        partOn(st, 'hvExercise', 'names') && { icon: 'pencil', label: t('Other names'), sub: aliasesOf(st, ex.id).join(', ') || t('Found by the search'), onClick: () => aliasSheet(ex) },
        // D76: the muscle its sets count for, as the user chooses it.
        partOn(st, 'hvExercise', 'muscle') && { icon: 'figureStrength', label: t('Main muscle'), sub: (muscleText(mainMuscleOf(ex)) || t('None')) + (st.hvMainMuscle?.[ex.id] ? ' · ' + t('your choice') : ''), onClick: () => mainMuscleSheet(ex) },
        { icon: 'gear', chevron: true, label: t('All details'), sub: t('Plate loading, estimated 1RM'), onClick: () => upstreamExerciseDetailSheet(ex) },
      ] },
      isCustomEx(ex) && { items: [
        { icon: 'pencil', label: t('Edit'), onClick: () => { close(); customExSheet(ex) } },
        { icon: 'trash', danger: true, label: t('Delete'), onClick: () => deleteCustomEx(ex, close) },
      ] },
    ].filter(Boolean),
  })
  return <div className={'hv-xd' + (big ? ' hv-big' : '')}>
    <div className="hv-xd-bar">
      <h3 className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</h3>
      <button type="button" className="iconbtn" aria-label={t('More')} onClick={more}><Icon name="more" /></button>
    </div>
    {aka.length > 0 && partOn(st, 'hvExercise', 'names') && <button type="button" className="hv-xd-aka" onClick={() => aliasSheet(ex)}>
      {t('Also called')} <span>{aka.join(' · ')}</span></button>}
    <div className={'hv-xd-page' + (isCustomEx(ex) ? '' : ' hv-xd-cat')} ref={media}>
      <Media ex={ex} />
      <ExerciseFacts ex={ex} />
      {brands && <div className="hv-xd-labels">
        {/* 'k:' keeps No brand's own key ('') apart from All sets. */}
        <MenuButton className="hv-xd-label" title={t('Brand')} value={on == null ? '' : 'k:' + on}
          onChange={v => pickLabel(v ? v.slice(2) : null)}
          options={[{ value: '', label: t('All sets') }, ...labels.map(l => ({ value: 'k:' + l.key, label: labelText(l, t) + ' (' + l.n + ')' }))]} />
      </div>}
      <PhaseFilter />
      {!hist.total ? <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No sessions logged yet')}</div>
        : <LastSessions ex={ex} sum={hist} kept={sum} st={st} onAll={() => openSub(<AllHistory ex={ex} label={on} />)} />}
      {/* Under three sessions a curve says nothing and the best tile already gives its number: no chart (the critiques, 2026-11-21). */}
      {sum.total > 0 && <Bests ex={ex} sum={sum} st={st}>{(sum.series.main || []).length >= 3 && <Chart ex={ex} sum={sum} st={st} />}</Bests>}
      <section className="hv-xd-more">
        {/* D19 follows the label the page shows (D28), every set under All. */}
        {/* Without a 1RM too when opened from Set a level, or once levels are typed in. */}
        {(e1rm || asked || st.hvStrength?.[ex.id]) && isOn(st, 'strength') /* D139: Strength has no parts left */ && <StrengthLevel exId={ex.id} oneRm={e1rm ? shownWeight(st, ex.id, e1rm.v) : 0} unit={exUnitOf(st, ex.id)} st={st} />}
        {brands && labels.length > 1 && <LinkRow icon="machine" title={t('Compare brands')} sub={labels.map(l => labelText(l, t)).join(', ')}
          onClick={() => openSub(<CompareHistory ex={ex} />)} />}
        {/* No line for one set a session: too few sets for a time (the sixth audit, 2026-11-22). */}
      {time?.avg != null && <p className="hv-xd-time"><Icon name="timer" />{t('Time on this exercise')} · {t('{0} a session', elapsedSpaced(Math.round(time.avg / 1000)))}</p>}
        <LinkRow icon="info" title={t('How to')} onClick={() => openSub(<HowTo ex={ex} />)} />
      </section>
    </div>
  </div>
}

export const exerciseDetailsSheet = ex => useUI.getState().openSheet(close => <ExerciseDetails ex={ex} close={close} />)

/** Seam S10's hand-off: every exerciseDetailSheet opens this sheet. */
export function installExerciseDetails() { hooks.exerciseDetail = exerciseDetailsSheet }
