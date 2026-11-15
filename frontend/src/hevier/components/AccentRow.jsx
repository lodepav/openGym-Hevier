// D123: the fork's Accent row on Settings → Look & Home, in place of upstream's hidden Accent color:
// the accents the fork offers (lib/accents.js), in order, and a colour of the user's own. A pick
// writes upstream's own two synced fields, as upstream's row does.
import { useEffect, useRef } from 'react'
import { t } from '../../lib/i18n.js'
import { useStore } from '../../store/useStore.js'
import { cleanHex, CUSTOM } from '../../lib/accent.js'
import { setRestAccent } from '../../lib/rest-alert.js'
import { Section } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { HV_ACCENTS, accentFields, hvAccentId, wornHex, DEFAULT_GREEN } from '../lib/accents.js'

const CELL = { position: 'relative', minWidth: 44, minHeight: 44, display: 'inline-flex', flexDirection: 'column',
  alignItems: 'center', gap: 4, padding: 0, border: 0, background: 'none', color: 'inherit', font: 'inherit' }

export default function AccentRow() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const id = hvAccentId(S)
  const own = id == null && S.accent === CUSTOM ? cleanHex(S.accentCustom) : null
  const pick = hex => {
    const c = cleanHex(hex)
    if (!c || c === wornHex(useStore.getState().S)) return
    update(s => { Object.assign(s, accentFields(c)) })
    setRestAccent(c)
  }
  // The picker sends a colour for every step of a drag; only its `change`, once it closes, is saved and synced.
  const input = useRef(null)
  const pickRef = useRef(pick)
  pickRef.current = pick
  useEffect(() => {
    const el = input.current
    const onChange = () => pickRef.current(el.value)
    el.addEventListener('change', onChange)
    return () => el.removeEventListener('change', onChange)
  }, [])
  // Uncontrolled, so React does not put the saved colour back mid-drag; a colour synced in is put in by hand.
  const start = own || cleanHex(S.accentCustom) || DEFAULT_GREEN
  useEffect(() => { if (input.current) input.current.value = start }, [start])
  return <Section footer={t('The home-screen icon changes when you leave the app. On some phones you put it back from the app list.')}>
    <div className="lrow hv-accent-row" style={{ flexWrap: 'wrap', rowGap: 12, paddingBottom: 14 }}>
      <span className="lrow-i" style={{ '--tint': 'var(--purple)' }}><Icon name="palette" /></span>
      <span className="lrow-m"><span className="lrow-t">{t('Accent')}</span></span>
      <div className="swatches" style={{ flexBasis: '100%', paddingInlineStart: 41 }}>
        {HV_ACCENTS.map(a => <button key={a.id} type="button" style={CELL} aria-pressed={id === a.id} onClick={() => pick(a.hex)}>
          <span className={'swatch' + (id === a.id ? ' on' : '')} style={{ background: a.hex }} aria-hidden="true" />
          <span className="small">{t(a.label)}</span>
        </button>)}
        <label style={CELL}>
          <span className={'swatch swatch-own' + (own ? ' on' : ' unset')} style={own ? { background: own } : undefined} aria-hidden="true">
            {!own && <Icon name="plus" />}
          </span>
          <span className="small">{t('Your own')}</span>
          <input ref={input} type="color" className="swatch-input" defaultValue={start} />
        </label>
      </div>
    </div>
  </Section>
}
