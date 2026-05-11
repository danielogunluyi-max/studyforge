const fs = require('fs');
const ts = require('typescript');
const file = 'src/app/dashboard/page.tsx';
const code = fs.readFileSync(file, 'utf8');
const result = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }, fileName: file });
if (result.diagnostics && result.diagnostics.length) {
  for (const d of result.diagnostics) {
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    console.log(`${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
  }
} else {
  console.log('No diagnostics');
}
