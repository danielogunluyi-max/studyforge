const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const start = text.indexOf('<main');
const end = text.lastIndexOf('</main>') + '</main>'.length;
const snippet = text.slice(start, end);
const lines = snippet.split(/\r?\n/);
const stack = [];
const regex = /<\/?([A-Za-z][A-Za-z0-9_:.]*|>)([^>]*)>/g;
let match;
let lineNo = 1;
let lastIndex = 0;
while ((match = regex.exec(snippet)) !== null) {
  const before = snippet.slice(lastIndex, match.index);
  lineNo += (before.match(/\n/g) || []).length;
  lastIndex = match.index + match[0].length;
  const tag = match[0];
  if (tag.startsWith('<!--') || tag.startsWith('</>')) {
    if (tag === '</>') {
      if (!stack.length || stack[stack.length - 1].name !== '<>') {
        console.log('Fragment close mismatch at line', lineNo, tag);
      } else stack.pop();
    }
    continue;
  }
  if (tag.startsWith('</')) {
    const name = match[1];
    if (!stack.length) {
      console.log('Extra closing', name, 'at line', lineNo);
      continue;
    }
    const top = stack[stack.length - 1];
    if (top.name === name) {
      stack.pop();
    } else if (top.name === '<>') {
      console.log('Expected closing fragment before', name, 'at line', lineNo);
      stack.pop();
      if (stack.length && stack[stack.length - 1].name === name) {
        stack.pop();
      } else {
        console.log('Mismatch after fragment at line', lineNo, 'found', name, 'expected', stack.length ? stack[stack.length-1].name : 'none');
      }
    } else {
      console.log('Mismatch closing', name, 'at line', lineNo, 'expected', top.name);
      stack.pop();
    }
  } else {
    const isSelf = tag.endsWith('/>');
    const name = match[1] === '>' ? '<>' : match[1];
    if (isSelf) continue;
    if (name === '') continue;
    if (name === '>') {
      stack.push({ name: '<>', line: lineNo });
      continue;
    }
    stack.push({ name, line: lineNo });
  }
}
console.log('Remaining stack:', stack.map(item => item.name + '@' + item.line));
