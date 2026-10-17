// @vitest-environment happy-dom
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { applyForkIcons, applyForkName, APP_NAME } from './pwa-icons.js'

// happy-dom's URL only takes http(s), so the files are found by path.
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const pub = p => resolve(frontend, 'public', p)

describe('hevier PWA icons', () => {
  it('points upstream\'s manifest and icon links at the fork\'s', () => {
    document.head.innerHTML = readFileSync(resolve(frontend, 'index.html'), 'utf8')
      .match(/<head>([\s\S]*)<\/head>/)[1]
    expect(applyForkIcons(document)).toBe(3)
    expect(document.querySelector('link[rel="manifest"]').getAttribute('href')).toBe('hevier/manifest.json')
    expect(document.querySelector('link[rel="manifest"]').getAttribute('crossorigin')).toBe('use-credentials')
    expect(document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href')).toBe('hevier/icon-180.png')
    expect(document.querySelector('link[rel="icon"]').getAttribute('href')).toBe('hevier/icon-180.png')
    expect(applyForkIcons(document)).toBe(0)
  })

  it('names the page and the iOS home-screen title Go Hevier (D39)', () => {
    document.head.innerHTML = readFileSync(resolve(frontend, 'index.html'), 'utf8')
      .match(/<head>([\s\S]*)<\/head>/)[1]
    expect(applyForkName(document)).toBe(2)
    expect(document.title).toBe('Go Hevier')
    expect(document.querySelector('meta[name="apple-mobile-web-app-title"]').getAttribute('content')).toBe('Go Hevier')
    expect(applyForkName(document)).toBe(0)
  })

  it('names the installed app Go Hevier: the PWA manifest and the Android launcher (D39)', () => {
    const fork = JSON.parse(readFileSync(pub('hevier/manifest.json'), 'utf8'))
    expect([fork.name, fork.short_name]).toEqual([APP_NAME, APP_NAME])
    const strings = readFileSync(resolve(frontend, 'android/app/src/hevier-release/res/values/strings.xml'), 'utf8')
    expect(strings).toContain(`<string name="app_name">${APP_NAME}</string>`)
    expect(strings).toContain(`<string name="title_activity_main">${APP_NAME}</string>`)
  })

  it('has a manifest that installs the same app from its own folder', () => {
    const up = JSON.parse(readFileSync(pub('manifest.json'), 'utf8'))
    const fork = JSON.parse(readFileSync(pub('hevier/manifest.json'), 'utf8'))
    const base = 'https://gym.example/app/'
    const at = (m, file) => new URL(m.start_url, new URL(file, base)).href
    expect(at(fork, 'hevier/manifest.json')).toBe(at(up, 'manifest.json'))
    expect(new URL(fork.scope, new URL('hevier/manifest.json', base)).href).toBe(base)
    expect(fork.icons.map(i => i.sizes)).toEqual(up.icons.map(i => i.sizes))
    for (const i of fork.icons) expect(existsSync(pub(`hevier/${i.src}`))).toBe(true)
  })
})
