import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { DocxConverter } from "@parsify/converter-docx";
import { PdfConverter } from "@parsify/converter-pdf";
import { XlsxConverter } from "@parsify/converter-xlsx";
import {
  type Converter,
  type ConverterRegistry,
  type ParseOptions,
  type ParsifyDocument,
  type SourceInfo,
  createRegistry,
} from "@parsify/core";
import { detectSource } from "./detect.js";

export { detectSource } from "./detect.js";
export * from "@parsify/core";

/** Heavy converters available in Node. Their constructors are cheap; the heavy
 * parsing libraries are dynamically imported only when a converter runs. */
export function nodeConverters(): Converter[] {
  return [new PdfConverter(), new DocxConverter(), new XlsxConverter()];
}

/** A Node registry: core built-ins + Node heavy converters. */
export function createNodeRegistry(extra: Converter[] = []): ConverterRegistry {
  return createRegistry([...nodeConverters(), ...extra]);
}

export interface ParseFromOptions extends ParseOptions {
  /** Override the registry (e.g. to add plugins). */
  registry?: ConverterRegistry;
  /** Hints to aid format detection. */
  hint?: Partial<SourceInfo>;
}

const defaultRegistry = createNodeRegistry();

/** Parse a local file path into a Parsify document. */
export async function parse(
  path: string,
  options: ParseFromOptions = {},
): Promise<ParsifyDocument> {
  const bytes = new Uint8Array(await readFile(path));
  return parseBytes(bytes, { ...options, hint: { filename: basename(path), ...options.hint } });
}

/** Parse a buffer/Uint8Array into a Parsify document. */
export async function parseBytes(
  bytes: Uint8Array,
  options: ParseFromOptions = {},
): Promise<ParsifyDocument> {
  const { registry = defaultRegistry, hint, ...parseOptions } = options;
  const source = await detectSource(bytes, hint);
  return registry.parse(bytes, source, parseOptions);
}

/** Fetch a URL and parse the response body. */
export async function parseUrl(
  url: string,
  options: ParseFromOptions = {},
): Promise<ParsifyDocument> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim();
  return parseBytes(bytes, {
    ...options,
    hint: { url, mimetype: contentType, ...options.hint },
  });
}
