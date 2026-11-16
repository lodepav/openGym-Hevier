// Hevy's Add Exercise picker (reference/SCREENS.md §8). Seam S13 sends
// upstream's exercisePicker here, so the workout's Add Exercise, the routine editor's Add and
// Replace, a swap and Structural balance all get it. Adding picks several (✓ circles, then "Add 2
// exercises"); a Replace, a swap or any other titled pick takes one tap. Each pick goes through the
// caller's own `onPick(ex, true)`, upstream's quick add with the default config, so what an added
// exercise starts with is upstream's. The search and ranking are upstream's too. The same list,
// browsing (no ✓, a tap opens exercise details), is the fork's Exercises page (Lifts → All exercises).
// "Add superset" adds the ticked exercises the same way, then links them with upstream's superset
// pairing, through the target the open workout or routine editor registers (useSupersetTarget).
// D129: the live workout's Swap is titled with its exercise and lists, before the catalogue's
// substitutes, what it was swapped for before and what was done at this gym (lib/swap-history.js),
// each row one tap to Use; the live workout's Add lists what was done at this gym first.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { exerciseNameText, fmtDate } from '../../lib/format.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { EXIDX, allExercises, equipmentOf, searchExercises } from '../../lib/exercises.js'
import { gymById, gymHas, gymLacks, pickerGym, rememberGym, inWorkout, currentPath } from '../lib/gym-filter.js'
import { eqMatches, groupIdOf, EQUIP_GROUPS } from '../lib/equip-groups.js'
import { EquipFilterSheet, MuscleFilterSheet } from '../components/EquipGroups.jsx'
import { muscleValueLabel, muscleFilterValue } from '../lib/muscle-groups.js'
import { isFav, sortFavouritesFirst, sortYoursFirst, usageOf } from '../../lib/favourites.js'
import { useSheetKeyboard } from '../../lib/use-sheet-keyboard.js'
import { useAutoMore } from '../../lib/use-auto-more.js'
import { customExSheet, exerciseDetailSheet } from '../../sheets.jsx'
import { Thumb } from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import PageBar from '../components/PageBar.jsx'
import { hooks } from '../hooks.js'
import { cleanBackups } from '../../lib/routine-backups.js'
import { armSwap } from '../lib/gym-backups-run.js'
import { muscleOf, muscleOptions, recentIds, filterPicker, addedRun, brandsByExercise, brandMatches, hiddenByGym } from '../lib/exercise-picker.js'
import { suggestedSubstitutes, relatedSubstitutes } from '../../lib/exercise-substitutes.js'
import { partOn } from '../lib/module-parts.js'
import { isBw } from '../../lib/history.js'
import { speedUnitOf } from '../../lib/speed.js'
import { previousText } from '../lib/set-text.js'
import { exUnitOf, shown as inUnit } from '../lib/ex-unit.js'
import { pastSwaps, doneHere } from '../lib/swap-history.js'

const PAGE = 50
const RECENT = 10   // as many as Recent Exercises lists
const GYM = '@'   // the equipment filter's "what this gym has" (D62); the gym is `gymId`

// What "Add superset" links into: { items() -> the list the picks were added to, end() -> the
// index of the last one added, pair(i, j) -> links two neighbours }. Set while a screen that adds
// exercises is open; with none, the picker offers no superset. The workout's also has
// insertAfter() -> the exercise the picks would go after, or null when that is the
// end, and placeAt(atEnd), which makes them go there or to the end (D78).
let supersetTarget = null
// "Insert after Bench Press" with the name cased as everywhere else and cut short, not the verb.
const named = (text, ex) => {
  const [pre, post = ''] = text.split('\u0001')
  return <>{pre && <span>{pre}</span>}<span className={'hv-pk-name ' + exerciseNameClass(ex)}>{exerciseNameFor(ex)}</span>{post && <span>{post}</span>}</>
}
const insertLabel = ex => named(t('Insert after {0}', '\u0001'), ex)
export function useSupersetTarget(target) {
  useEffect(() => { supersetTarget = target; return () => { if (supersetTarget === target) supersetTarget = null } })
}

