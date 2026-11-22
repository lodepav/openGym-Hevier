import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statuses, seams } from './seam-offers.mjs'

const features = '| What | Decision | Status |\n|---|---|---|\n| A | D1, D2 | Offered (#9) |\n| B | D3 | **Offer** (x) |\n| C | D4 | Fork |\n'
const seamsMd = '| S1 | `a.jsx` | hook for D1 and D2 | done |\n| S2 | `b.jsx` | D1 and D4 | done |\n| S3 | `c.jsx` | D3 | done |\n| S4 | `d.jsx` | no decision | done |\n'

test('a seam goes only when all its decisions are offered; an Offer makes a candidate', () => {
  const r = seams(seamsMd, statuses(features)).map(s => [s.id, s.verdict])
  assert.deepEqual(r, [['S1', 'goes when taken'], ['S2', 'stays'], ['S3', 'candidate'], ['S4', 'stays']])
})
