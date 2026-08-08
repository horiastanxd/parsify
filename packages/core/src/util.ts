/** Decode raw bytes to a string using the given charset (default UTF-8). */
export function decodeText(bytes: Uint8Array, charset = "utf-8"): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Turn heading text into a URL-safe anchor slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Normalize extracted Markdown: strip trailing whitespace and collapse blank runs. */
export function normalizeMarkdown(text: string): string {
  const trimmed = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n");
  return trimmed.replace(/\n{3,}/g, "\n\n").trim();
}
