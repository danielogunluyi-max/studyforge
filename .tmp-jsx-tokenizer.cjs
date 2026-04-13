const fs = require('fs');
const ts = require('typescript');
const text = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
const dashboardStart = text.indexOf('function DashboardPage');
const returnPos = text.indexOf('return (', dashboardStart);
console.log('dashboard pos', dashboardStart, 'return pos', returnPos, 'text len', text.length);
const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text, undefined, returnPos);
let token = scanner.scan();
console.log('first token', ts.SyntaxKind[token]);
let count = 0;
const stack = [];
while(token !== ts.SyntaxKind.EndOfFileToken && count < 150) {
  console.log(count, ts.SyntaxKind[token], JSON.stringify(text.slice(scanner.getTokenPos(), scanner.getTextPos()).replace(/\r?\n/g, ' ')));
  token = scanner.scan();
  count++;
  const kind = token;
  if (kind === ts.SyntaxKind.JsxSelfClosingElement) {
    const start = scanner.getTokenPos();
    const end = scanner.getTextPos();
    const tag = text.slice(start, end);
    console.log('SelfClosing', tag.replace(/\r?\n/g, ' '), 'line', text.slice(0,start).split(/\r?\n/).length);
  }
  if (kind === ts.SyntaxKind.JsxOpeningElement) {
    const start = scanner.getTokenPos();
    const end = scanner.getTextPos();
    const tag = text.slice(start, end);
    console.log('Open', tag.replace(/\r?\n/g, ' '), 'line', text.slice(0,start).split(/\r?\n/).length);
    // after scanning opening element, the next token may be JsxText or JsxClosingElement
  }
  if (kind === ts.SyntaxKind.JsxClosingElement) {
    const start = scanner.getTokenPos();
    const end = scanner.getTextPos();
    const tag = text.slice(start, end);
    console.log('Close', tag.replace(/\r?\n/g, ' '), 'line', text.slice(0,start).split(/\r?\n/).length);
  }
  if (kind === ts.SyntaxKind.JsxOpeningFragment) {
    console.log('OpenFragment line', text.slice(0,scanner.getTokenPos()).split(/\r?\n/).length);
  }
  if (kind === ts.SyntaxKind.JsxClosingFragment) {
    console.log('CloseFragment line', text.slice(0,scanner.getTokenPos()).split(/\r?\n/).length);
  }
  if (kind === ts.SyntaxKind.CloseBraceToken) {
    // ignore
  }
  token = scanner.scan();
}
