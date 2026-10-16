// Hevy's Add Exercise picker (hevier/PLAN.md M3; reference/SCREENS.md §8). Seam S13 sends
// upstream's exercisePicker here, so the workout's Add Exercise, the routine editor's Add and
// Replace, a swap and Structural balance all get it. Adding picks several (✓ circles, then "Add 2
// exercises"); a Replace, a swap or any other titled pick takes one tap. Each pick goes through the
// caller's own `onPick(ex, true)`, upstream's quick add with the default config, so what an added
// exercise starts with is upstream's. The search and ranking are upstream's too.
import { useRef, useState } from 'react'
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
import { muscleOf, muscleOptions, recentIds, filterPicker } from '../lib/exercise-picker.js'

const PAGE = 50
const MINE = '@'   // the equipment filter's "what the active profile has"

function ExercisePickerHevy({ onPick, title, like, close }) {
  const st = useStore(s => s.S)
  const all = allExercises(st)
  const profile = activeProfile(st)
  const likeEx = like ? (EXIDX[like] || all.find(e => e.id === like) || null) : null
  // Adding takes several at once; a titled pick (Replace, swap, Change exercise) takes one.
  const multi = !title
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
  // Same equipment first on a swap: a taken machine is usually swapped for the same kind of kit.
  if (likeEx?.eq && !q.trim()) list = [...list].sort((a, b) => Number(b.eq === likeEx.eq) - Number(a.eq === likeEx.eq))
  // Browsing (nothing typed or narrowed) shows Recent Exercises above everything.
  const browsing = !q.trim() && !muscle && (eq === '' || eq === MINE)
  const recent = browsing
    ? recentIds(st).map(id => EXIDX[id] || all.find(e => e.id === id)).filter(e => e && e.id !== like && !e.missing)
    : []

  const isOn = e => picked.some(p => p.id === e.id)
  const tap = e => {
    if (!multi) { onPick(e, true); return }
    setPicked(cur => (cur.some(p => p.id === e.id) ? cur.filter(p => p.id !== e.id) : [...cur, e]))
  }
  const addPicked = () => { close(); picked.forEach(e => onPick(e, true)) }
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
  const create = () => customExSheet(null, ex => { if (!ex) return; if (multi) setPicked(cur => [...cur, ex]); else onPick(ex, true) }, q.trim())

  const row = (e, key) => <div key={key + e.id} className={'item hv-pk-row' + (isOn(e) ? ' on' : '')} {...tappable(() => tap(e))}>
    <button className="hv-thumb" aria-label={t('Details')} onClick={ev => { ev.stopPropagation(); exerciseDetailSheet(e) }}><Thumb ex={e} /></button>
    <div className="grow">
      <div className={'tt ' + exerciseNameClass(e)}>{isFav(st, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</div>
      <div className="ss">{t(muscleOf(e))}</div>
    </div>
    {multi ? <span className={'hv-pk-check' + (isOn(e) ? ' on' : '')}>{isOn(e) && <Icon name="check" />}</span> : <Icon name="chevronRight" className="chev" />}
  </div>

  const eqLabel = eq === MINE ? profile?.name : eq ? t(eq) : t('All Equipment')
  return <div className="hv-pk">
    <div className="hv-pk-hd">
      <h3>{title || t('Add Exercise')}</h3>
      <button className="hv-link" onClick={create}>{t('Create')}</button>
    </div>
    <div className="picker-search"><div className="search-row"><div className={'search' + (q ? ' has-clear' : '')}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input ref={searchRef} className="input" placeholder={t('Search exercise')} value={q} onFocus={onSearchFocus} onChange={e => reset(setQ)(e.target.value)} />
      {q && <button className="clear" onClick={() => reset(setQ)('')} aria-label={t('Clear')}><Icon name="xmark" /></button>}</div></div></div>
    <div className="hv-pk-filters">
      <button className={'btn' + (eq && eq !== MINE ? ' on' : '')} onClick={openEquipment}><span className="capitalize">{eqLabel}</span></button>
      <button className={'btn' + (muscle ? ' on' : '')} onClick={openMuscles}>{muscle ? t(muscle) : t('All Muscles')}</button>
    </div>
    {recent.length > 0 && <><h4 className="sec">{t('Recent Exercises')}</h4><div className="list">{recent.map(e => row(e, 'r'))}</div></>}
    <h4 className="sec">{browsing ? t('All Exercises') : t('{0} exercises', list.length)}</h4>
    <div className="list">
      {list.slice(0, shown).map(e => row(e, 'a'))}
      {list.length === 0 && <div className="empty">{t('No exercises found')}</div>}
    </div>
    {list.length > shown && <button ref={moreRef} className="btn hv-pk-more" onClick={() => setShown(s => s + PAGE)}>{t('Show more')}</button>}
    {multi && picked.length > 0 && <div className="hv-pk-add">
      <button className="btn primary" onClick={addPicked}>{picked.length === 1 ? t('Add 1 exercise') : t('Add {0} exercises', picked.length)}</button>
    </div>}
  </div>
}

export const exercisePickerSheet = (onPick, { title, like } = {}) =>
  useUI.getState().openSheet(close => <ExercisePickerHevy onPick={onPick} title={title} like={like} close={close} />)

/** Points upstream's exercisePicker at this sheet (seam S13). */
export function installExercisePicker() { hooks.exercisePicker = exercisePickerSheet }
