import type { ParsifyDocument } from "../types.js";

/**
 * Return the document model as a plain JSON-serializable object. The model is
 * already plain data, so this is effectively the identity - exposed as a named
 * serializer so callers have a stable, explicit API alongside `toMarkdown`.
 */
export function toJSON(doc: ParsifyDocument): ParsifyDocument {
  return doc;
}

/** Convenience: the document model as a pretty-printed JSON string. */
export function toJSONString(doc: ParsifyDocument, space = 2): string {
  return JSON.stringify(doc, null, space);
}
