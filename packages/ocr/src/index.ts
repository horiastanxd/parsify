import type { Converter, ParseInput, ParsifyDocument } from "@parsify/core";
import { PRIORITY_SPECIFIC } from "@parsify/core";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tiff"]);

export interface OcrOptions {
  /** Tesseract language code(s), e.g. "eng" or "eng+deu". Default "eng". */
  lang?: string;
}

/**
 * Run OCR on raw image bytes, returning recognized text. Loads tesseract.js
 * lazily - importing this module does not pull in the heavy WASM/worker assets.
 */
export async function recognize(bytes: Uint8Array, options: OcrOptions = {}): Promise<string> {
  const { createWorker }: any = await import("tesseract.js");
  const worker = await createWorker(options.lang ?? "eng");
  try {
    const { data } = await worker.recognize(Buffer.from(bytes));
    return (data?.text ?? "").trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Converter for standalone image files. Emits an image block; when parse is
 * called with `{ ocr: true }`, it also fills `ocrText` with locally-recognized
 * text. Register it explicitly (it is not a default built-in).
 */
export class OcrImageConverter implements Converter {
  name = "ocr-image";
  priority = PRIORITY_SPECIFIC;

  constructor(private readonly options: OcrOptions = {}) {}

  accepts(source: { mimetype?: string; extension?: string }): boolean {
    const ext = (source.extension ?? "").toLowerCase();
    const mime = (source.mimetype ?? "").toLowerCase();
    return IMAGE_EXTENSIONS.has(ext) || mime.startsWith("image/");
  }

  async parse(input: ParseInput): Promise<ParsifyDocument> {
    const ocrText = input.options.ocr ? await recognize(input.bytes, this.options) : undefined;
    return {
      metadata: {
        source: input.source.filename ?? input.source.url,
        mimetype: input.source.mimetype,
      },
      blocks: [
        {
          type: "image",
          alt: input.source.filename,
          src: input.source.url,
          ocrText: ocrText || undefined,
          prov: { sourceConverter: this.name },
        },
      ],
    };
  }
}
