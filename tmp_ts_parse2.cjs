const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const file = path.resolve('src/app/dashboard/page.tsx');
const code = fs.readFileSync(file, 'utf8');
const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = sourceFile.parseDiagnostics;
if (!diagnostics.length) {
  console.log('no parse diagnostics');
} else {
  diagnostics.forEach(d => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start);
    console.log(`${line+1}:${character+1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
  });
}
