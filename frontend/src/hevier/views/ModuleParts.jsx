// A module's parts, each with its switch (hevier/DECISIONS.md D102), unfolded in place under the
// module's row on Settings → Modules (seam S54, `hooks.moduleRow`). The parts and the rules are
// lib/module-parts.js. The row holds upstream's switch, so the disclosure is a button of its own
// laid over the rest of the row rather than the row itself (a button cannot hold a button).
import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { isOn } from '../../lib/modules.js'
import { Row, Switch } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { PARTS, hasParts, partSwitch, setPart, needOf, partOn } from '../lib/module-parts.js'
import { setAnyModule } from '../lib/fork-modules.js'
import { loadExport } from '../lib/hevy-export-sync.js'
import { SEP } from '../lib/settings-values.js'
import { useLargeText } from '../components/useLargeText.js'

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

// Switching Integrations or its Hevy part off stops D34's export with no word here; the effect showed
// up later, elsewhere (the tenth critique, 2026-11-22). Said only while an export to Hevy is set up,
// and only after a tap on this page (a switch, or its confirm sheet): a sync or a restore says nothing.
const TAP_MS = 1000
function useHevyOffToast(S, update, watch) {
  const sending = watch && partOn(S, 'integrations', 'hevy')
  const was = useRef(sending)
  const tapped = useRef(0)
  useEffect(() => {
    if (!watch) return
    const mark = () => { tapped.current = Date.now() }
    document.addEventListener('click', mark, true)
    return () => document.removeEventListener('click', mark, true)
  }, [watch])
  useEffect(() => {
    const before = was.current
    was.current = sending
    if (!before || sending || Date.now() - tapped.current > TAP_MS) return
    loadExport().then(x => {
      if (x?.on) useUI.getState().toast(t('New workouts won’t go to Hevy'), { action: t('Undo'),
        onAction: () => update(s => { setAnyModule(s, 'integrations', true); setPart(s, 'integrations', 'hevy', true) }) })
    }).catch(() => {})
  }, [sending]) // eslint-disable-line react-hooks/exhaustive-deps
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
  useHevyOffToast(S, update, mod === 'integrations')
  // With large text the row's gaps narrow so a long word keeps its line beside the switch (hevier.css .hv-modrow.hv-big).
  const big = useLargeText()
  // "All on", not "All ›", which read as a link to see everything (the seventh critique, 2026-11-22).
  const count = !on ? t('Off') : n === parts.length ? t('All on') : t('{0} of {1}', n, parts.length)
  return <>
    {/* The count shown beside it is in the button's name, so TalkBack reads it once, with the button (the sixth audit, 2026-11-21). */}
    {/* Unfolded, the parts say what the module's line said, so it goes (the eighth critique, 2026-11-22). */}
    {/* The name and line are read with the button, once, not as text before it too (the ninth audit, 2026-11-22). */}
    {/* The count starts the line, not a column of its own, so the line takes two rows, not three (the tenth critique, 2026-11-22);
        outside the description's id, as the button's name already says it. */}
    {/* The space after the dot is outside the unbreakable count, so the line can wrap there (the tenth critique, 2026-11-22). */}
    {cloneElement(row, { className: row.props.className + ' hv-modrow' + (big ? ' hv-big' : ''), title: <span aria-hidden="true">{name}</span>,
      subtitle: open ? null : <><span className="hv-modcount" aria-hidden="true">{count + SEP.trimEnd()}</span>{' '}<span id={id + '-d'} aria-hidden="true">{mod === 'integrations' ? t(INTEGRATIONS_LINE) : row.props.subtitle}</span></> },
      <button type="button" className="hv-modrow-open" aria-expanded={open} aria-controls={id} aria-describedby={open ? undefined : id + '-d'}
        aria-label={t('Parts of {0}', name) + (open ? '' : ', ' + count)} onClick={() => setOpen(o => !o)} />,
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
