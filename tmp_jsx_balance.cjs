const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
const text = lines.join('\n');
const startIndex = text.indexOf('return (\n    <main');
if (startIndex === -1) {
  console.error('Could not find final return (<main> start).');
  process.exit(1);
}
const tail = text.slice(startIndex);
let stack = [];
const tagRegex = /<(\/)?([A-Za-z0-9_:.]+)([^>]*)>/g;
let match;
const lineBreaks = (s) => s.split(/\r?\n/).length - 1;
let currentLine = text.slice(0, startIndex).split(/\r?\n/).length;
let offset = startIndex;
while ((match = tagRegex.exec(tail)) !== null) {
  const [raw, closeSlash, tagName, rest] = match;
  const pre = tail.slice(0, match.index);
  const newLines = lineBreaks(pre) - lineBreaks(tail.slice(0, offset - startIndex));
  currentLine += Math.max(0, newLines);
  offset = startIndex + match.index;
  const selfClosing = /\/$/.test(rest.trim()) || ['input','img','br','hr','meta','link'].includes(tagName) || raw.startsWith('</');
  const lineNum = currentLine + 1;
  if (closeSlash) {
    if (stack.length === 0) {
      console.log(`Unmatched closing </${tagName}> at line ${lineNum}: ${raw}`);
    } else {
      const last = stack[stack.length - 1];
      if (last.tagName === tagName) {
        stack.pop();
      } else {
        console.log(`Mismatch closing </${tagName}> at line ${lineNum}, expected </${last.tagName}>; raw=${raw}`);
        stack.pop();
      }
    }
  } else if (!selfClosing) {
    stack.push({ tagName, line: lineNum, raw });
  }
  currentLine = text.slice(0, offset).split(/\r?\n/).length;
}
console.log('Stack length:', stack.length);
console.log('Remaining stack:', stack.slice(-30));
