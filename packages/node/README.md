# @parsify/node

Node adapter for [Parsify](https://github.com/parsify/parsify). Reads files,
stdin, and URLs, detects formats (magic bytes + extension), and converts to
Markdown, a JSON tree, or RAG chunks.

```ts
import { parse, parseBytes, parseUrl } from "@parsify/node";
import { toMarkdown, toChunks } from "@parsify/node";

const doc = await parse("report.pdf");
console.log(toMarkdown(doc, { frontmatter: true }));
```

Bundles the PDF, DOCX, and XLSX converters (lazy-loaded). MIT
