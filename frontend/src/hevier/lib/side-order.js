// Which side of a per-side set comes first (hevier/DECISIONS.md D72): left then right, as upstream
// draws it, or right then left, per exercise. Kept in S.hvSideOrder ({ [exId]: 'RL' }, a fork-only
// field upstream ignores, so it syncs and is in backups); left first is no entry.

/** The sides of a per-side set in the order the exercise does them: ['L', 'R'] or ['R', 'L']. */
export const sideOrderOf = (S, exId) => (S?.hvSideOrder?.[exId] === 'RL' ? ['R', 'L'] : ['L', 'R'])

/** Sets the exercise's order on a draft of S: right first (`rightFirst`) or back to left first. */
export function setSideOrder(s, exId, rightFirst) {
  const all = { ...(s.hvSideOrder || {}) }
  if (rightFirst) all[exId] = 'RL'; else delete all[exId]
  if (Object.keys(all).length) s.hvSideOrder = all; else delete s.hvSideOrder
}
