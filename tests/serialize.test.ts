import { type ParsifyDocument, toJSON, toMarkdown } from "@parsify/core";
import { describe, expect, it } from "vitest";

const doc: ParsifyDocument = {
  metadata: { title: "Demo", author: "Ada", language: "en" },
  blocks: [
    { type: "heading", level: 1, text: "Title", id: "title" },
    { type: "paragraph", text: "Hello **world**." },
    {
      type: "list",
      ordered: false,
      items: [[{ type: "paragraph", text: "one" }], [{ type: "paragraph", text: "two" }]],
    },
    { type: "table", headers: ["a", "b"], rows: [["1", "2"]] },
    { type: "code", lang: "ts", text: "const x = 1;" },
  ],
};

describe("toMarkdown", () => {
  it("renders headings, lists, tables, and code", () => {
    const md = toMarkdown(doc);
    expect(md).toContain("# Title");
    expect(md).toContain("- one");
    expect(md).toContain("- two");
    expect(md).toContain("| a | b |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("```ts");
  });

  it("emits YAML frontmatter when requested", () => {
    const md = toMarkdown(doc, { frontmatter: true });
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("title: Demo");
    expect(md).toContain("author: Ada");
  });

  it("omits frontmatter by default", () => {
    expect(toMarkdown(doc).startsWith("---")).toBe(false);
  });

  it("collapses excessive blank lines", () => {
    const messy: ParsifyDocument = {
      metadata: {},
      blocks: [
        { type: "paragraph", text: "a" },
        { type: "paragraph", text: "b" },
      ],
    };
    expect(toMarkdown(messy)).toBe("a\n\nb");
  });
});

describe("toJSON", () => {
  it("returns the document model unchanged", () => {
    expect(toJSON(doc)).toEqual(doc);
  });
});
