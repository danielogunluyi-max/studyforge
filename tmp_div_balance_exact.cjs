const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const start = 493 - 1;
const end = 1154 - 1;
const region = lines.slice(start, end + 1).join('\n');
const stack = [];
const unmatched = [];
const regex = /<\/div>|<div(?:\s|>|\/)/g;
let m;
let lastIndex = 0;
function posToLineCol(idx) {
  const prefix = region.slice(0, idx);
  const line = prefix.split(/\n/).length;
  const col = idx - prefix.lastIndexOf('\n');
  return { line: start + line, col };
}
while ((m = regex.exec(region))) {
  const { index } = m;
  const { line, col } = posToLineCol(index);
  if (m[0].startsWith('</div')) {
    if (stack.length === 0) {
      unmatched.push({ type: 'close', line, col, text: m[0] });
    } else {
      stack.pop();
    }
  } else {
    stack.push({ type: 'open', line, col, text: m[0] });
  }
}
console.log('remaining open divs', stack.map((x) => `${x.line}:${x.col} ${x.text}`).join(' | '));
console.log('unmatched close divs', unmatched.map((x) => `${x.line}:${x.col} ${x.text}`).join(' | '));
console.log('open count', stack.length, 'close count', unmatched.length, 'total open', region.match(/<div(?:\s|>|\/)/g)?.length || 0, 'total close', (region.match(/<\/div>/g) || []).length);
