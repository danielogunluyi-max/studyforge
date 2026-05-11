const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const start = text.indexOf('const dashboardContent =');
const end = text.indexOf('\n  return (', start);
if (start === -1 || end === -1) { console.error('boundaries missing'); process.exit(1); }
const seg = text.slice(start, end);
const lines = seg.split(/\r?\n/);
let open = 0, close = 0;
const details = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const matchesOpen = line.match(/<div(\s|>|\/)/g) || [];
  const matchesClose = line.match(/<\/div>/g) || [];
  if (matchesOpen.length || matchesClose.length) {
    details.push({ line: i+1, open: matchesOpen.length, close: matchesClose.length, text: line.trim() });
  }
  open += matchesOpen.length;
  close += matchesClose.length;
}
console.log('open', open, 'close', close, 'diff', open - close);
for (const d of details) {
  if (d.open || d.close) console.log(d.line, d.open, d.close, d.text);
}
