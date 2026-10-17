// Exercise details → Summary's Strength level (hevier/DECISIONS.md D19): a five-band bar from the
// thresholds the user typed in from strengthlevel.com, with a marker at the page's Best 1RM.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { fmtNum, fmtDate, todayISO } from '../../lib/format.js'
import { openExternal } from '../../components/CustomMedia.jsx'
import { LEVELS, compareUrl, levelsIn, setLevels, strengthLevel, validLevels } from '../lib/strength-level.js'

function LevelsSheet({ exId, unit, close }) {
  const entry = useStore.getState().S.hvStrength?.[exId]
  const [v, setV] = useState(() => (levelsIn(entry, unit) || ['', '', '', '', '']).map(String))
  const lv = validLevels(v.map(x => x.replace(',', '.')))
  const save = next => { useStore.getState().update(s => setLevels(s, exId, next, unit, todayISO())); close() }
  return <form className="hv-namesheet hv-sl-sheet" onSubmit={e => { e.preventDefault(); if (lv) save(lv) }}>
    <h3>{t('Strength levels')}</h3>
    <p className="small dim">{t('Type the 1RM for each level that strengthlevel.com shows you.')}</p>
    {LEVELS.map((name, i) => <label key={name} className="hv-sl-row">
      <span className="grow">{t(name)}</span>
      <input className="input" inputMode="decimal" value={v[i]} aria-label={t(name)}
        onChange={e => setV(v.map((x, k) => (k === i ? e.target.value : x)))} />
      <span className="dim">{unit}</span>
    </label>)}
    {!lv && v.every(Boolean) && <p className="small hv-sl-err">{t('Each level must be heavier than the one before.')}</p>}
    <button type="submit" className="btn primary" disabled={!lv}>{t('Save')}</button>
    {entry && <button type="button" className="btn danger" onClick={() => save(null)}>{t('Remove')}</button>}
  </form>
}

const levelsSheet = (exId, unit) => useUI.getState().openSheet(close => <LevelsSheet exId={exId} unit={unit} close={close} />)

export default function StrengthLevel({ exId, oneRm, st }) {
  const unit = st.unit
  const entry = st.hvStrength?.[exId]
  const lv = levelsIn(entry, unit)
  const compare = <button type="button" className="btn" onClick={() => openExternal(compareUrl(exId, unit))}>{t('Compare strength')}</button>
  if (!lv) return <div className="hv-sl">
    <h4 className="sec">{t('Strength level')}</h4>
    <p className="small dim">{t('Look up your levels on strengthlevel.com, then type them in here.')}</p>
    <div className="hv-sl-btns">{compare}<button type="button" className="btn primary" onClick={() => levelsSheet(exId, unit)}>{t('Enter levels')}</button></div>
  </div>
  const { level, next, toNext, pos } = strengthLevel(oneRm, lv)
  const head = level < 0 ? t('Below Beginner') : t(LEVELS[level])
  return <div className="hv-sl">
    <h4 className="sec">{t('Strength level')}</h4>
    <div className="hv-sl-head"><b>{head}</b>{next != null && <span className="dim"> · {fmtNum(toNext)} {unit} {t('to')} {t(LEVELS[next])}</span>}</div>
    <div className="hv-sl-bar" role="img" aria-label={head}>
      {LEVELS.map((name, i) => <span key={name} style={{ '--f': Math.min(1, Math.max(0, pos * LEVELS.length - i)) * 100 + '%' }} />)}
      <i style={{ left: pos * 100 + '%' }} />
    </div>
    <div className="hv-sl-ticks">{lv.map((x, i) => <span key={i}>{fmtNum(x)}</span>)}</div>
    <div className="hv-sl-foot small dim">
      <span className="grow">{t('Best 1RM')} {fmtNum(oneRm)} {unit}{entry.d && <> · {t('levels from')} {fmtDate(entry.d, true)}</>}</span>
      <button type="button" className="btn plain xs" onClick={() => openExternal(compareUrl(exId, unit))}>{t('Compare')}</button>
      <button type="button" className="btn plain xs" onClick={() => levelsSheet(exId, unit)}>{t('Edit')}</button>
    </div>
  </div>
}
