// [hevier] The export to Hevy's switch (hevier/DECISIONS.md D34) on upstream's Integrations page, after Training apps,
// put there beside the Health Connect reads (hevier/views/SettingsRootHevy.jsx). Android only:
// where the login cannot be kept encrypted, nothing shows. Workouts go with a Hevy login (D138);
// the Pro API key is only for routines.
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { Section, Row, Switch } from '../../components/ui.jsx'
import { HEVY_DEV_SETTINGS } from '../../lib/import-hevy.js'
import { canKeepSecrets } from '../lib/secret.js'
import { sep } from '../lib/dates.js'
import {
  loadExport, enableExport, disableExport, sendToHevy, onExportChange, relogin,
  saveRoutineKey, forgetRoutineKey, hasRoutineKey, hasLogin, planRepair, unusedCustoms, removeCustoms,
} from '../lib/hevy-export-sync.js'

const toast = msg => useUI.getState().toast(msg)
const getState = () => useStore.getState().S
const apply = fn => useStore.getState().update(fn)

const REASON = {
  auth: () => t('Not logged in to Hevy'),
  offline: () => t('Hevy could not be reached. Check the connection'),
  unsupported: () => t('The login could not be kept on this phone'),
}
const KEY_REASON = { ...REASON, auth: () => t('That Hevy API key was refused'), unsupported: () => t('The key could not be kept on this phone') }
const reasonOf = r => (REASON[r] || (() => t('Could not reach Hevy')))()

/** The sheet that asks for the Pro API key routines go with, checks it and keeps it. */
export function KeySheet({ close, done = () => {} }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const connect = async () => {
    if (!key.trim() || busy) return
    setBusy(true)
    const r = await saveRoutineKey(key).catch(() => ({ ok: false, reason: 'failed' }))
    setBusy(false)
    if (!r.ok) { toast((KEY_REASON[r.reason] || (() => t('Could not reach Hevy')))()); return }
    setKey('')
    close()
    done()
    toast(t('Routines go to Hevy too'))
    sendToHevy(getState, { force: true, apply }).catch(() => {})
  }
  return <form className="hv-namesheet" onSubmit={e => { e.preventDefault(); connect() }}>
    <h3>{t('Routines to Hevy')}</h3>
    <div className="muted small" style={{ marginBottom: 14, lineHeight: 1.5 }}>
      {t('Workouts go with your Hevy login. Routines still need a Hevy Pro API key: paste it here. It is kept encrypted on this phone only, never in a backup or a sync, and forgotten when you turn this off.')}
    </div>
    <input className="input" type="password" autoComplete="off" spellCheck={false} autoFocus
      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" aria-label={t('Hevy API key')}
      value={key} disabled={busy} onChange={e => setKey(e.target.value)} />
    <div className="small" style={{ margin: '10px 0 16px', lineHeight: 1.45 }}>
      <a href={HEVY_DEV_SETTINGS} target="_blank" rel="noopener noreferrer">{t('Get your API key')}</a>
      <span className="dim"> · {t('Hevy → Settings → Developer')}</span>
    </div>
    <button type="submit" className="btn primary" disabled={busy || !key.trim()}>
      {busy ? t('Checking the key…') : t('Keep the key')}
    </button>
  </form>
}

/**
 * The repair (D138): workouts sent before with a brand's own exercise or a custom copy of a Hevy
 * exercise are rewritten in Hevy, then the custom exercises nothing uses any more are offered for
 * deletion, by name, before anything is deleted.
 */
export function RepairSheet({ close }) {
  const [step, setStep] = useState('ask')       // ask → fixing → unused → done
  const [count, setCount] = useState(0)
  const [left, setLeft] = useState(0)
  const [unused, setUnused] = useState([])
  const fix = async () => {
    setStep('fixing')
    try {
      const ids = await planRepair(getState)
      if (ids == null) { toast(reasonOf('auth')); close(); return }
      const st = await sendToHevy(getState, { force: true, apply })
      if (st?.last?.error) { toast(statusOf(st)); close(); return }
      const waiting = ids.filter(id => st.out?.w?.[id]?.h === 'repair').length
      setCount(ids.length - waiting)
      setLeft(waiting)
      setUnused(await unusedCustoms())
      setStep('unused')
    } catch { toast(t('Could not reach Hevy')); close() }
  }
  const remove = async () => {
    setStep('fixing')
    try { toast(t('Deleted in Hevy: {0}', await removeCustoms(unused.map(c => c.id)))) } catch { toast(t('Could not reach Hevy')) }
    close()
  }
  const text = { marginBottom: 14, lineHeight: 1.5 }
  if (step === 'ask' || step === 'fixing') return <div className="hv-namesheet">
    <h3>{t('Fix exercises in Hevy')}</h3>
    <div className="muted small" style={text}>
      {t('Workouts sent before went to a brand\'s own exercise, or to a custom copy of a Hevy exercise. They are rewritten in Hevy with Hevy\'s exercise, the brand in the note. Then you choose which custom exercises nothing uses any more to delete.')}
    </div>
    <button type="button" className="btn primary" disabled={step === 'fixing'} onClick={fix}>
      {step === 'fixing' ? t('Working…') : t('Fix them')}
    </button>
  </div>
  return <div className="hv-namesheet">
    <h3>{t('Rewritten in Hevy: {0}', count)}</h3>
    {left > 0 && <div className="muted small" style={text}>{t('Still to rewrite: {0}. They go with the next sends.', left)}</div>}
    {unused.length ? <>
      <div className="muted small" style={text}>{t('These custom exercises are in no workout or routine in Hevy now. Delete them there?')}</div>
      <ul className="small" style={{ margin: '0 0 16px', paddingLeft: 18, lineHeight: 1.5 }}>{unused.map(c => <li key={c.id}>{c.title}</li>)}</ul>
      <button type="button" className="btn primary" onClick={remove}>{t('Delete {0} in Hevy', unused.length)}</button>
      <button type="button" className="btn" style={{ marginTop: 8 }} onClick={close}>{t('Keep them')}</button>
    </> : <>
      <div className="muted small" style={text}>{t('No custom exercise is left unused.')}</div>
      <button type="button" className="btn primary" onClick={close}>{t('Done')}</button>
    </>}
  </div>
}

