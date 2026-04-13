const fs = require('fs');
const ts = require('typescript');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const sourceFile = ts.createSourceFile('dashboard.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = sourceFile.parseDiagnostics;
console.log('diagnostics length', diagnostics.length);
for (const d of diagnostics) {
  console.log(d.messageText, 'at', d.start, 'len', d.length, 'line', sourceFile.getLineAndCharacterOfPosition(d.start).line + 1);
}
