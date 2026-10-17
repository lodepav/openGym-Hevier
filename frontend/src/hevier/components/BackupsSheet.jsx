// The routine editor's ⋮ → Backups (hevier/DECISIONS.md D45): upstream 1.4.2's BackupsSheet
// (sheets.jsx), drawn in the fork's look. The slot's planned backups, each removable, and added
// from the library with the picker a swap uses, opened on the same muscle. Saves as it goes, as
// the fork's routine editor does (D15).
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor } from '../../lib/i18n.js'
import { EXIDX } from '../../lib/exercises.js'
import Icon from '../../components/Icon.jsx'
import { Thumb } from '../../components/Media.jsx'
import { exercisePickerSheet } from '../views/ExercisePickerHevy.jsx'
import { cleanBackups, withBackups, MAX_BACKUPS } from '../lib/routine-backups.js'

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

export function BackupsSheet({ rid, i, exId, close }) {
  const slot = useStore(s => s.S.routines.find(r => r.id === rid)?.ex?.[i])
  if (!slot || slot.id !== exId) return null
  const ex = EXIDX[exId]
  const subs = cleanBackups(slot.subs, exId, known)
  const add = () => {
    const picker = exercisePickerSheet(pick => {
      picker.close()
      setBackups(rid, i, exId, [...subs, pick.id])
    }, { title: t('Add a backup'), like: exId })
  }
  return <>
    <h3>{t('Backups for {0}', ex ? exerciseNameFor(ex) : '')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Machine taken? Pick what you’d do instead, and a swap mid-workout offers these first.')}</div>
    {subs.length > 0 && <div className="list hv-backups" style={{ marginBottom: 12 }}>
      {subs.map(id => EXIDX[id]).map(b => <div key={b.id} className="item hv-pk-row">
        <span className="hv-thumb"><Thumb ex={b} /></span>
        <div className="grow">
          <div className="tt">{exerciseNameFor(b)}</div>
          <div className="ss capitalize">{t(b.eq)}</div>
        </div>
        <button type="button" className="iconbtn" aria-label={t('Remove “{0}”', exerciseNameFor(b))}
          onClick={() => setBackups(rid, i, exId, subs.filter(x => x !== b.id))}><Icon name="xmark" /></button>
      </div>)}
    </div>}
    {subs.length < MAX_BACKUPS
      ? <button type="button" className="btn" style={{ width: '100%' }} onClick={add}><Icon name="plus" /> {t('Add a backup')}</button>
      : <div className="small dim">{t('That’s plenty of backups.')}</div>}
    <div style={{ height: 8 }} />
    <button type="button" className="btn primary" style={{ width: '100%' }} onClick={close}>{t('Done')}</button>
  </>
}
