const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
const text = fs.readFileSync(path, 'utf8');
const start = text.indexOf('const dashboardContent =');
if (start === -1) {
  console.error('Could not find dashboardContent');
  process.exit(1);
}
const end = text.indexOf('return (', start);
if (end === -1) {
  console.error('Could not find final return after dashboardContent');
  process.exit(1);
}
const segment = text.slice(start, end);
const lines = segment.split(/\r?\n/);
let stack = [];
let line = 1;
let col = 1;
let i = 0;
let inSingle = false, inDouble = false, inTemplate = false, escape = false, braceDepth = 0;
const selfClosingTags = new Set(['area','base','br','col','embed','hr','img','input','keygen','meta','param','source','track','wbr']);
const report = [];
while (i < segment.length) {
  const ch = segment[i];
  if (ch === '\n') {
    line++; col = 1; i++; continue;
  }
  if (escape) {
    escape = false; i++; col++; continue;
  }
  if (ch === '\\') {
    escape = true; i++; col++; continue;
  }
  if (inSingle) {
    if (ch === "'") inSingle = false;
    i++; col++; continue;
  }
  if (inDouble) {
    if (ch === '"') inDouble = false;
    i++; col++; continue;
  }
  if (inTemplate) {
    if (ch === '`') inTemplate = false;
    if (ch === '$' && segment[i+1] === '{') {
      braceDepth++;
      i += 2; col += 2;
      continue;
    }
    i++; col++; continue;
  }
  if (ch === "'") { inSingle = true; i++; col++; continue; }
  if (ch === '"') { inDouble = true; i++; col++; continue; }
  if (ch === '`') { inTemplate = true; i++; col++; continue; }
  if (ch === '{') { braceDepth++; i++; col++; continue; }
  if (ch === '}') { if (braceDepth > 0) braceDepth--; i++; col++; continue; }
  if (braceDepth > 0) { i++; col++; continue; }
  if (ch === '<') {
    if (segment[i+1] === '!' || segment[i+1] === '?' ) { i++; col++; continue; }
    const startLine = line; const startCol = col;
    let j = i + 1;
    let closing = false;
    if (segment[j] === '/') { closing = true; j++; }
    // skip whitespace
    while (segment[j] === ' ' || segment[j] === '\t' || segment[j] === '\r' || segment[j] === '\n') { if (segment[j] === '\n') { line++; col = 1; } else col++; j++; }
    const nameStart = j;
    while (j < segment.length && /[A-Za-z0-9_:.]/.test(segment[j])) j++;
    const tagName = segment.slice(nameStart, j);
    if (!tagName) { i++; col++; continue; }
    // parse until end of tag, accounting for strings and braces
    let tagEnd = j;
    let localSingle = false, localDouble = false, localTemplate = false, localEscape=false, localBrace = 0;
    while (tagEnd < segment.length) {
      const c = segment[tagEnd];
      if (c === '\n') {
        line++; col = 1;
      }
      if (localEscape) { localEscape = false; tagEnd++; col++; continue; }
      if (c === '\\') { localEscape = true; tagEnd++; col++; continue; }
      if (localSingle) {
        if (c === "'") localSingle = false;
        tagEnd++; col++; continue;
      }
      if (localDouble) {
        if (c === '"') localDouble = false;
        tagEnd++; col++; continue;
      }
      if (localTemplate) {
        if (c === '`') localTemplate = false;
        else if (c === '$' && segment[tagEnd+1] === '{') { localBrace++; tagEnd += 2; col += 2; continue; }
        tagEnd++; col++; continue;
      }
      if (c === "'") { localSingle = true; tagEnd++; col++; continue; }
      if (c === '"') { localDouble = true; tagEnd++; col++; continue; }
      if (c === '`') { localTemplate = true; tagEnd++; col++; continue; }
      if (c === '{') { localBrace++; tagEnd++; col++; continue; }
      if (c === '}') { if (localBrace > 0) localBrace--; tagEnd++; col++; continue; }
      if (localBrace > 0) { tagEnd++; col++; continue; }
      if (c === '>') { break; }
      tagEnd++; col++;
    }
    const raw = segment.slice(i, tagEnd + 1);
    const isSelfClosing = closing || /<[^>]*\/\s*>$/.test(raw) || selfClosingTags.has(tagName.toLowerCase());
    if (closing) {
      if (!stack.length) {
        report.push({ type: 'unmatched-close', tagName, line: startLine, col: startCol, raw });
      } else {
        const last = stack[stack.length - 1];
        if (last.tagName === tagName) {
          stack.pop();
        } else {
          report.push({ type: 'mismatch', tagName, expected: last.tagName, line: startLine, col: startCol, raw, last });
          stack.pop();
        }
      }
    } else if (!isSelfClosing) {
      stack.push({ tagName, line: startLine, col: startCol, raw });
    }
    // advance i to after tagEnd
    const advance = tagEnd + 1 - i;
    i += advance;
    col += advance;
    continue;
  }
  i++; col++;
}
console.log('stack length', stack.length);
console.log('remaining stack (top 20):', stack.slice(-20));
for (const r of report) {
  console.log(r);
}
