const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const start = 493 - 1;
const end = 1154 - 1;
const chunk = lines.slice(start, end + 1).join('\n');
const stack = [];
let inSingle = false;
let inDouble = false;
let inTemplate = false;
let inComment = false;
let inLineComment = false;
let line = 493;
let col = 1;
const log = [];
for (let i = 0; i < chunk.length; i++) {
  const ch = chunk[i];
  if (inLineComment) {
    if (ch === '\n') { inLineComment = false; line++; col = 1; continue; }
  } else if (inComment) {
    if (ch === '*' && chunk[i+1] === '/') { inComment = false; i++; col += 2; continue; }
  } else if (inSingle) {
    if (ch === "'" && chunk[i-1] !== '\\') inSingle = false;
  } else if (inDouble) {
    if (ch === '"' && chunk[i-1] !== '\\') inDouble = false;
  } else if (inTemplate) {
    if (ch === '`' && chunk[i-1] !== '\\') inTemplate = false;
  } else {
    if (ch === '/' && chunk[i+1] === '*') { inComment = true; i++; col += 2; continue; }
    if (ch === '/' && chunk[i+1] === '/') { inLineComment = true; i++; col += 2; continue; }
    if (ch === "'") { inSingle = true; }
    if (ch === '"') { inDouble = true; }
    if (ch === '`') { inTemplate = true; }
    if (ch === '(') { stack.push({ch, line, col}); log.push(`push ( at ${line}:${col} stack=${stack.length}`); }
    if (ch === ')') {
      const top = stack[stack.length-1];
      if (!top || top.ch !== '(') {
        log.push(`mismatch ) at ${line}:${col} expected ( top=${top ? top.ch : 'none'}`);
      } else {
        stack.pop();
        log.push(`pop ( at ${line}:${col} stack=${stack.length}`);
      }
    }
  }
  if (ch === '\n') { line++; col = 1; } else { col++; }
}
log.push('remaining stack: ' + stack.map((item) => `${item.ch}@${item.line}:${item.col}`).join(' | '));
console.log(log.join('\n'));
