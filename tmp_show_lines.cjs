const fs = require('fs');
const file = 'src/app/dashboard/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
for (let i = 760; i <= 840; i++) {
  if (i < lines.length) console.log(`${(i+1).toString().padStart(4,' ')}: ${lines[i]}`);
}
