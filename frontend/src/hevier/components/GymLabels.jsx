// The workout's gym line and a machine exercise's brand line (hevier/DECISIONS.md D28), a cable's
// setup beside the brand (D43), with the sheets that change them, and the gym picker's nearby and
// custom gyms (D47). The gyms are upstream's equipment profiles, managed in Settings →
// Equipment; the logic is hevier/lib/gym-labels.js.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { menuSheet } from '../../sheets.jsx'
import Icon from '../../components/Icon.jsx'
import HvIcon from './HvIcon.jsx'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import {
  gymsOf, gymName, workoutGym, entryBrand, setWorkoutGym, setEntryBrand, knownBrands, hasLabel, BRAND_MAX,
  CABLES, cableText, entryCable, setEntryCable, cableStamped, stampCable,
} from '../lib/gym-labels.js'
import {
  currentPosition, placesNear, ownHere, gymOfPlace, addGym, distanceText, RADIUS,
} from '../lib/nearby-gyms.js'

const update = fn => useStore.getState().update(fn, true)

/** The gym sheet (D28, D47): your gyms, gyms nearby on a tap, a custom one, no gym. */
export function gymSheet(nav) {
  const S = useStore.getState().S
  const cur = workoutGym(S, S.active)
  menuSheet({
    title: t('Gym'),
    sections: [
      { items: [
        ...gymsOf(S).map(g => ({ icon: 'figureStrength', label: g.name || t('Unnamed gym'), on: g.id === cur, onClick: () => update(s => setWorkoutGym(s, g.id)) })),
        { icon: 'xmark', label: t('No gym'), on: !cur, onClick: () => update(s => setWorkoutGym(s, null)) },
      ] },
      { items: [
        { icon: 'pin', label: t('Find gyms nearby'), sub: t('Sends your position to OpenStreetMap, once'), onClick: () => useUI.getState().openSheet(close => <NearbySheet close={close} />) },
        { icon: 'plus', label: t('Custom gym…'), onClick: () => useUI.getState().openSheet(close => <CustomGymSheet close={close} />) },
      ] },
      { items: [{ icon: 'gear', chevron: true, label: t('Manage gyms'), sub: t('Your equipment profiles'), onClick: () => nav('/settings/equipment') }] },
    ],
  })
}

/** The session's gym, under the stats row. */
export function GymRow() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const cur = workoutGym(S, S.active)
  return <button type="button" className="hv-gym" onClick={() => gymSheet(nav)}>
    <HvIcon name="mapPin" />{cur ? (gymName(S, cur) || t('Removed gym')) : t('No gym')}
    <Icon name="chevronDown" className="hv-gym-chev" />
  </button>
}

// The phone's own position is never kept as a gym's place (picked at home, it would sync home's
// coordinates): only a place picked from OpenStreetMap carries one.
const pickGym = id => update(s => setWorkoutGym(s, id))

const WHY = {
  denied: 'Location isn’t allowed for Go Hevier. Allow it in the phone’s settings, or add the gym by name.',
  off: 'Location is switched off. Switch it on, or add the gym by name.',
  nofix: 'Couldn’t find where you are. Try again outdoors, or add the gym by name.',
  net: 'OpenStreetMap didn’t answer. Try again in a moment, or add the gym by name.',
}

