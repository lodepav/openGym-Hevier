// The workout's gym line and a machine exercise's brand line (hevier/DECISIONS.md D28), a cable's
// setup beside the brand (D43), with the sheets that change them. The gyms are upstream's equipment profiles, managed in Settings →
// Equipment; the logic is hevier/lib/gym-labels.js.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { menuSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import {
  gymsOf, gymName, workoutGym, entryBrand, setWorkoutGym, setEntryBrand, knownBrands, isMachine, BRAND_MAX,
  CABLES, cableText, entryCable, setEntryCable, cableStamped, stampCable,
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

const CABLE_NAME = { '1:1': 'Single pulley', '2:1': 'Double pulley', x2: 'Two stacks' }
const CABLE_SUB = { '1:1': 'One cable, the stack’s weight', '2:1': 'The stack’s weight, half at the handle', x2: 'Both stacks loaded: the weight of one, counted twice' }

export function cableSheet(idx) {
  const S = useStore.getState().S
  const cur = entryCable(S, S.active, idx)
  const editing = S.active?.editingWorkoutId != null
  const gym = gymName(S, workoutGym(S, S.active))
  menuSheet({
    title: t('Cable setup'),
    subtitle: editing ? t('Only this workout changes.') : gym ? t('Used for this exercise at {0} from now on.', gym) : t('Used for this exercise from now on.'),
    items: CABLES.map(c => ({ label: t(CABLE_NAME[c]) + ' · ' + cableText(c), sub: t(CABLE_SUB[c]), on: c === cur,
      onClick: () => update(s => setEntryCable(s, idx, c)) })),
  })
}

/** A machine or cable exercise's brand, under its name; a cable's setup beside it. */
export function BrandLine({ idx }) {
  const S = useStore(s => s.S)
  const e = S.active?.entries?.[idx]
  const cable = e ? entryCable(S, S.active, idx) : null
  // Two stacks are logged per stack (D43): the session's entry says so, as a dumbbell's does.
  const stale = !!cable && !cableStamped(e, cable)
  useEffect(() => { if (stale) update(s => stampCable(s.active?.entries?.[idx], cable)) }, [stale, idx, cable])
  if (!e || !isMachine(e.id)) return null
  const b = entryBrand(S, S.active, idx)
  const brand = <button type="button" className={'hv-brand' + (b ? ' has' : '')} onClick={() => brandSheet(idx)}>
    <Icon name="machine" />{b || t('Add machine label')}
  </button>
  if (!cable) return brand
  return <div className="hv-labels">
    {brand}
    <button type="button" className={'hv-cable' + (cable !== '1:1' ? ' has' : '')} aria-label={t('Cable setup')} onClick={() => cableSheet(idx)}>
      {t('Cable')} {cableText(cable)}<Icon name="chevronDown" />
    </button>
  </div>
}
