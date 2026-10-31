// Profile → Statistics → Strength levels: every exercise with levels typed in (D19), one section per
// level its best 1RM reaches, Elite first, then those with no 1RM logged yet. The 1RM is exercise
// details' own Best 1RM over every set (D19, D57's counted log). A tap opens exercise details.
import { useMemo } from 'react'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import { BackTo } from './Statistics.jsx'
import { countedS } from '../lib/counted.js'
import { usePhasedS } from '../lib/shared-phase-run.js'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { exerciseSummary } from '../lib/exercise-summary.js'
import { LEVELS, levelGroups } from '../lib/strength-level.js'

const title = level => (level == null ? t('No 1RM logged yet') : level < 0 ? t('Below Beginner') : t(LEVELS[level]))

export default function StrengthLevels() {
  const st = useStore(s => s.S)
  const unit = st.unit
  const counted = usePhasedS(countedS(st))
  const groups = useMemo(() => {
    return levelGroups(st.hvStrength, unit, id => exerciseSummary(counted, id).records.e1rm?.v)
  }, [st.hvStrength, counted, st.dbLoad, unit]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="narrow hv-statpage">
    <BackTo label={t('Statistics')} to="/stats" title={t('Strength levels')} />
    <PhaseFilter />
    {!groups.length && <div className="muted small">{t('No strength levels yet. Add them on an exercise’s Summary, under Strength level.')}</div>}
    {groups.map(g => <section key={String(g.level)}>
      <h4 className="sec">{title(g.level)} <span className="dim">· {g.items.length}</span></h4>
      <div className="list">{g.items.map(x => {
        const ex = exOr(x.id)
        return <button key={x.id} type="button" className="item hv-report-row" onClick={() => exerciseDetailSheet(ex)}>
          <span className="grow"><b className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</b>
            {x.oneRm > 0 && x.next != null && <span className="small dim">{fmtNum(x.toNext)} {unit} {t('to')} {t(LEVELS[x.next])}</span>}
          </span>
          {x.oneRm > 0 && <b>{fmtNum(x.oneRm)} {unit}</b>}
        </button>
      })}</div>
    </section>)}
  </div>
}
