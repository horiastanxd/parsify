import { toMarkdown } from "./serialize/markdown.js";
import { countTokens } from "./tokenizer.js";
import type { Block, ParsifyDocument } from "./types.js";

export interface ChunkOptions {
  /** Soft maximum number of tokens per chunk. */
  maxTokens: number;
  /**
   * "heading" (default) keeps semantic boundaries: a new chunk starts at each
   * heading and whenever adding a block would exceed `maxTokens`.
   * "fixed" ignores headings and packs purely by token budget.
   */
  strategy?: "heading" | "fixed";
  /** Tokenizer model hint (forwarded to countTokens). */
  model?: string;
}

export interface Chunk {
  text: string;
  tokenCount: number;
  /** Heading hierarchy in effect for this chunk, e.g. ["Intro", "Goals"]. */
  headingPath: string[];
  /** Page of the first contributing block, when available. */
  page?: number;
  index: number;
}

function renderBlock(block: Block): string {
  return toMarkdown({ metadata: {}, blocks: [block] });
}

interface Pending {
  parts: string[];
  headingPath: string[];
  page?: number;
}

/** Split a document into RAG-friendly chunks carrying heading path and provenance. */
export function toChunks(doc: ParsifyDocument, options: ChunkOptions): Chunk[] {
  const { maxTokens, strategy = "heading", model } = options;
  const chunks: Chunk[] = [];
  const headingStack: { level: number; text: string }[] = [];

  let pending: Pending | null = null;

  const flush = () => {
    if (!pending || pending.parts.length === 0) return;
    const text = pending.parts.join("\n\n");
    chunks.push({
      text,
      tokenCount: countTokens(text, model),
      headingPath: pending.headingPath,
      page: pending.page,
      index: chunks.length,
    });
    pending = null;
  };

  for (const block of doc.blocks) {
    if (block.type === "heading") {
      while (headingStack.length > 0 && headingStack[headingStack.length - 1]!.level >= block.level)
        headingStack.pop();
      if (strategy === "heading") flush();
      headingStack.push({ level: block.level, text: block.text });
    }

    const rendered = renderBlock(block);
    const blockTokens = countTokens(rendered, model);

    if (pending) {
      const projected = countTokens([...pending.parts, rendered].join("\n\n"), model);
      if (projected > maxTokens && pending.parts.length > 0) flush();
    }

    if (!pending) {
      pending = {
        parts: [],
        headingPath: headingStack.map((h) => h.text),
        page: block.prov?.page,
      };
    }
    // Use the first available page within the chunk (a leading heading often has none).
    if (pending.page === undefined && block.prov?.page !== undefined) {
      pending.page = block.prov.page;
    }
    pending.parts.push(rendered);

    // A single oversized block becomes its own chunk.
    if (blockTokens >= maxTokens) flush();
  }

  flush();
  return chunks;
}
