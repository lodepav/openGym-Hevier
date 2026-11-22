#!/usr/bin/env python3
"""Usage report from Claude Code transcripts (hevier/TOOLING-PLAN.md, the measurement harness).

Reads ~/.claude/projects/<project>/**/*.jsonl and prints, for a date range or one session:
main-chat vs subagent tokens, tool calls, cross-session messages, compactions, status
questions, timeouts, PATH prefixes, and subagent spend by task kind.

  usage-report.py [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--session ID] [--project NAME ...] [--json]

--project takes a folder name under ~/.claude/projects or a repo name (openGym-Hevier,
OpenNutriTracker); default both forks. Records are counted by their own timestamp.
"""
import argparse, collections, glob, json, os, re, sys

ROOT = os.path.expanduser('~/.claude/projects')
FORKS = ['openGym-Hevier', 'OpenNutriTracker']
STATUS_Q = re.compile(r"\b(what'?s left|how much is (done|left)|is it (hanging|stuck|running|still going)|is something (still )?running|what'?s the (progress|current status|status))", re.I)
NOISE = ('[image:', 'another claude session', 'base directory for this skill', 'this session is being continued',
         '(re-invocation', '<artifact-content', '[cross-session', '<command-', '[request interrupted', '<system-reminder',
         '<task-notification', '<local-command', '<bash-')
KINDS = [('ai-eval answers', ['answers', 'replay', 'plays the meal', 'model test', 'retest']),
         ('dry-run', ['dry-run', 'dry run']),
         ('ux journeys', ['journey', 'ux review', 'ux round']),
         ('critique/audit', ['critique', 'audit', 'impeccable']),
         ('code review', ['review']),
         ('implement/fix', ['fix', 'implement', 'build', 'add', 'port', 'unit', 'phase', 'part']),
         ('research/lookup', ['research', 'search', 'find', 'investigate', 'check', 'scope', 'assess', 'compare'])]


def kind(agent_type, desc):
    d = (desc or '').lower()
    for k, words in KINDS:
        if any(w in d for w in words):
            return k
    return 'other:' + (agent_type or '?')


def project_dirs(names):
    out = []
    for n in names:
        p = os.path.join(ROOT, n)
        if not os.path.isdir(p):
            p = os.path.join(ROOT, os.path.expanduser('~/IdeaProjects/' + n).replace('/', '-'))
        if not os.path.isdir(p):
            sys.exit(f'usage-report: no transcripts for {n}')
        out.append(p)
    return out


def user_text(m):
    c = m.get('content')
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return ' '.join(x.get('text', '') for x in c if isinstance(x, dict) and x.get('type') == 'text')
    return ''


def new_stats():
    return {'cache_read': 0, 'cache_write': 0, 'input': 0, 'output': 0, 'calls': 0, 'turns': 0}


def scan(dirs, since, until, session):
    R = {'main': collections.defaultdict(new_stats), 'sub': collections.defaultdict(new_stats),
         'tools': collections.Counter(), 'sub_kinds': collections.defaultdict(new_stats), 'sub_kind_n': collections.Counter(),
         'sessions': set(), 'user_msgs': 0, 'status_q': 0, 'compactions': 0, 'msgs_sent': 0, 'msgs_received': 0,
         'path_prefix': 0, 'bash_main': 0, 'py_edits_main': 0, 'exit144': collections.Counter(), 'images_main': 0}
    for d in dirs:
        for f in glob.glob(d + '/**/*.jsonl', recursive=True):
            sub = '/subagents/' in f
            sid = (f.split('/subagents/')[0].rsplit('/', 1)[-1] if sub else os.path.basename(f)[:-6])
            if session and not sid.startswith(session):
                continue
            k = None
            if sub:
                try:
                    meta = json.load(open(f[:-6] + '.meta.json'))
                    k = kind(meta.get('agentType'), meta.get('description'))
                except (OSError, ValueError):
                    k = 'other:?'
            counted_agent = False
            pending = {}
            for line in open(f, errors='replace'):
                try:
                    r = json.loads(line)
                except ValueError:
                    continue
                ts = (r.get('timestamp') or '')[:10]
                if not ts or (since and ts < since) or (until and ts > until):
                    continue
                m = r.get('message') or {}
                if r.get('type') == 'assistant':
                    u = m.get('usage') or {}
                    model = (m.get('model') or '?').replace('claude-', '')
                    if model == '<synthetic>':
                        continue
                    targets = [R['sub' if sub else 'main'][model]] + ([R['sub_kinds'][k]] if sub else [])
                    for t in targets:
                        t['cache_read'] += u.get('cache_read_input_tokens', 0)
                        t['cache_write'] += u.get('cache_creation_input_tokens', 0)
                        t['input'] += u.get('input_tokens', 0)
                        t['output'] += u.get('output_tokens', 0)
                        t['turns'] += 1
                    if sub and not counted_agent:
                        R['sub_kind_n'][k] += 1
                        counted_agent = True
                    if not sub:
                        R['sessions'].add(sid)
                    for c in m.get('content') or []:
                        if not isinstance(c, dict) or c.get('type') != 'tool_use':
                            continue
                        for t in targets:
                            t['calls'] += 1
                        if sub:
                            continue
                        name, inp = c['name'], c.get('input') or {}
                        R['tools'][name] += 1
                        if name == 'SendMessage':
                            R['msgs_sent'] += 1
                        if name == 'Bash':
                            cmd = inp.get('command', '')
                            R['bash_main'] += 1
                            if re.search(r'export PATH=\S*(node|flutter|platform-tools)', cmd):
                                R['path_prefix'] += 1
                            if re.match(r'(cd [^;&]+[;&]+\s*)?python3( -I)? - <<', cmd) and '.replace(' in cmd and 'write' in cmd:
                                R['py_edits_main'] += 1
                            pending[c.get('id')] = cmd
                elif r.get('type') == 'user' and not sub:
                    c = m.get('content')
                    if isinstance(c, list):
                        for x in c:
                            if isinstance(x, dict) and x.get('type') == 'tool_result':
                                body = x.get('content')
                                s = body if isinstance(body, str) else json.dumps(body)
                                if x.get('is_error') and s.startswith('Exit code 144'):
                                    cmd = pending.get(x.get('tool_use_id'), '')
                                    key = re.sub(r'^(cd [^;&]+[;&]+\s*|export \S+\s*[;&]+\s*|[A-Z_]+=\S+\s+)+', '', cmd)
                                    R['exit144'][' '.join(key.split()[:3])[:70]] += 1
                                if isinstance(body, list) and any(isinstance(y, dict) and y.get('type') == 'image' for y in body):
                                    R['images_main'] += 1
                            elif isinstance(x, dict) and x.get('type') == 'image':
                                R['images_main'] += 1
                    t = user_text(m).strip()
                    low = t.lower()
                    if low.startswith('this session is being continued'):
                        R['compactions'] += 1
                    elif low.startswith('another claude session') or low.startswith('[cross-session'):
                        R['msgs_received'] += 1
                    elif t and not low.startswith(NOISE):
                        R['user_msgs'] += 1
                        if STATUS_Q.search(t[:200]):
                            R['status_q'] += 1
    return R


