const fs = require('fs');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const idx = text.indexOf('return (');
console.log('return index', idx);
console.log('snippet', text.slice(idx, idx + 80));
const idx2 = text.indexOf('<main', idx);
console.log('main index', idx2, 'snippet', text.slice(idx2, idx2 + 30));
