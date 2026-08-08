import type { Converter, ParseInput, ParseOptions, ParsifyDocument, SourceInfo } from "./types.js";

export class UnsupportedFormatError extends Error {
  constructor(source: SourceInfo) {
    super(
      `No converter accepted the input (extension=${source.extension ?? "?"}, mimetype=${
        source.mimetype ?? "?"
      }).`,
    );
    this.name = "UnsupportedFormatError";
  }
}

export interface FailedAttempt {
  converter: string;
  error: unknown;
}

export class ConversionFailedError extends Error {
  readonly attempts: FailedAttempt[];
  constructor(attempts: FailedAttempt[]) {
    const names = attempts.map((a) => a.converter).join(", ");
    super(`All accepting converters failed (${names}). See \`attempts\` for details.`);
    this.name = "ConversionFailedError";
    this.attempts = attempts;
  }
}

/**
 * Holds registered converters and dispatches a parse to the first one that both
 * accepts the source and succeeds. Converters are sorted by priority (lower first)
 * on each parse, using a stable sort, so later registrations win ties.
 */
export class ConverterRegistry {
  private converters: Converter[] = [];

  /** Register a converter. Most recently registered wins ties at the same priority. */
  register(converter: Converter): this {
    this.converters.unshift(converter);
    return this;
  }

  /** Register multiple converters in order. */
  registerAll(converters: Converter[]): this {
    for (const c of converters) this.register(c);
    return this;
  }

  list(): readonly Converter[] {
    return [...this.converters].sort((a, b) => a.priority - b.priority);
  }

  async parse(
    bytes: Uint8Array,
    source: SourceInfo,
    options: ParseOptions = {},
  ): Promise<ParsifyDocument> {
    const input: ParseInput = { bytes, source, options };
    const candidates = this.list().filter((c) => c.accepts(source));

    // If nothing matched on metadata, give every converter a chance (matches the
    // reference behaviour of falling back to an empty-info guess).
    const ordered = candidates.length > 0 ? candidates : this.list();

    const attempts: FailedAttempt[] = [];
    for (const converter of ordered) {
      try {
        return await converter.parse(input);
      } catch (error) {
        attempts.push({ converter: converter.name, error });
      }
    }

    if (attempts.length > 0) throw new ConversionFailedError(attempts);
    throw new UnsupportedFormatError(source);
  }
}