def total(d):
    t = new_stats()
    for s in d.values():
        for k in t:
            t[k] += s[k]
    return t


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--since'); ap.add_argument('--until'); ap.add_argument('--session')
    ap.add_argument('--project', nargs='*', default=FORKS); ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    R = scan(project_dirs(a.project), a.since, a.until, a.session)
    main_t, sub_t = total(R['main']), total(R['sub'])
    out = {
        'range': [a.since, a.until], 'session': a.session, 'main_sessions': len(R['sessions']),
        'main': main_t, 'sub': sub_t, 'main_by_model': R['main'], 'sub_by_model': R['sub'],
        'main_context_per_turn': round(main_t['cache_read'] / main_t['turns']) if main_t['turns'] else 0,
        'user_msgs': R['user_msgs'], 'status_questions': R['status_q'], 'compactions': R['compactions'],
        'msgs_sent': R['msgs_sent'], 'msgs_received': R['msgs_received'], 'bash_main': R['bash_main'],
        'path_prefix_calls': R['path_prefix'], 'python_edits_main': R['py_edits_main'], 'images_main': R['images_main'],
        'exit144': dict(R['exit144'].most_common(15)), 'tools_main': dict(R['tools'].most_common(15)),
        'sub_kinds': {k: dict(v, agents=R['sub_kind_n'][k]) for k, v in sorted(R['sub_kinds'].items(), key=lambda kv: -kv[1]['cache_read'])},
    }
    if a.json:
        print(json.dumps(out, indent=1, default=list)); return
    B = lambda n: f'{n / 1e9:.2f} B' if n >= 1e8 else f'{n / 1e6:.1f} M'
    print(f"range {a.since or 'start'}..{a.until or 'now'}{'  session ' + a.session if a.session else ''}  main sessions {out['main_sessions']}")
    for side, t in (('main', main_t), ('subagents', sub_t)):
        print(f"{side:10} cache read {B(t['cache_read']):>9}  cache write {B(t['cache_write']):>8}  output {B(t['output']):>8}  turns {t['turns']:6}  tool calls {t['calls']:6}")
    print(f"main context per turn {out['main_context_per_turn']:,} tokens")
    print(f"user messages {out['user_msgs']}  status questions {out['status_questions']}  compactions {out['compactions']}")
    print(f"cross-session messages sent {out['msgs_sent']}  received {out['msgs_received']}")
    print(f"main Bash {out['bash_main']}  with PATH prefix {out['path_prefix_calls']}  python edits {out['python_edits_main']}  images read {out['images_main']}")
    if out['exit144']:
        print('exit 144:', ', '.join(f'{k} ({v})' for k, v in out['exit144'].items()))
    print('subagents by kind (cache read, output, agents):')
    for k, v in out['sub_kinds'].items():
        print(f"  {k:24} {B(v['cache_read']):>9} {B(v['output']):>8} {v['agents']:5}")


if __name__ == '__main__':
    main()
