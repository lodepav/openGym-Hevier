// @vitest-environment happy-dom
// The fork's sections on upstream's Integrations page (seam S57): the heart-rate strap (D79) after
// Health & devices, where the watches are, and the export to Hevy (D34) after Training apps.
// Phones only; the strap also needs Health's strap part (D102).
import { describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../../store/useStore.js'
import { hooks } from '../hooks.js'
import { Section } from '../../components/ui.jsx'

vi.mock('../flag.js', () => ({ HEVIER: true }))
vi.mock('../../lib/mobile.js', async orig => ({ ...(await orig()), MOBILE: true }))

const { installSettings } = await import('./SettingsRootHevy.jsx')
const { default: StrapSection } = await import('../components/StrapSection.jsx')
const { default: HevyExportSection } = await import('../components/HevyExportSection.jsx')

describe('Integrations gets the fork\'s sections', () => {
  it('the strap after Health & devices, Send to Hevy after Training apps, nothing elsewhere', () => {
    useStore.setState({ S: { ...DEF } })
    installSettings()
    expect(hooks.integrationsAfter('health')?.type).toBe(StrapSection)
    expect(hooks.integrationsAfter('training')?.type).toBe(HevyExportSection)
    for (const cat of ['automation', 'ai', 'backup']) expect(hooks.integrationsAfter(cat)).toBe(null)
  })

  it('no strap while Health\'s strap part is off', () => {
    useStore.setState({ S: { ...DEF, hvModuleParts: { 'health.strap': false } } })
    installSettings()
    expect(hooks.integrationsAfter('health')).toBe(null)
    expect(hooks.integrationsAfter('training')?.type).toBe(HevyExportSection)
  })

  it('Data & backup has neither any more', () => {
    useStore.setState({ S: { ...DEF } })
    installSettings()
    const tree = hooks.settings.page('data', <div><Section title="Backup" /><Section title="Bring data in" /></div>)
    const text = JSON.stringify(tree, (k, v) => (typeof v === 'function' ? v.name : v))
    expect(text).not.toContain('StrapSection')
    expect(text).not.toContain('HevyExportSection')
  })
})
