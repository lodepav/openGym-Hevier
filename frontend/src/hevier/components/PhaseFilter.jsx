// The statistics pages' filter by OpenBite's phase (D93): All, then each phase the log has workouts
// in. With no workout carrying a phase there is nothing to filter by, and nothing shows.
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { PHASE_LABEL, phasesIn } from '../lib/shared-phase.js'
import { useStatsPhase } from '../lib/shared-phase-run.js'

export default function PhaseFilter() {
  const phases = phasesIn(useStore(s => s.S.workouts))
  const picked = useStatsPhase(s => s.phase)
  const pick = useStatsPhase(s => s.pick)
  if (!phases.length) return null
  const on = phases.includes(picked) ? picked : null
  return <div className="hv-chips hv-phase-filter" role="group" aria-label={t('Phase')}>
    {[null, ...phases].map(p => <button key={p || 'all'} type="button" className={'hv-chip' + (p === on ? ' on' : '')}
      aria-pressed={p === on} onClick={() => pick(p)}>{t(p ? PHASE_LABEL[p] : 'All')}</button>)}
  </div>
}
