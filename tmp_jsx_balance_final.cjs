const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
const text = fs.readFileSync(path, 'utf8');
const start = text.indexOf('<main');
if (start === -1) {
  console.error('Could not find final <main> block start');
  process.exit(1);
}
const before = text.slice(0, start);
const tail = text.slice(start);
const baseLine = before.split(/\r?\n/).length;
const regex = /<(\/)?([A-Za-z][A-Za-z0-9_:.]*)([^>]*)>/gs;
const selfClosing = new Set(['area','base','br','col','embed','hr','img','input','keygen','meta','param','source','track','wbr']);
const stack = [];
let match;
while ((match = regex.exec(tail)) !== null) {
  const [raw, closing, tagName, rest] = match;
  const line = tail.slice(0, match.index).split(/\r?\n/).length;
  const absoluteLine = baseLine + line;
  const isSelfClosing = closing || /\/\s*>$/.test(raw) || selfClosing.has(tagName.toLowerCase());
  if (closing) {
    if (!stack.length) {
      console.log(`unmatched closing </${tagName}> at ${absoluteLine}: ${raw}`);
    } else {
      const last = stack[stack.length - 1];
      if (last.tagName === tagName) {
        stack.pop();
      } else {
        const context = tail.slice(Math.max(0, match.index - 80), match.index + raw.length + 80);
        console.log(`mismatch: closing </${tagName}> at ${absoluteLine}, expected </${last.tagName}>; stack top was ${last.tagName}\n  raw=${raw}\n  context=${JSON.stringify(context)}`);
        stack.pop();
      }
    }
  } else if (!isSelfClosing) {
    stack.push({ tagName, line, absoluteLine, raw });
  }
}
console.log('stack length', stack.length);
console.log('remaining stack', JSON.stringify(stack.slice(-20), null, 2));
