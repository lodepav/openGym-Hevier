import { test } from 'node:test'
import assert from 'node:assert/strict'
import { check } from './features-check.mjs'

const index = '- **D1** One.\n- **D2** Two.\n- **D10** Ten.\n'

test('a decision missing from FEATURES.md is reported; D1 does not count as D10', () => {
  const r = check(index, '| A | D1, D2 | Fork |\n')
  assert.deepEqual(r.missing, [10])
})

test('the lists below the tables count as named', () => {
  assert.deepEqual(check(index, '| A | D1 | Fork |\n- **Keep** (D2)\nDecisions without a row: D10.\n').missing, [])
})

test('an Offered row needs its number; Offered in prose does not count', () => {
  const r = check(index, '| A | D1 | Offered (#812) |\n| B | D2 | **Offered** |\nD10 was Offered once.\n| **Offered** | The legend row. |\n')
  assert.deepEqual(r.offeredNoNumber, ['| B | D2 | **Offered** |'])
})
