// Hevy's Settings root over upstream's pages (hevier/DECISIONS.md D16; reference/SCREENS.md §10),
// through seams S11 and S12 in views/Settings.jsx: upstream's search, account card data and row
// previews, in titled groups; each row opens upstream's own page, less the rows that only steer
// upstream's workout layouts (hevier/lib/settings.js). Preferences also has the fork's Volume row
// (DECISIONS.md D18): sets per muscle or total weight, kept in S.hvVolume; and its Previous values
// row (D21): where the PREVIOUS column reads from, kept in S.hvPrevious. The Volume row's sheet also
// holds Muscle sets (D42): a set for its main muscle only, or a secondary muscle in part too, kept
// in S.hvMuscleSets. Data & backup gets the
// fork's Health Connect read switches (D27) under upstream's Health Connect card.
import { t } from '../../lib/i18n.js'
import { restTimerText } from '../lib/elapsed.js'
import { useStore } from '../../store/useStore.js'
import { nav } from '../../lib/nav.js'
import { PAGES, pageVisible } from '../../views/settings-pages.js'
import { Section, Row } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { menuSheet } from '../../sheets.jsx'
import { hooks } from '../hooks.js'
import { volumeMode, muscleMode } from '../lib/volume.js'
import { previousMode } from '../lib/previous-sets.js'
import { MOBILE } from '../../lib/mobile.js'
import { SETTINGS_GROUPS, prunePage, relabelPage, hiddenSetting, insertBeforeSection, GymsPage } from '../lib/settings.js'
import { aboutPage, versionLine } from '../lib/version.js'
import HealthReadSection from '../components/HealthReadSection.jsx'
import HevyExportSection from '../components/HevyExportSection.jsx'

function SettingsRootHevy({ ctx, preview, open, acct, initial }) {
  const restSec = useStore(s => s.S.restSec)
  const body = useStore(s => s.S.body)
  const gyms = useStore(s => s.S.equipProfiles)
  const mode = useStore(s => volumeMode(s.S))
  const VOLUME = { sets: t('Sets per muscle'), weight: t('Total weight') }
  const mMode = useStore(s => muscleMode(s.S))
  const MUSCLE = { main: t('Main muscle only'), share: t('Secondary muscles too') }
  // D18's volume and D42's muscle count are one question, so one row and one sheet.
  const pickVolume = () => menuSheet({
    title: t('Volume'),
    sections: [
      { items: Object.entries(VOLUME).map(([v, label]) => ({ label, on: mode === v,
        onClick: () => useStore.getState().update(s => { s.hvVolume = v }) })) },
      { title: t('Muscle sets'), items: Object.entries(MUSCLE).map(([v, label]) => ({ label, on: mMode === v,
        onClick: () => useStore.getState().update(s => { s.hvMuscleSets = v }) })) },
    ],
  })
  const volumeValue = mode === 'weight' ? VOLUME.weight : t('Sets') + ' · ' + (mMode === 'share' ? t('secondary too') : t('main muscle'))
  const prevMode = useStore(s => previousMode(s.S))
  const PREVIOUS = { routine: t('Same routine'), any: t('Any workout') }
  const pickPrevious = () => menuSheet({
    title: t('Previous values'),
    items: Object.entries(PREVIOUS).map(([v, label]) => ({ label, on: prevMode === v,
      onClick: () => useStore.getState().update(s => { s.hvPrevious = v }) })),
  })
  // Upstream's Workout preview also names the layout, which the fork does not offer (D1): the
  // rest timer alone, in upstream's words. Look's preview names the theme and accent, which the
  // fork pins (D17), so that row names the body diagram instead.
  const value = id => (id === 'workout' ? (restSec > 0 ? t('{0} rest', restTimerText(restSec, 0, '')) : t('No rest timer'))
    : id === 'look' ? t(body === 'female' ? 'Female' : 'Male')
    // D62: the gyms, not upstream's filter switch.
    : id === 'equipment' ? (gyms || []).map(g => g?.name).filter(Boolean).join(' · ') || t('No gyms')
    : preview[id]?.() || null)
  // The Workout group's first row is not called Workout too; its page keeps upstream's title.
  const title = id => t(id === 'workout' ? 'During a workout' : id === 'equipment' ? 'Gyms & equipment' : PAGES[id].title)
  const row = id => <Row key={id} icon={PAGES[id].icon} iconTint={PAGES[id].tint} title={title(id)}
    value={value(id)} accessory="chevron" onClick={() => open(id)} className="sp-root-row" />
  const own = {
    'hv:volume': () => <Row key={'hv:volume'} icon="chart" iconTint="var(--blue)" title={t('Volume')} value={volumeValue} accessory="chevron" onClick={pickVolume} className="sp-root-row" />,
    'hv:previous': () => <Row key={'hv:previous'} icon="history" iconTint="var(--blue)" title={t('Previous values')} value={PREVIOUS[prevMode]} accessory="chevron" onClick={pickPrevious} className="sp-root-row" />,
  }
  return SETTINGS_GROUPS.map(g => {
    const ids = g.ids.filter(id => id.startsWith('hv:') || pageVisible(id, ctx))
    if (!ids.length && !g.account) return null
    return <Section key={g.title} title={t(g.title)}>
      {/* Upstream's account card (views/Settings.jsx SettingsRoot), as a row of its group. */}
      {g.account && <button className="lrow tap sp-acct" onClick={() => open('account')}>
        <span className={'sp-avatar' + (initial ? ' on' : '')} aria-hidden="true">{initial || <Icon name="personCircle" />}</span>
        <span className="lrow-m"><span className="lrow-t">{acct.title}</span><span className="lrow-s">{acct.sub}</span></span>
        <Icon name="chevronRight" className="lrow-c" />
      </button>}
      {ids.map(id => own[id] ? own[id]() : row(id))}
    </Section>
  }).concat(
    // Both versions under the groups (D52); upstream's own line after it is hidden (hevier.css).
    <div key="hv-version" className="dim small sp-version hv-version">{versionLine(t)}</div>)
}

/** Seams S11 and S12's hand-off. */
export function installSettings() {
  hooks.settings = {
    root: props => <SettingsRootHevy {...props} />,
    // Settings opens from Profile's ⚙ (D14): back the way you came, else up to Profile.
    back: () => <button className="sp-back" aria-label={t('Profile')}
      onClick={() => ((window.history.state?.idx || 0) > 0 ? nav(-1) : nav('/profile', { replace: true }))}>
      <Icon name="chevronLeft" /><span>{t('Profile')}</span></button>,
    page: (id, tree) => {
      if (id === 'equipment') return <GymsPage card={tree} tr={t} />
      const out = relabelPage(id, prunePage(id, tree, t), t)
      if (id === 'about') return aboutPage(out, t)
      if (id !== 'data' || !MOBILE) return out
      // D27's Health Connect reads, then D34's export to Hevy, both before "Bring data in".
      return insertBeforeSection(out, t('Bring data in'), <>
        <HealthReadSection key="hv-health-read" />
        <HevyExportSection key="hv-hevy-export" />
      </>)
    },
    hides: hiddenSetting,
  }
}
