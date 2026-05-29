<div align="center">

# Parsify

**Convert any document to LLM-ready Markdown, JSON, or RAG chunks — in Node _and_ the browser.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)
[![Runs in the browser](https://img.shields.io/badge/runs%20in-the%20browser-6ee7b7.svg)](#playground)

</div>

Parsify turns PDFs, Word docs, spreadsheets, HTML, CSV, and plain text into clean
Markdown for LLMs — or into a **structured document tree** and **RAG-ready chunks**
with heading paths, page provenance, and token counts.

It is **isomorphic**: the same code runs in Node and in the browser. The browser
build means you can convert files **100% client-side — your data never leaves the
machine**. No server, no API key, no cloud.

```ts
import { parse } from "@parsify/node";
import { toMarkdown, toChunks } from "@parsify/core";

const doc = await parse("report.pdf");

toMarkdown(doc, { frontmatter: true });   // LLM-ready Markdown + YAML metadata
toChunks(doc, { maxTokens: 512 });         // RAG chunks with headingPath, page, tokenCount
```

## Why Parsify?

| | Parsify | Typical converters |
|---|---|---|
| **Runs in the browser** | ✅ 100% client-side | ❌ server-only |
| **Output** | Markdown **+ JSON tree + RAG chunks** | Markdown string only |
| **Structure preserved** | ✅ typed document model | ❌ flattened to text |
| **Provenance** | ✅ page numbers per block | ❌ none |
| **RAG chunking** | ✅ built-in, heading-aware | ❌ bring your own |
| **Token counts** | ✅ built-in | ❌ none |
| **OCR** | ✅ local, zero-cloud (opt-in) | ☁️ paid cloud APIs |

The key design difference: most tools serialize straight to a Markdown string and
throw the structure away. Parsify parses into a **typed document model** first —
so Markdown, JSON, and chunks are all *derived* from one parse, and structure +
provenance survive.

## Install

```bash
# Library (Node)
npm install @parsify/node

# CLI — or just run it with npx
npx parsify report.pdf > report.md
```

## CLI

```bash
parsify report.pdf                          # → Markdown on stdout
parsify report.pdf -o report.md             # → file
parsify report.pdf --json                   # → structured JSON tree
parsify report.pdf --chunks --max-tokens 512 # → RAG chunks (JSONL)
parsify report.pdf --frontmatter            # → Markdown with YAML frontmatter
parsify report.pdf --ocr                    # → local OCR for scanned pages
cat file.pdf | parsify -x pdf               # → read from stdin
parsify ./docs -o ./out                     # → batch a whole directory
```

## Library

```ts
import { parse, parseBytes, parseUrl } from "@parsify/node";
import { toMarkdown, toJSON, toChunks, countTokens } from "@parsify/core";

const doc = await parse("invoice.docx");

const md     = toMarkdown(doc, { frontmatter: true });
const tree   = toJSON(doc);                       // ParsifyDocument
const chunks = toChunks(doc, { maxTokens: 256 }); // Chunk[]
const tokens = countTokens(md);
```

Each chunk carries everything a RAG pipeline needs:

```ts
{
  text: "## Goals\n\n…",
  tokenCount: 187,
  headingPath: ["Introduction", "Goals"],
  page: 3,
  index: 4
}
```

## Browser

```ts
import { parseFile, toMarkdown } from "@parsify/browser";

input.addEventListener("change", async () => {
  const doc = await parseFile(input.files[0]); // never leaves the browser
  console.log(toMarkdown(doc));
});
```

### Playground

The `apps/playground` app is a drag-and-drop demo that converts files entirely in
your browser. Run it locally:

```bash
pnpm install
pnpm playground
```

## Supported formats (v1)

PDF · DOCX · XLSX · CSV · HTML · TXT · Markdown · images (with optional OCR).

More formats are designed to arrive as standalone `@parsify/converter-*` packages —
the converter interface is public and stable.

## Architecture

Parsify is a layered monorepo so the browser bundle stays small and heavy parsers
load only when needed:

| Package | Role |
|---|---|
| [`@parsify/core`](./packages/core) | Isomorphic, zero-I/O: document model, registry, serializers, chunking, tokenizer |
| [`@parsify/node`](./packages/node) | Node adapter: file/stdin/URL reads + format detection |
| [`@parsify/browser`](./packages/browser) | Browser adapter: `File`/`Blob`, 100% client-side |
| [`@parsify/converter-pdf`](./packages/converter-pdf) | PDF (pdfjs-dist), lazy-loaded |
| [`@parsify/converter-docx`](./packages/converter-docx) | DOCX (mammoth), lazy-loaded |
| [`@parsify/converter-xlsx`](./packages/converter-xlsx) | XLSX (exceljs), lazy-loaded |
| [`@parsify/ocr`](./packages/ocr) | Optional local OCR (tesseract.js) |
| [`parsify`](./packages/cli) | The CLI |

### Writing a converter

A converter is anything implementing the `Converter` interface — a cheap
`accepts()` check plus an async `parse()` that returns a document model:

```ts
import type { Converter, ParseInput, ParsifyDocument } from "@parsify/core";
import { PRIORITY_SPECIFIC } from "@parsify/core";

export class MyConverter implements Converter {
  name = "my-format";
  priority = PRIORITY_SPECIFIC;
  accepts(source) { return source.extension === ".myext"; }
  async parse(input: ParseInput): Promise<ParsifyDocument> {
    return { metadata: {}, blocks: [/* … */] };
  }
}
```

Register it via `createNodeRegistry([new MyConverter()])` (or the browser equivalent).

## Development

```bash
pnpm install
pnpm build       # tsc -b for libraries + tsup for the CLI
pnpm test        # vitest
pnpm typecheck   # tsc -b
pnpm lint        # biome
pnpm playground  # run the browser demo
```

## License

MIT — see [LICENSE](./LICENSE).
