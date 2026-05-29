import {
  type Converter,
  CsvConverter,
  HtmlConverter,
  type SourceInfo,
  TextConverter,
  toMarkdown,
} from "@parsify/core";
import { describe, expect, it } from "vitest";

const bytes = (s: string) => new TextEncoder().encode(s);
const parse = async (c: Pick<Converter, "parse">, text: string, source: SourceInfo) =>
  c.parse({ bytes: bytes(text), source, options: {} });

describe("TextConverter", () => {
  const c = new TextConverter();

  it("accepts text and markdown", () => {
    expect(c.accepts({ extension: ".md" })).toBe(true);
    expect(c.accepts({ mimetype: "text/plain" })).toBe(true);
    expect(c.accepts({ extension: ".pdf" })).toBe(false);
  });

  it("parses markdown headings, paragraphs, and code fences", async () => {
    const doc = await parse(c, "# Title\n\nhello world\n\n```js\nx()\n```", { extension: ".md" });
    expect(doc.blocks[0]).toMatchObject({ type: "heading", level: 1, text: "Title" });
    expect(doc.blocks[1]).toMatchObject({ type: "paragraph", text: "hello world" });
    expect(doc.blocks[2]).toMatchObject({ type: "code", lang: "js", text: "x()" });
  });
});

describe("CsvConverter", () => {
  const c = new CsvConverter();

  it("parses a header row and quoted fields", async () => {
    const doc = await parse(c, 'name,note\nAda,"hello, world"\n', { extension: ".csv" });
    expect(doc.blocks[0]).toMatchObject({
      type: "table",
      headers: ["name", "note"],
      rows: [["Ada", "hello, world"]],
    });
  });

  it("renders to a markdown table", async () => {
    const doc = await parse(c, "a,b\n1,2", { extension: ".csv" });
    expect(toMarkdown(doc)).toContain("| a | b |");
  });
});

describe("HtmlConverter", () => {
  const c = new HtmlConverter();

  it("extracts title, headings, lists, and links", async () => {
    const html =
      "<html><head><title>Doc</title></head><body><h1>Hi</h1><p>see <a href='http://x'>link</a></p><ul><li>one</li><li>two</li></ul></body></html>";
    const doc = await parse(c, html, { extension: ".html" });
    expect(doc.metadata.title).toBe("Doc");
    expect(doc.blocks.some((b) => b.type === "heading" && b.text === "Hi")).toBe(true);
    const md = toMarkdown(doc);
    expect(md).toContain("[link](http://x)");
    expect(md).toContain("- one");
  });

  it("extracts tables", async () => {
    const doc = await parse(
      c,
      "<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>",
      { extension: ".html" },
    );
    const table = doc.blocks.find((b) => b.type === "table");
    expect(table).toMatchObject({ headers: ["a", "b"], rows: [["1", "2"]] });
  });
});
