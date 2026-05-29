# Parsify — Design Specification

**Date:** 2026-05-29
**Status:** Approved for planning
**One-liner:** A TypeScript-native toolkit that converts any document into LLM-ready Markdown, structured JSON, or RAG chunks — running identically in Node and the browser, with zero data leaving the client.

---

## 1. Background & Motivation

[MarkItDown](https://github.com/microsoft/markitdown) (Microsoft, Python) is the reference: a library + CLI that converts many file types to Markdown for LLM consumption. It uses a converter-registry architecture (`accepts()` / `convert()` per format, priority ordering, `magika`-based detection) and serializes **directly to a flat Markdown string**. Heavy/quality features (OCR, layout) are pushed to paid Azure cloud services.

**The opportunity.** Adoption follows *high demand + weak supply*. Python doc-to-markdown is well served by MarkItDown. The **JavaScript/TypeScript ecosystem has no dominant equivalent**, despite being the largest developer ecosystem and increasingly the home of AI agents (Vercel AI SDK, LangChain.js, MCP servers). Parsify targets that gap.

**The differentiators** (things MarkItDown structurally cannot match):

1. **Runs in the browser** — convert files 100% client-side; data never leaves the machine. A new category, not just another converter.
2. **Parses to a Document Model (AST), not a string** — enabling structured JSON, provenance, and chunking from a single parse.
3. **RAG-native** — semantic chunking with heading hierarchy, page provenance, and token counts, ready for vector DBs.
4. **Local-first OCR** — scanned PDFs/images via `tesseract.js`, no cloud, no API key.

## 2. Goals & Non-Goals

**Goals (v1):**
- Isomorphic core (Node + browser) for 4–6 high-demand formats, polished.
- Document Model → {Markdown, JSON tree, RAG chunks, YAML frontmatter}.
- Token-aware output (chunk token counts).
- Surfaces: npm library (`@parsify/core` + adapters), CLI (`npx parsify`), client-side browser playground.
- First-class, type-safe plugin/converter API from day one.

**Non-Goals (v1):**
- Full format parity with MarkItDown (PPTX, EPUB, audio, RSS, YouTube, zip) — fast-follow / community plugins.
- MCP server — fast-follow (architecture leaves room for it).
- Cloud converters (Azure Doc Intelligence / Content Understanding) — explicitly not our positioning.
- High-fidelity human-facing document rendering — output is for text/LLM pipelines.

## 3. Architecture

**Approach: layered — pure core + thin environment adapters + lazy heavy converters.**

```
parsify/
├── packages/
│   ├── core/        @parsify/core       zero-I/O, isomorphic:
│   │                                     Document Model, converter registry,
│   │                                     serializers (md/json), chunking, tokenizer
│   ├── node/        @parsify/node        Node adapter: fs/stdin/URL reads, format detection (file-type)
│   ├── browser/     @parsify/browser     Browser adapter: File/Blob/drag-drop, format detection
│   ├── cli/         parsify              CLI built on @parsify/node
│   ├── converters/  @parsify/converter-* one package per heavy format (pdf, docx, xlsx); lazy-loaded
│   └── ocr/         @parsify/ocr         optional local OCR (tesseract.js), lazy
├── apps/
│   └── playground/                       Vite SPA, client-side demo (GitHub Pages)
└── docs/
```

**Why layered:** keeps the browser bundle small and tree-shakeable (heavy parsers lazy-loaded per format), isolates pure logic (testable without I/O), makes OCR an opt-in cost, and enforces the security boundary (core does no I/O) via types rather than discipline.

**Tooling:** pnpm workspaces, TypeScript (strict), tsup/Vite for builds, Biome (lint+format), Vitest (test), Changesets (versioning/release).

## 4. Document Model

Parsing produces a typed tree; all outputs derive from it.

```typescript
interface ParsifyDocument {
  metadata: DocumentMetadata;
  blocks: Block[];
}

interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: string;       // ISO 8601
  language?: string;        // BCP-47, best-effort detection
  source?: string;          // filename / URL
  mimetype?: string;
  pageCount?: number;
  custom?: Record<string, string>;
}

type Block =
  | { type: "heading"; level: 1|2|3|4|5|6; text: string; id: string; prov?: BlockProvenance }
  | { type: "paragraph"; text: string; prov?: BlockProvenance }
  | { type: "list"; ordered: boolean; items: Block[][]; prov?: BlockProvenance }
  | { type: "table"; headers: string[]; rows: string[][]; prov?: BlockProvenance }
  | { type: "code"; lang?: string; text: string; prov?: BlockProvenance }
  | { type: "image"; alt?: string; src?: string; ocrText?: string; prov?: BlockProvenance }
  | { type: "blockquote"; blocks: Block[]; prov?: BlockProvenance };

interface BlockProvenance {
  page?: number;                 // e.g. PDF page number
  sourceConverter: string;       // which converter produced this block
  charRange?: [number, number];  // offset range in source text, when meaningful
}
```

Design notes:
- `heading.id` is a slug used for anchors and as the unit of heading-path tracking during chunking.
- Provenance is optional per block; converters fill what they can (PDF fills `page`, plain text fills `charRange`).

## 5. Converter Interface

Borrows MarkItDown's `accepts`/`convert` split (cheap acceptance check before expensive work, priority ordering), but **typed, async, and returning a Document Model instead of a string**.

```typescript
interface SourceInfo {
  mimetype?: string;
  extension?: string;     // includes leading dot, lowercase
  filename?: string;
  url?: string;
  charset?: string;
}

interface ParseInput {
  bytes: Uint8Array;      // isomorphic; adapters produce this from fs/File/stream
  source: SourceInfo;
  options: ParseOptions;  // e.g. { ocr?: boolean }
}

interface Converter {
  name: string;
  priority: number;                          // lower tried first (matches MarkItDown)
  accepts(source: SourceInfo): boolean;       // cheap, no byte reads required
  parse(input: ParseInput): Promise<ParsifyDocument>;
}
```

- `priority`: generic converters (plain text, html) get a high number (tried last); specific converters (pdf, docx) get a low number (tried first) — same semantics as MarkItDown's `PRIORITY_SPECIFIC_FILE_FORMAT` vs `PRIORITY_GENERIC_FILE_FORMAT`.
- `async` because `pdf.js`/WASM/OCR are inherently async in JS and to allow streaming large files.
- The registry tries accepting converters in priority order; first successful `parse()` wins. Failures are collected and surfaced if none succeed (mirrors MarkItDown's `FileConversionException`).

**Format detection:** environment adapters build `SourceInfo`. Node uses the `file-type` package (magic-byte sniffing) + extension + mimetype guessing; browser uses `File.type` + extension. The core registry consumes `SourceInfo` and is detection-agnostic.

## 6. Serializers & Features (pipeline steps over the Document Model)

Full pipeline: `source → detect → parse → ParsifyDocument → {serializers}`.

```typescript
toMarkdown(doc: ParsifyDocument, opts?: { frontmatter?: boolean }): string;
toJSON(doc: ParsifyDocument): ParsifyDocument;          // the tree + provenance
toChunks(doc: ParsifyDocument, opts: ChunkOptions): Chunk[];
countTokens(text: string, model?: string): number;
```

| Feature | Implementation | Package |
|---|---|---|
| JSON tree | `toJSON(doc)` — exposes the model directly | core |
| Markdown | `toMarkdown(doc)` — serialize tree; apply MarkItDown-style whitespace normalization (rstrip lines, collapse 3+ blank lines to 2) | core |
| Frontmatter | `toMarkdown(doc, { frontmatter: true })` — emit YAML from `doc.metadata` | core |
| Token-aware | `countTokens` via `gpt-tokenizer` (pure JS, isomorphic, no WASM) | core |
| RAG chunking | `toChunks` — group blocks respecting heading boundaries; never split below `maxTokens` where avoidable | core |
| Local OCR | `@parsify/ocr` registers a step that fills `image.ocrText` via tesseract.js; lazy, opt-in | ocr |

```typescript
interface ChunkOptions {
  maxTokens: number;          // e.g. 512
  strategy?: "heading" | "fixed";  // default "heading"
  model?: string;             // tokenizer model, default a GPT-style encoding
}

interface Chunk {
  text: string;               // markdown slice
  tokenCount: number;
  headingPath: string[];      // e.g. ["Introduction", "Goals"]
  page?: number;              // from block provenance
  index: number;
}
```

Chunking strategy ("heading", default): walk blocks accumulating into the current chunk; start a new chunk at heading boundaries or when adding the next block would exceed `maxTokens`. Each chunk records the heading path from the document hierarchy and the page from the first contributing block's provenance.

## 7. v1 Format Coverage

| Format | Library | Notes |
|---|---|---|
| Plain text / Markdown | none (core) | passthrough + light structure detection; generic priority |
| HTML | `htmlparser2` / `turndown`-style serialize | generic priority |
| CSV | none (core) | → single table block |
| XLSX | `exceljs` | each sheet → table block(s) |
| DOCX | `mammoth` (→ HTML → model) | headings, lists, tables |
| PDF | `pdfjs-dist` | text + page provenance; tables best-effort; OCR via @parsify/ocr when scanned/`--ocr` |
| Images | `exifr` (metadata) + optional OCR | metadata always; `ocrText` when OCR enabled |

All listed libraries work in both Node and browser (the isomorphic requirement). Heavy ones (`pdfjs-dist`, `exceljs`, `mammoth`, `tesseract.js`) live in their own packages and are dynamically imported only when their converter is selected.

## 8. Surfaces

**Library (npm):**
```typescript
import { parse } from "@parsify/node";
import { toMarkdown, toChunks } from "@parsify/core";

const doc = await parse("report.pdf");
console.log(toMarkdown(doc, { frontmatter: true }));
const chunks = toChunks(doc, { maxTokens: 512 });
```

**CLI (`parsify`, runnable via `npx parsify`):**
```bash
parsify report.pdf                    # markdown → stdout
parsify report.pdf -o out.md          # → file
parsify report.pdf --json             # JSON tree
parsify report.pdf --chunks --max-tokens 512   # RAG chunks → JSONL
parsify report.pdf --ocr              # enable local OCR
cat file.pdf | parsify -x pdf         # stdin with extension hint
parsify ./docs/ -o ./out/             # batch a directory (new vs MarkItDown)
```

**Browser playground (Vite SPA, deployed to GitHub Pages):** drag-and-drop a file, see tabbed Markdown / JSON / Chunks output instantly, **100% client-side**. Prominent banner: "Your files never leave your browser." This is both the proof of the differentiator and the primary marketing magnet.

## 9. Testing & Quality

- **Vitest** for unit + integration.
- **Fixtures** per format in `tests/fixtures/` (sample files).
- **Test vectors**: `(input file → expected markdown/json)` pairs run **identically in Node and browser (jsdom/happy-dom)** to guarantee isomorphic parity — if a converter diverges across environments, the test fails.
- **TDD** for pure logic (serializers, chunking, tokenizer) — no I/O needed.
- **CI** (GitHub Actions): Biome lint, `tsc` typecheck, Vitest on Node 18/20/22, playground build.

## 10. Licensing & Distribution

- **MIT license** (matches MarkItDown; maximum adoption, minimal contributor friction).
- **npm** scoped packages under `@parsify/*`; unscoped `parsify` for the CLI.
- **Changesets** for versioning and changelog.
- Playground on **GitHub Pages** (free, static, reinforces client-side story).

## 11. Roadmap Beyond v1 (non-binding)

- MCP server (`@parsify/mcp`) exposing `parse_to_markdown` / `parse_to_chunks`.
- Additional formats (PPTX, EPUB, RTF, audio transcription) as `@parsify/converter-*` packages.
- Streaming API for very large files.
- Optional pluggable LLM image captioning (bring-your-own-client, like MarkItDown's `llm_client`).

## 12. Open Questions

None blocking. OCR bundle size is the main risk; mitigated by isolating it in `@parsify/ocr` (opt-in, lazy).
