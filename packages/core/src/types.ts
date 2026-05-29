/**
 * The Parsify Document Model.
 *
 * Unlike string-first converters, every Parsify converter parses into this typed
 * tree. Markdown, JSON, and RAG chunks are all *derived* from it — so structure,
 * provenance, and metadata survive the conversion.
 */

export interface DocumentMetadata {
  title?: string;
  author?: string;
  /** ISO 8601 timestamp. */
  createdAt?: string;
  /** BCP-47 language tag, best-effort. */
  language?: string;
  /** Originating filename or URL. */
  source?: string;
  mimetype?: string;
  pageCount?: number;
  /** Converter-specific extra fields. */
  custom?: Record<string, string>;
}

/** Where a block came from in the source document. */
export interface BlockProvenance {
  /** 1-based page number, when the source has pages (e.g. PDF). */
  page?: number;
  /** Name of the converter that produced this block. */
  sourceConverter: string;
  /** Character offset range in the extracted source text, when meaningful. */
  charRange?: [number, number];
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingBlock {
  type: "heading";
  level: HeadingLevel;
  text: string;
  /** Slug used for anchors and heading-path tracking. */
  id: string;
  prov?: BlockProvenance;
}

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
  prov?: BlockProvenance;
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  /** Each item is itself a list of blocks (supports nesting). */
  items: Block[][];
  prov?: BlockProvenance;
}

export interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
  prov?: BlockProvenance;
}

export interface CodeBlock {
  type: "code";
  lang?: string;
  text: string;
  prov?: BlockProvenance;
}

export interface ImageBlock {
  type: "image";
  alt?: string;
  src?: string;
  /** Text recovered by OCR, when enabled. */
  ocrText?: string;
  prov?: BlockProvenance;
}

export interface BlockquoteBlock {
  type: "blockquote";
  blocks: Block[];
  prov?: BlockProvenance;
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | CodeBlock
  | ImageBlock
  | BlockquoteBlock;

export interface ParsifyDocument {
  metadata: DocumentMetadata;
  blocks: Block[];
}

/** Metadata about a source stream, used to pick a converter. */
export interface SourceInfo {
  mimetype?: string;
  /** Includes the leading dot, lowercase (e.g. ".pdf"). */
  extension?: string;
  filename?: string;
  url?: string;
  charset?: string;
}

export interface ParseOptions {
  /** Enable local OCR for images / scanned PDFs (requires @parsify/ocr). */
  ocr?: boolean;
  [key: string]: unknown;
}

export interface ParseInput {
  /** The raw bytes to convert. Isomorphic: adapters build this from fs/File/streams. */
  bytes: Uint8Array;
  source: SourceInfo;
  options: ParseOptions;
}

/**
 * A document converter. Mirrors the proven accepts()/convert() split (cheap
 * acceptance check, then the real work), but is typed, async, and returns a
 * Document Model instead of a string.
 */
export interface Converter {
  name: string;
  /**
   * Lower numbers are tried first. Specific formats (pdf, docx) should use a low
   * value; near-catch-all formats (plain text, html) should use a high value.
   */
  priority: number;
  /** Cheap determination from metadata only — must not read bytes. */
  accepts(source: SourceInfo): boolean;
  parse(input: ParseInput): Promise<ParsifyDocument>;
}

/** Priority constants, matching the specific-before-generic ordering convention. */
export const PRIORITY_SPECIFIC = 0;
export const PRIORITY_GENERIC = 10;
