// [hevier] The export to Hevy's switch (hevier/DECISIONS.md D34) on upstream's Data & backup page,
// put there beside the Health Connect reads (hevier/views/SettingsRootHevy.jsx). Android only:
// where the key cannot be kept encrypted, nothing shows.
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { Section, Row, Switch } from '../../components/ui.jsx'
import { HEVY_DEV_SETTINGS } from '../../lib/import-hevy.js'
import { canKeepSecrets } from '../lib/secret.js'
import { loadExport, enableExport, disableExport, sendToHevy, onExportChange } from '../lib/hevy-export-sync.js'

const toast = msg => useUI.getState().toast(msg)
const getState = () => useStore.getState().S
const apply = fn => useStore.getState().update(fn)

const REASON = {
  auth: () => t('That Hevy API key was refused'),
  offline: () => t('Hevy could not be reached. Check the connection'),
  unsupported: () => t('The key could not be kept on this phone'),
}
const reasonOf = r => (REASON[r] || (() => t('Could not reach Hevy')))()

/** The sheet that asks for the key, checks it and turns the export on. */
export function KeySheet({ close }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const connect = async () => {
    if (!key.trim() || busy) return
    setBusy(true)
    const r = await enableExport(key, getState, { apply }).catch(() => ({ ok: false, reason: 'failed' }))
    setBusy(false)
    if (!r.ok) { toast(reasonOf(r.reason)); return }
    setKey('')
    close()
    toast(t('Sending to Hevy is on'))
  }
  return <form className="hv-namesheet" onSubmit={e => { e.preventDefault(); connect() }}>
    <h3>{t('Send to Hevy')}</h3>
    <div className="muted small" style={{ marginBottom: 14, lineHeight: 1.5 }}>
      {t('Paste your Hevy Pro API key. It is kept encrypted on this phone only, never in a backup or a sync, and forgotten when you turn this off.')}
    </div>
    <input className="input" type="password" autoComplete="off" spellCheck={false} autoFocus
      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" aria-label={t('Hevy API key')}
      value={key} disabled={busy} onChange={e => setKey(e.target.value)} />
    <div className="small" style={{ margin: '10px 0 16px', lineHeight: 1.45 }}>
      <a href={HEVY_DEV_SETTINGS} target="_blank" rel="noopener noreferrer">{t('Get your API key')}</a>
      <span className="dim"> · {t('Hevy → Settings → Developer')}</span>
    </div>
    <button type="submit" className="btn primary" disabled={busy || !key.trim()}>
      {busy ? t('Checking the key…') : t('Turn on')}
    </button>
  </form>
}

const when = at => {
  const d = new Date(at)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? time : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + time
}

/** The status line under the switch: the last send, or why it could not. */
export function statusOf(st) {
  const l = st?.last
  if (!l) return t('New workouts and changed routines go to Hevy while the app is open.')
  if (l.error === 'nokey') return t('The key is gone from this phone. Turn this off and on again')
  if (l.error === 'auth') return t('Hevy refused the key. Turn this off and on again with a new one')
  if (l.error) return t('Not sent: {0}. It is tried again later', l.error === 'offline' ? t('no connection') : l.error === 'rate' ? t('Hevy asked to wait') : t('Hevy had an error'))
  const parts = [t('Last sent {0}', when(l.at))]
  if (l.sent) parts.push(t('Sent: {0}', l.sent))
  if (l.refused) parts.push(t('Refused by Hevy: {0}', l.refused))
  return parts.join(' · ')
}

export default function HevyExportSection() {
  const [ok, setOk] = useState(false)
  const [st, setSt] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    canKeepSecrets().then(v => { if (live) setOk(v) })
    loadExport().then(x => { if (live) setSt({ ...x }) })
    const off = onExportChange(x => { if (live) setSt({ ...x }) })
    return () => { live = false; off() }
  }, [])
  if (!ok || !st) return null

  const toggle = async v => {
    if (v) { useUI.getState().openSheet(close => <KeySheet close={close} />); return }
    setBusy(true)
    await disableExport().catch(() => {})
    setBusy(false)
  }
  const now = async () => {
    setBusy(true)
    await sendToHevy(getState, { force: true, apply }).catch(() => {})
    setBusy(false)
  }

  return <Section title={t('Send to Hevy')}
    footer={st.on ? t('Workouts saved since this went on, and routines changed since, go to your Hevy account. An edited workout is updated there; one deleted here stays in Hevy.') : null}>
    <Row icon="cloud" iconTint="var(--blue)" title={t('Send to Hevy')}
      subtitle={st.on ? statusOf(st) : t('Each workout you save and each routine you change goes to your Hevy account too. Needs a Hevy Pro API key.')}>
      <Switch checked={!!st.on} disabled={busy} onChange={toggle} aria-label={t('Send to Hevy')} />
    </Row>
    {st.on && <Row icon="repeat" title={busy ? t('Sending…') : t('Send now')} accessory="chevron" onClick={busy ? undefined : now} />}
  </Section>
}
