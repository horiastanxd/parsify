import type { Block, Converter, ParseInput, ParsifyDocument } from "@parsify/core";
import { PRIORITY_SPECIFIC, slugify } from "@parsify/core";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Converts XLSX workbooks: each worksheet becomes a heading + a table block. */
export class XlsxConverter implements Converter {
  name = "xlsx";
  priority = PRIORITY_SPECIFIC;

  accepts(source: { mimetype?: string; extension?: string }): boolean {
    const ext = (source.extension ?? "").toLowerCase();
    const mime = (source.mimetype ?? "").toLowerCase();
    return ext === ".xlsx" || mime === XLSX_MIME;
  }

  async parse(input: ParseInput): Promise<ParsifyDocument> {
    const ExcelJS: any = await import("exceljs");
    const Workbook = ExcelJS.default?.Workbook ?? ExcelJS.Workbook;
    const wb = new Workbook();
    await wb.xlsx.load(Buffer.from(input.bytes));

    const blocks: Block[] = [];
    for (const ws of wb.worksheets) {
      const rows: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (row: any) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        rows.push(values.map(cellToString));
      });
      if (rows.length === 0) continue;

      const name = ws.name || `Sheet ${ws.id}`;
      blocks.push({
        type: "heading",
        level: 2,
        text: name,
        id: slugify(name),
        prov: { sourceConverter: this.name },
      });
      const [headers = [], ...body] = rows;
      blocks.push({ type: "table", headers, rows: body, prov: { sourceConverter: this.name } });
    }

    return {
      metadata: {
        source: input.source.filename ?? input.source.url,
        mimetype: XLSX_MIME,
      },
      blocks,
    };
  }
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("text" in obj) return String(obj.text);
    if ("result" in obj) return String(obj.result);
    if ("richText" in obj && Array.isArray(obj.richText)) {
      return obj.richText.map((r: any) => r.text ?? "").join("");
    }
    if (obj instanceof Date) return obj.toISOString();
  }
  return String(value);
}
