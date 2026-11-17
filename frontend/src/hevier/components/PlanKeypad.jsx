// The keypad that plans one number of a routine's next session (hevier/DECISIONS.md D128): digits,
// a step down and up by the exercise's step, "Last time" to put the number back, "Next" to move to
// the next one. It writes S.hvPlan only (hevier/lib/next-plan.js); the routine is not changed.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { exOr } from '../../lib/exercises.js'
import { fmtNum } from '../../lib/format.js'
import { shownWeight, storedWeight, exUnitOf } from '../../lib/ex-unit.js'
import { speedUnitOf } from '../../lib/speed.js'
import Icon from '../../components/Icon.jsx'
import { nextSession, planFields, setPlanned, stepped, weightStep, lastText } from '../lib/next-plan.js'

const MAX_LEN = 6

/** Field `f` (planFields') in words: "Bench Press, set 2, left, weight". */
export function fieldWords(f) {
  return [exerciseNameFor(exOr(f.x.id)), f.set.kind === 'warm' ? t('Warm-up {0}', f.set.n + 1) : t('Set {0}', f.set.n + 1),
    f.side && (f.side === 'L' ? t('Left') : t('Right')), f.field === 'w' ? t('Weight') : t('Reps')].filter(Boolean).join(', ')
}

/** What field `f` shows: a weight in the exercise's own unit (D41), reps as they are. */
export const shownOf = (S, f, v = f.value) => (f.field === 'w' ? shownWeight(S, f.x.id, v) : v)

export default function PlanKeypad({ rid, start, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [id, setId] = useState(start)
  // What was typed since the number opened; null until a digit is, so the first one replaces it.
  const [typed, setTyped] = useState(null)
  const fields = planFields(nextSession(S, rid))
  const at = fields.findIndex(f => f.id === id)
  const f = fields[at]
  if (!f) return null
  const weight = f.field === 'w'
  const shown = shownOf(S, f)
  // Typed back to what it opens with unplanned, the number is last time's again, not a plan.
  const write = v => update(s => { setPlanned(s, rid, f.x.key, f.set.key, f.side, f.field, v === f.base ? null : v) })
  const put = v => write(weight ? storedWeight(S, f.x.id, v, f.value) : v)
  const key = k => {
    const text = k === 'del' ? (typed ?? String(fmtNum(shown))).slice(0, -1) : (typed ?? '') + k
    if (text.length > MAX_LEN || (k === '.' && (!weight || (typed ?? '').includes('.')))) return
    setTyped(text)
    const v = Number(text === '.' ? 0 : text)
    // Emptied, the number is last time's again: the 0 shown is not a plan.
    if (text === '') write(null)
    else if (Number.isFinite(v)) put(weight ? v : Math.round(v))
  }
  const step = dir => { setTyped(null); put(stepped(S, f.x.cfg, f.field, shown, dir)) }
  const next = () => {
    setTyped(null)
    if (at < fields.length - 1) setId(fields[at + 1].id)
    else close()
  }
  const { step: inc, owned } = weightStep(S, f.x.cfg)
  const by = weight ? (owned ? '' : fmtNum(inc)) : '1'
  const unit = weight ? ' ' + exUnitOf(S, f.x.id) : ''
  const last = lastText(f.set.last[0], { cfg: f.x.cfg, side: f.side, speedUnit: speedUnitOf(S), show: w => shownWeight(S, f.x.id, w), unit: exUnitOf(S, f.x.id) })
  const digit = d => <button key={d} type="button" onClick={() => key(d)}>{d}</button>
  return <div className="hv-kp">
    <div className="hv-kp-hd">
      <b className={exerciseNameClass(exOr(f.x.id))}>{fieldWords(f)}</b>
      <span className="hv-sub">{t('Last time: {0}', last)}</span>
    </div>
    <div className={'hv-kp-val' + (f.planned ? ' chg' : '')} role="status" aria-live="polite">
      {(typed ?? fmtNum(shown)) || '0'}{unit}
      {f.planned && <span className="hv-sub">{t('Planned')}</span>}
    </div>
    <div className="hv-kp-keys">
      {['1', '2', '3'].map(digit)}
      <button type="button" aria-label={t('Decrease')} onClick={() => step(-1)}>{'−' + by}</button>
      {['4', '5', '6'].map(digit)}
      <button type="button" aria-label={t('Increase')} onClick={() => step(1)}>{'+' + by}</button>
      {['7', '8', '9'].map(digit)}
      <button type="button" aria-label={t('Delete')} onClick={() => key('del')}>⌫</button>
      <button type="button" disabled={!weight} onClick={() => key('.')}>.</button>
      {digit('0')}
      <button type="button" className="hv-kp-word" onClick={() => { setTyped(null); write(null) }}>{t('Last time')}</button>
      <button type="button" className="hv-kp-word hv-kp-next" onClick={next}>{at < fields.length - 1 ? t('Next') : t('Done')}<Icon name="chevronRight" /></button>
    </div>
  </div>
}
