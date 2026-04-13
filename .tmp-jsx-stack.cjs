const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const startLine = 464;
const content = lines.slice(startLine - 1).join('\n');
let stack = [];
const tagRegex = /<\/?([A-Za-z][A-Za-z0-9_:.]*|>)([^>]*?)?>|<\/>/g;
let match;
while ((match = tagRegex.exec(content)) !== null) {
  const tag = match[0];
  const name = match[1];
  const line = content.slice(0, match.index).split(/\r?\n/).length + startLine - 1;
  const isClosing = tag.startsWith('</');
  const isSelfClosing = /<[^>]*\/>$/.test(tag);
  if (tag === '</>') {
    if (stack.length && stack[stack.length - 1].name === '<>') {
      stack.pop();
    } else {
      console.log('Extra closing fragment at', line, tag);
      break;
    }
  } else if (!isClosing) {
    if (!isSelfClosing) {
      stack.push({ name: name === '>' ? '<>' : name, line });
    }
  } else {
    const expected = stack.length ? stack[stack.length - 1].name : null;
    const closeName = name;
    if (expected === closeName) {
      stack.pop();
    } else {
      console.log('Mismatch closing', closeName, 'at', line, 'expected', expected);
      console.log('stack top', stack[stack.length-1]);
      break;
    }
  }
}
console.log('Remaining stack length', stack.length);
stack.forEach((item, idx) => console.log(idx+1, item));
