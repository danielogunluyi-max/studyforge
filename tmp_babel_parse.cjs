const fs = require('fs');
const parser = require('@babel/parser');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const code = fs.readFileSync(file, 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  console.log('ok');
} catch (e) {
  console.log('message:', e.message);
  console.log('line:', e.loc && e.loc.line);
  console.log('column:', e.loc && e.loc.column);
  console.log('pos:', e.pos);
}
