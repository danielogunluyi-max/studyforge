const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const dashboardContent =')) console.log('dashboardContent at', i+1);
  if (lines[i].trim() === 'return (' ) console.log('return at', i+1, JSON.stringify(lines[i]));
}
