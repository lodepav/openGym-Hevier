// A one-field sheet for a name: a new folder, or a folder's new name.
import { useState } from 'react'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'

function NameSheet({ title, value, placeholder, saveLabel, max, onSave, close }) {
  const [v, setV] = useState(value || '')
  const save = () => { if (!v.trim()) return; close(); onSave(v) }
  return <form className="hv-namesheet" onSubmit={e => { e.preventDefault(); save() }}>
    <h3>{title}</h3>
    <input className="input" autoFocus value={v} maxLength={max} placeholder={placeholder}
      aria-label={title} onChange={e => setV(e.target.value)} />
    <button type="submit" className="btn primary" disabled={!v.trim()}>{saveLabel || t('Save')}</button>
  </form>
}

export const nameSheet = opts => useUI.getState().openSheet(close => <NameSheet {...opts} close={close} />)
