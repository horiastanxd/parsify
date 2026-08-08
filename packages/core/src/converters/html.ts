import { type ChildNode, type Element, isTag, isText } from "domhandler";
import { parseDocument } from "htmlparser2";
import type { Block, Converter, HeadingLevel, ParseInput, ParsifyDocument } from "../types.js";
import { PRIORITY_GENERIC } from "../types.js";
import { decodeText, slugify } from "../util.js";

const BLOCK_TAGS = new Set([
  "html",
  "body",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "table",
  "pre",
  "blockquote",
  "img",
  "div",
  "section",
  "article",
  "main",
  "header",
  "footer",
  "figure",
  "figcaption",
]);

const SKIP_TAGS = new Set(["script", "style", "noscript", "head", "nav", "svg"]);

const INLINE_WRAP: Record<string, [string, string]> = {
  strong: ["**", "**"],
  b: ["**", "**"],
  em: ["*", "*"],
  i: ["*", "*"],
  code: ["`", "`"],
  del: ["~~", "~~"],
  s: ["~~", "~~"],
};

/** Converts HTML to the Parsify document model. */
export class HtmlConverter implements Converter {
  name = "html";
  priority = PRIORITY_GENERIC;

  accepts(source: { mimetype?: string; extension?: string }): boolean {
    const ext = (source.extension ?? "").toLowerCase();
    const mime = (source.mimetype ?? "").toLowerCase();
    return (
      ext === ".html" || ext === ".htm" || mime === "text/html" || mime === "application/xhtml+xml"
    );
  }

  async parse(input: ParseInput): Promise<ParsifyDocument> {
    const html = decodeText(input.bytes, input.source.charset);
    const { blocks, title } = htmlToBlocks(html, this.name);
    return {
      metadata: {
        title,
        source: input.source.filename ?? input.source.url,
        mimetype: input.source.mimetype ?? "text/html",
      },
      blocks,
    };
  }
}

/** Shared entry point: parse an HTML string into blocks (reused by the DOCX converter). */
export function htmlToBlocks(html: string, converter: string): { blocks: Block[]; title?: string } {
  const doc = parseDocument(html, { decodeEntities: true });
  const blocks: Block[] = [];
  let title: string | undefined;

  const findTitle = (nodes: ChildNode[]) => {
    for (const node of nodes) {
      if (isTag(node)) {
        if (node.name === "title") title ??= inlineText(node).trim() || undefined;
        if (node.children) findTitle(node.children as ChildNode[]);
      }
    }
  };
  findTitle(doc.children as ChildNode[]);

  walk(doc.children as ChildNode[], blocks, converter);
  return { blocks, title };
}

function walk(nodes: ChildNode[], out: Block[], converter: string): void {
  let inlineBuffer = "";
  const flushInline = () => {
    const text = inlineBuffer.replace(/\s+/g, " ").trim();
    if (text) out.push({ type: "paragraph", text, prov: { sourceConverter: converter } });
    inlineBuffer = "";
  };

  for (const node of nodes) {
    if (isText(node)) {
      inlineBuffer += node.data;
      continue;
    }
    if (!isTag(node)) continue;
    const tag = node.name.toLowerCase();
    if (SKIP_TAGS.has(tag)) continue;

    if (!BLOCK_TAGS.has(tag)) {
      // Unknown/inline-ish container: absorb its inline text.
      inlineBuffer += ` ${inlineText(node)} `;
      continue;
    }

    flushInline();
    const block = elementToBlock(node, tag, converter);
    if (Array.isArray(block)) out.push(...block);
    else if (block) out.push(block);
  }
  flushInline();
}

function elementToBlock(el: Element, tag: string, converter: string): Block | Block[] | null {
  const prov = { sourceConverter: converter };

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1]) as HeadingLevel;
    const text = inlineText(el).trim();
    return text ? { type: "heading", level, text, id: slugify(text), prov } : null;
  }
  if (tag === "p" || tag === "figcaption") {
    const text = inlineText(el).trim();
    return text ? { type: "paragraph", text, prov } : null;
  }
  if (tag === "pre") {
    return { type: "code", text: textContent(el).replace(/\n$/, ""), prov };
  }
  if (tag === "blockquote") {
    const inner: Block[] = [];
    walk(el.children as ChildNode[], inner, converter);
    return { type: "blockquote", blocks: inner, prov };
  }
  if (tag === "img") {
    return {
      type: "image",
      alt: el.attribs.alt || undefined,
      src: el.attribs.src || undefined,
      prov,
    };
  }
  if (tag === "ul" || tag === "ol") {
    return listToBlock(el, tag === "ol", converter);
  }
  if (tag === "table") {
    return tableToBlock(el, converter);
  }
  // Container: recurse.
  const inner: Block[] = [];
  walk(el.children as ChildNode[], inner, converter);
  return inner;
}

function listToBlock(el: Element, ordered: boolean, converter: string): Block {
  const items: Block[][] = [];
  for (const child of el.children) {
    if (isTag(child) && child.name.toLowerCase() === "li") {
      const itemBlocks: Block[] = [];
      // Inline text of the li (excluding nested lists) becomes a paragraph.
      const text = inlineText(child, true).trim();
      if (text) itemBlocks.push({ type: "paragraph", text, prov: { sourceConverter: converter } });
      for (const sub of child.children) {
        if (isTag(sub) && (sub.name === "ul" || sub.name === "ol")) {
          itemBlocks.push(listToBlock(sub, sub.name === "ol", converter));
        }
      }
      items.push(itemBlocks);
    }
  }
  return { type: "list", ordered, items, prov: { sourceConverter: converter } };
}

function tableToBlock(el: Element, converter: string): Block {
  const rows: string[][] = [];
  const collectRows = (node: Element) => {
    for (const child of node.children) {
      if (!isTag(child)) continue;
      const name = child.name.toLowerCase();
      if (name === "tr") {
        const cells: string[] = [];
        for (const cell of child.children) {
          if (isTag(cell) && (cell.name === "td" || cell.name === "th")) {
            cells.push(inlineText(cell).trim());
          }
        }
        rows.push(cells);
      } else if (name === "thead" || name === "tbody" || name === "tfoot") {
        collectRows(child);
      }
    }
  };
  collectRows(el);
  const [headers = [], ...body] = rows;
  return { type: "table", headers, rows: body, prov: { sourceConverter: converter } };
}

/** Render inline content to a Markdown-ish string. If `skipNestedLists`, ul/ol are ignored. */
function inlineText(el: Element, skipNestedLists = false): string {
  let result = "";
  for (const node of el.children) {
    if (isText(node)) {
      result += node.data;
    } else if (isTag(node)) {
      const tag = node.name.toLowerCase();
      if (SKIP_TAGS.has(tag)) continue;
      if (skipNestedLists && (tag === "ul" || tag === "ol")) continue;
      if (tag === "br") {
        result += " ";
      } else if (tag === "a") {
        const href = node.attribs.href;
        const text = inlineText(node, skipNestedLists);
        result += href ? `[${text}](${href})` : text;
      } else if (INLINE_WRAP[tag]) {
        const [open, close] = INLINE_WRAP[tag]!;
        result += `${open}${inlineText(node, skipNestedLists)}${close}`;
      } else {
        result += inlineText(node, skipNestedLists);
      }
    }
  }
  return result;
}

/** Raw text content (no Markdown markup), used for <pre>. */
function textContent(el: Element): string {
  let result = "";
  for (const node of el.children) {
    if (isText(node)) result += node.data;
    else if (isTag(node)) result += textContent(node);
  }
  return result;
}
