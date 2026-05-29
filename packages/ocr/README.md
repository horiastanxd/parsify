# @parsify/ocr

Optional **local** OCR for [Parsify](https://github.com/parsify/parsify), built on
`tesseract.js`. Recognizes text from images and scanned pages — entirely offline,
no cloud, no API key. Lazy-loaded so the heavy WASM assets load only when used.

```ts
import { createNodeRegistry } from "@parsify/node";
import { OcrImageConverter } from "@parsify/ocr";

const registry = createNodeRegistry([new OcrImageConverter()]);
const doc = await parse("scan.png", { registry, ocr: true });
```

Requires `tesseract.js` as a peer dependency. MIT
