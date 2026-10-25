# Hevy import fixes offered upstream

**DuarteSantos8/openGym#672**, branch `hevier-upstream/hevy-map-fixes` (opened 2026-10-17). It
puts 40 of Hevy's built-in titles on the catalogue exercise whose animation Hevy's own thumbnail
shows (`14541201-Lever-Seated-Shoulder-Press` is 1454): 26 that upstream matched to a different
exercise, 14 it left unmatched. It also caches the CSV import's matches by exact title, so
`Triceps Dip` and `Triceps Dip (Weighted)` no longer share one. The pull request's description
has the table, title by title, with the old id, the new one and Hevy's thumbnail.

The fork carries the same ids in `FIXES` (`frontend/src/hevier/lib/hevy-import.js`, D29). Once
upstream merges #672, delete those 40 rows there. Four rows stay, because they are the user's own
titles, not Hevy's: `bulgarian split squat (smith machine)`, `deficit push up`,
`pull up (close neutral grip)` and `seated cable row - bar wide grip (cable)`.

## Offered in #672 too: 15 more of Hevy's pictures

The user's review of their own history (2026-10-18, D29) added 16 rows to `FIXES` under "Hevy's own
picture", each the catalogue exercise Hevy's thumbnail names. The user sent all of them upstream;
15 went into #672 (commit "15 more Hevy titles follow Hevy's own artwork"), and its description's
table lists them. The close-grip pulldown's fixtures in upstream's tests moved with it (2616 → 6392).
## Not taken: the regenerated template map

#672 was closed on 2026-10-25 as taken into 1.4.3, but `release-1.4.3` has only its first three
commits. The fourth, "map Hevy templates to the exercise their own artwork shows" (`fc5ba8450`,
pushed after the maintainer's review), regenerated `frontend/src/lib/hevy-id-map.js` with
`scripts/build-hevy-id-map.mjs` picking each template by its thumbnail's animation id: 429 of 451
mapped (1.4.3 has 297), 129 former customs mapped, 80 rows moved to Hevy's own picture. Once 1.4.3
is released, run the generator on it (upstream's #784, #785 and #793 changed the map since) and
open a new PR.

**Single Arm Triceps Extension (Cable)** stays fork-only: it is a custom exercise in the user's
Hevy account, not one of Hevy's titles, so upstream's map has no place for it.

## Not offered yet: a review of the matches before an import

The fork has one (D33, `frontend/src/hevier/lib/import-review.js`): the import summary gets a
**Check exercise matches** row listing every title in the file with what it becomes, the user's
own exercises first; a tap picks a library exercise, keeps it as the user's own, or goes back to
the automatic match. Choices are kept per app and title and the file is parsed again at once.
Upstream could take it into `ImportSummary` and the Hevy sheet directly: its parsers would read
the choices before their own match, which removes the fork's re-read of the file.
