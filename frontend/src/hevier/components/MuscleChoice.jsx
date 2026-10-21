// The main muscle an exercise counts for, as the user chooses it (hevier/DECISIONS.md D76): exercise
// details' ⋯ → Main muscle. Automatic is the fork's own (D74); a choice is kept in S.hvMainMuscle.
import { menuSheet } from '../../sheets.jsx'
import { t } from '../../lib/i18n.js'
import { useStore } from '../../store/useStore.js'
import { MUSCLE_GROUPS } from '../lib/muscle-groups.js'
import { autoMuscleOf, setMainMuscle } from '../lib/main-muscle.js'

export function mainMuscleSheet(ex) {
  const chosen = useStore.getState().S.hvMainMuscle?.[ex.id] || null
  const auto = autoMuscleOf(ex)
  const pick = name => useStore.getState().update(s => { setMainMuscle(s, ex.id, name) })
  menuSheet({
    title: t('Main muscle'),
    subtitle: t('What its sets count for in the statistics, and where the muscle filter finds it.'),
    sections: [
      { items: [{ label: t('Automatic'), sub: auto ? t(auto) : t('None'), on: !chosen, onClick: () => pick(null) }] },
      ...MUSCLE_GROUPS.filter(g => g.names.length).map(g => ({
        title: t(g.label),
        items: g.names.map(n => ({ label: t(n), on: chosen === n, onClick: () => pick(n) })),
      })),
    ],
  })
}
