// [hevier] The strap's heart rate full screen (hevier/DECISIONS.md D80): ♥ beside the workout's ⏱
// opens it. The heart rate large, its zone, the zone bar with a marker, this workout's average and
// highest, and the time in each zone; with a set's timer running (D53), that set's time on top.
// The zones are hevier/lib/hr-zones.js's, from the maximum in S.hvHrMax.
import { useEffect, useState } from 'react'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { EXIDX } from '../../lib/exercises.js'
import Icon from '../../components/Icon.jsx'
import { liveStrap, onLive, workoutSamples } from '../lib/hr-strap-run.js'
import { liveBpm } from '../lib/hr-strap.js'
import { ZONES, maxHr, zoneOf, zoneFloors, zoneTimes, summary, MAX_OK, YEAR_OK } from '../lib/hr-zones.js'
import { RUN, runningSec } from '../lib/set-timer.js'
import { elapsedClock, durationWords } from '../lib/elapsed.js'

/** The set whose count-up timer runs (D53): `{ name, sec }`, or null. */
function runningSet(A, now) {
  for (const e of A?.entries || []) for (const s of e.sets || []) if (s?.[RUN]) {
    const ex = EXIDX[e.id]
    return { name: ex ? exerciseNameFor(ex) : e.n || e.id, cls: ex ? exerciseNameClass(ex) : '', sec: runningSec(s, now) }
  }
  return null
}