const when = at => {
  const d = new Date(at)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? time : sep(d.toLocaleDateString([], { day: 'numeric', month: 'short' })) + ' ' + time
}

/** The status line under the switch: the last send, or why it could not. */
export function statusOf(st) {
  const l = st?.last
  if (!l) return t('New workouts and changed routines go to Hevy while the app is open.')
  if (l.error === 'nokey') return t('The Hevy login is gone from this phone. Log in again')
  if (l.error === 'auth') return t('Hevy logged you out. Log in again')
  if (l.error === 'key') return t('Hevy refused the Pro API key, so routines wait. Workouts still go')
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
  const [key, setKey] = useState(false)
  const [session, setSession] = useState(true)
  useEffect(() => {
    let live = true
    canKeepSecrets().then(v => { if (live) setOk(v) })
    hasRoutineKey().then(v => { if (live) setKey(v) })
    hasLogin().then(v => { if (live) setSession(v) })
    loadExport().then(x => { if (live) setSt({ ...x }) })
    const off = onExportChange(x => { if (live) { setSt({ ...x }); hasLogin().then(v => { if (live) setSession(v) }) } })
    return () => { live = false; off() }
  }, [])
  if (!ok || !st) return null

  const toggle = async v => {
    setBusy(true)
    if (v) {
      const r = await enableExport(getState, { apply }).catch(() => ({ ok: false, reason: 'failed' }))
      toast(r.ok ? t('Sending to Hevy is on') : reasonOf(r.reason))
    } else {
      await disableExport().catch(() => {})
      setKey(false)
    }
    setBusy(false)
  }
  const login = async () => {
    setBusy(true)
    const r = await relogin(getState, { apply }).catch(() => ({ ok: false, reason: 'failed' }))
    if (!r.ok) toast(reasonOf(r.reason))
    setBusy(false)
  }
  const routines = async () => {
    if (!key) { useUI.getState().openSheet(close => <KeySheet close={close} done={() => setKey(true)} />); return }
    await forgetRoutineKey().catch(() => {})
    setKey(false)
    toast(t('Routines no longer go to Hevy'))
  }
  const loggedOut = !session || st.last?.error === 'auth' || st.last?.error === 'nokey'
  const now = async () => {
    setBusy(true)
    await sendToHevy(getState, { force: true, apply }).catch(() => {})
    setBusy(false)
  }

  return <Section title={t('Send to Hevy')}
    footer={st.on ? t('Workouts saved since this went on go to your Hevy account and its feed, and routines changed since with a key. An edited workout is updated there; one deleted here stays in Hevy.') : null}>
    <Row icon="cloud" iconTint="var(--blue)" title={t('Send to Hevy')}
      subtitle={st.on ? statusOf(st) : t('Each workout you save goes to your Hevy account too. Turning this on opens Hevy\'s login.')}>
      <Switch checked={!!st.on} disabled={busy} onChange={toggle} aria-label={t('Send to Hevy')} />
    </Row>
    {st.on && loggedOut && <Row icon="person" title={session ? t('Log in to Hevy again') : t('Log in to Hevy')}
      subtitle={session ? null : t('Workouts go with your Hevy login, into your followers\' feed')} accessory="chevron" onClick={busy ? undefined : login} />}
    {st.on && <Row icon="repeat" title={busy ? t('Sending…') : t('Send now')} accessory="chevron" onClick={busy ? undefined : now} />}
    {st.on && <Row icon="list" title={t('Routines to Hevy')}
      subtitle={key ? t('On, with your Pro API key. Tap to forget the key') : t('Off: routines need a Hevy Pro API key')} accessory="chevron" onClick={busy ? undefined : routines} />}
    {st.on && <Row icon="wrench" title={t('Fix exercises in Hevy')} subtitle={t('Rewrites workouts sent before with Hevy\'s own exercises')}
      accessory="chevron" onClick={busy ? undefined : () => useUI.getState().openSheet(close => <RepairSheet close={close} />)} />}
  </Section>
}
