export * from "./types.js";
export {
  ConverterRegistry,
  UnsupportedFormatError,
  ConversionFailedError,
  type FailedAttempt,
} from "./registry.js";
export { toMarkdown, type MarkdownOptions } from "./serialize/markdown.js";
export { toJSON, toJSONString } from "./serialize/json.js";
export { toChunks, type Chunk, type ChunkOptions } from "./chunk.js";
export { countTokens } from "./tokenizer.js";
export { slugify, decodeText, normalizeMarkdown } from "./util.js";

export { TextConverter } from "./converters/text.js";
export { CsvConverter } from "./converters/csv.js";
export { HtmlConverter, htmlToBlocks } from "./converters/html.js";

import { CsvConverter } from "./converters/csv.js";
import { HtmlConverter } from "./converters/html.js";
import { TextConverter } from "./converters/text.js";
import { ConverterRegistry } from "./registry.js";
import type { Converter } from "./types.js";

/**
 * The pure converters bundled with core (no heavy or environment-specific deps).
 * Adapters (@parsify/node, @parsify/browser) add format-detection and register
 * heavy converters (PDF, DOCX, XLSX) on top of these.
 */
export function builtinConverters(): Converter[] {
  return [new TextConverter(), new HtmlConverter(), new CsvConverter()];
}

/** Build a registry preloaded with the core built-in converters. */
export function createRegistry(extra: Converter[] = []): ConverterRegistry {
  return new ConverterRegistry().registerAll(builtinConverters()).registerAll(extra);
}
