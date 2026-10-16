// The fork's one look (hevier/DECISIONS.md D17): seam S15 pins the theme and accent, and
// theme.css hangs Hevy's tokens off data-ui so upstream's look is untouched with the flag off.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')

describe('hevier: one look (seam S15, theme.css)', () => {
  it('applyPrefs pins dark and the blue preset before it resolves anything', () => {
    const app = read('../App.jsx')
    expect(app).toMatch(/function applyPrefs\(theme, accent\) \{\s*\/\/ \[hevier\] S15[^\n]*\n\s*if \(HEVIER\) \{ theme = 'dark'; accent = 'sky' \}/)
  })

  it('every rule in theme.css is scoped to the fork', () => {
    const css = read('./theme.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim())
    expect(selectors.length).toBeGreaterThan(0)
    for (const s of selectors) expect(s).toMatch(/^:root\[data-ui="hevier"\]/)
  })

  it('the accent is Hevy blue', () => {
    expect(read('./theme.css')).toMatch(/--acc:\s*#008cff/)
    expect(read('./index.js')).toContain("import './theme.css'")
  })
})
