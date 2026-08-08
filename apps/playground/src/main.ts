// biome-ignore lint/style/useNodejsImportProtocol: the "buffer" npm polyfill, not node:buffer (this runs in the browser)
import { Buffer } from "buffer";
// DOCX/XLSX parsers expect a Node-style Buffer global; provide it for the browser.
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;

import {
  type ParsifyDocument,
  createBrowserRegistry,
  parseFile,
  toChunks,
  toJSONString,
  toMarkdown,
} from "@parsify/browser";
import { DocxConverter } from "@parsify/converter-docx";
import { PdfConverter } from "@parsify/converter-pdf";
import { XlsxConverter } from "@parsify/converter-xlsx";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

// Configure the pdfjs worker once; PdfConverter imports the same module instance.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

import "./style.css";

const registry = createBrowserRegistry([
  new PdfConverter(),
  new DocxConverter(),
  new XlsxConverter(),
]);

const dropzone = document.getElementById("dropzone") as HTMLElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const browseBtn = document.getElementById("browse") as HTMLButtonElement;
const resultEl = document.getElementById("result") as HTMLElement;
const outputCode = document.querySelector("#output code") as HTMLElement;
const filenameEl = document.getElementById("filename") as HTMLElement;
const statusEl = document.getElementById("status") as HTMLElement;
const copyBtn = document.getElementById("copy") as HTMLButtonElement;
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));

let currentDoc: ParsifyDocument | null = null;
let activeTab: "markdown" | "json" | "chunks" = "markdown";

function render(): void {
  if (!currentDoc) return;
  let text: string;
  if (activeTab === "markdown") text = toMarkdown(currentDoc, { frontmatter: true });
  else if (activeTab === "json") text = toJSONString(currentDoc);
  else
    text = toChunks(currentDoc, { maxTokens: 512 })
      .map((c) => JSON.stringify(c, null, 2))
      .join("\n\n");
  outputCode.textContent = text;
}

async function handleFile(file: File): Promise<void> {
  statusEl.textContent = `Parsing ${file.name}…`;
  resultEl.hidden = true;
  try {
    currentDoc = await parseFile(file, { registry, ocr: false });
    filenameEl.textContent = file.name;
    resultEl.hidden = false;
    statusEl.textContent = "";
    render();
  } catch (err) {
    statusEl.textContent = `Could not parse ${file.name}: ${(err as Error).message}`;
  }
}

browseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void handleFile(file);
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  const file = e.dataTransfer?.files?.[0];
  if (file) void handleFile(file);
});

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    for (const t of tabs) t.classList.remove("active");
    tab.classList.add("active");
    activeTab = tab.dataset.tab as typeof activeTab;
    render();
  });
}

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(outputCode.textContent ?? "");
  copyBtn.textContent = "Copied!";
  setTimeout(() => {
    copyBtn.textContent = "Copy";
  }, 1500);
});
