const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
const start = 1139 - 1;
const end = 1450 - 1;
const replacement = ['        {dashboardContent}'];
const newLines = [...lines.slice(0, start), ...replacement, ...lines.slice(end + 1)];
fs.writeFileSync(path, newLines.join('\n'));
console.log(`Replaced lines ${start+1}-${end+1} with dashboardContent.`);
