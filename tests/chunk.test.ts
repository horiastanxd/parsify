import { type ParsifyDocument, countTokens, toChunks } from "@parsify/core";
import { describe, expect, it } from "vitest";

const doc: ParsifyDocument = {
  metadata: {},
  blocks: [
    { type: "heading", level: 1, text: "Intro", id: "intro" },
    { type: "paragraph", text: "First section body.", prov: { sourceConverter: "test", page: 1 } },
    { type: "heading", level: 2, text: "Goals", id: "goals" },
    { type: "paragraph", text: "Second section body.", prov: { sourceConverter: "test", page: 2 } },
  ],
};

describe("toChunks", () => {
  it("starts a new chunk at heading boundaries", () => {
    const chunks = toChunks(doc, { maxTokens: 1000 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.headingPath).toEqual(["Intro"]);
    expect(chunks[1]?.headingPath).toEqual(["Intro", "Goals"]);
  });

  it("records page provenance and token counts", () => {
    const chunks = toChunks(doc, { maxTokens: 1000 });
    expect(chunks[0]?.page).toBe(1);
    expect(chunks[1]?.page).toBe(2);
    for (const chunk of chunks) expect(chunk.tokenCount).toBeGreaterThan(0);
  });

  it("indexes chunks in order", () => {
    const chunks = toChunks(doc, { maxTokens: 1000 });
    expect(chunks.map((c) => c.index)).toEqual([0, 1]);
  });
});

describe("countTokens", () => {
  it("returns 0 for empty input and a positive count otherwise", () => {
    expect(countTokens("")).toBe(0);
    expect(countTokens("hello world")).toBeGreaterThan(0);
  });
});
