const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
let balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div(\s|>|\/)/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  if (opens || closes) {
    console.log(`${i + 1}: +${opens} -${closes}  ${line.trim()}`);
  }
  balance += opens - closes;
}
console.log('Balance:', balance);
