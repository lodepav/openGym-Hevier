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
import { PARTS, hasParts, partSwitch, setPart, needOf } from '../lib/module-parts.js'

// Upstream's "Webhooks for Home Assistant and friends, and the MCP server" in a lifter's words, with the fork's parts (the ninth critique, 2026-11-22).
const INTEGRATIONS_LINE = 'Send your workouts to Hevy, OpenBite, Home Assistant and AI assistants.'

/** `hooks.moduleRow`: upstream's row of module `mod`, with its parts under it when it has any. */
export const moduleRow = (mod, row) => hasParts(mod) ? <ModuleParts key={mod} mod={mod} row={row} /> : row

/** The row of module `mod` on this page, scrolled to, unfolded when it has parts and its switch
 *  focused: "Needs Strength levels" goes there (the eighth critique, 2026-11-22). */
export function goToModule(mod, doc = document) {
  const el = doc.querySelector(`[data-tour="module-${mod}"]`)
  if (!el) return false
  el.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
  const fold = el.querySelector('.hv-modrow-open')
  if (fold?.getAttribute('aria-expanded') === 'false') fold.click()
  el.querySelector('[role="switch"]')?.focus({ preventScroll: true })
  return true
}

export function ModuleParts({ mod, row }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [open, setOpen] = useState(false)
  const id = useId()
  const name = row.props.title
  const on = isOn(S, mod)
  const parts = PARTS[mod]
  const n = parts.filter(p => partSwitch(S, mod, p.id)).length
  // "All on", not "All ›", which read as a link to see everything (the seventh critique, 2026-11-22).
  const count = !on ? t('Off') : n === parts.length ? t('All on') : t('{0} of {1}', n, parts.length)
  return <>
    {/* The count shown beside it is in the button's name, so TalkBack reads it once, with the button (the sixth audit, 2026-11-21). */}
    {/* Unfolded, the parts say what the module's line said, so it goes (the eighth critique, 2026-11-22). */}
    {/* The name and line are read with the button, once, not as text before it too (the ninth audit, 2026-11-22). */}
    {cloneElement(row, { className: row.props.className + ' hv-modrow', title: <span aria-hidden="true">{name}</span>,
      subtitle: open ? null : <span id={id + '-d'} aria-hidden="true">{mod === 'integrations' ? t(INTEGRATIONS_LINE) : row.props.subtitle}</span> },
      <button type="button" className="hv-modrow-open" aria-expanded={open} aria-controls={id} aria-describedby={open ? undefined : id + '-d'}
        aria-label={t('Parts of {0}', name) + (open ? '' : ', ' + count)} onClick={() => setOpen(o => !o)} />,
      !open && <span className="lrow-v" aria-hidden="true">{count}</span>,
      // Android's expand more / expand less, not a page's › (the eighth audit, 2026-11-22).
      <Icon name={open ? 'chevronUp' : 'chevronDown'} className="lrow-c" />,
      row.props.children)}
    <div id={id} className="hv-modparts" role="group" aria-label={t('Parts of {0}', name)} hidden={!open}>
      {open && parts.map(p => {
        // A part that also needs another module says so while that one is off (needOf).
        const need = needOf(S, mod + '.' + p.id)
        const stuck = !!need && !need.on
        return <Row key={p.id} title={t(p.title)} className={on && !stuck ? '' : 'dis'}
          subtitle={on && stuck ? <button type="button" className="hv-link hv-modneed" onClick={() => goToModule(need.mod)}>{t('Needs {0}', t(need.title))}</button> : t(p.desc)}>
          <Switch aria-label={t(p.title)} checked={partSwitch(S, mod, p.id)} disabled={!on || stuck}
            onChange={v => update(s => { setPart(s, mod, p.id, v) })} />
        </Row>
      })}
      {open && !on && <p className="hv-modparts-off">{t('{0} is off, so all of it is hidden.', name)}</p>}
    </div>
  </>
}
