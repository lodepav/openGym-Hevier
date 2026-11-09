// A module's own page with a switch per part (hevier/DECISIONS.md D102), at /settings/modules/<id>,
// reached from "Parts of a module" under Settings → Modules. The parts and the rules are
// lib/module-parts.js; the module's name and words are upstream's (lib/modules-copy.js), or the
// fork's for its own modules (D114).
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { isOn } from '../../lib/modules.js'
import { moduleCopy } from '../../lib/modules-copy.js'
import { Row, Section, Switch } from '../../components/ui.jsx'
import { BackTo } from './Statistics.jsx'
import { PARTS, hasParts, partSwitch, setPart } from '../lib/module-parts.js'
import { HIDDEN_MODULES, forkModuleCopy } from '../lib/fork-modules.js'

const copy = () => ({ ...moduleCopy(), ...forkModuleCopy() })

export const partsPath = mod => '/settings/modules/' + mod

/** The modules with a page of parts, in Settings → Modules' order. */
export const modulesWithParts = () => Object.keys(PARTS).filter(m => hasParts(m) && !HIDDEN_MODULES.includes(m))

/** "Parts of a module", the section the fork adds under Settings → Modules. */
export function ModulePartsSection() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const mc = copy()
  return <Section title={t('Parts of a module')} footer={t('Keep a module and hide one of its parts. A module that is off hides all of them.')}>
    {modulesWithParts().map(m => {
      const n = PARTS[m].filter(p => partSwitch(S, m, p.id)).length
      return <Row key={m} title={mc[m][0]} accessory="chevron" onClick={() => nav(partsPath(m))}
        value={!isOn(S, m) ? t('Off') : n === PARTS[m].length ? t('All') : t('{0} of {1}', n, PARTS[m].length)} />
    })}
  </Section>
}

export function ModulePartsPage() {
  const { mod } = useParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  if (!modulesWithParts().includes(mod)) return <Navigate to="/settings/modules" replace />
  const [name] = copy()[mod]
  const on = isOn(S, mod)
  return <div className="narrow hv-modparts">
    <BackTo label={t('Modules')} to="/settings/modules" title={name} />
    {!on && <p className="sect-f">{t('{0} is off, so all of it is hidden. Switch it on in Modules to choose its parts.', name)}</p>}
    <Section footer={t('Nothing gets deleted: switch a part back on and it’s all still there.')}>
      {PARTS[mod].map(p => <Row key={p.id} title={t(p.title)} subtitle={t(p.desc)}>
        <Switch aria-label={t(p.title)} checked={partSwitch(S, mod, p.id)} disabled={!on}
          onChange={v => update(s => { setPart(s, mod, p.id, v) })} />
      </Row>)}
    </Section>
  </div>
}
