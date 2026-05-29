import {
  type Converter,
  type ConverterRegistry,
  type ParseOptions,
  type ParsifyDocument,
  type SourceInfo,
  createRegistry,
} from "@parsify/core";

export * from "@parsify/core";

/** Derive a SourceInfo from a browser File. */
export function sourceFromFile(file: File): SourceInfo {
  const dot = file.name.lastIndexOf(".");
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : undefined;
  return {
    filename: file.name,
    extension,
    mimetype: file.type || undefined,
  };
}

export interface BrowserParseOptions extends ParseOptions {
  registry?: ConverterRegistry;
  hint?: Partial<SourceInfo>;
}

/**
 * A browser registry. By default it includes only the pure core converters
 * (text/markdown, HTML, CSV), which run with zero configuration and no network.
 * Pass heavy converters (e.g. a PDF converter with a configured worker) via
 * `extra` to extend it.
 */
export function createBrowserRegistry(extra: Converter[] = []): ConverterRegistry {
  return createRegistry(extra);
}

const defaultRegistry = createBrowserRegistry();

/** Parse a File or Blob entirely in the browser. */
export async function parseFile(
  file: File,
  options: BrowserParseOptions = {},
): Promise<ParsifyDocument> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const source = { ...sourceFromFile(file), ...options.hint };
  const { registry = defaultRegistry, hint: _hint, ...parseOptions } = options;
  return registry.parse(bytes, source, parseOptions);
}

/** Parse raw bytes in the browser, given an explicit SourceInfo. */
export async function parseBytes(
  bytes: Uint8Array,
  source: SourceInfo,
  options: BrowserParseOptions = {},
): Promise<ParsifyDocument> {
  const { registry = defaultRegistry, hint, ...parseOptions } = options;
  return registry.parse(bytes, { ...source, ...hint }, parseOptions);
}
