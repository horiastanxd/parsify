# parsify

The [Parsify](https://github.com/parsify/parsify) CLI — convert any document to
LLM-ready Markdown, JSON, or RAG chunks.

```bash
npx parsify report.pdf > report.md
parsify report.pdf --chunks --max-tokens 512 > chunks.jsonl
parsify ./docs -o ./out          # batch a directory
cat file.pdf | parsify -x pdf    # stdin
```

Run `parsify --help` for all options. MIT
