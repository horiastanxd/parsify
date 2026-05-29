import type { Block, Converter, HeadingLevel, ParseInput, ParsifyDocument } from "../types.js";
import { PRIORITY_GENERIC } from "../types.js";
import { decodeText, slugify } from "../util.js";

const TEXT_EXTENSIONS = new Set([".txt", ".text", ".md", ".markdown", ".log"]);

/**
 * Handles plain text and Markdown. Light Markdown awareness: ATX headings,
 * fenced code blocks, and blank-line-separated paragraphs. Registered at generic
 * priority so specific binary converters win first.
 */
export class TextConverter implements Converter {
  name = "text";
  priority = PRIORITY_GENERIC;

  accepts(source: { mimetype?: string; extension?: string }): boolean {
    const ext = (source.extension ?? "").toLowerCase();
    const mime = (source.mimetype ?? "").toLowerCase();
    return TEXT_EXTENSIONS.has(ext) || mime.startsWith("text/");
  }

  async parse(input: ParseInput): Promise<ParsifyDocument> {
    const text = decodeText(input.bytes, input.source.charset);
    const blocks = parseTextBlocks(text, this.name);
    return {
      metadata: {
        source: input.source.filename ?? input.source.url,
        mimetype: input.source.mimetype ?? "text/plain",
      },
      blocks,
    };
  }
}

function parseTextBlocks(text: string, converter: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      type: "paragraph",
      text: paragraph.join("\n").trim(),
      prov: { sourceConverter: converter },
    });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      flushParagraph();
      const lang = fence[1]?.trim() || undefined;
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i] ?? "")) {
        code.push(lines[i] ?? "");
        i++;
      }
      blocks.push({
        type: "code",
        lang,
        text: code.join("\n"),
        prov: { sourceConverter: converter },
      });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1]!.length as HeadingLevel;
      const headingText = heading[2]!.trim();
      blocks.push({
        type: "heading",
        level,
        text: headingText,
        id: slugify(headingText),
        prov: { sourceConverter: converter },
      });
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}
