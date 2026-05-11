import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const filePath = path.join(path.resolve(), 'src/app/dashboard/page.tsx')
const content = fs.readFileSync(filePath, 'utf8')
const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const diagnostics = sourceFile.parseDiagnostics
console.log('diagnostics', diagnostics.length)
for (const diag of diagnostics) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start ?? 0)
  console.log(`${line + 1}:${character + 1} - ${ts.flattenDiagnosticMessageText(diag.messageText, '\n')}`)
}
if (diagnostics.length > 0) {
  const pos = diagnostics[0].start ?? 0
  const snippet = content.slice(Math.max(0, pos - 120), pos + 120)
  console.log('--- snippet around error ---')
  console.log(snippet)
}
