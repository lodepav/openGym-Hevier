// Hevy's Settings root over upstream's pages (hevier/DECISIONS.md D16; reference/SCREENS.md §10),
// through seams S11 and S12 in views/Settings.jsx: upstream's search, account card data and row
// previews, in titled groups; each row opens upstream's own page, less the rows that only steer
// upstream's workout layouts (hevier/lib/settings.js).
import { t } from '../../lib/i18n.js'
import { fmtRest } from '../../lib/duration.js'
import { useStore } from '../../store/useStore.js'
import { nav } from '../../lib/nav.js'
import { PAGES, pageVisible } from '../../views/settings-pages.js'
import { Section, Row } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { hooks } from '../hooks.js'
import { SETTINGS_GROUPS, prunePage, hiddenSetting } from '../lib/settings.js'

function SettingsRootHevy({ ctx, preview, open, acct, initial }) {
  const restSec = useStore(s => s.S.restSec)
  // Upstream's Workout preview also names the layout, which the fork does not offer (D1): the
  // rest timer alone, in upstream's words.
  const value = id => (id === 'workout' ? (restSec > 0 ? t('{0} rest', fmtRest(restSec)) : t('No rest timer')) : preview[id]?.() || null)
  const row = id => <Row key={id} icon={PAGES[id].icon} iconTint={PAGES[id].tint} title={t(PAGES[id].title)}
    value={value(id)} accessory="chevron" onClick={() => open(id)} className="sp-root-row" />
  return SETTINGS_GROUPS.map(g => {
    const ids = g.ids.filter(id => pageVisible(id, ctx))
    if (!ids.length && !g.account) return null
    return <Section key={g.title} title={t(g.title)}>
      {/* Upstream's account card (views/Settings.jsx SettingsRoot), as a row of its group. */}
      {g.account && <button className="lrow tap sp-acct" onClick={() => open('account')}>
        <span className={'sp-avatar' + (initial ? ' on' : '')} aria-hidden="true">{initial || <Icon name="personCircle" />}</span>
        <span className="lrow-m"><span className="lrow-t">{acct.title}</span><span className="lrow-s">{acct.sub}</span></span>
        <Icon name="chevronRight" className="lrow-c" />
      </button>}
      {ids.map(row)}
    </Section>
  })
}

/** Seams S11 and S12's hand-off. */
export function installSettings() {
  hooks.settings = {
    root: props => <SettingsRootHevy {...props} />,
    // Settings opens from Profile's ⚙ (D14): back the way you came, else up to Profile.
    back: () => <button className="sp-back" aria-label={t('Profile')}
      onClick={() => ((window.history.state?.idx || 0) > 0 ? nav(-1) : nav('/profile', { replace: true }))}>
      <Icon name="chevronLeft" /><span>{t('Profile')}</span></button>,
    page: (id, tree) => prunePage(id, tree, t),
    hides: hiddenSetting,
  }
}
