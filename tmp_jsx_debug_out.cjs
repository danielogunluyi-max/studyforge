const fs = require('fs');
const ts = require('typescript');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const sourceText = fs.readFileSync(file, 'utf8');
const out = [];
const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
out.push('parseDiagnostics:');
for (const d of sourceFile.parseDiagnostics) {
  const loc = sourceFile.getLineAndCharacterOfPosition(d.start || 0);
  out.push(`${loc.line + 1}:${loc.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}
const tags = ['div', 'main', 'section', 'Link', 'p', 'h1', 'style', 'input', 'select', 'option', 'LoadingButton', 'RecordResultModal'];
for (const tag of tags) {
  const open = (sourceText.match(new RegExp(`<${tag}(\\s|>|\\/)`, 'g')) || []).length;
  const close = (sourceText.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  out.push(`${tag}: open=${open} close=${close}`);
}
fs.writeFileSync('tmp_jsx_debug_output.txt', out.join('\n'));
