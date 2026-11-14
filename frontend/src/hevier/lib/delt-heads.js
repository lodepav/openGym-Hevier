// The shoulder's three heads (hevier/DECISIONS.md D65). Since upstream 1.4.5 (#638) the catalogue
// names the head of every shoulder exercise and the body map draws each one, so the fork reads
// the head from the exercise's target instead of sorting by name (D103). A custom exercise filed
// under plain shoulders has no head: it is only under Shoulders as a whole.

export const HEADS = ['front', 'side', 'rear']
// The picker's names (Hevy's spelling) and upstream's body-map muscles.
export const HEAD_NAME = { front: 'Front Delts', side: 'Side Delts', rear: 'Rear Delts' }
export const HEAD_SLUG = { front: 'front-delts', side: 'side-delts', rear: 'rear-delts' }
const BY_NAME = Object.fromEntries(HEADS.map(h => [HEAD_NAME[h], h]))
// The catalogue's target spelling ("front delts") and a custom exercise's primary ("front-delts").
const BY_TARGET = Object.fromEntries(HEADS.flatMap(h => [[HEAD_SLUG[h], h], [HEAD_SLUG[h].replace('-', ' '), h]]))
export const headOfName = n => BY_NAME[n] || null

/** The head an exercise is filed under, null when its target is no shoulder head. */
export const headOf = ex => BY_TARGET[ex?.tg] || BY_TARGET[ex?.primaries?.[0]] || null
