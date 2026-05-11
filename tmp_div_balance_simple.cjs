const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const start = text.indexOf('  return (');
const segment = text.slice(start);
let openDiv = 0;
let closeDiv = 0;
const regex = /<\/?div\b[^>]*>/g;
let m;
while ((m = regex.exec(segment)) !== null) {
  if (m[0].startsWith('</')) closeDiv++;
  else openDiv++;
  const pos = m.index;
  const line = segment.slice(0, pos).split(/\r?\n/).length;
  console.log(`${line}: ${m[0]}`);
}
console.log('openDiv=', openDiv, 'closeDiv=', closeDiv, 'diff=', openDiv-closeDiv);
