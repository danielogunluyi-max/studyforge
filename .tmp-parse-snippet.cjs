const fs = require('fs');
const ts = require('typescript');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const sf = ts.createSourceFile('dashboard.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const d = sf.parseDiagnostics[0];
console.log('pos', d.start, 'len', d.length, 'line', sf.getLineAndCharacterOfPosition(d.start).line + 1);
console.log('snippet:\n' + text.slice(Math.max(0, d.start - 120), d.start + d.length + 120));
