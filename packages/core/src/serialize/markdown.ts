import type { Block, ParsifyDocument, TableBlock } from "../types.js";
import { normalizeMarkdown } from "../util.js";

export interface MarkdownOptions {
  /** Prepend a YAML frontmatter block built from document metadata. */
  frontmatter?: boolean;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function tableToMarkdown(block: TableBlock): string {
  const cols = Math.max(block.headers.length, ...block.rows.map((r) => r.length), 1);
  const pad = (row: string[]) => {
    const cells = Array.from({ length: cols }, (_, i) => escapeCell(row[i] ?? ""));
    return `| ${cells.join(" | ")} |`;
  };
  const lines = [pad(block.headers), `| ${Array(cols).fill("---").join(" | ")} |`];
  for (const row of block.rows) lines.push(pad(row));
  return lines.join("\n");
}

function blockToMarkdown(block: Block, depth = 0): string {
  switch (block.type) {
    case "heading":
      return `${"#".repeat(block.level)} ${block.text}`;
    case "paragraph":
      return block.text;
    case "code":
      return `\`\`\`${block.lang ?? ""}\n${block.text}\n\`\`\``;
    case "blockquote":
      return block.blocks
        .map((b) => blockToMarkdown(b, depth))
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "table":
      return tableToMarkdown(block);
    case "image": {
      const base = `![${block.alt ?? ""}](${block.src ?? ""})`;
      return block.ocrText ? `${base}\n\n${block.ocrText}` : base;
    }
    case "list": {
      const indent = "  ".repeat(depth);
      return block.items
        .map((item, i) => {
          const marker = block.ordered ? `${i + 1}.` : "-";
          const rendered = item.map((b) => blockToMarkdown(b, depth + 1)).join("\n\n");
          const [first, ...rest] = rendered.split("\n");
          const head = `${indent}${marker} ${first ?? ""}`;
          const tail = rest.map((line) => `${indent}  ${line}`);
          return [head, ...tail].join("\n");
        })
        .join("\n");
    }
  }
}

function buildFrontmatter(doc: ParsifyDocument): string {
  const meta = doc.metadata;
  const lines: string[] = [];
  const put = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "") return;
    const str = String(value);
    const needsQuote = /[:#\n]/.test(str) || /^\s|\s$/.test(str);
    lines.push(`${key}: ${needsQuote ? JSON.stringify(str) : str}`);
  };
  put("title", meta.title);
  put("author", meta.author);
  put("createdAt", meta.createdAt);
  put("language", meta.language);
  put("source", meta.source);
  put("mimetype", meta.mimetype);
  put("pageCount", meta.pageCount);
  if (meta.custom) for (const [k, v] of Object.entries(meta.custom)) put(k, v);
  if (lines.length === 0) return "";
  return `---\n${lines.join("\n")}\n---\n\n`;
}

/** Serialize a Parsify document to Markdown. */
export function toMarkdown(doc: ParsifyDocument, options: MarkdownOptions = {}): string {
  const body = normalizeMarkdown(doc.blocks.map((b) => blockToMarkdown(b)).join("\n\n"));
  const fm = options.frontmatter ? buildFrontmatter(doc) : "";
  return `${fm}${body}`;
}
