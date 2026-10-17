// Hevy's Add Exercise picker (reference/SCREENS.md §8). Seam S13 sends
// upstream's exercisePicker here, so the workout's Add Exercise, the routine editor's Add and
// Replace, a swap and Structural balance all get it. Adding picks several (✓ circles, then "Add 2
// exercises"); a Replace, a swap or any other titled pick takes one tap. Each pick goes through the
// caller's own `onPick(ex, true)`, upstream's quick add with the default config, so what an added
// exercise starts with is upstream's. The search and ranking are upstream's too. The same list,
// browsing (no ✓, a tap opens exercise details), is the fork's Exercises page (Profile → Exercises).
// "Add superset" adds the ticked exercises the same way, then links them with upstream's superset
// pairing, through the target the open workout or routine editor registers (useSupersetTarget).
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { EXIDX, allExercises, equipmentOf, searchExercises } from '../../lib/exercises.js'
import { activeProfile, exAvailable } from '../../lib/equipment.js'
import { isFav, sortFavouritesFirst, sortYoursFirst, usageOf } from '../../lib/favourites.js'
import { useSheetKeyboard, tappable } from '../../lib/use-sheet-keyboard.js'
import { useAutoMore } from '../../lib/use-auto-more.js'
import { menuSheet, customExSheet, exerciseDetailSheet } from '../../sheets.jsx'
import { Thumb } from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import { hooks } from '../hooks.js'
import { cleanBackups, swapBackups } from '../lib/routine-backups.js'
import { armSwap } from '../lib/gym-backups-run.js'
import { muscleOf, muscleOptions, recentIds, filterPicker, addedRun, brandsByExercise, brandMatches } from '../lib/exercise-picker.js'

const PAGE = 50
const MINE = '@'   // the equipment filter's "what the active profile has"

// What "Add superset" links into: { items() -> the list the picks were added to, end() -> the
// index of the last one added, pair(i, j) -> links two neighbours }. Set while a screen that adds
// exercises is open; with none, the picker offers no superset.
let supersetTarget = null
export function useSupersetTarget(target) {
  useEffect(() => { supersetTarget = target; return () => { if (supersetTarget === target) supersetTarget = null } })
}

