const fs = require('fs');
const ts = require('typescript');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const lines = text.split(/\r?\n/);
for (let end = 520; end <= lines.length; end += 20) {
  const prefix = lines.slice(0, end).join('\n');
  const sf = ts.createSourceFile('dashboard.tsx', prefix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (sf.parseDiagnostics.length > 0) {
    console.log('Diagnostics at prefix ending line', end, sf.parseDiagnostics.map(d => ({line: sf.getLineAndCharacterOfPosition(d.start).line+1, msg: d.messageText}))); 
  } else {
    console.log('No diagnostics at prefix ending line', end);
  }
}
