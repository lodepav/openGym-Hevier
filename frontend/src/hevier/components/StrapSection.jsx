// [hevier] The heart-rate strap on Settings → Data & backup (hevier/DECISIONS.md D79), under D27's
// Health Connect reads: pick a Bluetooth strap once, and every workout records it live. Android
// only; a phone without Bluetooth LE shows nothing.
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n.js'
import { useUI } from '../../store/useUI.js'
import { Section, Row } from '../../components/ui.jsx'
import { plugin, loadStrap, saveStrap, onStrapChange, liveStrap, onLive, lastError } from '../lib/hr-strap-run.js'
import { liveBpm } from '../lib/hr-strap.js'
import { maxHr } from '../lib/hr-zones.js'
import { zonesSheet } from './StrapScreen.jsx'
import { useStore } from '../../store/useStore.js'

const toast = msg => useUI.getState().toast(msg)

export function ScanSheet({ close }) {
  const [devices, setDevices] = useState([])
  const [phase, setPhase] = useState('asking')   // asking · scanning · done · denied · off · failed
  useEffect(() => {
    let live = true, sub = null
    ;(async () => {
      const { H } = (await plugin()) || {}
      if (!H) { setPhase('failed'); return }
      const p = await H.request().catch(() => ({ permission: 'denied' }))
      if (!live) return
      if (p.permission !== 'granted') { setPhase('denied'); return }
      const add = d => setDevices(list => (list.some(x => x.address === d.address) ? list : [...list, d]))
      sub = await H.addListener('device', add)
      setPhase('scanning')
      try {
        const r = await H.scan({ ms: 10000 })
        if (live) { (r.devices || []).forEach(add); setPhase('done') }
      } catch (e) { if (live) setPhase(e?.code === 'off' ? 'off' : e?.code === 'permission' ? 'denied' : 'failed') }
    })()
    return () => { live = false; sub?.remove?.() }
  }, [])
  const pick = async d => {
    await saveStrap({ address: d.address, name: d.name || d.address })
    close()
    toast(t('{0} records your workouts', d.name || d.address))
  }
  const note = {
    asking: t('Allow Nearby devices to find your strap.'),
    scanning: t('Looking for straps…'),
    done: devices.length ? null : t('No strap found.'),
    denied: t('Nearby devices is not allowed. Allow it in Android’s settings for the app.'),
    off: t('Bluetooth is off. Turn it on and try again.'),
    failed: t('Could not look for straps.'),
  }[phase]
  return <div className="hv-namesheet hv-strapsheet">
    <h3>{t('Pick your strap')}</h3>
    <div className="muted small" style={{ marginBottom: 12, lineHeight: 1.5 }}>
      {t('Turn on the strap’s heart-rate broadcast first. Zepp calls it Heart rate push, Garmin Broadcast heart rate.')}
    </div>
    <div className="hv-strap-list">
      {devices.map(d => <button key={d.address} type="button" className="hv-strap-dev" onClick={() => pick(d)}>
        <b>{d.name || t('Unnamed strap')}</b><span className="muted small">{d.address}</span>
      </button>)}
    </div>
    {note && <div className="muted small" style={{ margin: '12px 0' }}>{note}</div>}
    <button type="button" className="btn" onClick={close}>{t('Cancel')}</button>
  </div>
}

export const scanSheet = () => useUI.getState().openSheet(close => <ScanSheet close={close} />)

export default function StrapSection() {
  const [bt, setBt] = useState(null)
  const [strap, setStrap] = useState(null)
  const [live, setLive] = useState(() => ({ ...liveStrap() }))
  const hrMax = useStore(s => s.S.hvHrMax)
  useEffect(() => {
    let on = true
    plugin().then(p => p?.H.status()).then(s => { if (on) setBt(s || { bluetooth: 'none' }) }).catch(() => on && setBt({ bluetooth: 'none' }))
    loadStrap().then(s => { if (on) setStrap(s) })
    const a = onStrapChange(s => on && setStrap(s))
    const b = onLive(l => on && setLive({ ...l }))
    return () => { on = false; a(); b() }
  }, [])
  if (!bt || bt.bluetooth === 'none') return null
  const bpm = liveBpm(live.last)
  const now = live.state === 'connected' ? (bpm ? t('Connected · {0} bpm', bpm) : t('Connected')) : live.state === 'connecting' ? t('Connecting…') : null
  const err = lastError() === 'permission' ? t('Nearby devices is not allowed, so nothing is recorded.') : null
  return <Section title={t('Heart rate strap')}
    footer={t('While a workout runs, the phone records the strap every second, also with the screen locked, and the saved workout gets each set’s heart rate. It replaces what Health Connect has for that workout.')}>
    <Row icon="heart" iconTint="var(--red)" title={strap ? strap.name || strap.address : t('Pick a strap')} accessory="chevron"
      subtitle={err || now || (strap ? t('Records your workouts') : t('A chest strap, armband or watch that broadcasts its heart rate over Bluetooth'))}
      onClick={scanSheet} />
    {strap && <Row icon="gauge" title={t('Heart rate zones')} accessory="chevron" onClick={zonesSheet}
      subtitle={(m => (m ? (m.from === 'set' ? t('Maximum {0} bpm, yours', m.bpm) : t('Maximum {0} bpm, estimated from your age', m.bpm)) : t('Set your age or maximum heart rate')))(maxHr(hrMax))} />}
    {strap && <Row icon="trash" danger title={t('Forget strap')} onClick={async () => { await saveStrap(null); toast(t('Strap forgotten')) }} />}
  </Section>
}
