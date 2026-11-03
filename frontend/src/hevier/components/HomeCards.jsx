// Upstream 1.4.4's new Home cards as Home widgets (hevier/DECISIONS.md D98): each is upstream's own
// card, which keeps its own gates (its season, its switch, its dismiss), hosted by D12's Home where
// the fork's Edit Home adds it, off until added. Workouts left this week is upstream's countdown
// (#753, lib/week-left.js) as a widget of its own.
import { t, tn } from '../../lib/i18n.js'
import { todayISO } from '../../lib/format.js'
import { workoutsLeft } from '../../lib/week-left.js'
import { RecapHomeCard } from '../../components/Recap.jsx'
import { WrappedHomeCard } from '../../components/WrappedEntry.jsx'
import RecoveryHint from '../../components/RecoveryHint.jsx'
import { ChallengesCard } from '../../components/Challenges.jsx'
import Icon from '../../components/Icon.jsx'

export function WeekLeftWidget({ S }) {
  const left = workoutsLeft(S, todayISO())
  if (!left) return null
  return <div className="card hv-weekleft">
    <Icon name="calendar" />
    <span>{left.left > 0 ? tn('{0} of {1} left this week', '{0} of {1} left this week', left.left, left.of) : t('All done this week. Nice.')}</span>
  </div>
}

export const HOME_CARDS = {
  challenges: S => <ChallengesCard S={S} />,
  recap: S => <RecapHomeCard S={S} />,
  year: S => <WrappedHomeCard S={S} />,
  recoveryhint: S => <RecoveryHint S={S} />,
  weekleft: S => <WeekLeftWidget S={S} />,
}
