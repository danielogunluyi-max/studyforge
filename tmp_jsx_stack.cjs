const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const start = 493 - 1; // start of top-level div
let stack = [];
for (let i = start; i < lines.length; i++) {
  const line = lines[i];
  let idx = 0;
  while (idx < line.length) {
    const openTag = line.slice(idx).match(/^<([A-Za-z][A-Za-z0-9]*)([^>]*)>/);
    const closeTag = line.slice(idx).match(/^<\/([A-Za-z][A-Za-z0-9]*)\s*>/);
    const fragOpen = line.slice(idx).match(/^<>/);
    const fragClose = line.slice(idx).match(/^<\/\s*>/);
    const selfClosing = line.slice(idx).match(/^<([A-Za-z][A-Za-z0-9]*)([^>]*)\/>/);
    if (selfClosing) {
      idx += selfClosing[0].length;
      continue;
    }
    if (fragOpen) {
      stack.push({ tag: '<>', line: i+1, text: fragOpen[0] });
      idx += fragOpen[0].length;
      continue;
    }
    if (fragClose) {
      const top = stack[stack.length-1];
      if (!top || top.tag !== '<>') {
        console.log('Mismatch fragment close at', i+1, line.trim());
      } else {
        stack.pop();
      }
      idx += fragClose[0].length;
      continue;
    }
    if (closeTag) {
      const tag = closeTag[1];
      const top = stack[stack.length-1];
      if (!top || top.tag !== tag) {
        console.log('Mismatch close', tag, 'at', i+1, 'expected', top ? top.tag : '<none>');
        stack.push({ tag: `</${tag}>`, line: i+1, text: line.trim() });
      } else {
        stack.pop();
      }
      idx += closeTag[0].length;
      continue;
    }
    if (openTag) {
      const tagName = openTag[1];
      if (!openTag[0].endsWith('/>')) {
        stack.push({ tag: tagName, line: i+1, text: openTag[0] });
      }
      idx += openTag[0].length;
      continue;
    }
    idx += 1;
  }
}
console.log('Remaining stack:', stack.map(item => `${item.tag}@${item.line}:${item.text}`).join(' | '));
