// [hevier] The two read switches of hevier/DECISIONS.md D27 on upstream's Data & backup page, right
// under its Health Connect card (put there through seam S12, hevier/lib/settings.js), worded as
// upstream's v1.4.3 rows, which replace them when the fork merges it. Android only: anywhere
// Health Connect cannot be used, nothing shows.
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { Section, Row, Switch } from '../../components/ui.jsx'
import { readStatus, loadRead, enableRead, disableRead, onReadChange } from '../lib/health-read-sync.js'

export default function HealthReadSection() {
  const [st, setSt] = useState(null)
  const [h, setH] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    readStatus().then(s => { if (live) setSt(s) })
    loadRead().then(x => { if (live) setH(x) })
    const off = onReadChange(x => { if (live) setH(x) })
    return () => { live = false; off() }
  }, [])
  if (!st || !h || st.status !== 'available') return null

  const getState = () => useStore.getState().S
  const apply = fn => useStore.getState().update(fn)
  const toast = msg => useUI.getState().toast(msg)
  const toggle = kind => async v => {
    setBusy(true)
    try {
      if (v) {
        const r = await enableRead(kind, getState, { apply })
        setH(r.health || await loadRead())
        if (!r.ok) toast(r.reason === 'denied' ? t('Health Connect permission not granted') : t('Could not read from Health Connect'))
      } else setH(await disableRead(kind))
    } catch { toast(t('Could not read from Health Connect')) }
    setBusy(false)
  }
  const reading = h.readHr || h.readWeight

  return <Section title={t('Read from Health Connect')}
    footer={reading ? t('openGym reads only while it is open: heart rate for workouts of the last day, weigh-ins of the last 30 days. Older workouts stay as they are.') : null}>
    <Row icon="heart" iconTint="var(--red)" title={t('Heart rate from your watch')}
      subtitle={t('After a workout, each set gets the heart rate your watch saved. Garmin, Fitbit, Galaxy Watch and friends welcome.')}>
      <Switch checked={!!h.readHr} disabled={busy} onChange={toggle('hr')} aria-label={t('Heart rate from your watch')} />
    </Row>
    <Row icon="scale" iconTint="var(--teal)" title={t('Weigh-ins from other apps')}
      subtitle={h.readWeight ? t('Your smart scale’s weigh-ins land here, and only from there: typing one in is off while this is on.')
        : t('Your smart scale’s weigh-ins land here. One you type in yourself always wins.')}>
      <Switch checked={!!h.readWeight} disabled={busy} onChange={toggle('weight')} aria-label={t('Weigh-ins from other apps')} />
    </Row>
    {reading && h.readError === 'permission' && <Row icon="warning" iconTint="var(--orange)"
      title={t('Permission withdrawn. Tap to allow again')} accessory="chevron"
      onClick={() => toggle(h.readHr ? 'hr' : 'weight')(true)} />}
  </Section>
}
