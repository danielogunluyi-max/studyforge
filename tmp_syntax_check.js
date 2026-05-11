const fs = require('fs');
const ts = require('typescript');
const path = 'src/app/dashboard/page.tsx';
const text = fs.readFileSync(path, 'utf8');
const sourceFile = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
console.log('diagnostics:', sourceFile.parseDiagnostics.length);
for (const d of sourceFile.parseDiagnostics) {
  console.log(d.messageText, d.start, d.length);
}
