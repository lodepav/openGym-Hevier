// The strap's live heart rate in the workout's stats row (hevier/DECISIONS.md D79): "Heart rate ♥ 128"
// while it reads, "…" while it connects, nothing without a strap or while it is off.
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n.js'
import Icon from '../../components/Icon.jsx'
import { liveStrap, onLive } from '../lib/hr-strap-run.js'
import { liveBpm } from '../lib/hr-strap.js'

export default function StrapBpm() {
  const [live, setLive] = useState(() => ({ ...liveStrap() }))
  const [now, setNow] = useState(Date.now)
  useEffect(() => onLive(l => { setLive({ ...l }); setNow(Date.now()) }), [])
  // A strap gone quiet reads as such after a few seconds, with no reading to wake the screen.
  useEffect(() => {
    if (live.state === 'off') return undefined
    const id = setInterval(() => setNow(Date.now()), 2000)
    return () => clearInterval(id)
  }, [live.state])
  if (live.state === 'off') return null
  const bpm = liveBpm(live.last, now)
  return <div className="hv-strap" aria-live="off">
    <span>{t('Heart rate')}</span>
    <b className={bpm ? 'on' : ''}><Icon name="heart" />{bpm ?? '…'}</b>
  </div>
}
