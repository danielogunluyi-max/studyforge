const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
const start = 464 - 1;
const end = 776 - 1;
const newLines = [...lines.slice(0, start), ...lines.slice(end + 1)];
fs.writeFileSync(path, newLines.join('\n'));
console.log(`Removed lines ${start+1}-${end+1}`);
