// D123: the launcher entries the APK ends up with, read from upstream's manifest and the fork's
// overlay as the manifest merger folds them: one per icon id, exactly one on by default.
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICON_IDS, DEFAULT_ICON } from './accent-icon.js'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '../../../android/app/src')
const read = f => readFileSync(resolve(APP, f), 'utf8')
const attr = (el, name) => el.match(new RegExp(`android:${name}="([^"]*)"`))?.[1]
// Each <activity-alias ...> or <activity-alias ...>...</activity-alias>, by its android:name.
const aliases = xml => new Map([...xml.matchAll(/<activity-alias\b[^>]*?(?:\/>|>[\s\S]*?<\/activity-alias>)/g)]
  .map(([el]) => [attr(el, 'name'), el]))

const main = aliases(read('main/AndroidManifest.xml'))
const overlay = aliases(read('hevier/AndroidManifest.xml'))
// The merged alias: the overlay's attributes over upstream's, gone when the overlay removes it.
const merged = new Map()
for (const name of new Set([...main.keys(), ...overlay.keys()])) {
  const o = overlay.get(name) || ''
  if (/tools:node="remove"/.test(o.match(/^<activity-alias\b[^>]*>/)?.[0] || '')) continue
  merged.set(name, o + (main.get(name) || ''))
}
const launchers = [...merged].filter(([, el]) => /android\.intent\.category\.LAUNCHER/.test(el))
const java = read('hevier/java/ch/duartesantos/opengym/HevierIcons.java')
const javaList = name => JSON.parse('[' + java.match(new RegExp(`${name} = \\{([^}]*)\\}`))[1].replace('DEFAULT_ALIAS', '"IconDefault"') + ']')

describe('the fork’s launcher aliases (D123)', () => {
  it('exactly one launcher entry is on by default, the green IconDefault', () => {
    const on = launchers.filter(([, el]) => attr(el, 'enabled') !== 'false').map(([n]) => n)
    expect(on).toEqual(['.IconDefault'])
  })

  it('every icon id has its alias, and there is no other launcher entry', () => {
    const ids = javaList('IDS'), names = javaList('ALIASES')
    expect(ids).toEqual(ICON_IDS)
    expect(names[ids.indexOf(DEFAULT_ICON)]).toBe('IconDefault')
    expect(launchers.map(([n]) => n).sort()).toEqual(names.map(n => '.' + n).sort())
  })

  it('each of the fork’s aliases opens the app, is reachable by the launcher and has its icon', () => {
    for (const [name, el] of launchers) {
      expect(attr(el, 'targetActivity'), name).toBe('.MainActivity')
      expect(attr(el, 'exported'), name).toBe('true')
      expect(el, name).toMatch(/android\.intent\.action\.MAIN/)
      if (name === '.IconDefault') continue
      expect(el, name).not.toMatch(/android\.app\.shortcuts/)
      for (const key of ['icon', 'roundIcon']) {
        const res = attr(el, key).replace('@mipmap/', '')
        expect(existsSync(resolve(APP, `hevier/res/mipmap-anydpi-v26/${res}.xml`)), res).toBe(true)
      }
    }
  })
})
