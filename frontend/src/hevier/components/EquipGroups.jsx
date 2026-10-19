// Equipment by group (hevier/DECISIONS.md D63): a gym's checklist (seam S36) and the exercise
// picker's equipment filter show the groups of hevier/lib/equip-groups.js, each with a chevron at
// its right edge that opens its kinds. A group is chosen or ticked as one; a kind on its own too.
import { Fragment, useState } from 'react'
import { t } from '../../lib/i18n.js'
import Icon from '../../components/Icon.jsx'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import { MUSCLES, MUSCLE_NAME } from '../../lib/muscles.js'
import { groupBy, groupOfMuscle, groupOfName, nameGroups, muscleGroupValue, muscleGroupIdOf, muscleGroupLabel, explorerShare } from '../lib/muscle-groups.js'
import { groupKinds, groupState, toggleGroup, groupValue, groupIdOf, groupOf, eqOnAmong, eqMatches } from '../lib/equip-groups.js'

const Chevron = ({ open, label, onClick, className }) => <button type="button" className={className}
  aria-expanded={open} aria-label={open ? t('Hide {0}', label) : t('Show {0}', label)}
  onClick={ev => { ev.stopPropagation(); onClick() }}><Icon name={open ? 'chevronUp' : 'chevronDown'} /></button>

const check = on => <span className={'menu-on' + (on ? ' is-on' : '')}><Icon name="check" /></span>
const menuItem = (key, label, on, onTap, extra = null, cls = '') => <div key={key} className={'item menu-item ' + cls} {...tappable(onTap)}>
  {extra?.icon && <span className="lrow-i"><Icon name={extra.icon} /></span>}
  <div className="grow"><div className="tt">{label}</div></div>
  {check(on)}
  {extra?.chevron}
</div>

/**
 * A grouped filter list: a row per group (`valueOf(g)`: a group of one is that kind), its chevron
 * after the tick opening the group's kinds, indented under it. `onPick(v)` returns the tap handler.
 */
function GroupRows({ groups, open, flip, item = menuItem, valueOf, isOn, onPick, kindLabel }) {
  return groups.map(g => {
    const many = g.kinds.length > 1
    const isOpen = many && open.has(g.id)
    const label = t(g.label)
    const v = valueOf(g)
    return <Fragment key={g.id}>
      {item(g.id, label, isOn(v), onPick(v),
        { chevron: many && <Chevron open={isOpen} label={label} className="iconbtn hv-eqg-x" onClick={() => flip(g.id)} /> })}
      {isOpen && g.kinds.map(k => item(k, kindLabel(k), isOn(k), onPick(k), null, 'hv-eqg-kind'))}
    </Fragment>
  })
}

const useOpen = first => {
  const [open, setOpen] = useState(() => new Set(first ? [first] : []))
  return [open, id => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })]
}

/**
 * A strip of group chips with a chevron at each one's right edge, an open group's kinds in a
 * second strip. `value` is '' (any), a kind or a group's value (`gv(id)`, read back by `gidOf`);
 * `kindGroup(k)` is a kind's group; `count(v)`, when given, is shown after a chip's name.
 */
