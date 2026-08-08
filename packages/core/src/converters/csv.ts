import type { Converter, ParseInput, ParsifyDocument } from "../types.js";
import { PRIORITY_SPECIFIC } from "../types.js";
import { decodeText } from "../util.js";

/** Parses CSV (and TSV) into a single table block. */
export class CsvConverter implements Converter {
  name = "csv";
  priority = PRIORITY_SPECIFIC;

  accepts(source: { mimetype?: string; extension?: string }): boolean {
    const ext = (source.extension ?? "").toLowerCase();
    const mime = (source.mimetype ?? "").toLowerCase();
    return ext === ".csv" || ext === ".tsv" || mime === "text/csv";
  }

  async parse(input: ParseInput): Promise<ParsifyDocument> {
    const text = decodeText(input.bytes, input.source.charset);
    const delimiter = (input.source.extension ?? "").toLowerCase() === ".tsv" ? "\t" : ",";
    const rows = parseDelimited(text, delimiter);
    const [headers = [], ...body] = rows;
    return {
      metadata: {
        source: input.source.filename ?? input.source.url,
        mimetype: input.source.mimetype ?? "text/csv",
      },
      blocks: [
        {
          type: "table",
          headers,
          rows: body,
          prov: { sourceConverter: this.name },
        },
      ],
    };
  }
}

/** Minimal RFC-4180-ish delimited parser with quoted-field support. */
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // ignore; handled by \n
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}
