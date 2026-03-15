import katex from "katex";
import "katex/dist/katex.min.css";

export function renderMath(text: string): string {
  // Replace $$...$$ with block math
  // Replace $...$ with inline math
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
      try {
        return `<div class="math-block">${katex.renderToString(math, { displayMode: true, throwOnError: false })}</div>`;
      } catch {
        return `$$${math}$$`;
      }
    })
    .replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { throwOnError: false });
      } catch {
        return `$${math}$`;
      }
    });
}
