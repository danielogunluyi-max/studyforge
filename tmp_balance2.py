from pathlib import Path
path = Path('src/app/dashboard/page.tsx')
lines = path.read_text().splitlines()
start = 464
end = len(lines)
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
    out.append(f'{i}: paren={paren} brace={brace} bracket={bracket} line={line}')
Path('tmp_balance2.txt').write_text('\n'.join(out))
