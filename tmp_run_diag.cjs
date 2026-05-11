const fs = require('fs');
const ts = require('typescript');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const source = fs.readFileSync(file, 'utf8');
const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const messages = [];
for (const d of sourceFile.parseDiagnostics) {
  const loc = sourceFile.getLineAndCharacterOfPosition(d.start || 0);
  messages.push(`${loc.line+1}:${loc.character+1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}
fs.writeFileSync('tmp_run_diag_output.txt', messages.join('\n'));
