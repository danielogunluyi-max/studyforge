const fs = require('fs');
const ts = require('typescript');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const sourceFile = ts.createSourceFile('tmp.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text, undefined, 0, ts.ScriptKind.TSX);
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTextPos();
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  if (line + 1 >= 1130 && line + 1 <= 1154) {
    console.log(`${line+1}:${character+1} ${ts.SyntaxKind[token]} '${scanner.getTokenText()}'`);
  }
  token = scanner.scan();
}
