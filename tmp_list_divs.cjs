const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
for (let i = 492; i < 1151; i++) {
  const line = lines[i];
  if (!line) continue;
  if (line.includes('<div') && !line.includes('</div>')) {
    console.log('OPEN', i+1, line.trim());
  }
  if (line.includes('</div>')) {
    console.log('CLOSE', i+1, line.trim());
  }
}
