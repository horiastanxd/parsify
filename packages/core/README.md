# @parsify/core

Isomorphic core for [Parsify](https://github.com/parsify/parsify): the typed
document model, converter registry, Markdown/JSON serializers, heading-aware RAG
chunking, and a pure-JS tokenizer. Zero I/O - runs anywhere.

```ts
import { toMarkdown, toChunks, countTokens, createRegistry } from "@parsify/core";
```

Bundled pure converters: text/Markdown, HTML, CSV. Heavy formats live in
`@parsify/converter-*`. See the [main README](https://github.com/parsify/parsify).

MIT
