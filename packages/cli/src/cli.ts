import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { parseArgs } from "node:util";
import {
  type Chunk,
  type ParsifyDocument,
  createNodeRegistry,
  parse,
  parseBytes,
  parseUrl,
  toChunks,
  toJSONString,
  toMarkdown,
} from "@parsify/node";
import { OcrImageConverter } from "@parsify/ocr";

const VERSION = "0.1.0";

const HELP = `parsify — convert any document to LLM-ready Markdown, JSON, or RAG chunks

USAGE
  parsify <file|url>            Convert a file or URL (Markdown to stdout)
  parsify <dir> -o <outdir>     Batch-convert every file in a directory
  cat file.pdf | parsify -x pdf Read from stdin (give a format hint with -x)

OPTIONS
  -o, --output <path>     Write to a file (or directory in batch mode)
      --json              Output the structured JSON document tree
      --chunks            Output RAG chunks as JSONL
      --max-tokens <n>    Max tokens per chunk (default 512)
      --frontmatter       Prepend YAML frontmatter to Markdown
      --ocr               Enable local OCR for images (needs tesseract.js)
  -x, --extension <ext>   Format hint for stdin (e.g. pdf, docx, html)
  -v, --version           Print version
  -h, --help              Show this help

EXAMPLES
  parsify report.pdf -o report.md
  parsify report.pdf --chunks --max-tokens 256 > chunks.jsonl
  parsify https://example.com/page.html --json
  parsify ./docs -o ./out`;

interface Options {
  output?: string;
  json: boolean;
  chunks: boolean;
  maxTokens: number;
  frontmatter: boolean;
  ocr: boolean;
  extension?: string;
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      output: { type: "string", short: "o" },
      json: { type: "boolean", default: false },
      chunks: { type: "boolean", default: false },
      "max-tokens": { type: "string", default: "512" },
      frontmatter: { type: "boolean", default: false },
      ocr: { type: "boolean", default: false },
      extension: { type: "string", short: "x" },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (values.version) {
    process.stdout.write(`parsify ${VERSION}\n`);
    return 0;
  }

  const opts: Options = {
    output: values.output,
    json: values.json ?? false,
    chunks: values.chunks ?? false,
    maxTokens: Number.parseInt(values["max-tokens"] ?? "512", 10),
    frontmatter: values.frontmatter ?? false,
    ocr: values.ocr ?? false,
    extension: normalizeExt(values.extension),
  };

  const registry = createNodeRegistry(opts.ocr ? [new OcrImageConverter()] : []);
  const target = positionals[0];

  // Directory → batch mode.
  if (target && (await isDirectory(target))) {
    return batch(target, opts, registry);
  }

  let doc: ParsifyDocument;
  if (!target) {
    const bytes = await readStdin();
    doc = await parseBytes(bytes, {
      registry,
      ocr: opts.ocr,
      hint: opts.extension ? { extension: opts.extension } : undefined,
    });
  } else if (/^https?:\/\//.test(target)) {
    doc = await parseUrl(target, { registry, ocr: opts.ocr });
  } else {
    doc = await parse(target, { registry, ocr: opts.ocr });
  }

  const rendered = render(doc, opts);
  if (opts.output) await writeFile(opts.output, rendered, "utf-8");
  else process.stdout.write(`${rendered}\n`);
  return 0;
}

function render(doc: ParsifyDocument, opts: Options): string {
  if (opts.json) return toJSONString(doc);
  if (opts.chunks) {
    return toChunks(doc, { maxTokens: opts.maxTokens })
      .map((c: Chunk) => JSON.stringify(c))
      .join("\n");
  }
  return toMarkdown(doc, { frontmatter: opts.frontmatter });
}

async function batch(
  dir: string,
  opts: Options,
  registry: ReturnType<typeof createNodeRegistry>,
): Promise<number> {
  const outDir = opts.output ?? `${dir}-parsified`;
  await mkdir(outDir, { recursive: true });
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath ?? dir, entry.name);
    try {
      const doc = await parse(full, { registry, ocr: opts.ocr });
      const rel = relative(dir, full);
      const ext = opts.json ? ".json" : opts.chunks ? ".jsonl" : ".md";
      const outPath = join(outDir, rel.slice(0, -extname(rel).length || undefined) + ext);
      await mkdir(join(outPath, ".."), { recursive: true });
      await writeFile(outPath, render(doc, opts), "utf-8");
      process.stderr.write(`✓ ${rel}\n`);
      count++;
    } catch (err) {
      process.stderr.write(`✗ ${basename(full)}: ${(err as Error).message}\n`);
    }
  }
  process.stderr.write(`\nConverted ${count} file(s) → ${outDir}\n`);
  return 0;
}

function normalizeExt(ext?: string): string | undefined {
  if (!ext) return undefined;
  const trimmed = ext.trim().toLowerCase();
  if (!trimmed) return undefined;
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function readStdin(): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return new Uint8Array(Buffer.concat(chunks));
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`parsify: ${(err as Error).message}\n`);
    process.exit(1);
  });
