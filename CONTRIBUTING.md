# Contributing to Parsify

Thanks for your interest in improving Parsify! 🎉

## Getting started

```bash
git clone https://github.com/parsify/parsify
cd parsify
pnpm install
pnpm build
pnpm test
```

Requires Node ≥ 18 and pnpm ≥ 11 (`corepack enable` will provide pnpm).

## Project layout

It's a pnpm monorepo. The dependency direction is one-way:

```
core  ←  node / browser  ←  cli / playground
core  ←  converter-* / ocr
```

`@parsify/core` must stay **isomorphic and I/O-free** — no `node:` imports. Anything
that touches the filesystem, the network, or a heavy parser lives in an adapter or a
converter package.

## Adding a converter

The easiest way to add a format is a new `@parsify/converter-*` package that exports a
class implementing the `Converter` interface (`accepts()` + async `parse()` returning a
`ParsifyDocument`). Keep the heavy parsing dependency a **peer dependency** and import
it **dynamically inside `parse()`** so `accepts()` stays cheap and the dependency stays
optional. See `packages/converter-docx` for a compact example.

## Before opening a PR

```bash
pnpm lint        # biome
pnpm typecheck   # tsc -b
pnpm test        # vitest
pnpm build
```

Please add tests for new behavior. Pure logic (serializers, chunking, converters that
don't need binary fixtures) is tested in `tests/`.

## Commit & PR conventions

- Keep PRs focused and describe the user-facing change.
- New formats and features should update the README's "Supported formats" section.

By contributing, you agree your contributions are licensed under the MIT License.