/** "Find gyms nearby" (D47): the position once, then OpenStreetMap's gyms around it. */
export function NearbySheet({ close, locate = currentPosition, places = placesNear }) {
  const [st, setSt] = useState({ step: 'locating' })
  const turn = useRef(0)
  const run = () => {
    const mine = ++turn.current
    const set = v => { if (turn.current === mine) setSt(v) }
    set({ step: 'locating' })
    locate().then(
      here => { set({ step: 'searching', here }); return places(here).then(found => set({ step: 'done', here, found }), () => set({ step: 'error', why: 'net', here })) },
      e => set({ step: 'error', why: WHY[e?.code] ? e.code : 'nofix' }))
  }
  useEffect(() => { run(); return () => { turn.current = -1 } }, [])
  const S = useStore(s => s.S)
  const cur = workoutGym(S, S.active)
  const here = st.here
  const own = here ? ownHere(S, here) : []
  const ownIds = new Set(own.map(g => g.id))
  const choose = fn => () => { close(); fn() }
  const item = (key, { label, sub, on, onClick }) => <div key={key} className="item menu-item" {...tappable(onClick)}>
    <span className="lrow-i"><Icon name="figureStrength" /></span>
    <div className="grow"><div className="tt">{label}</div>{sub && <div className="ss">{sub}</div>}</div>
    {on != null && <span className={'menu-on' + (on ? ' is-on' : '')}><Icon name="check" /></span>}
  </div>
  return <div className="hv-nearby">
    <h3 style={{ marginBottom: 2 }}>{t('Gyms nearby')}</h3>
    <div className="muted small" style={{ marginBottom: 10 }}>{t('Your position goes to OpenStreetMap for this search only, and isn’t kept.')}</div>
    {(st.step === 'locating' || st.step === 'searching') && <p className="dim">{st.step === 'locating' ? t('Finding where you are…') : t('Asking OpenStreetMap…')}</p>}
    {st.step === 'error' && <>
      <p className="dim">{t(WHY[st.why])}</p>
      <button type="button" className="btn" style={{ width: '100%' }} onClick={run}>{t('Try again')}</button>
    </>}
    {own.length > 0 && <div className="menu-group grouped">
      <div className="menu-sec">{t('Your gyms here')}</div>
      <div className="list menu-list">{own.map(g => item(g.id, { label: g.name || t('Unnamed gym'), sub: distanceText(g.dist), on: g.id === cur, onClick: choose(() => pickGym(g.id)) }))}</div>
    </div>}
    {st.step === 'done' && <div className="menu-group grouped">
      <div className="menu-sec">{t('Nearby')}</div>
      {st.found.length
        ? <div className="list menu-list">{st.found.map(p => {
          const mine = gymOfPlace(S, p.osm)
          if (mine && ownIds.has(mine.id)) return null
          const sub = [mine ? t('Your gym {0}', mine.name || t('Unnamed gym')) : p.sub, distanceText(p.dist)].filter(Boolean).join(' · ')
          return item(p.osm, { label: p.label, sub, on: mine ? mine.id === cur : undefined,
            onClick: choose(() => mine ? pickGym(mine.id) : update(s => setWorkoutGym(s, addGym(s, p.label, p)))) })
        })}</div>
        : <p className="dim">{t('No gyms on OpenStreetMap within {0}.', distanceText(RADIUS))}</p>}
    </div>}
    {here && <div className="menu-group grouped"><div className="list menu-list">
      {gymsOf(S).filter(g => !ownIds.has(g.id)).map(g => item(g.id, { label: g.name || t('Unnamed gym'), sub: t('Your gym'), on: g.id === cur, onClick: choose(() => pickGym(g.id)) }))}
    </div></div>}
    <button type="button" className="btn ghost" style={{ width: '100%', marginTop: 8 }}
      onClick={() => { close(); useUI.getState().openSheet(c => <CustomGymSheet close={c} />) }}><Icon name="plus" /> {t('Custom gym…')}</button>
    <div className="small dim" style={{ marginTop: 8 }}>{t('Gym data © OpenStreetMap contributors')}</div>
  </div>
}

/** "Custom gym…" (D47): a gym by name, made one of your gyms and picked. */
export function CustomGymSheet({ close }) {
  const [v, setV] = useState('')
  const save = () => {
    const name = v.trim()
    if (!name) return
    close()
    update(s => setWorkoutGym(s, addGym(s, name)))
  }
  return <form className="hv-namesheet" onSubmit={e => { e.preventDefault(); save() }}>
    <h3>{t('Custom gym')}</h3>
    <p className="small dim">{t('Added to your gyms, with the equipment of the gym you’re at now. Change it under Manage gyms.')}</p>
    <input className="input" autoFocus value={v} maxLength={60} placeholder={t('Gym name')} aria-label={t('Gym name')} onChange={e => setV(e.target.value)} />
    <button type="submit" className="btn primary" disabled={!v.trim()}>{t('Add gym')}</button>
  </form>
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

/** A machine or cable exercise's brand, under its name (any exercise's once it has one); a cable's setup beside it. */
export function BrandLine({ idx }) {
  const S = useStore(s => s.S)
  const e = S.active?.entries?.[idx]
  const cable = e ? entryCable(S, S.active, idx) : null
  // Two stacks are logged per stack (D43): the session's entry says so, as a dumbbell's does.
  const stale = !!cable && !cableStamped(e, cable)
  useEffect(() => { if (stale) update(s => stampCable(s.active?.entries?.[idx], cable)) }, [stale, idx, cable])
  if (!e || !hasLabel(S, S.active, idx)) return null
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
