// The workout's gym line and a machine exercise's brand line (hevier/DECISIONS.md D28), with the
// sheets that change them. The gyms are upstream's equipment profiles, managed in Settings →
// Equipment; the logic is hevier/lib/gym-labels.js.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { menuSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import {
  gymsOf, gymName, workoutGym, entryBrand, setWorkoutGym, setEntryBrand, knownBrands, isMachine, BRAND_MAX,
} from '../lib/gym-labels.js'

const update = fn => useStore.getState().update(fn, true)

/** The session's gym, under the stats row. Shown once there is a gym to pick. */
export function GymRow() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const gyms = gymsOf(S)
  const cur = workoutGym(S, S.active)
  if (!gyms.length && !cur) return null
  const pick = () => menuSheet({
    title: t('Gym'),
    sections: [
      { items: [
        ...gyms.map(g => ({ icon: 'figureStrength', label: g.name || t('Unnamed gym'), on: g.id === cur, onClick: () => update(s => setWorkoutGym(s, g.id)) })),
        { icon: 'xmark', label: t('No gym'), on: !cur, onClick: () => update(s => setWorkoutGym(s, null)) },
      ] },
      { items: [{ icon: 'gear', chevron: true, label: t('Manage gyms'), sub: t('Your equipment profiles'), onClick: () => nav('/settings/equipment') }] },
    ],
  })
  return <button type="button" className="hv-gym" onClick={pick}>
    <Icon name="figureStrength" />{cur ? (gymName(S, cur) || t('Removed gym')) : t('No gym')}
    <Icon name="chevronDown" className="hv-gym-chev" />
  </button>
}

function BrandSheet({ idx, close }) {
  const S = useStore.getState().S
  const [v, setV] = useState(entryBrand(S, S.active, idx) || '')
  const brands = knownBrands(S)
  const save = b => { close(); update(s => setEntryBrand(s, idx, b)) }
  const editing = S.active?.editingWorkoutId != null
  const gym = gymName(S, workoutGym(S, S.active))
  return <form className="hv-namesheet" onSubmit={e => { e.preventDefault(); save(v) }}>
    <h3>{t('Machine label')}</h3>
    <p className="small dim">{editing
      ? t('Only this workout changes.')
      : gym ? t('Used for this exercise at {0} from now on.', gym) : t('Used for this exercise from now on.')}</p>
    <input className="input" autoFocus value={v} maxLength={BRAND_MAX} placeholder={t('Brand or machine, e.g. Life Fitness')}
      aria-label={t('Machine label')} onChange={e => setV(e.target.value)} />
    {brands.length > 0 && <div className="hv-xd-chips">{brands.map(b =>
      <button key={b} type="button" className={'chip nocap' + (b === v ? ' on' : '')} onClick={() => save(b)}>{b}</button>)}</div>}
    <button type="submit" className="btn primary">{t('Save')}</button>
    {entryBrand(S, S.active, idx) && <button type="button" className="btn ghost dim" onClick={() => save('')}>{t('Remove label')}</button>}
  </form>
}

export const brandSheet = idx => useUI.getState().openSheet(close => <BrandSheet idx={idx} close={close} />)

/** A machine or cable exercise's brand, under its name. */
export function BrandLine({ idx }) {
  const S = useStore(s => s.S)
  const e = S.active?.entries?.[idx]
  if (!e || !isMachine(e.id)) return null
  const b = entryBrand(S, S.active, idx)
  return <button type="button" className={'hv-brand' + (b ? ' has' : '')} onClick={() => brandSheet(idx)}>
    <Icon name="machine" />{b || t('Add machine label')}
  </button>
}
