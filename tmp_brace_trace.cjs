const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const start = text.lastIndexOf('return (');
const segment = text.slice(start);
let depth = 0;
for (let i = 0; i < segment.length; i++) {
  const c = segment[i];
  if (c === '{') depth++;
  if (c === '}') depth--;
  if (depth < 0) {
    const line = segment.slice(0, i).split(/\r?\n/).length;
    console.log('negative at line', line, 'char', i, 'context', JSON.stringify(segment.slice(Math.max(0, i-40), i+40)));
    process.exit(0);
  }
}
console.log('final depth', depth);
