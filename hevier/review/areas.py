#!/usr/bin/env python3
"""Maps every file the fork changed (merge-base with main..HEAD) to one review area.
Usage: areas.py            -> counts per area, unmapped files
       areas.py <area>     -> the area's files, one per line (pathspec for git diff)"""
import re, subprocess, sys
BASE = subprocess.check_output(['git', 'merge-base', 'HEAD', 'main'], text=True).strip()
files = subprocess.check_output(['git', 'diff', '--name-only', BASE, 'HEAD'], text=True).split()
EXCLUDE = [r'^frontend/android/app/src/hevier[^/]*/res/', r'\.(png|ttf|webp|jpg|gif|mp4|svg)$', r'package-lock\.json$',
           r'^hevier/ux/', r'^hevier/(DECISIONS|DECISIONS-INDEX|FEATURES|PIPELINE|CHANGELOG|SEAMS|RULES|CONFLICTS|TOOLING-PLAN|README)\.md$',
           r'^hevier/(archive|upstream|reference|review)/', r'^(README|PRODUCT|DESIGN|CLAUDE)\.md$', r'^docs/', r'^website/',
           r'^\.impeccable/', r'OFL\.txt$', r'^hevier/VERSION$', r'^frontend/src/hevier/upgrade/fixtures/', r'^watch-zepp/']
# first match wins; order matters
AREAS = [
 ('hevy', r'(hevy-(import|export|login|web|gyms|folders|builtins|stop|more)|HevyExport|HevyMore|HevyLogin|secret|Secret|gym-backups|BackupsSheet|backup-keep|BackupFolderRow|import-hevy|import-csv|Integrations|upgrade/|/agents/|hevier/skills/|/hooks/|release|supply-chain|install-scanners|security/|lib/version|update-notice|UpdateNotice|lib/update\.js)'),
 ('native', r'(\.java$|\.gradle$|hr-strap|hr-zones|Strap|fake-strap|month-widget|widget|media-pack|media-motion|MediaMotion|MediaSection|Media\.jsx|nearby-gyms|location|phase|Phase|large-text|LargeText|TextZoom|accent-icon|pwa-icons|manifest\.json|mobile\.js)'),
 ('workout', r'(HevyWorkout|WorkoutTab|Workout\.jsx|WorkoutCard|RestDock|FinishSheet|finish-facts|save-workout|set-|open-set|next-set|next-after-rest|rest-extra|hold-|stopwatch|elapsed|Elapsed|Clock|clock-off|dock-next|cur-follow|unticked|untimed|previous-sets|plate-line|nearest-bar|one-limb|side-|odd-value|touched|Touched|field-reveal|HintNumber|duration|Duration|effort|note-text|add-at-end|reorder-units|ReorderExercises|HevyExerciseBlock|exercise-menus|swap-history|PlanKeypad|session-start|history\.js|sheets\.jsx|card-state|useCardState|SubRows|label-refill|sheet-toast|ex-unit|fit-numbers|within|DurationWheel|QueueRow|VoiceSettings)'),
 ('routines', r'(routine|Routine|plan-|next-plan|rotation|plain-routine|ExercisePicker|exercise-picker|equip-groups|EquipGroups|ex-aliases|AliasSheet|NameSheet|prog-default|gym-filter|gym-labels|GymLabels|compound|main-muscle|muscle-groups|MuscleChoice|delt-heads|hevy-builtins|today|Today|next-planned)'),
 ('stats', r'(history-|History|Statistics|stats-|Stats|volume|Volume|records|month-report|MonthReport|calendar|Calendar|workout-compare|weekly-series|WeeklyChart|strength|Strength|lift-progress|lifts-list|Lifts|measures|Measures|body-goal|weigh-in|exercise-page|exercise-summary|ExerciseDetails|exercise-time|ExerciseTime|muscle-sets|MuscleSets|MuscleLine|MuscleExplorer|StructuralBalance|ArrangeStats|chart-tap|delta|trend|Trend|streak|Streak|seasons|days-ago|dates|share-cards|ShareSheet|workout-when|came-back|WorkoutDetail|meaning-colours|volume)'),
 ('shell', r'.'),
]
def area(f):
    if any(re.search(x, f) for x in EXCLUDE): return None
    for name, rx in AREAS:
        if re.search(rx, f): return name
args = sys.argv[1:]
if args:
    print('\n'.join(f for f in files if area(f) == args[0]))
else:
    from collections import Counter
    c = Counter(area(f) for f in files)
    for k, v in sorted(c.items(), key=lambda kv: str(kv[0])):
        fs = [f for f in files if area(f) == k]
        lines = 0
        if k:
            lines = sum(int(l.split()[0]) for l in subprocess.check_output(['git','diff','--numstat',BASE,'HEAD','--',*fs],text=True).splitlines() if l.split()[0] != '-')
        print(f'{str(k):10} files={v:4} added_lines={lines}')
