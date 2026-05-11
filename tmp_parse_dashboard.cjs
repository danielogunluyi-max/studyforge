const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/app/dashboard/page.tsx');
const source = fs.readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function visit(node, depth = 0) {
  if (
    node.kind === ts.SyntaxKind.JsxElement ||
    node.kind === ts.SyntaxKind.JsxSelfClosingElement ||
    node.kind === ts.SyntaxKind.JsxFragment
  ) {
    console.log(depth, ts.SyntaxKind[node.kind], node.getText().slice(0, 120).replace(/\s+/g, ' '));
  }
  ts.forEachChild(node, (c) => visit(c, depth + 1));
}
visit(sf);
console.log('Parse diagnostics');
for (const d of sf.parseDiagnostics) {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start);
  console.log(`${line + 1}:${character + 1} - ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}
