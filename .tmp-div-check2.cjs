const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // naive scanning for div open and close tags, ignoring self-closing
  let idx = 0;
  while (idx < line.length) {
    const openMatch = line.slice(idx).match(/<div(?=\s|>|$)/);
    const closeMatch = line.slice(idx).match(/<\/div>/);
    if (!openMatch && !closeMatch) break;

    const openIdx = openMatch ? idx + openMatch.index : Infinity;
    const closeIdx = closeMatch ? idx + closeMatch.index : Infinity;

    if (openIdx < closeIdx) {
      const tagPart = line.slice(openIdx, line.indexOf('>', openIdx) + 1);
      const isSelfClosing = tagPart.endsWith('/>');
      if (!isSelfClosing) {
        stack.push({line: i + 1, text: line.trim()});
      }
      idx = openIdx + 4;
    } else {
      if (stack.length === 0) {
        console.log('Extra closing </div> at line', i+1, line.trim());
      } else {
        stack.pop();
      }
      idx = closeIdx + 6;
    }
  }
}
console.log('Unmatched open <div> count:', stack.length);
stack.forEach((entry, index) => {
  console.log(`${index + 1}: line ${entry.line}: ${entry.text}`);
});
