from pathlib import Path
path = Path('src/app/dashboard/page.tsx')
lines = path.read_text().splitlines()
start = 800
end = 1151
paren = brace = bracket = 0
out = []
for i, line in enumerate(lines[start-1:end], start):
    cleaned = ''
    esc = False
    quote = None
    for ch in line:
        if quote:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == quote:
                quote = None
            continue
        if ch in '"\'\`':
            quote = ch
            continue
        cleaned += ch
    paren += cleaned.count('(') - cleaned.count(')')
    brace += cleaned.count('{') - cleaned.count('}')
    bracket += cleaned.count('[') - cleaned.count(']')
    if paren < 0 or brace < 0 or bracket < 0:
        out.append(f'negative at {i} paren={paren} brace={brace} bracket={bracket} line={line}')
out.append(f'final {paren} {brace} {bracket}')
Path('analysis_balance.txt').write_text('\n'.join(out))
