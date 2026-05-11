const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const start = 491 - 1;
const end = 1154 - 1;
const chunk = lines.slice(start, end + 1).join('\n');
let stack = [];
let line = 491;
let col = 1;
let i = 0;
const bump = (ch) => { if (ch === '\n') { line++; col = 1; } else { col++; } };
const isNameChar = (ch) => /[A-Za-z0-9_]/.test(ch);
while (i < chunk.length) {
  const ch = chunk[i];
  if (ch === '<') {
    const startLine = line;
    const startCol = col;
    // parse tag or fragment
    let j = i + 1;
    if (chunk[j] === '!') { // comment or doctype
      while (j < chunk.length && chunk[j] !== '>') { if (chunk[j] === '\n') { line++; col = 1; } else { col++; } j++; }
      i = j + 1; continue;
    }
    let closing = false;
    if (chunk[j] === '/') { closing = true; j++; }
    let name = '';
    while (j < chunk.length && /[A-Za-z0-9_]/.test(chunk[j])) {
      name += chunk[j];
      j++;
    }
    if (!name && !closing && chunk[j] === '>') {
      // fragment open
      stack.push({ tag: '<>', line: startLine, col: startCol });
      i = j + 1; bump('<'); bump('/'); bump('>'); continue;
    }
    if (!name && closing && chunk[j] === '>') {
      // fragment close
      const top = stack[stack.length-1];
      if (!top || top.tag !== '<>') {
        console.log(`mismatch fragment close at ${startLine}:${startCol}, expected ${top ? top.tag : '<none>'}`);
      } else {
        stack.pop();
      }
      i = j + 1; bump('<'); bump('/'); bump('>'); continue;
    }
    // skip tag attributes until closing >, respecting strings and braces
    let selfClosing = false;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let depth = 0;
    while (j < chunk.length) {
      const c = chunk[j];
      if (inSingle) {
        if (c === "'" && chunk[j-1] !== '\\') inSingle = false;
      } else if (inDouble) {
        if (c === '"' && chunk[j-1] !== '\\') inDouble = false;
      } else if (inTemplate) {
        if (c === '`' && chunk[j-1] !== '\\') inTemplate = false;
      } else {
        if (c === "'") inSingle = true;
        else if (c === '"') inDouble = true;
        else if (c === '`') inTemplate = true;
        else if (c === '{') depth++;
        else if (c === '}') depth = Math.max(0, depth - 1);
        else if (c === '/' && chunk[j+1] === '>' && depth === 0) { selfClosing = true; j++; }
        else if (c === '>') break;
      }
      if (c === '\n') { line++; col = 1; } else { col++; }
      j++;
    }
    const tagInfo = { tag: name, closing, selfClosing, line: startLine, col: startCol };
    if (!closing && !selfClosing) {
      stack.push(tagInfo);
    } else if (closing) {
      const top = stack[stack.length-1];
      if (!top || top.tag !== name) {
        console.log(`mismatch close ${name} at ${startLine}:${startCol}, expected ${top ? top.tag : '<none>'}`);
      } else {
        stack.pop();
      }
    }
    // advance i and column
    while (i <= j) { bump(chunk[i] || ''); i++; }
    continue;
  }
  if (ch === '\n') { line++; col = 1; } else { col++; }
  i++;
}
console.log('remaining stack', stack.map((item) => `${item.tag}@${item.line}:${item.col}`).join(' | '));
