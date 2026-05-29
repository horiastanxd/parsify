# Parsify

Turn PDFs, Word docs, spreadsheets, HTML and plain text into clean Markdown for
LLMs. Parsify can also give you the parsed document as a JSON tree, or split it
into RAG chunks that already carry their heading path, page number and token count.

The whole thing runs in Node and in the browser from the same codebase. In the
browser that means files get converted locally, on the page, without uploading
them anywhere.

```ts
import { parse } from "@parsify/node";
import { toMarkdown, toChunks } from "@parsify/core";

const doc = await parse("report.pdf");

toMarkdown(doc, { frontmatter: true });  // Markdown with a YAML metadata header
toChunks(doc, { maxTokens: 512 });        // chunks with headingPath, page, tokenCount
```

## Why it exists

There are good Python tools for this (MarkItDown being the obvious one), but the
JavaScript side has been mostly empty. If you're building an agent or a RAG
pipeline in TypeScript you usually end up shelling out to Python or a cloud API.
Parsify is meant to be the thing you reach for instead.

Two ideas shape the design:

1. It parses into a typed document tree first, and Markdown / JSON / chunks are
   produced from that tree. Most converters dump straight to a Markdown string and
   lose the structure on the way. Keeping the tree means you also get page
   provenance and proper chunking for free.
2. It runs client side. The browser build does the parsing in the page, so for a
   lot of privacy-sensitive use cases you never have to send the file to a server.

OCR is optional and also local (tesseract.js), so scanned PDFs and images work
without any cloud service or API key.

## Install

```bash
npm install @parsify/node
```

Or just run the CLI without installing:

```bash
npx parsify report.pdf > report.md
```

## CLI

```bash
parsify report.pdf                            # Markdown to stdout
parsify report.pdf -o report.md               # write to a file
parsify report.pdf --json                      # the JSON document tree
parsify report.pdf --chunks --max-tokens 512   # RAG chunks as JSONL
parsify report.pdf --frontmatter               # Markdown with a YAML header
parsify report.pdf --ocr                        # local OCR for scanned pages
cat report.pdf | parsify -x pdf                 # read from stdin
parsify ./docs -o ./out                         # convert a whole folder
```

`parsify --help` lists everything.

## Library

```ts
import { parse, parseBytes, parseUrl } from "@parsify/node";
import { toMarkdown, toJSON, toChunks, countTokens } from "@parsify/core";

const doc = await parse("invoice.docx");

const md     = toMarkdown(doc, { frontmatter: true });
const tree   = toJSON(doc);
const chunks = toChunks(doc, { maxTokens: 256 });
const tokens = countTokens(md);
```

A chunk looks like this:

```ts
{
  text: "## Goals\n\nShip v1 by Q3.",
  tokenCount: 187,
  headingPath: ["Introduction", "Goals"],
  page: 3,
  index: 4
}
```

## In the browser

```ts
import { parseFile, toMarkdown } from "@parsify/browser";

input.addEventListener("change", async () => {
  const doc = await parseFile(input.files[0]);
  console.log(toMarkdown(doc));
});
```

There's a small drag-and-drop demo in `apps/playground` that does this entirely in
the page. Run it with `pnpm playground`.

## Formats

PDF, DOCX, XLSX, CSV, HTML, plain text, Markdown, and images (with OCR on).

Anything else is meant to come in as a separate `@parsify/converter-*` package.
The converter interface is public, so adding a format is a small, self-contained
job.

## How it's put together

It's a pnpm monorepo. The core is environment-agnostic and does no I/O; the
adapters add file/network access and pull in the heavy parsers only when they're
actually needed, so the browser bundle stays small.

| Package | What it does |
|---|---|
| `@parsify/core` | document model, registry, Markdown/JSON serializers, chunking, tokenizer |
| `@parsify/node` | reads files, stdin and URLs, detects the format |
| `@parsify/browser` | parses a `File` or `Blob` in the page |
| `@parsify/converter-pdf` | PDF, via pdfjs-dist |
| `@parsify/converter-docx` | DOCX, via mammoth |
| `@parsify/converter-xlsx` | XLSX, via exceljs |
| `@parsify/ocr` | optional local OCR, via tesseract.js |
| `parsify` | the CLI |

### Writing a converter

A converter is a small object with a cheap `accepts()` check and an async
`parse()` that returns the document model:

```ts
import type { Converter, ParseInput, ParsifyDocument } from "@parsify/core";
import { PRIORITY_SPECIFIC } from "@parsify/core";

export class MyConverter implements Converter {
  name = "my-format";
  priority = PRIORITY_SPECIFIC;
  accepts(source) {
    return source.extension === ".myext";
  }
  async parse(input: ParseInput): Promise<ParsifyDocument> {
    return { metadata: {}, blocks: [] };
  }
}
```

Register it with `createNodeRegistry([new MyConverter()])`, or the browser
equivalent.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm playground
```

Node 18+ and pnpm 11+ (`corepack enable` gives you pnpm).

## License

MIT. See [LICENSE](./LICENSE).
