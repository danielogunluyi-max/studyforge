from pathlib import Path
p = Path('src/app/dashboard/page.tsx')
lines = p.read_text().splitlines()
for i in range(720, 846):
    if i < len(lines):
        print(f'{i+1:4}: {lines[i]}')
