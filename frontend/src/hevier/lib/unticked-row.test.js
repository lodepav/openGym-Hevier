// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { firstUntickedRow, showRow } from './unticked-row.js'

const page = html => { document.body.innerHTML = html; return document.body }
const row = (id, cls, cell) => `<div id="${id}" class="hv-row${cls}"><button class="hv-set">1</button>${cell}</div>`
const tick = on => `<button class="chk${on ? ' on' : ''} hv-chk"></button>`

afterEach(() => { document.body.innerHTML = '' })

describe('hevier: the first unticked set (Finish → Show them)', () => {
  it('skips ticked sets and drop lines, and finds a set whose tick is the effort button', () => {
    const root = page(`<div class="hv-ex">${row('a', ' done', tick(true))}<div class="hv-row hv-sub-row"><button class="hv-set">D</button><span></span></div></div>
      <div class="hv-ex">${row('b', ' done', tick(true))}${row('c', '', '<button class="hv-eff hv-eff-tick">RIR</button>')}${row('d', '', tick(false))}</div>`)
    expect(firstUntickedRow(root).id).toBe('c')
  })

  it('finds one side of a per-side set left unticked, and nothing when all are ticked', () => {
    const root = page(`<div class="hv-ex"><div class="hv-pair">${row('l', ' hv-side done', tick(true))}${row('r', ' hv-side', tick(false))}</div></div>`)
    expect(firstUntickedRow(root).id).toBe('r')
    expect(firstUntickedRow(page(`<div class="hv-ex">${row('a', ' done', tick(true))}</div>`))).toBeNull()
    expect(firstUntickedRow(null)).toBeNull()
  })

  it('centres the row, without the glide when motion is reduced, and focuses its tick', () => {
    const root = page(`<div class="hv-ex">${row('a', '', tick(false))}</div>`)
    const el = firstUntickedRow(root)
    el.scrollIntoView = vi.fn()
    showRow(el, { matchMedia: () => ({ matches: false }) })
    expect(el.scrollIntoView).toHaveBeenLastCalledWith({ block: 'center', behavior: 'smooth' })
    expect(document.activeElement).toBe(el.querySelector('.hv-chk'))
    showRow(el, { matchMedia: () => ({ matches: true }) })
    expect(el.scrollIntoView).toHaveBeenLastCalledWith({ block: 'center', behavior: 'auto' })
    expect(() => showRow(null)).not.toThrow()
  })
})
