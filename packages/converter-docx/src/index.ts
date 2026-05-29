import type { Converter, ParseInput, ParsifyDocument } from "@parsify/core";
import { PRIORITY_SPECIFIC, htmlToBlocks } from "@parsify/core";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Converts DOCX by letting mammoth produce semantic HTML, then reusing the core
 * HTML → document-model walker. This keeps a single, well-tested structure
 * extractor and gives DOCX headings, lists, and tables for free.
 */
export class DocxConverter implements Converter {
  name = "docx";
  priority = PRIORITY_SPECIFIC;

  accepts(source: { mimetype?: string; extension?: string }): boolean {
    const ext = (source.extension ?? "").toLowerCase();
    const mime = (source.mimetype ?? "").toLowerCase();
    return ext === ".docx" || mime === DOCX_MIME;
  }

  async parse(input: ParseInput): Promise<ParsifyDocument> {
    const mammoth: any = await import("mammoth");
    const buffer = Buffer.from(input.bytes);
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const { blocks, title } = htmlToBlocks(html, this.name);
    return {
      metadata: {
        title,
        source: input.source.filename ?? input.source.url,
        mimetype: DOCX_MIME,
      },
      blocks,
    };
  }
}
