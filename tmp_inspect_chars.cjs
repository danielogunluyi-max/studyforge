const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
for (let i = 1120; i < 1155; i++) {
  const line = lines[i] || '';
  const codes = Array.from(line).map((ch) => ch.charCodeAt(0).toString(16).padStart(4, '0'));
  console.log(`${i+1}: ${line}`);
  console.log(`  codes: ${codes.join(' ')}`);
}
