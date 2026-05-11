const fs = require('fs');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
for (let i = 660; i < 730; i++) {
  if (i < lines.length) {
    console.log(`${(i+1).toString().padStart(4, ' ')}: ${lines[i]}`);
  }
}
