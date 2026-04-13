const fs = require('fs');
const ts = require('typescript');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const sf = ts.createSourceFile('dashboard.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = sf.parseDiagnostics;
console.log('diagnostics', diagnostics.length);
for (const d of diagnostics) {
  console.log('diag', d.messageText, 'line', sf.getLineAndCharacterOfPosition(d.start).line + 1);
}
const node = sf.statements.find(s => s.kind === ts.SyntaxKind.FunctionDeclaration && s.name?.escapedText === 'DashboardPage');
console.log('DashboardPage node', !!node, node && ts.SyntaxKind[node.kind]);
if (node) {
  const fn = node;
  console.log('body kind', ts.SyntaxKind[fn.body.kind]);
  const body = fn.body;
  if (body && body.statements) {
    console.log('body statements', body.statements.length);
    body.statements.forEach((stmt, idx) => {
      console.log(idx, ts.SyntaxKind[stmt.kind], 'start line', sf.getLineAndCharacterOfPosition(stmt.pos).line+1);
    });
    const returnStmt = body.statements.find(s => s.kind === ts.SyntaxKind.ReturnStatement);
    if (returnStmt) {
      console.log('return statement kind', ts.SyntaxKind[returnStmt.kind]);
      console.log('return start line', sf.getLineAndCharacterOfPosition(returnStmt.pos).line+1);
      console.log('return end line', sf.getLineAndCharacterOfPosition(returnStmt.end).line+1);
      console.log('return has expression', !!returnStmt.expression, 'expr kind', returnStmt.expression && ts.SyntaxKind[returnStmt.expression.kind]);
      if (returnStmt.expression) {
        const expr = returnStmt.expression;
        console.log('expr full text start-end', expr.pos, expr.end);
        console.log('expr snippet:', text.slice(expr.pos, expr.end).slice(0, 200).replace(/\r?\n/g, ' '));
        console.log('expr snippet end:', text.slice(expr.pos, expr.end).slice(-200).replace(/\r?\n/g, ' '));
        const recurse = (node, depth = 0) => {
          const kind = ts.SyntaxKind[node.kind];
          const line = sf.getLineAndCharacterOfPosition(node.pos).line + 1;
          console.log(' '.repeat(depth*2)+kind+' line '+line);
          ts.forEachChild(node, child => recurse(child, depth+1));
        };
        recurse(expr, 0);
      }
    }
  }
}
