# @parsify/browser

Browser adapter for [Parsify](https://github.com/parsify/parsify). Convert a
`File` or `Blob` to Markdown, JSON, or RAG chunks **100% client-side** — your
data never leaves the browser.

```ts
import { parseFile, toMarkdown } from "@parsify/browser";

const doc = await parseFile(file);
console.log(toMarkdown(doc));
```

By default includes the pure converters (text/Markdown, HTML, CSV). Pass heavy
converters (e.g. a PDF converter with a configured worker) via
`createBrowserRegistry([...])`. MIT
