const fs = require('fs');
const lines = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8').split(/\r?\n/);
for (let i = 480; i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
