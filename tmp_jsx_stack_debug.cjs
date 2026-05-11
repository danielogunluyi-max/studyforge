const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
const text = fs.readFileSync(path, 'utf8');
const start = text.indexOf('return (');
const segment = text.slice(start);
const lines = segment.split(/\r?\n/);
const selfClosing = new Set(['area','base','br','col','embed','hr','img','input','keygen','link','meta','param','source','track','wbr']);
const regex = /<(\/)?([A-Za-z0-9_:.]+)([^>]*)>/g;
let match;
let stack = [];
while ((match = regex.exec(segment)) !== null) {
  const [raw, closing, tagName, rest] = match;
  const pos = match.index;
  const line = segment.slice(0, pos).split(/\r?\n/).length;
  const selfClose = closing || /\/\s*>$/.test(raw) || selfClosing.has(tagName.toLowerCase());
  if (closing) {
    const exp = stack.length ? stack[stack.length - 1] : null;
    if (!exp) {
      console.log(`${line}: unmatched closing ${raw}`);
    } else if (exp.tag === tagName) {
      stack.pop();
      console.log(`${line}: closing ${raw}, matched ${tagName}, stack now ${stack.map(s=>s.tag).join(',')}`);
    } else {
      console.log(`${line}: closing ${raw}, expected </${exp.tag}> but top was ${exp.tag}, stack before pop ${stack.map(s=>s.tag).join(',')}`);
      stack.pop();
    }
  } else if (!selfClose) {
    stack.push({ tag: tagName, raw, line });
    console.log(`${line}: opening ${raw}, stack now ${stack.map(s=>s.tag).join(',')}`);
  } else {
    console.log(`${line}: self-closing ${raw}, stack unchanged ${stack.map(s=>s.tag).join(',')}`);
  }
}
console.log('final stack length', stack.length, stack.map(s=>`${s.line}:${s.tag}`).join(', '));
