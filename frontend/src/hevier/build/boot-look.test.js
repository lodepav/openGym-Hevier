// The boot screen and the font in the fork's build (D83, D123, seam S45).
import { describe, expect, it } from 'vitest'
import { bootLook, BOOT_GREEN, BOOT_SCRIPT, BOOT_STYLE, FONT_URL } from './boot-look.js'

const HTML = '<html><head></head><body><div id="boot"></div></body></html>'
const tags = () => bootLook(true).transformIndexHtml(HTML).tags
const tag = (name) => tags().find(t => t.tag === name)

// Runs the inline script with a stubbed localStorage and document; returns the style it added, if any.
const runScript = (stored, { throws = false } = {}) => {
  const added = []
  const localStorage = { getItem: k => { if (throws) throw new Error('blocked'); return k === 'hevier_accent' ? stored : null } }
  const document = { createElement: () => ({ textContent: '' }), head: { appendChild: el => added.push(el) } }
  new Function('localStorage', 'document', BOOT_SCRIPT)(localStorage, document)
  return added[0]?.textContent
}

describe('boot look (D123)', () => {
  it('is off in upstream\'s build', () => {
    expect(bootLook(false).transformIndexHtml(HTML)).toBe(HTML)
  })

  it('injects the font face, the preload, the style and the script', () => {
    expect(tags().map(t => [t.tag, t.injectTo])).toEqual([['link', 'head'], ['style', 'body-prepend'], ['script', 'body-prepend']])
    expect(tag('link').attrs).toEqual({ rel: 'preload', as: 'font', type: 'font/ttf', crossorigin: true, href: './hevier/fonts/Nunito.ttf' })
    expect(tag('style').children).toContain("@font-face{font-family:Nunito;src:url(./hevier/fonts/Nunito.ttf) format('truetype');font-weight:200 1000;font-display:block}")
    expect(FONT_URL).toBe('./hevier/fonts/Nunito.ttf')
    expect(tag('script').children).toBe(BOOT_SCRIPT)
  })

  it('paints the barbell and the Reload button green by default, with black ink on the button', () => {
    expect(BOOT_GREEN).toBe('#34d08a')
    expect(BOOT_STYLE).toContain('html #boot{background:#000}')
    expect(BOOT_STYLE).toContain('html #boot .db{fill:#34d08a}')
    expect(BOOT_STYLE).toContain('html #boot ellipse{fill:#34d08a}')
    expect(BOOT_STYLE).toContain('html #boot.fail button{background:#34d08a;color:#000}')
    expect(BOOT_STYLE).not.toContain('008cff')
  })

  it('a saved accent recolours the barbell and the button, above the default rules', () => {
    const css = runScript('#008cff')
    expect(css).toBe('html body #boot .db{fill:#008cff}html body #boot ellipse{fill:#008cff}html body #boot.fail button{background:#008cff;color:#000}')
    expect(runScript('#ABCDEF')).toContain('fill:#ABCDEF')
  })

  it('a missing, malformed or unreadable accent keeps the green', () => {
    for (const bad of [null, '', 'red', '#fff', '#12345', '#1234567', '#gggggg', ' #008cff', "#008cff'}body{x:1", '008cff'])
      expect(runScript(bad), String(bad)).toBeUndefined()
    expect(runScript('#008cff', { throws: true })).toBeUndefined()
  })
})
