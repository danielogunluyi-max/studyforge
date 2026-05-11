const fs = require('fs');
const ts = require('typescript');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const sourceText = fs.readFileSync(file, 'utf8');
const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const out = [];
out.push('diagnostics:');
for (const d of sourceFile.parseDiagnostics) {
  const loc = sourceFile.getLineAndCharacterOfPosition(d.start || 0);
  out.push(`${loc.line + 1}:${loc.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}
const f = sourceFile.statements.find(s => s.kind === ts.SyntaxKind.FunctionDeclaration);
if (!f) {
  out.push('no function declaration');
} else {
  out.push('found function declaration');
  const ret = f.body && f.body.statements.find(s => s.kind === ts.SyntaxKind.ReturnStatement);
  if (ret) {
    out.push('found return statement');
    const expr = ret.expression;
    out.push('return kind=' + (expr && ts.SyntaxKind[expr.kind]));
    if (expr && expr.kind === ts.SyntaxKind.JsxElement) {
      out.push('jsx element opening tag=' + expr.openingElement.tagName.getText());
      out.push('jsx children count=' + expr.children.length);
    }
  }
}
fs.writeFileSync('tmp_tsx_info.txt', out.join('\n'));
