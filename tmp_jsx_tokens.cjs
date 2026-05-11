const fs = require('fs');
const ts = require('typescript');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const text = fs.readFileSync(file, 'utf8');
const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text, undefined, 0, ts.ScriptKind.TSX);
let token = scanner.scan();
const interesting = new Set([
  ts.SyntaxKind.JsxText,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.OpenBraceToken,
  ts.SyntaxKind.CloseBraceToken,
  ts.SyntaxKind.OpenParenToken,
  ts.SyntaxKind.CloseParenToken,
]);
const kinds = ts.SyntaxKind;
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTextPos();
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  if (line + 1 >= 493) {
    if (interesting.has(token)) {
      console.log(`${line+1}:${character+1} ${kinds[token]} '${scanner.getTokenText()}'`);
    }
  }
  token = scanner.scan();
}
