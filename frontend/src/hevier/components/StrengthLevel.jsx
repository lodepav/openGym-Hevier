// Exercise details → Summary's Strength level (hevier/DECISIONS.md D19): a five-band bar from the
// thresholds the user typed in from strengthlevel.com, with a marker at the page's Best 1RM. The
// fields fold open in the section itself (D19), not in a sheet.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { fmtNum, fmtDate, todayISO } from '../../lib/format.js'
import { openExternal } from '../../components/CustomMedia.jsx'
import { LEVELS, compareUrl, levelsIn, setLevels, strengthLevel, validLevels } from '../lib/strength-level.js'

// The levels' fields, folded open under the section (D19): a button to look the
// levels up on strengthlevel.com, the five 1RMs, Save, and Remove once there are levels.
function LevelsForm({ exId, unit, close }) {
  const entry = useStore.getState().S.hvStrength?.[exId]
  const [v, setV] = useState(() => (levelsIn(entry, unit) || ['', '', '', '', '']).map(String))
  const lv = validLevels(v.map(x => x.replace(',', '.')))
  const save = next => { useStore.getState().update(s => setLevels(s, exId, next, unit, todayISO())); close() }
  return <form className="hv-sl-form" onSubmit={e => { e.preventDefault(); if (lv) save(lv) }}>
    <p className="small dim">{t('Look up your levels on strengthlevel.com, then type the 1RM it shows for each level.')}</p>
    <button type="button" className="btn hv-sl-look" onClick={() => openExternal(compareUrl(exId, unit))}>{t('Look up on strengthlevel.com')}</button>
    {LEVELS.map((name, i) => <label key={name} className="hv-sl-row">
      <span className="grow">{t(name)}</span>
      <input className="input" inputMode="decimal" value={v[i]} aria-label={t(name)}
        onChange={e => setV(v.map((x, k) => (k === i ? e.target.value : x)))} />
      <span className="dim">{unit}</span>
    </label>)}
    {!lv && v.every(Boolean) && <p className="small hv-sl-err">{t('Each level must be heavier than the one before.')}</p>}
    <div className="hv-sl-btns">
      <button type="button" className="btn" onClick={close}>{t('Cancel')}</button>
      <button type="submit" className="btn primary" disabled={!lv}>{t('Save')}</button>
    </div>
    {entry && <button type="button" className="btn plain danger hv-sl-rm" onClick={() => save(null)}>{t('Remove levels')}</button>}
  </form>
}

export default function StrengthLevel({ exId, oneRm, st }) {
  const unit = st.unit
  const entry = st.hvStrength?.[exId]
  const lv = levelsIn(entry, unit)
  const [open, setOpen] = useState(false)
  const form = open && <LevelsForm exId={exId} unit={unit} close={() => setOpen(false)} />
  if (!lv) return <div className="hv-sl">
    <h4 className="sec">{t('Strength level')}</h4>
    {form || <>
      <p className="small dim">{t('See how your best 1RM compares, from the levels strengthlevel.com gives you.')}</p>
      <div className="hv-sl-btns"><button type="button" className="btn primary" aria-expanded={false} onClick={() => setOpen(true)}>{t('Compare strength')}</button></div>
    </>}
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
      {!open && <button type="button" className="btn plain xs" aria-expanded={false} onClick={() => setOpen(true)}>{t('Edit')}</button>}
    </div>
    {form}
  </div>
}
