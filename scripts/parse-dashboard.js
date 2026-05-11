import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const filePath = path.join(path.resolve(), 'src/app/dashboard/page.tsx')
const code = fs.readFileSync(filePath, 'utf8')
const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const diagnostics = sourceFile.parseDiagnostics
if (diagnostics.length === 0) {
  console.log('No parse diagnostics')
} else {
  diagnostics.forEach(diag => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start ?? 0)
    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n')
    console.log(`${line + 1}:${character + 1} - ${message}`)
  })
}
