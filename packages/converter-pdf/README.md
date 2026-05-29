# @parsify/converter-pdf

PDF converter for [Parsify](https://github.com/parsify/parsify), built on
`pdfjs-dist`. Extracts text with per-block page provenance. The pdfjs library is
loaded lazily, so `accepts()` stays cheap.

```ts
import { createNodeRegistry } from "@parsify/node";
import { PdfConverter } from "@parsify/converter-pdf";

const registry = createNodeRegistry([new PdfConverter()]);
```

Requires `pdfjs-dist` as a peer dependency. In the browser, configure
`GlobalWorkerOptions.workerSrc`. MIT
