const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const program = ts.createProgram([file], {
  jsx: ts.JsxEmit.Preserve,
  allowJs: true,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
console.log(diagnostics.map(d => ({
  file: d.file && d.file.fileName,
  start: d.start,
  line: d.file && d.file.getLineAndCharacterOfPosition(d.start),
  msg: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
})));