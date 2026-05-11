const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const start = text.indexOf('return (');
const end = text.lastIndexOf('}');
const segment = text.slice(start);
let brace = 0, paren = 0, angle = 0;
for (let i = 0; i < segment.length; i++) {
  const c = segment[i];
  if (c === '{') brace++;
  if (c === '}') brace--;
  if (c === '(') paren++;
  if (c === ')') paren--;
}
console.log('final counts', { brace, paren });
