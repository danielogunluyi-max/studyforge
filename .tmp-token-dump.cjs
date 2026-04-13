const fs = require('fs');
const ts = require('typescript');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
const startLine = 464;
let pos = 0;
for (let i = 0; i < startLine - 1; i++) pos += lines[i].length + 1;
console.log('start pos', pos, 'line', startLine);
const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text, undefined, pos);
let token = scanner.scan();
let count = 0;
while(token !== ts.SyntaxKind.EndOfFileToken && count < 200) {
  const kindName = ts.SyntaxKind[token];
  const tokenText = text.slice(scanner.getTokenPos(), scanner.getTextPos()).replace(/\r?\n/g,' ');
  console.log(`${count}: ${kindName} [${tokenText}] at ${scanner.getTokenPos()}-${scanner.getTextPos()}`);
  token = scanner.scan();
  count++;
}
