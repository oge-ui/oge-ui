# @oge-ui/react-editor

Rich-text editor for React 18 and 19 — a `contenteditable` editing surface
driven by a document model of its own, with a sanitized HTML value. It runs
the same `@oge-ui/behavior` editor machine and the same stylesheet as the
Angular `@oge-ui/editor`. Dependency-free, MIT.

```bash
npm install @oge-ui/react-editor
```

```tsx
import { OgeEditor } from '@oge-ui/react-editor';
import '@oge-ui/react-layout/styles.css';
import '@oge-ui/react-overlay/styles.css';
import '@oge-ui/react-inputs/styles.css';
import '@oge-ui/react-editor/styles.css';

<OgeEditor label="Description" value={html} onValueChange={setHtml} />;
```

## What it does

- **Formatting** — bold, italic, underline, strikethrough, inline code,
  sub/superscript, text and highlight colours, headings, quotes, code blocks,
  nested bulleted and numbered lists, links, images by URL, horizontal rules,
  alignment and per-block text direction.
- **No `execCommand`** — every edit is a command on the editor's own
  document model; undo/redo is the editor's own history.
- **Keyboard first** — Ctrl/⌘+B / I / U / K / Z / Y, Shift+Enter, Tab /
  Shift+Tab in lists, and markdown shortcuts (`# `, `- `, `1. `, `> `).
- **Safe HTML in and out** — a strict allowlist sanitizer for values, pastes
  (Word and Google Docs are cleaned up) and `insertHtml()`; links through
  `sanitizeUrl`, images through `sanitizeResourceUrl`; Trusted Types policy
  `oge-ui#editor`; the live DOM is built with `createElement`, never
  `dangerouslySetInnerHTML`.
- **Controlled or uncontrolled**, a `ref` handle (`exec`, `insertHtml`,
  `undo`, …), `useId()`-based ids and a `'use client'` build.

## Docs

- Live demos and the full API reference: <https://www.ogeui.com/components/editor?framework=react>
- Machine-readable reference for coding assistants:
  `node_modules/@oge-ui/react-editor/llms.txt`

## License

MIT. See [LICENSE](LICENSE).
