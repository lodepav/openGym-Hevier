// Equipment by group (hevier/DECISIONS.md D63): a gym's checklist (seam S36) and the exercise
// picker's equipment filter show the groups of hevier/lib/equip-groups.js, each with a chevron at
// its right edge that opens its kinds. A group is chosen or ticked as one; a kind on its own too.
import { Fragment, useState } from 'react'
import { t } from '../../lib/i18n.js'
import Icon from '../../components/Icon.jsx'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import { groupKinds, groupState, toggleGroup, groupValue, groupIdOf, groupOf, eqOnAmong, eqMatches } from '../lib/equip-groups.js'

const Chevron = ({ open, label, onClick, className }) => <button type="button" className={className}
  aria-expanded={open} aria-label={open ? t('Hide {0}', label) : t('Show {0}', label)}
  onClick={ev => { ev.stopPropagation(); onClick() }}><Icon name={open ? 'chevronUp' : 'chevronDown'} /></button>

/** A gym's checklist: a chip per group, ticking all its kinds, its chevron opening them one by one. */
export function GymEquipmentChips({ kinds, checked, setChecked }) {
  const [open, setOpen] = useState(() => new Set())
  const flip = id => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggle = k => setChecked(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  return <div className="hv-eqg">
    {groupKinds(kinds).map(g => {
      const state = groupState(g.kinds, checked)
      const label = t(g.label)
      const many = g.kinds.length > 1
      const isOpen = many && open.has(g.id)
      return <Fragment key={g.id}>
        <span className={'chip hv-eqg-chip' + (state === 'all' ? ' on' : state === 'some' ? ' some' : '')}>
          <button type="button" className="hv-eqg-t" aria-pressed={state === 'all'} onClick={() => setChecked(s => toggleGroup(s, g.kinds))}>
            {label}{state === 'some' && <span className="dim"> {g.kinds.filter(k => checked.has(k)).length}/{g.kinds.length}</span>}
          </button>
          {many && <Chevron open={isOpen} label={label} className="hv-eqg-x" onClick={() => flip(g.id)} />}
        </span>
        {isOpen && <div className="hv-eqg-sub">
          {g.kinds.map(k => <button key={k} type="button" className={'chip' + (checked.has(k) ? ' on' : '')}
            aria-pressed={checked.has(k)} onClick={() => toggle(k)}>{t(k)}</button>)}
        </div>}
      </Fragment>
    })}
  </div>
}

/**
 * The picker's equipment filter: All Equipment, your gyms, then the groups of `kinds`, each with
 * its chevron. `value` is '' (all), a kind, or a group's value; `gymId` the gym when one is on.
 */
export function EquipFilterSheet({ value, gyms, gymId, kinds, onAll, onGym, onEq, close }) {
  const at = groupIdOf(value) || (value && !gymId ? groupOf(value) : null)
  // A kind chosen before opens its group, so the tick is in sight.
  const [open, setOpen] = useState(() => new Set(at && !groupIdOf(value) ? [at] : []))
  const flip = id => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const pick = fn => () => { close(); fn() }
  const check = on => <span className={'menu-on' + (on ? ' is-on' : '')}><Icon name="check" /></span>
  const item = (key, label, on, onTap, extra = null, cls = '') => <div key={key} className={'item menu-item ' + cls} {...tappable(onTap)}>
    {extra?.icon && <span className="lrow-i"><Icon name={extra.icon} /></span>}
    <div className="grow"><div className="tt">{label}</div></div>
    {check(on)}
    {extra?.chevron}
  </div>
  return <>
    <h3 style={{ marginBottom: 10 }}>{t('Equipment')}</h3>
    <div className="menu-group grouped"><div className="list menu-list">
      {item('all', t('All Equipment'), !value && !gymId, pick(onAll))}
    </div></div>
    {gyms.length > 0 && <div className="menu-group grouped">
      <div className="menu-sec">{t('Gyms')}</div>
      <div className="list menu-list">
        {gyms.map(g => item(g.id, g.name, gymId === g.id, pick(() => onGym(g.id)), { icon: 'house' }))}
      </div>
    </div>}
    <div className="menu-group grouped">
      <div className="menu-sec">{t('Equipment')}</div>
      <div className="list menu-list">
        {groupKinds(kinds).map(g => {
          const many = g.kinds.length > 1
          const isOpen = many && open.has(g.id)
          const label = t(g.label)
          // A group of one is that kind.
          const v = many ? groupValue(g.id) : g.kinds[0]
          return <Fragment key={g.id}>
            {item(g.id, label, !gymId && value === v, pick(() => onEq(v)),
              { chevron: many && <Chevron open={isOpen} label={label} className="iconbtn hv-eqg-x" onClick={() => flip(g.id)} /> })}
            {isOpen && g.kinds.map(k => item(k, <span className="capitalize">{t(k)}</span>, !gymId && value === k, pick(() => onEq(k)), null, 'hv-eqg-kind'))}
          </Fragment>
        })}
      </div>
    </div>
  </>
}

/**
 * The muscle explorer's equipment strip (seam S38): Any equipment, then a chip per group, its
 * chevron opening a second strip of its kinds. `value` is '' (any), a kind or a group's value.
 */
export function EquipChipStrip({ kinds, value, onChange }) {
  const groups = groupKinds(kinds)
  // A kind chosen opens its group's strip, so the choice is in sight.
  const [open, setOpen] = useState(() => (value && !groupIdOf(value) ? groupOf(value) : null))
  const shut = open && groups.find(g => g.id === open)?.kinds.length > 1 ? open : null
  const sub = shut ? groups.find(g => g.id === shut) : null
  const inGroup = id => value === groupValue(id) || (!groupIdOf(value) && value && groupOf(value) === id)
  return <>
    <div className="chips" style={{ marginBottom: sub ? 6 : 12 }}>
      <button className={'chip nocap' + (!value ? ' on' : '')} onClick={() => onChange('')}>{t('Any equipment')}</button>
      {groups.map(g => {
        const many = g.kinds.length > 1
        const v = many ? groupValue(g.id) : g.kinds[0]
        const label = t(g.label)
        return <span key={g.id} className={'chip hv-eqg-chip' + (value === v ? ' on' : inGroup(g.id) ? ' some' : '')}>
          <button type="button" className="hv-eqg-t" aria-pressed={value === v} onClick={() => onChange(value === v ? '' : v)}>{label}</button>
          {many && <Chevron open={shut === g.id} label={label} className="hv-eqg-x" onClick={() => setOpen(o => (o === g.id ? null : g.id))} />}
        </span>
      })}
    </div>
    {sub && <div className="chips hv-eqg-strip" style={{ marginBottom: 12 }}>
      {sub.kinds.map(k => <button key={k} className={'chip' + (value === k ? ' on' : '')} aria-pressed={value === k}
        onClick={() => onChange(value === k ? groupValue(sub.id) : k)}>{t(k)}</button>)}
    </div>}
  </>
}

/** Seam S38's hand-off. */
export const equipChips = { on: eqOnAmong, has: eqMatches, Chips: EquipChipStrip }
