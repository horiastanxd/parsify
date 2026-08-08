# @parsify/converter-docx

DOCX converter for [Parsify](https://github.com/parsify/parsify). Uses `mammoth`
to produce semantic HTML, then reuses Parsify's HTML → document-model walker, so
DOCX gets headings, lists, and tables for free. Lazy-loaded.

Requires `mammoth` as a peer dependency. MIT
