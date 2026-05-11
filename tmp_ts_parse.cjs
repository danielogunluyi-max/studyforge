const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const file = path.resolve('src/app/dashboard/page.tsx');
const code = fs.readFileSync(file, 'utf8');
const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], {
  jsx: ts.JsxEmit.Preserve,
  allowJs: true,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  noEmit: true,
}));
for (const d of diagnostics) {
  const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  if (d.file && typeof d.start === 'number') {
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    console.log(`${line + 1}:${character + 1} ${msg}`);
  } else {
    console.log(`Unknown location: ${msg}`);
  }
}
