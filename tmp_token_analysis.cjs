const fs = require('fs');
const ts = require('typescript');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const sourceText = fs.readFileSync(file, 'utf8');
const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, sourceText);
const out = [];
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const tokenText = scanner.getTokenText();
  const { line, character } = ts.getLineAndCharacterOfPosition(sourceText, scanner.getTextPos ? scanner.getTextPos() : scanner.getTextPos());
  out.push(`${ts.SyntaxKind[token]} (${line + 1}:${character + 1}) ${tokenText.replace(/\n/g, '\\n').slice(0, 100)}`);
  token = scanner.scan();
}
fs.writeFileSync('tmp_token_analysis.txt', out.join('\n'));
