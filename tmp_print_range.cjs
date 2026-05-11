const fs = require('fs');
const lines = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8').split(/\r?\n/);
for (let i = 990; i <= 1010; i++) {
  console.log(`${i+1}: ${lines[i] || ''}`);
}