export function GroupStrip({ groups, value, onChange, anyLabel, gv, gidOf, kindGroup, kindLabel = k => t(k), count, anyCls = 'chip nocap' }) {
  const [open, setOpen] = useState(() => (value && !gidOf(value) ? kindGroup(value) : null))
  const shut = open && groups.find(g => g.id === open)?.kinds.length > 1 ? open : null
  const sub = shut ? groups.find(g => g.id === shut) : null
  const inGroup = id => value === gv(id) || (!gidOf(value) && value && kindGroup(value) === id)
  const n = v => count && <span className="dim"> {count(v)}</span>
  return <>
    <div className="chips" style={{ marginBottom: sub ? 6 : 12 }}>
      <button className={anyCls + (!value ? ' on' : '')} onClick={() => onChange('')}>{anyLabel}</button>
      {groups.map(g => {
        const many = g.kinds.length > 1
        const v = many ? gv(g.id) : g.kinds[0]
        const label = t(g.label)
        return <span key={g.id} className={'chip hv-eqg-chip' + (value === v ? ' on' : inGroup(g.id) ? ' some' : '')}>
          <button type="button" className="hv-eqg-t" aria-pressed={value === v} onClick={() => onChange(value === v ? '' : v)}>{label}{n(v)}</button>
          {many && <Chevron open={shut === g.id} label={label} className="hv-eqg-x" onClick={() => setOpen(o => (o === g.id ? null : g.id))} />}
        </span>
      })}
    </div>
    {sub && <div className="chips hv-eqg-strip" style={{ marginBottom: 12 }}>
      {sub.kinds.map(k => <button key={k} className={'chip' + (value === k ? ' on' : '')} aria-pressed={value === k}
        onClick={() => onChange(value === k ? gv(sub.id) : k)}>{kindLabel(k)}{n(k)}</button>)}
    </div>}
  </>
}

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
  const [open, flip] = useOpen(at && !groupIdOf(value) ? at : null)
  const pick = fn => () => { close(); fn() }
  const item = menuItem
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
        <GroupRows groups={groupKinds(kinds)} open={open} flip={flip} item={item}
          valueOf={g => (g.kinds.length > 1 ? groupValue(g.id) : g.kinds[0])} isOn={v => !gymId && value === v}
          onPick={v => pick(() => onEq(v))} kindLabel={k => <span className="capitalize">{t(k)}</span>} />
      </div>
    </div>
  </>
}

/**
 * The muscle explorer's equipment strip (seam S38): Any equipment, then a chip per group, its
 * chevron opening a second strip of its kinds. `value` is '' (any), a kind or a group's value.
 */
export const EquipChipStrip = ({ kinds, value, onChange }) => <GroupStrip groups={groupKinds(kinds)} value={value}
  onChange={onChange} anyLabel={t('Any equipment')} gv={groupValue} gidOf={groupIdOf} kindGroup={groupOf} />

/** Seam S38's hand-off. */
export const equipChips = { on: eqOnAmong, has: eqMatches, Chips: EquipChipStrip }

/**
 * The picker's muscle filter (D64): All Muscles, then the muscle groups of `names`, each opening
 * on its muscles. `value` is '' (all), a muscle's name or a group's value.
 */
export function MuscleFilterSheet({ value, names, onPick, close }) {
  const [open, flip] = useOpen(value && !muscleGroupIdOf(value) ? groupOfName(value) : null)
  const pick = v => () => { close(); onPick(v) }
  return <>
    <h3 style={{ marginBottom: 10 }}>{t('Muscles')}</h3>
    <div className="menu-group grouped"><div className="list menu-list">
      {menuItem('all', t('All Muscles'), !value, pick(''))}
    </div></div>
    <div className="menu-group grouped"><div className="list menu-list">
      <GroupRows groups={nameGroups(names)} open={open} flip={flip}
        valueOf={g => (g.kinds.length > 1 ? muscleGroupValue(g.id) : g.kinds[0])} isOn={v => value === v}
        onPick={pick} kindLabel={k => t(k)} />
    </div></div>
  </>
}

/** Seam S39: the By muscle explorer's muscle chips by group, with each one's exercise count. */
function MuscleStrip({ value, onChange, catalog }) {
  const groups = groupBy(MUSCLES, groupOfMuscle).map(g => ({ ...g, label: g.kinds.length > 1 ? g.label : MUSCLE_NAME[g.kinds[0]] }))
  const count = v => catalog.filter(e => explorerShare(v, e)).length
  return <div style={{ marginTop: 10 }}><GroupStrip groups={groups} value={value || ''} onChange={v => onChange(v || null)}
    anyLabel={t('All')} gv={muscleGroupValue} gidOf={muscleGroupIdOf} kindGroup={groupOfMuscle}
    kindLabel={m => t(MUSCLE_NAME[m])} count={count} /></div>
}
// A muscle is outlined on the body map; a group is filled in, its muscles all at full.
const mapProps = v => {
  const g = muscleGroupIdOf(v)
  return g ? { load: Object.fromEntries(groupBy(MUSCLES, groupOfMuscle).find(x => x.id === g)?.kinds.map(m => [m, 1]) || []) } : { selected: v }
}
const muscleName = v => { const g = muscleGroupIdOf(v); return t(g ? muscleGroupLabel(g) : MUSCLE_NAME[v]) }
export const muscleChips = { Chips: MuscleStrip, share: explorerShare, name: muscleName, map: mapProps }
