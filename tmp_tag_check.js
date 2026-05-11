const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const stack = [];
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let idx = 0;
  while (true) {
    const open = line.slice(idx).match(/<([A-Za-z0-9_]+)([^/>]*?)\s*>/);
    const self = line.slice(idx).match(/<([A-Za-z0-9_]+)([^>]*?)\/>/);
    const close = line.slice(idx).match(/<\/([A-Za-z0-9_]+)\s*>/);
    const candidates = [];
    if (open) candidates.push({ type: 'open', match: open, index: line.indexOf(open[0], idx) });
    if (self) candidates.push({ type: 'self', match: self, index: line.indexOf(self[0], idx) });
    if (close) candidates.push({ type: 'close', match: close, index: line.indexOf(close[0], idx) });
    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.index - b.index);
    const cand = candidates[0];
    if (cand.type === 'open') {
      if (!cand.match[0].endsWith('/>')) {
        stack.push({ tag: cand.match[1], line: i + 1, text: cand.match[0] });
      }
      idx = cand.index + cand.match[0].length;
    } else if (cand.type === 'self') {
      idx = cand.index + cand.match[0].length;
    } else {
      const tag = cand.match[1];
      if (stack.length === 0 || stack[stack.length - 1].tag !== tag) {
        console.log('Mismatch at', i + 1, cand.match[0], 'expected', stack.length ? stack[stack.length - 1].tag : '<none>');
        break;
      } else {
        stack.pop();
        idx = cand.index + cand.match[0].length;
      }
    }
  }
}
console.log('remaining stack', stack.slice(-20).map((item) => `${item.tag}:${item.line}`).join(', '));
