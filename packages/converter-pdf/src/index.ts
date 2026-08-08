import type { Block, Converter, ParseInput, ParsifyDocument } from "@parsify/core";
import { PRIORITY_SPECIFIC } from "@parsify/core";

/**
 * Converts PDF to the Parsify document model using pdfjs-dist. Text is grouped
 * into lines per page; each resulting block carries its 1-based page number as
 * provenance. The pdfjs library is dynamically imported so merely constructing
 * this converter (and calling `accepts`) stays cheap.
 */
export class PdfConverter implements Converter {
  name = "pdf";
  priority = PRIORITY_SPECIFIC;

  accepts(source: { mimetype?: string; extension?: string }): boolean {
    const ext = (source.extension ?? "").toLowerCase();
    const mime = (source.mimetype ?? "").toLowerCase();
    return ext === ".pdf" || mime === "application/pdf" || mime === "application/x-pdf";
  }

  async parse(input: ParseInput): Promise<ParsifyDocument> {
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const loadingTask = pdfjs.getDocument({
      data: input.bytes,
      // Disable worker: simplest portable setup for Node + bundlers.
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;

    const blocks: Block[] = [];
    let title: string | undefined;
    let author: string | undefined;

    try {
      const meta = await pdf.getMetadata();
      title = meta?.info?.Title || undefined;
      author = meta?.info?.Author || undefined;
    } catch {
      // metadata is best-effort
    }

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const text = itemsToText(content.items);
      for (const para of splitParagraphs(text)) {
        blocks.push({
          type: "paragraph",
          text: para,
          prov: { sourceConverter: this.name, page: pageNum },
        });
      }
      page.cleanup();
    }

    return {
      metadata: {
        title,
        author,
        source: input.source.filename ?? input.source.url,
        mimetype: "application/pdf",
        pageCount: pdf.numPages,
      },
      blocks,
    };
  }
}

function itemsToText(items: any[]): string {
  let out = "";
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    out += item.str;
    if (item.hasEOL) out += "\n";
    else if (!item.str.endsWith(" ")) out += " ";
  }
  return out;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/[ \t]+/g, " ")
        .replace(/\n+/g, " ")
        .trim(),
    )
    .filter((p) => p.length > 0);
}
