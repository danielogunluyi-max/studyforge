const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const start = 450 - 1; // include return and main wrapper
const region = lines.slice(start, lines.length).join('\n');
let stack = [];
let line = 451;
let col = 1;
let i = 0;
const bump = (ch) => { if (ch === '\n') { line++; col = 1; } else { col++; } };
const scanUntil = (endChar) => {
  let nesting = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  while (i < region.length) {
    const ch = region[i];
    if (inSingle) {
      if (ch === "'" && region[i-1] !== '\\') inSingle = false;
    } else if (inDouble) {
      if (ch === '"' && region[i-1] !== '\\') inDouble = false;
    } else if (inTemplate) {
      if (ch === '`' && region[i-1] !== '\\') inTemplate = false;
    } else {
      if (ch === "'") inSingle = true;
      else if (ch === '"') inDouble = true;
      else if (ch === '`') inTemplate = true;
      else if (ch === '{') nesting++;
      else if (ch === '}') nesting = Math.max(0, nesting-1);
      else if (ch === endChar && nesting === 0) {
        return;
      }
    }
    bump(ch);
    i++;
  }
};

while (i < region.length) {
  const ch = region[i];
  if (ch === '<') {
    const startLine = line;
    const startCol = col;
    i++;
    bump('<');
    if (region[i] === '/') {
      i++; bump('/');
      let tag = '';
      while (i < region.length && /[A-Za-z0-9_]/.test(region[i])) { tag += region[i]; bump(region[i]); i++; }
      scanUntil('>');
      bump('>');
      i++;
      const top = stack[stack.length - 1];
      const expected = top ? top.tag : '<none>';
      if (tag === '' && expected === '<>') {
        stack.pop();
      } else if (top && top.tag === tag) {
        stack.pop();
      } else {
        console.log(`mismatch close ${tag || '<>'} at ${startLine}:${startCol}, expected ${expected}`);
      }
      continue;
    }
    if (region[i] === '>') {
      // fragment open
      stack.push({ tag: '<>', line: startLine, col: startCol });
      i++; bump('>');
      continue;
    }
    let tag = '';
    while (i < region.length && /[A-Za-z0-9_]/.test(region[i])) { tag += region[i]; bump(region[i]); i++; }
    const tagName = tag;
    scanUntil('>');
    // determine if self closing by looking back before >
    let j = i;
    while (j > 0 && region[j] !== '>') j--;
    const before = region.slice(j-2, j).trim();
    const selfClosing = before.endsWith('/');
    bump('>');
    i++;
    if (!selfClosing) {
      stack.push({ tag: tagName || '<>', line: startLine, col: startCol });
    }
    continue;
  }
  if (ch === '\n') { line++; col = 1; } else { col++; }
  i++;
}
console.log('remaining stack', stack.map((x) => `${x.tag}@${x.line}:${x.col}`).join(' | '));
