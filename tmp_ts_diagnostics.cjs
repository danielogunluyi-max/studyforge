const fs = require('fs');
const ts = require('typescript');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const text = fs.readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = sf.parseDiagnostics;
console.log('diagnostics', diagnostics.length);
for (const d of diagnostics) {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start || 0);
  console.log(`${line+1}:${character+1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}
// print token stream around error
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text, undefined, 0, ts.ScriptKind.TSX);
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTextPos();
  const { line } = sf.getLineAndCharacterOfPosition(pos);
  if (line+1 >= 1140) {
    console.log(`token ${ts.SyntaxKind[token]} at ${line+1}:${scanner.getTextPos() - 1} => ${scanner.getTokenText()}`);
  }
  token = scanner.scan();
}
