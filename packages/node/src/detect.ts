import { extname } from "node:path";
import type { SourceInfo } from "@parsify/core";
import { fileTypeFromBuffer } from "file-type";

/**
 * Build a SourceInfo for raw bytes. Combines the filename extension with
 * magic-byte sniffing (file-type), so a `.pdf` that is really a ZIP, or a
 * stream with no name, is still classified correctly.
 */
export async function detectSource(
  bytes: Uint8Array,
  hint: Partial<SourceInfo> = {},
): Promise<SourceInfo> {
  const extension =
    hint.extension ?? (hint.filename ? extname(hint.filename).toLowerCase() : undefined);
  let mimetype = hint.mimetype;
  let sniffedExt: string | undefined;

  if (!mimetype || !extension) {
    const sniffed = await fileTypeFromBuffer(bytes);
    if (sniffed) {
      mimetype ??= sniffed.mime;
      sniffedExt = `.${sniffed.ext}`;
    }
  }

  return {
    filename: hint.filename,
    url: hint.url,
    charset: hint.charset,
    extension: extension ?? sniffedExt,
    mimetype,
  };
}
