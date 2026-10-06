# @oge-ui/editor

Rich-text editor for Angular 22 — a `contenteditable` editing surface driven
by a document model of its own, with a sanitized HTML value. Signal-based,
standalone, dependency-free, MIT.

```bash
npm install @oge-ui/editor
```

```html
<oge-editor label="Description" [(value)]="html" placeholder="Write something…" />
```

## What it does

- **Formatting** — bold, italic, underline, strikethrough, inline code,
  sub/superscript, text and highlight colours, headings, quotes, code blocks,
  bulleted and numbered lists with nesting, links, images by URL, horizontal
  rules, alignment and per-block text direction.
- **No `execCommand`** — every edit is a command on the editor's own document
  model, so every browser produces the same markup, and undo/redo is the
  editor's own history (typing coalesces into words).
- **Keyboard first** — Ctrl/⌘+B / I / U / K / Z / Y, Shift+Enter, Tab /
  Shift+Tab in lists, Ctrl+Alt+1…6 for headings, and markdown shortcuts
  (`# `, `- `, `1. `, `> `, ` ``` `, `---`). Every shortcut is in its
  tool's tooltip and `aria-keyshortcuts`.
- **Safe HTML in and out** — one strict allowlist parser handles the bound
  value, pastes (Word and Google Docs are cleaned up) and `insertHtml()`.
  Scripts, event handlers, `style` beyond colour/alignment and unsafe URLs
  never survive; links go through `sanitizeUrl`, images through
  `sanitizeResourceUrl`. Its one `DOMParser` call runs behind the
  `oge-ui#editor` Trusted Types policy, and the live DOM is built with
  `createElement` — never `innerHTML`. `ogeSanitizeEditorHtml()` is exported
  for server-bound values.
- **Forms, three ways** — standalone `[(value)]`, reactive forms through
  `ControlValueAccessor` (with `ogeEditorMaxLength()` counting text, not
  markup), and Signal Forms through the `FormValueControl` contract.
- **Accessible** — `role="textbox"` with `aria-multiline`, a labelled APG
  toolbar with roving focus and an overflow menu, announced formatting
  toggles, forced-colours and reduced-motion support, RTL.

## Customization

Every string lives in `OgeEditorMessages`; override them app-wide with
`provideOgeEditorConfig({ messages: { … } })` or per instance with
`[messages]`. The toolbar takes built-in tool names, `'separator'` and your own
`OgeEditorCustomTool` objects.

## Docs

- Live demos and the full API reference: <https://www.ogeui.com/components/editor>
- Machine-readable reference for coding assistants:
  `node_modules/@oge-ui/editor/llms.txt`

## License

MIT — free forever, like the rest of the open tier. See [LICENSE](LICENSE).
