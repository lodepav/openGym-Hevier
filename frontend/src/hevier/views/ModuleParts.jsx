// A module's parts, each with its switch (hevier/DECISIONS.md D102), unfolded in place under the
// module's row on Settings → Modules (seam S54, `hooks.moduleRow`). The parts and the rules are
// lib/module-parts.js. The row holds upstream's switch, so the disclosure is a button of its own
// laid over the rest of the row rather than the row itself (a button cannot hold a button).
import { cloneElement, useId, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { isOn } from '../../lib/modules.js'
import { Row, Switch } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { PARTS, hasParts, partSwitch, setPart } from '../lib/module-parts.js'

/** `hooks.moduleRow`: upstream's row of module `mod`, with its parts under it when it has any. */
export const moduleRow = (mod, row) => hasParts(mod) ? <ModuleParts key={mod} mod={mod} row={row} /> : row

export function ModuleParts({ mod, row }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [open, setOpen] = useState(false)
  const id = useId()
  const name = row.props.title
  const on = isOn(S, mod)
  const parts = PARTS[mod]
  const n = parts.filter(p => partSwitch(S, mod, p.id)).length
  return <>
    {cloneElement(row, { className: row.props.className + ' hv-modrow' },
      <button type="button" className="hv-modrow-open" aria-expanded={open} aria-controls={id}
        aria-label={t('Parts of {0}', name)} onClick={() => setOpen(o => !o)} />,
      !open && <span className="lrow-v">{!on ? t('Off') : n === parts.length ? t('All') : t('{0} of {1}', n, parts.length)}</span>,
      <Icon name={open ? 'chevronDown' : 'chevronRight'} className="lrow-c" />,
      row.props.children)}
    <div id={id} className="hv-modparts" role="group" aria-label={t('Parts of {0}', name)} hidden={!open}>
      {open && parts.map(p => <Row key={p.id} title={t(p.title)} subtitle={t(p.desc)} className={on ? '' : 'dis'}>
        <Switch aria-label={t(p.title)} checked={partSwitch(S, mod, p.id)} disabled={!on}
          onChange={v => update(s => { setPart(s, mod, p.id, v) })} />
      </Row>)}
      {open && !on && <p className="hv-modparts-off">{t('{0} is off, so all of it is hidden.', name)}</p>}
    </div>
  </>
}