function ExerciseList({ onPick, title, like, close, browse, backups }) {
  const st = useStore(s => s.S)
  const all = allExercises(st)
  const profile = activeProfile(st)
  const likeEx = like ? (EXIDX[like] || all.find(e => e.id === like) || null) : null
  // Adding takes several at once; a titled pick (Replace, swap, Change exercise) takes one.
  const multi = !title && !browse
  const [q, setQ] = useState('')
  // A swap opens on what trains the same muscle, as upstream's does (#473).
  const [muscle, setMuscle] = useState(() => muscleOf(likeEx))
  const [eq, setEq] = useState(profile ? MINE : '')
  const [picked, setPicked] = useState([])
  const [shown, setShown] = useState(PAGE)
  const searchRef = useRef(null)
  const onSearchFocus = useSheetKeyboard(searchRef)
  const moreRef = useAutoMore(() => setShown(s => s + PAGE))

  const avail = eq === MINE && profile ? e => exAvailable(st, e) : null
  const base = filterPicker(all, { muscle, eq: eq === MINE ? '' : eq, avail }).filter(e => e.id !== like)
  let list = searchExercises(base, q)
  list = q.trim() ? sortYoursFirst(list, st, usageOf(st)) : sortFavouritesFirst(list, st)
  // D36: exercises a typed brand reaches come first, with the brand under the name.
  const byBrand = q.trim() ? brandMatches(base, brandsByExercise(st), q, searchExercises) : []
  const brandOf = new Map(byBrand.map(m => [m.ex.id, m.brand]))
  if (byBrand.length) list = [...byBrand.map(m => m.ex), ...list.filter(e => !brandOf.has(e.id))]
  // Same equipment first on a swap: a taken machine is usually swapped for the same kind of kit.
  if (likeEx?.eq && !q.trim()) list = [...list].sort((a, b) => Number(b.eq === likeEx.eq) - Number(a.eq === likeEx.eq))
  // Browsing (nothing typed or narrowed) shows Recent Exercises above everything.
  const browsing = !q.trim() && !muscle && (eq === '' || eq === MINE)
  const recent = browsing
    ? recentIds(st).map(id => EXIDX[id] || all.find(e => e.id === id)).filter(e => e && e.id !== like && !e.missing)
    : []

  // D45: the slot's planned backups first, while nothing is typed (upstream 1.4.2's "Your backups").
  const backupList = q.trim() ? [] : cleanBackups(backups, like).map(id => EXIDX[id] || all.find(e => e.id === id)).filter(e => e && !e.missing)

  const isOn = e => picked.some(p => p.id === e.id)
  const tap = e => {
    if (browse) { exerciseDetailSheet(e); return }
    if (!multi) { onPick(e, true); return }
    setPicked(cur => (cur.some(p => p.id === e.id) ? cur.filter(p => p.id !== e.id) : [...cur, e]))
  }
  const addPicked = () => { close(); picked.forEach(e => onPick(e, true)) }
  const canLink = multi && picked.length > 1 && !!supersetTarget
  const addSuperset = () => {
    const target = supersetTarget
    addPicked()
    const first = addedRun(target.items(), target.end(), picked.map(e => e.id))
    for (let i = first; first >= 0 && i < first + picked.length - 1; i++) target.pair(i, i + 1)
  }
  const reset = fn => v => { fn(v); setShown(PAGE) }

  const openEquipment = () => menuSheet({
    title: t('Equipment'),
    items: [
      { label: t('All Equipment'), on: eq === '', onClick: () => reset(setEq)('') },
      profile && { icon: 'kettlebell', label: t('What you have in "{0}"', profile.name), on: eq === MINE, onClick: () => reset(setEq)(MINE) },
      ...equipmentOf(all).map(x => ({ label: <span className="capitalize">{t(x)}</span>, on: eq === x, onClick: () => reset(setEq)(x) })),
    ],
  })
  const openMuscles = () => menuSheet({
    title: t('Muscles'),
    items: [
      { label: t('All Muscles'), on: !muscle, onClick: () => reset(setMuscle)('') },
      ...muscleOptions(all).map(m => ({ label: t(m), on: muscle === m, onClick: () => reset(setMuscle)(m) })),
    ],
  })
  const create = () => customExSheet(null, ex => { if (!ex) return; if (browse) exerciseDetailSheet(ex); else if (multi) setPicked(cur => [...cur, ex]); else onPick(ex, true) }, q.trim())

  const row = (e, key) => <div key={key + e.id} className={'item hv-pk-row' + (isOn(e) ? ' on' : '')} {...tappable(() => tap(e))}>
    <button className="hv-thumb" aria-label={t('Details')} onClick={ev => { ev.stopPropagation(); exerciseDetailSheet(e) }}><Thumb ex={e} /></button>
    <div className="grow">
      <div className={'tt ' + exerciseNameClass(e)}>{isFav(st, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</div>
      <div className="ss">{[t(muscleOf(e)), brandOf.get(e.id)].filter(Boolean).join(' · ')}</div>
    </div>
    {multi ? <span className={'hv-pk-check' + (isOn(e) ? ' on' : '')}>{isOn(e) && <Icon name="check" />}</span> : <Icon name="chevronRight" className="chev" />}
  </div>

  const eqLabel = eq === MINE ? profile?.name : eq ? t(eq) : t('All Equipment')
  return <div className="hv-pk">
    {browse ? browse({ create }) : <div className="hv-pk-hd">
      <h3>{title || t('Add Exercise')}</h3>
      <button className="hv-link" onClick={create}>{t('Create')}</button>
    </div>}
    <div className="picker-search"><div className="search-row"><div className={'search' + (q ? ' has-clear' : '')}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input ref={searchRef} className="input" placeholder={t('Search exercise')} value={q} onFocus={onSearchFocus} onChange={e => reset(setQ)(e.target.value)} />
      {q && <button className="clear" onClick={() => reset(setQ)('')} aria-label={t('Clear')}><Icon name="xmark" /></button>}</div></div></div>
    <div className="hv-pk-filters">
      <button className={'btn' + (eq && eq !== MINE ? ' on' : '')} onClick={openEquipment}><span className="capitalize">{eqLabel}</span></button>
      <button className={'btn' + (muscle ? ' on' : '')} onClick={openMuscles}>{muscle ? t(muscle) : t('All Muscles')}</button>
    </div>
    {backupList.length > 0 && <><h4 className="sec">{t('Your backups')}</h4><div className="list">{backupList.map(e => row(e, 'b'))}</div></>}
    {recent.length > 0 && <><h4 className="sec">{t('Recent Exercises')}</h4><div className="list">{recent.map(e => row(e, 'r'))}</div></>}
    <h4 className="sec">{browsing ? t('All Exercises') : t('{0} exercises', list.length)}</h4>
    <div className="list">
      {list.slice(0, shown).map(e => row(e, 'a'))}
      {list.length === 0 && <div className="empty">{t('No exercises found')}</div>}
    </div>
    {list.length > shown && <button ref={moreRef} className="btn hv-pk-more" onClick={() => setShown(s => s + PAGE)}>{t('Show more')}</button>}
    {multi && picked.length > 0 && <div className="hv-pk-add">
      {canLink && <button className="btn" onClick={addSuperset}>{t('Add superset')}</button>}
      <button className="btn primary" onClick={addPicked}>{picked.length === 1 ? t('Add 1 exercise') : t('Add {0} exercises', picked.length)}</button>
    </div>}
  </div>
}

// `backups` (D45): the slot's planned backups. Upstream's v1.4.1 swap does not pass them (1.4.2's
// does), so a swap of the running workout's exercise reads them from its entry.
export const exercisePickerSheet = (onPick, { title, like, backups } = {}) => {
  const swap = title === t('Swap exercise')
  const list = backups ?? (swap ? swapBackups(useStore.getState().S, like) : null)
  // D46: a swap's pick is learned for the session's gym.
  const pick = swap ? armSwap(() => useStore.getState().S, like, onPick) : onPick
  return useUI.getState().openSheet(close => <ExerciseList onPick={pick} title={title} like={like} backups={list} close={close} />)
}

// Profile → Exercises (reference/SCREENS.md §8): the list to browse, Create, and openGym's own
// By muscle explorer (upstream's /muscles) one tap away.
export function Exercises() {
  const nav = useNavigate()
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/profile'))
  return <ExerciseList browse={({ create }) => <div className="hv-pagebar">
    <button type="button" className="iconbtn" aria-label={t('Back')} onClick={back}><Icon name="chevronLeft" /></button>
    <div className="hv-title">{t('Exercises')}</div>
    <button type="button" className="iconbtn" aria-label={t('By muscle')} onClick={() => nav('/muscles')}><Icon name="figureStrength" /></button>
    <button type="button" className="hv-link" onClick={create}>{t('Create')}</button>
  </div>} />
}

/** Points upstream's exercisePicker at this sheet (seam S13). */
export function installExercisePicker() { hooks.exercisePicker = exercisePickerSheet }
