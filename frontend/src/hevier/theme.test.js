// The fork's one look (hevier/DECISIONS.md D17): seam S15 pins the dark theme (the accent is the user's, D123), and
// theme.css hangs Hevy's tokens off data-ui so upstream's look is untouched with the flag off.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { MEANINGS } from './lib/meaning-colours.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')

describe('hevier: one look (seam S15, theme.css)', () => {
  it('applyPrefs pins dark, and only dark, before it resolves anything', () => {
    const app = read('../App.jsx')
    expect(app).toMatch(/function applyPrefs\(theme, accent\) \{\s*\/\/ \[hevier\] S15[^\n]*\n\s*if \(HEVIER\) theme = 'dark'\n/)
  })

  it('every rule in theme.css is scoped to the fork', () => {
    const css = read('./theme.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim())
    expect(selectors.length).toBeGreaterThan(0)
    for (const s of selectors) expect(s).toMatch(/^:root\[data-ui="hevier"\]/)
    expect(read('./index.js')).toContain("import './theme.css'")
  })

  // D123: the accent is the user's. theme.css's blocks weigh as much as upstream's presets and load
  // later, so an accent token in them would beat every pick, and the light one the timer flash's ink.
  it('theme.css sets no accent token, only a darker ink for the kept presets that need one', () => {
    const css = read('./theme.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }))
    const accentDecl = /(^|[;\s])--(acc|acc-2|acc-ink|on-acc)\s*:/
    const setting = rules.filter(r => accentDecl.test(r.body))
    expect(setting.map(r => r.sel)).toEqual([
      ':root[data-ui="hevier"]:not([data-theme="light"]):is([data-accent="sky"], [data-accent="violet"], [data-accent="pink"], [data-accent="red"])',
    ])
    expect(setting[0].body.replace(/\s/g, '')).toBe('--on-acc:#000000;')
    expect(rules.some(r => r.sel === ':root[data-ui="hevier"]' && /--surface:\s*#16140f/.test(r.body))).toBe(true)
  })

  // D123: the meaning colours hevier.css draws come from the helper's variables, so they step aside
  // from the accent; and the preview's hacks stay out.
  it('hevier.css reads every meaning colour from its --hv-* variable, with no hacks', () => {
    const css = read('./hevier.css')
    for (const k of Object.keys(MEANINGS)) expect(css).toContain(`var(--hv-${k},`)
    for (const f of ['./hevier.css', './theme.css']) {
      const c = read(f)
      expect(c).not.toContain('data-blend')
      expect(c).not.toMatch(/box-shadow:\s*0 0 0 5px/)
      expect(c.match(/!important/g)).toHaveLength(1)
    }
    // the exercise card draws its edge inside and clips nothing (the next set's edge, focus rings)
    const unit = [...css.matchAll(/:root\[data-ui="hevier"\] \.hv-unit\{([^}]*)\}/g)].map(m => m[1]).join(';')
    expect(unit).toContain('box-shadow:var(--hv-card-line)')
    expect(unit).not.toContain('overflow')
  })
})
