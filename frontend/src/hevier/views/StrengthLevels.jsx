// Lifts → Strength levels (D140): every exercise with levels typed in (D19), one section per
// level its best 1RM reaches, Elite first, then those with no 1RM logged yet. The 1RM is exercise
// details' own Best 1RM over every set (D19, D57's counted log). A tap opens exercise details.
import { useMemo } from 'react'
import { useStore } from '../../store/useStore.js'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { exOr } from '../../lib/exercises.js'
import { exerciseDetailSheet } from '../../sheets.jsx'
import { exercisePickerSheet } from './ExercisePickerHevy.jsx'
import { openCompareFor } from '../components/StrengthLevel.jsx'
import { BackTo } from './Statistics.jsx'
import { countedS } from '../../lib/counted-log.js'
import { useStatsPhase } from '../lib/shared-phase-run.js'
import { phasedS } from '../lib/shared-phase.js'
import { partOn } from '../lib/module-parts.js'
import PhaseFilter from '../components/PhaseFilter.jsx'
import { exerciseSummary } from '../lib/exercise-summary.js'
import { LEVELS, levelGroups } from '../lib/strength-level.js'

const title = level => (level == null ? t('No 1RM logged yet') : level < 0 ? t('Below Beginner') : t(LEVELS[level]))

export default function StrengthLevels() {
  const st = useStore(s => s.S)
  const unit = st.unit
  const phase = useStatsPhase(s => s.phase)
  // counted is a new copy on each write: made inside, keyed on what it is made from and what the summary reads
  // (the fifth audit, 2026-11-21; inside, the eighth audit, 2026-11-22). The phase as usePhasedS applies it (D114).
  const groups = useMemo(() => {
    const counted = phasedS(countedS(st), partOn(st, 'integrations', 'openbite') ? phase : null)
    return levelGroups(st.hvStrength, unit, id => exerciseSummary(counted, id).records.e1rm?.v)
  }, [st.hvStrength, st.workouts, st.routines, phase, st.modules, st.hvModuleParts, st.dbLoad, st.volumeWarmups, st.customEx, unit]) // eslint-disable-line react-hooks/exhaustive-deps
  const setLevel = () => {
    const picker = exercisePickerSheet(ex => { picker.close(); openCompareFor(ex.id); exerciseDetailSheet(ex) }, { title: t('Set a level') })
  }
  return <div className="narrow hv-statpage">
    <BackTo label={t('Lifts')} to="/lifts" title={t('Strength levels')} />
    <PhaseFilter />
    {/* With none set, a line, not a list of every lift; Set a level picks one (the critique, 2026-11-21). */}
    {/* What a level is, as the app bundles none: you type them in (D19, the sixth audit, 2026-11-22). */}
    {/* A heading, and where the weights come from: Compare strength looks them up (the ninth critique, 2026-11-22). */}
    {!groups.length && <div className="hv-ms-empty"><h2 className="hv-sl-lead">{t('No strength levels yet.')}</h2>
      <div className="small dim" style={{ marginTop: 6 }}>{t('A strength level places your best estimated one-rep max among five levels, Beginner to Elite, whose weights you type in yourself. Compare strength on an exercise looks them up on strengthlevel.com.')}</div></div>}
    {/* The page's one action: full width, filled while the page is empty (the critique, 2026-11-21). */}
    <button type="button" className={'btn' + (groups.length ? '' : ' primary') + ' hv-sl-add'} onClick={setLevel}>{t('Set a level')}</button>
    {groups.map(g => <section key={String(g.level)}>
      <h2 className="sec">{title(g.level)} <span className="dim">· {g.items.length}</span></h2>
      <div className="list">{g.items.map(x => {
        const ex = exOr(x.id)
        return <button key={x.id} type="button" className="item hv-report-row" onClick={() => exerciseDetailSheet(ex)}>
          <span className="grow"><span className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</span>
            {x.oneRm > 0 && x.next != null && <span className="small dim">{fmtNum(x.toNext)} {unit} {t('to')} {t(LEVELS[x.next])}</span>}
          </span>
          {/* Named, as a bare "120 kg" could be the gap above it (the eighth audit, 2026-11-22). */}
          {x.oneRm > 0 && <b role="img" aria-label={t('best one-rep max {0}', fmtNum(x.oneRm) + ' ' + unit)}>{fmtNum(x.oneRm)} {unit}</b>}
        </button>
      })}</div>
    </section>)}
  </div>
}
