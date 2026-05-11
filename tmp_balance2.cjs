const fs = require('fs');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
let paren = 0;
let brace = 0;
let bracket = 0;
let out = [];
for (let i = 463; i < lines.length; i++) {
  const line = lines[i];
  let cleaned = '';
  let quote = null;
  let esc = false;
  for (const ch of line) {
    if (quote) {
      if (esc) {
        esc = false;
      } else if (ch === '\\') {
        esc = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    cleaned += ch;
  }
  paren += (cleaned.match(/\(/g) || []).length;
  paren -= (cleaned.match(/\)/g) || []).length;
  brace += (cleaned.match(/\{/g) || []).length;
  brace -= (cleaned.match(/\}/g) || []).length;
  bracket += (cleaned.match(/\[/g) || []).length;
  bracket -= (cleaned.match(/\]/g) || []).length;
  out.push(`${i+1}: paren=${paren} brace=${brace} bracket=${bracket} ${line}`);
}
fs.writeFileSync(path.resolve('tmp_balance2.txt'), out.join('\n'));
