// Weight decimals' choices named for what they show (hevier/DECISIONS.md D40).
import React from 'react'
import { describe, expect, it } from 'vitest'
import { relabelPage } from './settings.js'
import { Section, Row } from '../../components/ui.jsx'

const Seg = () => null
const page = () => <div><Section title="Units">
  <Row title="Weight decimals"><Seg options={[{ value: 1, label: '0.5' }, { value: 2, label: '0.25' }]} value={1} /></Row>
  <Row title="Speed unit"><Seg options={[{ value: 1, label: 'km/h' }]} /></Row>
</Section></div>
const segs = tree => {
  const out = []
  const walk = n => { if (!n?.props) return; if (n.type === Seg) out.push(n.props.options); [].concat(n.props.children || []).forEach(walk) }
  walk(tree)
  return out
}

describe('hevier Weight decimals labels (D40)', () => {
  it('names the choices 0.1 and 0.01 and leaves their values and the other rows alone', () => {
    const [dec, speed] = segs(relabelPage('units', page(), k => k))
    expect(dec).toEqual([{ value: 1, label: '0.1' }, { value: 2, label: '0.01' }])
    expect(speed).toEqual([{ value: 1, label: 'km/h' }])
    expect(segs(relabelPage('look', page(), k => k))[0][1].label).toBe('0.25')
  })
})
