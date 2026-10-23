// The routine editor's ⋮ → Backups (hevier/DECISIONS.md D45): upstream 1.4.2's BackupsSheet
// (sheets.jsx), drawn in the fork's look. The slot's planned backups, each removable, and added
// from the library with the picker a swap uses, opened on the same muscle. Saves as it goes, as
// the fork's routine editor does (D15). The backups are tried in their order, which a long press
// (or the hidden handle) changes, and each exercise, the slot's own too, can be marked missing at a
// gym: a workout there starts with the first one it has (D86).
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { EXIDX } from '../../lib/exercises.js'
import Icon from '../../components/Icon.jsx'
import { Thumb } from '../../components/Media.jsx'
import { exercisePickerSheet } from '../views/ExercisePickerHevy.jsx'
import { cleanBackups, withBackups, MAX_BACKUPS } from '../../lib/routine-backups.js'
import { useDragReorder } from './useDragReorder.js'
import { gymsOf } from '../lib/gym-labels.js'
import { missingAt, setMissing } from '../lib/gym-backups.js'

const known = id => !!EXIDX[id]

/** Writes the slot's backups (routine `rid`, index `i`, still holding `exId`). */
export function setBackups(rid, i, exId, list) {
  useStore.getState().update(s => {
    const slot = s.routines.find(r => r.id === rid)?.ex?.[i]
    if (!slot || slot.id !== exId) return
    delete slot.subs
    Object.assign(slot, withBackups(list, exId, known))
  })
}

// Which of your gyms have the exercise: a chip per gym, on where it is (D86).
function GymChips({ exId, gyms }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  if (!gyms.length) return null
  const ex = EXIDX[exId]
  return <div className="chips hv-bk-gyms">
    {gyms.map(g => {
      const has = !missingAt(S, exId, g.id)
      return <button key={g.id} type="button" className={'chip nocap' + (has ? ' on' : '')} aria-pressed={has}
        aria-label={t('{0} at {1}', ex ? exerciseNameFor(ex) : '', g.name)}
        onClick={() => update(s => { setMissing(s, exId, g.id, has) })}>{g.name}</button>
    })}
  </div>
}

export function BackupsSheet({ rid, i, exId, close }) {
  const slot = useStore(s => s.S.routines.find(r => r.id === rid)?.ex?.[i])
  const profiles = useStore(s => s.S.equipProfiles)
  const gyms = gymsOf({ equipProfiles: profiles })
  const subs = slot && slot.id === exId ? cleanBackups(slot.subs, exId, known) : []
  const reorder = useDragReorder(subs.length, (from, to) => {
    const next = [...subs]
    next.splice(to, 0, ...next.splice(from, 1))
    setBackups(rid, i, exId, next)
  })
  if (!slot || slot.id !== exId) return null
  const ex = EXIDX[exId]
  const add = () => {
    const picker = exercisePickerSheet(pick => {
      picker.close()
      setBackups(rid, i, exId, [...subs, pick.id])
    }, { title: t('Add a backup'), like: exId })
  }
  return <>
    <h3 className={ex ? exerciseNameClass(ex) : ''}>{t('Backups for {0}', ex ? exerciseNameFor(ex) : '')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Machine taken? Pick what you’d do instead, and a swap mid-workout offers these first.')}</div>
    {gyms.length > 0 && ex && <div className="list hv-backups" style={{ marginBottom: 12 }}>
      <div className="item hv-pk-row">
        <span className="hv-thumb"><Thumb ex={ex} /></span>
        <div className="grow">
          <div className={'tt ' + exerciseNameClass(ex)}>{exerciseNameFor(ex)}</div>
          <div className="ss">{t('In the routine')}</div>
          <GymChips exId={exId} gyms={gyms} />
        </div>
      </div>
    </div>}
    {subs.length > 0 && <div ref={reorder.listRef} className={'list hv-backups' + (reorder.drag ? ' is-reordering' : '')} style={{ marginBottom: 12 }}>
      {subs.map(id => EXIDX[id]).map((b, k) => <div key={b.id} data-reorder-row className="item hv-pk-row" style={reorder.rowStyle(k)} {...reorder.press(k)}>
        {subs.length > 1 && <button type="button" className="hv-grip" aria-label={t('Move {0}', exerciseNameFor(b))} title={t('Drag to reorder')} {...reorder.handle(k)}><Icon name="grip" /></button>}
        <span className="hv-thumb"><Thumb ex={b} /></span>
        <div className="grow">
          <div className={'tt ' + exerciseNameClass(b)}>{subs.length > 1 ? `${k + 1}. ` : ''}{exerciseNameFor(b)}</div>
          <div className="ss capitalize">{t(b.eq)}</div>
          <GymChips exId={b.id} gyms={gyms} />
        </div>
        <button type="button" className="iconbtn" aria-label={t('Remove “{0}”', exerciseNameFor(b))}
          onClick={() => setBackups(rid, i, exId, subs.filter(x => x !== b.id))}><Icon name="xmark" /></button>
      </div>)}
    </div>}
    {gyms.length > 0 && <div className="small dim" style={{ marginBottom: 12 }}>{t('Tap a gym that lacks an exercise: a workout there starts with the first backup it has. Hold a backup to change the order.')}</div>}
    {subs.length < MAX_BACKUPS
      ? <button type="button" className="btn" style={{ width: '100%' }} onClick={add}><Icon name="plus" /> {t('Add a backup')}</button>
      : <div className="small dim">{t('That’s plenty of backups.')}</div>}
    <div style={{ height: 8 }} />
    <button type="button" className="btn primary" style={{ width: '100%' }} onClick={close}>{t('Done')}</button>
  </>
}
