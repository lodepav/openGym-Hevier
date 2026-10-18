// Go Hevier's version beside upstream's on the About page (hevier/DECISIONS.md D52).
import React from 'react'
import { describe, expect, it } from 'vitest'
import { aboutPage, versionLine } from './version.js'
import { Section, Row } from '../../components/ui.jsx'

const tr = (s, ...a) => a.reduce((out, v, i) => out.replace('{' + i + '}', v), s)
const page = (update = 'Check for updates') => <>
  <Section footer="Releases are checked on GitHub.">
    <Row title="Version" value="v1.0.0" />
    <Row title={update} subtitle="You have v1.0.0" />
  </Section>
  <div className="dim small sp-version">openGym v{'1.0.0'} · {'free & open source (AGPL v3)'}<br /><a href="x">Source code</a></div>
</>
const rows = tree => {
  const out = []
  const walk = n => { if (!n?.props) return; if (n.type === Row) out.push(n.props); [].concat(n.props.children || []).forEach(walk) }
  walk(tree)
  return out
}
const footer = tree => [].concat(tree.props.children).find(k => k?.props?.className?.includes('sp-version')).props.children

describe('hevier version (D52)', () => {
  it('names both versions', () => {
    expect(versionLine(tr, '1.0.0+abc1234', '1.4.1')).toBe('Go Hevier 1.0.0+abc1234 · based on openGym 1.4.1')
  })
  it('About: the Version row, the update row and the footer name Go Hevier and openGym', () => {
    const out = aboutPage(page('Update to openGym v1.1.0'), tr, '1.0.0', '1.4.1')
    const [ver, upd] = rows(out)
    expect(ver).toMatchObject({ value: 'v1.0.0', subtitle: 'based on openGym v1.4.1' })
    expect(upd.title).toBe('Update to Go Hevier v1.1.0')
    const kids = footer(out)
    expect(kids[0]).toBe('Go Hevier 1.0.0 · based on openGym 1.4.1')
    expect(kids[1]).toBe(' · ')
  })
  it('leaves "Check for updates" and a footer of another shape alone', () => {
    const out = aboutPage(page(), tr, '2.0.0', '1.4.1')
    expect(rows(out)[1].title).toBe('Check for updates')
    expect(footer(out)[0]).toBe('openGym v')
  })
})
