const fs = require('fs');
const ts = require('typescript');
const path = require('path');
const file = path.resolve('src/app/dashboard/page.tsx');
const code = fs.readFileSync(file, 'utf8');
const lines = code.split(/\r?\n/);
function parse(code) {
  const sourceFile = ts.createSourceFile('tmp.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return sourceFile.parseDiagnostics.map((d) => ({ line: sourceFile.getLineAndCharacterOfPosition(d.start).line + 1, message: ts.flattenDiagnosticMessageText(d.messageText, '\n') }));
}
function test(removeRange) {
  const modified = lines.filter((_, idx) => !(idx + 1 >= removeRange[0] && idx + 1 <= removeRange[1])).join('\n');
  const diagnostics = parse(modified);
  console.log('remove', removeRange, 'errors', diagnostics.length, diagnostics.slice(0, 5));
}
// test candidate blocks
const candidates = [
  [1138, 1150], // selectedExamForResult block
  [1015, 1136], // pastExams block
  [836, 1012],  // upcoming exams block
  [768, 824],   // add exam card block
  [693, 725],   // readiness card block
];
candidates.forEach(test);
