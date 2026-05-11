const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
const text = fs.readFileSync(path, 'utf8');
const lines = text.split(/\r?\n/);
const open = [];
const tags = [];
const regex = /<(\/?)([A-Za-z0-9_:.]+)([^>]*)>/g;
for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  let m;
  while ((m = regex.exec(line)) !== null) {
    const closing = m[1] === '/';
    const tagName = m[2];
    const rest = m[3];
    const selfClosing = /\/$/.test(rest.trim()) || ['input','img','br','hr','meta','link'].includes(tagName);
    tags.push({ line: li + 1, tagName, closing, selfClosing, raw: m[0] });
    if (!closing && !selfClosing) {
      open.push({ tagName, line: li + 1, raw: m[0] });
    } else if (closing) {
      let found = false;
      for (let i = open.length - 1; i >= 0; i--) {
        if (open[i].tagName === tagName) {
          open.splice(i, 1);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`Unmatched closing </${tagName}> at line ${li + 1}`);
      }
    }
  }
}
console.log('Remaining open tags:', open.slice(-20));
console.log('Total open tags left:', open.length);
console.log('Total tags found:', tags.length);
