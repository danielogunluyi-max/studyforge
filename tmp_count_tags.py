from pathlib import Path
import re
path=Path('src/app/dashboard/page.tsx')
text=path.read_text()
lines=text.splitlines()
start=493
end=1151
open_div=0
close_div=0
open_frag=0
close_frag=0
for i,line in enumerate(lines[start-1:end], start):
    open_div += line.count('<div')
    close_div += line.count('</div>')
    open_frag += line.count('<>')
    close_frag += line.count('</>')
    if '<main' in line: main_line=i
with open('count_tags_result.txt','w',encoding='utf-8') as f:
    f.write(f'main_line={main_line}\n')
    f.write(f'open_div={open_div}\nclose_div={close_div}\nopen_frag={open_frag}\nclose_frag={close_frag}\n')
    for i,line in enumerate(lines[start-1:end], start):
        if 'open_div' in line or '</div>' in line or '<>' in line or '</>' in line:
            pass
