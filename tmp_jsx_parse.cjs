const fs = require('fs');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/\/\*[\s\S]*?\*\//g, '');
const stack = [];
const regex = /<\s*\/\s*([A-Za-z][A-Za-z0-9]*)\s*>|<\s*([A-Za-z][A-Za-z0-9]*)\b([^>]*?)\/\s*>|<\s*([A-Za-z][A-Za-z0-9]*)\b([^>]*?)>|<\s*\/\s*>|<\s*>/g;
let match;
const lines = text.split(/\r?\n/);
while ((match = regex.exec(text)) !== null) {
  const index = match.index;
  const upTo = text.slice(0, index);
  const line = upTo.split(/\r?\n/).length;
  if (match[1]) {
    const tag = match[1];
    const top = stack.length ? stack[stack.length-1] : null;
    if (top && top.tag === tag) {
      stack.pop();
    } else {
      console.log('Unmatched closing', tag, 'at line', line);
    }
  } else if (match[2]) {
    // self closing tag
    continue;
  } else if (match[4]) {
    stack.push({ tag: match[4], line });
  } else if (match[0] === '<>' ) {
    stack.push({ tag:'<>', line });
  } else if (match[0] === '</>') {
    const top = stack.length ? stack[stack.length-1] : null;
    if (top && top.tag === '<>') stack.pop(); else console.log('Unmatched closing fragment at line', line);
  }
}
if (stack.length) {
  console.log('Remaining stack:');
  stack.forEach(item => console.log(item.tag, 'opened at line', item.line));
} else console.log('stack clean');
