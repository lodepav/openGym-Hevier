// The workout's Reorder Exercises (reference/SCREENS.md §2, Hevy's ⇅ in the exercise ⋮ menu): every
// exercise as one collapsed row, a superset as one block, lifted by a long press or the grip and
// dropped into place. `onMove(from, to)` (HevyWorkout.jsx) moves the unit through upstream's own move.
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { exerciseNameText } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { supersetUnits } from '../../lib/history.js'
import { Thumb } from '../../components/Media.jsx'
import Icon from '../../components/Icon.jsx'
import { useDragReorder } from './useDragReorder.js'

export function ReorderExercisesSheet({ onMove, close }) {
  const entries = useStore(s => s.S.active?.entries) || []
  const units = supersetUnits(entries)
  const reorder = useDragReorder(units.length, onMove)
  // Keyed by what a unit holds, not where it is, so the grip keeps focus through an arrow-key move.
  const seen = {}
  const keyOf = u => { const k = u.map(i => entries[i].id).join('+'); seen[k] = (seen[k] || 0) + 1; return k + '#' + seen[k] }
  // data-nodrag: a row dragged down must not pull the sheet down with it (Modals.jsx's swipe to dismiss).
  return <>
    <h3>{t('Reorder exercises')}</h3>
    <div ref={reorder.listRef} data-nodrag="" className={'list hv-reorder' + (reorder.drag ? ' is-reordering' : '')}>
      {units.map((u, n) => <div key={keyOf(u)} data-reorder-row className={'hv-ro-unit' + (u.length > 1 ? ' ss' : '')}
        style={reorder.rowStyle(n)} {...reorder.press(n)}>
        {u.map(i => {
          const ex = exOr(entries[i].id)
          return <div key={i - u[0]} className="item hv-pk-row">
            <span className="hv-thumb"><Thumb ex={ex} /></span>
            <div className={'grow tt ' + exerciseNameClass(ex)}>{exerciseNameFor(ex)}</div>
            {units.length > 1 && <button type="button" className="hv-grip" aria-label={t('Move {0}', exerciseNameText(ex))} title={t('Drag to reorder')} {...reorder.handle(n)}><Icon name="grip" /></button>}
          </div>
        })}
      </div>)}
    </div>
    <button type="button" className="btn primary hv-ro-done" onClick={close}>{t('Done')}</button>
  </>
}

export const reorderExercisesSheet = onMove => useUI.getState().openSheet(close => <ReorderExercisesSheet onMove={onMove} close={close} />)