/** The maximum heart rate and birth year, for the zones. */
export function ZonesSheet({ close }) {
  const cfg = useStore.getState().S.hvHrMax || {}
  const [max, setMax] = useState(cfg.max ? String(cfg.max) : '')
  const [born, setBorn] = useState(cfg.born ? String(cfg.born) : '')
  const m = Number(max), b = Number(born)
  const ok = (!max || MAX_OK(m)) && (!born || YEAR_OK(b))
  const est = maxHr({ born: b })
  const save = () => {
    useStore.getState().update(s => {
      const next = {}
      if (max && MAX_OK(m)) next.max = Math.round(m)
      if (born && YEAR_OK(b)) next.born = b
      if (Object.keys(next).length) s.hvHrMax = next; else delete s.hvHrMax
    })
    close()
  }
  return <div className="hv-namesheet">
    <h3>{t('Heart rate zones')}</h3>
    <div className="muted small" style={{ marginBottom: 12, lineHeight: 1.5 }}>
      {t('Five zones of your maximum heart rate: 50, 60, 70, 80 and 90 %. With no maximum of your own, it is estimated from your age as 208 − 0.7 × age (Tanaka, 2001).')}
    </div>
    <label className="hv-field"><span>{t('Birth year')}</span>
      <input className="input" inputMode="numeric" value={born} onChange={e => setBorn(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1990" /></label>
    <label className="hv-field"><span>{t('Maximum heart rate')}</span>
      <input className="input" inputMode="numeric" value={max} onChange={e => setMax(e.target.value.replace(/\D/g, '').slice(0, 3))}
        placeholder={est ? String(est.bpm) : t('Measured, if you know it')} /></label>
    <div className="muted small" style={{ margin: '4px 0 14px' }}>
      {est && !max ? t('Estimated maximum: {0} bpm', est.bpm) : t('A maximum you measured beats the estimate.')}
    </div>
    <div className="row" style={{ gap: 10 }}>
      <button type="button" className="btn grow" onClick={close}>{t('Cancel')}</button>
      <button type="button" className="btn primary grow" disabled={!ok} onClick={save}>{t('Save')}</button>
    </div>
  </div>
}

export const zonesSheet = () => useUI.getState().openSheet(close => <ZonesSheet close={close} />)

function Screen({ close }) {
  const A = useStore(s => s.S.active)
  const cfg = useStore(s => s.S.hvHrMax)
  const [live, setLive] = useState(() => ({ ...liveStrap() }))
  const [now, setNow] = useState(Date.now)
  const [samples, setSamples] = useState([])
  useEffect(() => {
    let on = true
    workoutSamples().then(list => on && setSamples([...list]))
    const off = onLive(l => {
      setLive({ ...l })
      workoutSamples().then(list => on && setSamples([...list]))
    })
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => { on = false; off(); clearInterval(id) }
  }, [])
  const bpm = liveBpm(live.last, now)
  const max = maxHr(cfg)
  const z = max && bpm ? zoneOf(bpm, max.bpm) : 0
  const sum = summary(samples)
  const times = max ? zoneTimes(samples, max.bpm) : null
  const run = runningSet(A, now)
  const floors = max ? zoneFloors(max.bpm) : null
  // The marker's place on the bar: from zone 1's floor to the maximum.
  const at = max && bpm ? Math.max(0, Math.min(1, (bpm - floors[0]) / (max.bpm - floors[0]))) : null
  return <div className="hv-hrscreen" role="dialog" aria-modal="true" aria-label={t('Heart rate')}>
    <div className="hv-hrscreen-bar">
      <button type="button" className="iconbtn" aria-label={t('Close')} onClick={close}><Icon name="chevronDown" /></button>
      <div className="hv-title">{run ? <span className={run.cls}>{run.name}</span> : A?.name || t('Heart rate')}</div>
      <button type="button" className="iconbtn" aria-label={t('Heart rate zones')} onClick={zonesSheet}><Icon name="gear" /></button>
    </div>
    {run && <div className="hv-hrscreen-time"><b>{elapsedClock(run.sec)}</b><span>{t('Time')}</span></div>}
    <div className={'hv-hrscreen-bpm' + (run ? ' small' : '') + (z ? ' hv-z' + z : '')}>
      <b><Icon name="heart" />{bpm ?? '…'}</b>
      <span>{bpm ? (z ? t('Zone {0} · {1}', z, t(ZONES[z - 1].name)) : max ? t('Below zone 1') : t('Heart rate')) : live.state === 'connecting' ? t('Connecting…') : t('Waiting for the strap…')}</span>
    </div>
    {max
      ? <div className="hv-hrzones">
          <div className="hv-hrzones-bar">
            {ZONES.map(zz => <i key={zz.n} className={'hv-z' + zz.n + (zz.n === z ? ' on' : '')} />)}
            {at != null && <em style={{ left: (at * 100) + '%' }} />}
          </div>
          <div className="hv-hrzones-list">
            {ZONES.map((zz, i) => <div key={zz.n} className={'hv-z' + zz.n + (zz.n === z ? ' on' : '')}>
              <span><i />{t('Zone {0}', zz.n)} · {t(zz.name)}</span>
              <span className="muted">{floors[i]}{i < 4 ? '–' + (floors[i + 1] - 1) : '+'}</span>
              <b>{times[zz.n] ? durationWords(times[zz.n]) : '–'}</b>
            </div>)}
          </div>
          <div className="muted small">{max.from === 'set' ? t('Maximum {0} bpm, yours', max.bpm) : t('Maximum {0} bpm, estimated from your age', max.bpm)}</div>
        </div>
      : <button type="button" className="btn hv-hrzones-set" onClick={zonesSheet}>{t('Set up heart rate zones')}</button>}
    <div className="hv-hrscreen-sum">
      <div><b>{sum?.avg ?? '–'}</b><span>{t('Avg heart rate')}</span></div>
      <div><b>{sum?.max ?? '–'}</b><span>{t('Max heart rate')}</span></div>
    </div>
  </div>
}

// A viewer sheet: full screen, and Android's back closes it (lib/back.js).
const screen = () => useUI.getState().openSheet(close => <Screen close={close} />, { kind: 'viewer' })

/** ♥ beside the workout's ⏱, while a strap is connected or connecting. */
export default function StrapButton() {
  const [state, setState] = useState(() => liveStrap().state)
  useEffect(() => onLive(l => setState(l.state)), [])
  if (state === 'off') return null
  return <button type="button" className="iconbtn hv-hrbtn" aria-label={t('Heart rate full screen')} onClick={screen}><Icon name="heart" /></button>
}
