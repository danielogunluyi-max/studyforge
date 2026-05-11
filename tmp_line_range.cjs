const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
const start = Number(process.argv[2]) || 1;
const end = Number(process.argv[3]) || lines.length;
for (let i = start - 1; i < end && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
