const fs = require('fs');
const ts = require('typescript');
const file = 'src/app/dashboard/page.tsx';
const code = fs.readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
const diagnostics = source.parseDiagnostics;
if (diagnostics.length === 0) {
  console.log('No parse diagnostics');
} else {
  diagnostics.forEach(d => {
    const { line, character } = source.getLineAndCharacterOfPosition(d.start);
    console.log(`${line+1}:${character+1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
  });
}
