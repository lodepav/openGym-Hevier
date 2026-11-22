// Statistics' Sets per muscle card (hevier/DECISIONS.md D142, once the /muscle-sets page): the set
// count per muscle group this week, month or year against the one before; no target ranges (D139).
import { useLayoutEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { tnf } from '../../lib/i18n-core.js'
import { fmtNum, weekStartOf } from '../../lib/format.js'
import { signed } from '../lib/delta.js'
import { muscleSetCounts, namesAbove, openPeriod, PERIODS } from '../lib/muscle-sets.js'
import { muscleMode } from '../lib/volume.js'
import { muscleText } from '../lib/main-muscle.js'
import { useStatsPhase } from '../lib/shared-phase-run.js'

const PERIOD_LABEL = { week: 'Week', month: 'Month', year: 'Year' }
const SINCE = { week: 'vs last week', month: 'vs last month', year: 'vs last year' }
const LAST = { week: 'last week', month: 'last month', year: 'last year' }
const setsText = n => tnf('{0} set', '{0} sets', n, fmtNum(n))

/** A ref for a `.hv-msets` list and whether its names go above the bars, measured on resize: a container query's em ignores text zoom (the fifth audit, 2026-11-21). */
export function useNamesAbove() {
  const [el, setEl] = useState(null)
  const [above, setAbove] = useState(false)
  useLayoutEffect(() => {
    if (!el) return
    const fit = () => setAbove(namesAbove(el.getBoundingClientRect().width, parseFloat(getComputedStyle(el).fontSize)))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [el])
  return [setEl, above]
}

/** `S` is the page's: counted (D57) and phased (D93). Each new `weekAt` (the Sets per muscle tile's
 *  taps) puts the card on Week, the tile's period; it opens on openPeriod's (D144). */
export default function MuscleSetsCard({ S, today, weekAt = 0 }) {
  const ws = weekStartOf(S), mode = muscleMode(S)
  const [kind, setKind] = useState(() => openPeriod(S.workouts, { today, weekStart: ws, mode }))
  useLayoutEffect(() => { if (weekAt) setKind('week') }, [weekAt])
  const [list, above] = useNamesAbove()
  // Said after a chip is tapped, not on opening (the ninth critique, 2026-11-22).
  const [tapped, setTapped] = useState(false)
  // The page's S is a new copy on each write: key on what it is made from and reads (the fifth audit, 2026-11-21).
  const raw = useStore(s => s.S)
  const phase = useStatsPhase(s => s.phase)
  const { rows } = useMemo(() => muscleSetCounts(S.workouts, kind, { today, weekStart: ws, mode }),
    [raw.workouts, raw.routines, raw.modules, raw.hvModuleParts, raw.hvMainMuscle, raw.customEx, phase, kind, today, ws, mode]) // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...rows.map(r => r.sets))
  // Against a period with no sets at all every row would read as a gain, so the changes are left out.
  const before = rows.some(r => r.prev > 0)
  return <div className="card hv-setcounts hv-scard">
    <h2>{t('Sets per muscle')}</h2>
    <div className="hv-chips">{PERIODS.map(k => <button key={k} type="button" className={'hv-chip' + (k === kind ? ' on' : '')}
      aria-pressed={k === kind} onClick={() => { setKind(k); setTapped(true) }}>{t(PERIOD_LABEL[k])}</button>)}</div>
    {/* The period the numbers count, under the chips; only that (the owner, 2026-11-22). */}
    <div className="small dim hv-msets-cap">{t(SINCE[kind])}</div>
    <span className="hv-sr" role="status">{tapped ? t(PERIOD_LABEL[kind]) + ', ' + setsText(Math.round(rows.reduce((a, r) => a + r.sets, 0) * 10) / 10) : ''}</span>
    {rows.length ? <div className={'hv-msets' + (above ? ' hv-msets-above' : '')} ref={list}>{rows.map(r => {
      const diff = Math.round((r.sets - r.prev) * 10) / 10
      const d = before ? signed(diff) : null
      const last = t(LAST[kind])
      // One name a row, "Quadriceps, 225 sets, 64 fewer than last year": its pieces were read loose (the ninth critique, 2026-11-22).
      const said = [muscleText(r.muscle), setsText(r.sets), before && (!diff ? t('same as {0}', last)
        : t(diff > 0 ? '{0} more than {1}' : '{0} fewer than {1}', fmtNum(Math.abs(diff)), last))].filter(Boolean).join(', ')
      return <div key={r.muscle} className="hv-mset" role="img" aria-label={said}>
        <span className="hv-mset-n">{muscleText(r.muscle)}</span>
        <span className="hv-mset-bar"><i style={{ width: Math.round((r.sets / max) * 100) + '%' }} /></span>
        <b>{fmtNum(r.sets)}</b>
        <span className={'hv-mset-d' + (d ? (d.up ? ' up' : ' down') : '')}>{d?.text}</span>
      </div>
    })}
    </div> : <div className="muted small" style={{ marginTop: 10 }}>{t('No sets in this period yet.')}</div>}
  </div>
}
