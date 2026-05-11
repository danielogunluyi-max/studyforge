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
for (let i = 0, col = 1, line = 493; i < chunk.length; i++) {
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
    if (ch === '{' || ch === '(' || ch === '[') stack.push({ch, line, col});
    if (ch === '}' || ch === ')' || ch === ']') {
      const expected = ch === '}' ? '{' : ch === ')' ? '(' : '[';
      const top = stack[stack.length-1];
      if (!top || top.ch !== expected) {
        console.log('Mismatch', ch, 'at', line, col, 'expected', expected, 'top', top);
        break;
      }
      stack.pop();
    }
  }
  if (ch === '\n') { line++; col = 1; } else { col++; }
}
console.log('remaining stack', stack.slice(-20));
