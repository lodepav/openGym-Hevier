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

## Not offered yet: a review of the matches before an import

The fork has one (D33, `frontend/src/hevier/lib/import-review.js`): the import summary gets a
**Check exercise matches** row listing every title in the file with what it becomes, the user's
own exercises first; a tap picks a library exercise, keeps it as the user's own, or goes back to
the automatic match. Choices are kept per app and title and the file is parsed again at once.
Upstream could take it into `ImportSummary` and the Hevy sheet directly: its parsers would read
the choices before their own match, which removes the fork's re-read of the file.
