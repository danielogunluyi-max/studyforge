const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openMatch = line.match(/<div(?:\s|>|$)/);
  const closeMatch = line.includes('</div>');
  if (openMatch) {
    stack.push({ line: i + 1, text: line.trim() });
  }
  if (closeMatch) {
    if (stack.length === 0) {
      console.log('Unmatched close at', i + 1, line.trim());
    } else {
      stack.pop();
    }
  }
}
console.log('Remaining open divs:', stack.map((item) => `${item.line}: ${item.text}`).join(' | '));