function ExerciseList({ onPick, title, like, close, browse, backups }) {
  const st = useStore(s => s.S)
  const all = allExercises(st)
  // D62: the workout's gym in a workout, else the gym last chosen here.
  const [path] = useState(currentPath)
  const [gymId, setGymId] = useState(() => pickerGym(st, path))
  const profile = gymById(st, gymId)
  const likeEx = like ? (EXIDX[like] || all.find(e => e.id === like) || null) : null
  // Adding takes several at once; a titled pick (Replace, swap, Change exercise) takes one.
  const multi = !title && !browse
  const swap = title === t('Swap exercise')
  const liveAdd = multi && inWorkout(st, path)
  const [q, setQ] = useState('')
  // A swap opens on what trains the same muscle, as upstream's does (#473).
  const [muscle, setMuscle] = useState(() => muscleFilterValue(muscleOf(likeEx), likeEx))
  const [eq, setEq] = useState(profile ? GYM : '')
  const [picked, setPicked] = useState([])
  const [shown, setShown] = useState(PAGE)
  const [showHidden, setShowHidden] = useState(0)   // D67: how many of the hidden are listed
  const searchRef = useRef(null)
  const onSearchFocus = useSheetKeyboard(searchRef)
  const moreRef = useAutoMore(() => setShown(s => s + PAGE))

  // A gym, or a kind or a whole group of kinds (D63).
  const avail = eq === GYM ? (profile ? e => gymHas(profile, e) : null) : eq ? e => eqMatches(eq, e) : null
  const base = filterPicker(all, { muscle, avail }).filter(e => e.id !== like)
  // D129: from the log, while nothing is typed; kept to what the filters keep.
  const rid = swap ? (st.active?.entries || []).find(e => e?.id === like)?.rid : null
  const hereGym = eq === GYM ? gymId : null
  const hist = useMemo(() => (swap || liveAdd ? {
    swaps: swap ? pastSwaps(st, like, rid) : [],
    here: doneHere(st, hereGym),
    logged: new Set((st.workouts || []).flatMap(w => (w?.entries || []).map(e => e?.id))),
  } : null), [st.workouts, st.routines, like, rid, hereGym, swap, liveAdd]) // eslint-disable-line react-hooks/exhaustive-deps
  const inBase = new Set(base.map(e => e.id))
  const histRows = rs => (q.trim() ? [] : rs).filter(r => inBase.has(r.id)).map(r => ({ ...r, ex: EXIDX[r.id] || all.find(e => e.id === r.id) })).filter(r => r.ex)
  const swapRows = histRows(hist?.swaps || [])
  const hereRows = histRows(hist?.here || []).filter(r => !swapRows.some(x => x.id === r.id)).slice(0, swap ? undefined : RECENT)
  // D67: what the gym hid from the search, counted, and listed on a tap.
  const hidden = eq === GYM ? hiddenByGym(all.filter(e => e.id !== like), { muscle, avail }, q, searchExercises) : []
  let list = searchExercises(base, q)
  list = q.trim() ? sortYoursFirst(list, st, usageOf(st)) : sortFavouritesFirst(list, st)
  // D36: exercises a typed brand reaches come first, with the brand under the name.
  const byBrand = q.trim() && partOn(st, 'hvGyms', 'brands') ? brandMatches(base, brandsByExercise(st), q, searchExercises) : []
  const brandOf = new Map(byBrand.map(m => [m.ex.id, m.brand]))
  if (byBrand.length) list = [...byBrand.map(m => m.ex), ...list.filter(e => !brandOf.has(e.id))]
  // Same equipment first on a swap: a taken machine is usually swapped for the same kind of kit.
  if (likeEx?.eq && !q.trim()) list = [...list].sort((a, b) => Number(b.eq === likeEx.eq) - Number(a.eq === likeEx.eq))
  // Browsing (nothing typed or narrowed) shows Recent Exercises above everything.
  const browsing = !q.trim() && !muscle && (eq === '' || eq === GYM)
  const recent = browsing && !hist
    ? recentIds(st).map(id => EXIDX[id] || all.find(e => e.id === id)).filter(e => e && e.id !== like && !e.missing)
    : []

  // D45: the slot's planned backups first, while nothing is typed (upstream 1.4.2's "Your backups").
  // Not on a swap: D129 lists what the log says instead; the backups stay as data.
  const backupList = q.trim() || swap ? [] : cleanBackups(backups, like).map(id => EXIDX[id] || all.find(e => e.id === id)).filter(e => e && !e.missing)
  // D45's 1.4.4 note: upstream's swap suggestions (#674), up to three, under the backups: the same
  // movement and muscle first, else related ones, from what the gym and the filters leave, a planned
  // backup not twice. Only on a swap, while nothing is typed.
  const pool = likeEx && !q.trim() ? list.filter(e => !backupList.includes(e) && !hist?.logged.has(e.id)) : []
  const closeMatches = pool.length ? suggestedSubstitutes(pool, likeEx) : []
  const suggested = closeMatches.length ? closeMatches : pool.length ? relatedSubstitutes(pool, likeEx) : []
  const suggestWhy = closeMatches.length ? t('Same movement and muscle')
    : suggested.some(e => e.cat !== likeEx?.cat) ? t('Same muscle, different exercise type. Check suitability.')
      : suggested.some(e => e.tg !== likeEx?.tg) ? t('Related muscles and exercise type. The movement may differ.')
        : t('Same muscle and exercise type. The movement may differ.')
  const sugHead = !swap ? t('Suggested substitutes') : closeMatches.length ? t('Same movement, not tried yet') : t('Similar, not tried yet')

  const isOn = e => picked.some(p => p.id === e.id)
  const tap = e => {
    if (browse) { exerciseDetailSheet(e); return }
    if (!multi) { onPick(e, true); return }
    setPicked(cur => (cur.some(p => p.id === e.id) ? cur.filter(p => p.id !== e.id) : [...cur, e]))
  }
  // D78: while the picks would not go to the end, Insert after the current one or Add to end.
  const [after] = useState(() => (multi && supersetTarget?.insertAfter?.()) || null)
  const addPicked = (atEnd = true) => {
    close()
    supersetTarget?.placeAt?.(atEnd || !after)
    picked.forEach(e => onPick(e, true))
  }
  const canLink = multi && picked.length > 1 && !!supersetTarget
  const addSuperset = () => {
    const target = supersetTarget
    addPicked()
    const first = addedRun(target.items(), target.end(), picked.map(e => e.id))
    for (let i = first; first >= 0 && i < first + picked.length - 1; i++) target.pair(i, i + 1)
  }
  const reset = fn => v => { fn(v); setShown(PAGE) }

  // A gym chosen outside a workout is remembered for the next time (D62); in a workout the
  // choice is this picker's only, as the workout's gym line is where the gym is changed.
  const chooseGym = id => {
    setGymId(id)
    setShowHidden(0)
    reset(setEq)(id ? GYM : '')
    if (!inWorkout(st, path)) rememberGym(id)
  }
  const gyms = (st.equipProfiles || []).filter(p => p?.id != null)
  const openEquipment = () => useUI.getState().openSheet(close => <EquipFilterSheet close={close}
    value={eq === GYM ? '' : eq} gymId={eq === GYM ? gymId : null} gyms={gyms} kinds={equipmentOf(all)}
    onAll={() => chooseGym(null)} onGym={chooseGym} onEq={v => reset(setEq)(v)} />)
  const openMuscles = () => useUI.getState().openSheet(close => <MuscleFilterSheet close={close}
    value={muscle} names={muscleOptions(all)} onPick={v => reset(setMuscle)(v)} />)
  const create = () => customExSheet(null, ex => { if (!ex) return; if (browse) exerciseDetailSheet(ex); else if (multi) setPicked(cur => [...cur, ex]); else onPick(ex, true) }, q.trim())

  // The thumbnail and Hevy's chart button open the exercise's details without picking it.
  const details = (ev, e) => { ev.stopPropagation(); exerciseDetailSheet(e) }
  // D117: with the chart button switched off, the thumbnail is the way to the details a screen reader hears.
  const chartOn = partOn(st, 'hvWorkout', 'demos')
  // A screen reader hears the row as its exercise, and in a multi pick whether it is ticked; the
  // thumbnail repeats the chart button, so only the chart button is in its reading order.
  // The name is the row's button, stretched over it; the thumbnail and the chart button sit above it.
  // `line`: a row from the log says how often, when and the last set in place of the muscle (D129).
  // On a swap the whole row is its Use button.
  const row = (e, key, why, line) => {
    const sub = line ?? [t(muscleOf(e)), brandOf.get(e.id), why].filter(Boolean).join(' · ')
    return <div key={key + e.id} className={'item hv-pk-row tap-host' + (isOn(e) ? ' on' : '')}>
      <button className="hv-thumb" {...(browse || chartOn ? { 'aria-hidden': 'true', tabIndex: -1 } : { type: 'button', 'aria-label': t('Details') + ', ' + exerciseNameText(e) })} onClick={ev => details(ev, e)}><Thumb ex={e} /></button>
      <button type="button" className="grow item-open tap-main" onClick={() => tap(e)}
        aria-label={[swap ? t('Use {0}', exerciseNameText(e)) : exerciseNameText(e), sub].filter(Boolean).join(' · ')} aria-pressed={multi ? isOn(e) : undefined}>
        <span className={'tt ' + exerciseNameClass(e)}>{isFav(st, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</span>
        <span className="ss">{sub}</span>
      </button>
      {!browse && chartOn && <button type="button" className="iconbtn hv-pk-info" aria-label={t('Details') + ', ' + exerciseNameText(e)} onClick={ev => details(ev, e)}><Icon name="chart" /></button>}
      {swap ? <span className="hv-pk-use" aria-hidden="true">{t('Use')}</span>
        : multi ? <span className={'hv-pk-check' + (isOn(e) ? ' on' : '')}>{isOn(e) && <Icon name="check" />}</span> : <Icon name="chevronRight" className="chev" />}
    </div>
  }
  // "4 times · last 12 Oct · 27.5kg × 10", the set as the workout's PREVIOUS column writes it.
  const histLine = r => {
    const u = exUnitOf(st, r.id)
    const set = r.last ? previousText(r.last, { mode: r.mode, bw: isBw({ id: r.id }), unit: u, id: r.id, target: r.target,
      show: w => inUnit(w, st.unit, u), speedUnit: speedUnitOf(st) }).replace(/ \((RPE|RIR) [^)]*\)/g, '') : ''
    const when = r.d ? fmtDate(r.d) : ''
    return (r.n === 1 ? [t('once'), when] : [t('{0} times', r.n), when && t('last {0}', when)]).concat(set).filter(Boolean).join(' · ')
  }
  const histSection = (head, rows, key) => rows.length > 0 && <section aria-label={head}>
    <h4 className="sec">{head}</h4>
    <div className="list">{rows.map(r => row(r.ex, key, null, histLine(r)))}</div>
  </section>

  const eqLabel = eq === GYM ? profile?.name : groupIdOf(eq) ? t(EQUIP_GROUPS.find(g => g.id === groupIdOf(eq)).label) : eq ? t(eq) : t('All Equipment')
  return <div className="hv-pk">
    {browse ? browse({ create }) : <div className="hv-pk-hd">
      <h3>{swap ? (likeEx ? named(t('Swap {0}', '\u0001'), likeEx) : t('Swap exercise')) : title || t('Add Exercise')}</h3>
      <button className="hv-link" onClick={create}>{t('Create')}</button>
    </div>}
    <div className="picker-search"><div className="search-row"><div className={'search' + (q ? ' has-clear' : '')}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input ref={searchRef} className="input" placeholder={t('Search exercise')} value={q} onFocus={onSearchFocus} onChange={e => reset(setQ)(e.target.value)} />
      {q && <button className="clear" onClick={() => reset(setQ)('')} aria-label={t('Clear')}><Icon name="xmark" /></button>}</div></div></div>
    <div className="hv-pk-filters">
      <button className={'btn' + (eq && eq !== GYM ? ' on' : '')} onClick={openEquipment}><span className="capitalize">{eqLabel}</span></button>
      <button className={'btn' + (muscle ? ' on' : '')} onClick={openMuscles}>{muscle ? t(muscleValueLabel(muscle)) : t('All Muscles')}</button>
    </div>
    {backupList.length > 0 && <><h4 className="sec">{t('Your backups')}</h4><div className="list">{backupList.map(e => row(e, 'b'))}</div></>}
    {histSection(t('You swapped to these before'), swapRows, 'w')}
    {histSection(hereGym ? t('You have done these here') : t('You have done these'), hereRows, 'd')}
    {suggested.length > 0 && <section aria-label={sugHead}>
      <h4 className="sec">{sugHead}</h4>
      {!(swap && closeMatches.length) && <p className="small dim hv-pk-why">{suggestWhy}</p>}
      <div className="list">{suggested.map(e => row(e, 's'))}</div>
    </section>}
    {recent.length > 0 && <><h4 className="sec">{t('Recent Exercises')}</h4><div className="list">{recent.map(e => row(e, 'r'))}</div></>}
    {/* D67: every match hidden by the gym, the hidden line comes first, clear of the keyboard */}
    {!(list.length === 0 && hidden.length > 0) && <>
      <h4 className="sec">{browsing ? t('All Exercises') : tn('{0} exercise', '{0} exercises', list.length)}</h4>
      <div className="list">
        {list.slice(0, shown).map(e => row(e, 'a'))}
        {list.length === 0 && <div className="empty">{t('No exercises found')}
          {q.trim() && <button type="button" className="btn hv-pk-create" onClick={create}>{t('Create “{0}”', q.trim())}</button>}</div>}
      </div>
    </>}
    {list.length > shown && <button ref={moreRef} className="btn hv-pk-more" onClick={() => setShown(s => s + PAGE)}>{t('Show more')}</button>}
    {hidden.length > 0 && (showHidden
      ? <><h4 className="sec">{t('Not at {0}', profile?.name)}</h4><div className="list">{hidden.slice(0, showHidden).map(e => row(e, 'h', t('Needs {0}', gymLacks(profile, e).map(k => t(k)).join(', '))))}</div>
        {hidden.length > showHidden && <button className="btn hv-pk-more" onClick={() => setShowHidden(n => n + PAGE)}>{t('Show more')}</button>}</>
      : <button className="hv-pk-hidden" onClick={() => setShowHidden(PAGE)}>
        <span>{t('{0} hidden at {1}', hidden.length, profile?.name)}</span><span className="hv-link">{t('Show')}</span>
      </button>)}
    {swap && <p className="small dim hv-pk-note">{t('A swap is for this workout only.')}</p>}
    {multi && picked.length > 0 && <div className={'hv-pk-add' + (after && canLink ? ' three' : '')}>
      {canLink && <button className="btn" onClick={addSuperset}>{t('Add superset')}</button>}
      {after && <button className="btn hv-pk-insert" onClick={() => addPicked(false)}>{insertLabel(after)}</button>}
      <button className="btn primary" onClick={() => addPicked()}>{after ? t('Add to end') : picked.length === 1 ? t('Add 1 exercise') : t('Add {0} exercises', picked.length)}</button>
    </div>}
  </div>
}

// `backups` (D45): the slot's planned backups, which upstream's swaps pass.
export const exercisePickerSheet = (onPick, { title, like, backups } = {}) => {
  const swap = title === t('Swap exercise')
  // D46: a swap's pick is learned for the session's gym.
  const pick = swap ? armSwap(() => useStore.getState().S, like, onPick) : onPick
  return useUI.getState().openSheet(close => <ExerciseList onPick={pick} title={title} like={like} backups={backups} close={close} />)
}

// Lifts → All exercises (reference/SCREENS.md §8): the list to browse, Create, and openGym's own
// By muscle explorer (upstream's /muscles) one tap away.
export function Exercises() {
  const nav = useNavigate()
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/lifts'))
  return <ExerciseList browse={({ create }) => <PageBar title={t('Exercises')} onBack={back}>
    <button type="button" className="iconbtn" aria-label={t('By muscle')} onClick={() => nav('/muscles')}><Icon name="figureStrength" /></button>
    <button type="button" className="hv-link" onClick={create}>{t('Create')}</button>
  </PageBar>} />
}

/** Points upstream's exercisePicker at this sheet (seam S13). */
export function installExercisePicker() { hooks.exercisePicker = exercisePickerSheet }
