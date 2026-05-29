import { encode } from "gpt-tokenizer";

/**
 * Count tokens in a string using a GPT-style (cl100k_base) encoding. Pure JS and
 * isomorphic - no WASM - so it works identically in Node and the browser.
 *
 * The `model` parameter is accepted for forward-compatibility; v1 uses a single
 * cl100k_base encoding, which is a close estimate for current OpenAI/Anthropic
 * tokenizers and good enough for chunk budgeting.
 */
export function countTokens(text: string, _model?: string): number {
  if (text.length === 0) return 0;
  return encode(text).length;
}
