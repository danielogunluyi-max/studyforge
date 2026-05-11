import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(path.join(path.resolve(), 'src/app/dashboard/page.tsx'), 'utf8')
const lines = content.split(/\r?\n/)
let stack = []
const OPEN_TAG_RE = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>/g
const CLOSE_TAG_RE = /<\/([A-Za-z][A-Za-z0-9]*)>/g
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  let match
  while ((match = OPEN_TAG_RE.exec(line))) {
    const tag = match[1]
    const selfClosing = line[match.index + match[0].length - 2] === '/'
    if (selfClosing || /^[A-Z]/.test(tag) || ['input', 'img', 'br', 'hr', 'meta', 'link', 'source'].includes(tag)) {
      continue
    }
    stack.push({ tag, line: i + 1 })
  }
  while ((match = CLOSE_TAG_RE.exec(line))) {
    const tag = match[1]
    const idx = stack.map((item) => item.tag).lastIndexOf(tag)
    if (idx === -1) {
      console.log('Unmatched closing', tag, 'at', i + 1, line.trim())
    } else {
      stack.splice(idx, 1)
    }
  }
}
console.log('Remaining stack:')
console.log(stack)
