// @vitest-environment happy-dom
// prunePage (seam S12): an emptied fragment goes with its rows (upstream 1.4.4 groups its support
// rows in one, and cloneElement given no children kept them), and listed component types go too.
import React, { Children } from 'react'
import { describe, expect, it } from 'vitest'
import { Section, Row } from '../../components/ui.jsx'
import { prunePage } from './settings.js'

const titles = node => Children.toArray(node?.props?.children).flatMap(k => (k.type === React.Fragment ? titles(k) : [k.props.title]))
function Picker() { return null }

describe('hevier: prunePage', () => {
  it('leaves out a section whose rows all sat in a fragment', () => {
    const tree = <><Section title="Support openGym">{false}{<><Row title="Buy me a coffee" /><Row title="Ko-fi" /></>}</Section><Section title="App"><Row title="Version" /></Section></>
    const out = prunePage('about', tree, s => s)
    expect(Children.toArray(out.props.children).map(k => k.props.title)).toEqual(['App'])
  })
  it('keeps a fragment with a row left, and drops listed component types', () => {
    const tree = <Section title="Look"><>{<Row title="Body weight" />}<Row title="Theme" /></><Picker /></Section>
    expect(titles(prunePage('look', tree, s => s, [Picker]))).toEqual(['Body weight'])
  })
})
