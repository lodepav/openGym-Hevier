// How far the last weigh-in is from the body-weight goal, for the line under it on Measures (the
// ninth critique, 2026-11-22). As upstream's Home card says it (views/Home.jsx): the side the last
// weigh-in is on decides lose or gain, reached within 0.05. Weights are in the profile's unit, as
// upstream stores them (lib/units.js converts S.targetW with the rest).

/** { reached: true } within 0.05 of the goal, else { reached: false, by, up } (by to 0.1, up: to
 *  gain), or null without a goal or a weigh-in. */
export function goalGap(last, target) {
  if (!(Number(target) > 0) || !Number.isFinite(Number(last))) return null
  const diff = target - last
  if (Math.abs(diff) < 0.05) return { reached: true }
  return { reached: false, by: Math.round(Math.abs(diff) * 10) / 10, up: diff > 0 }
}
