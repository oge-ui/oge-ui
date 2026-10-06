import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React editor overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../editor/overview.ts` (`docs/REACT-PARITY.md`):
 * the same sections, same order, same example content, React idiom — the one
 * heading that differs is the forms section, which demos the controlled value
 * instead of Angular's `formControl` (a recorded exception).
 */
export const EDITOR_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-editor': ['OgeEditor'] },
      name: 'DescriptionEditor',
      body: `// The value is sanitized HTML ('' when empty). Every edit is a command on
// the editor's own document model — no document.execCommand — so every
// browser produces the same markup, and undo is the editor's own history.
const [html, setHtml] = useState('<p>Hello <strong>world</strong></p>');`,
      jsx: `<>
  <OgeEditor
    label="Description"
    placeholder="Write something…"
    hint="Try Ctrl+B, Ctrl+K, or type “# ” at the start of a line."
    value={html}
    onValueChange={setHtml}
  />
  <pre>{html}</pre>
</>`,
    }),
  },
  {
    title: 'Toolbar and custom tools',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-editor': ['OgeEditor'] },
      types: {
        '@oge-ui/react-editor': [
          'OgeEditorCustomTool',
          'OgeEditorToolbarEntry',
        ],
      },
      name: 'ReleaseNotes',
      before: `// A custom tool: a label, an optional 16×16 stroke icon, and what it does.
const stamp: OgeEditorCustomTool = {
  key: 'stamp',
  text: 'Insert today’s date',
  icon: 'M3 4.5h10v9H3zM3 7.5h10M6 2.5v3M10 2.5v3',
  run: (editor) => editor.insertText(new Date().toLocaleDateString('en-GB')),
};

// Built-in tool names, 'separator' and your own tools, in any order.
const tools: readonly OgeEditorToolbarEntry[] = [
  'undo', 'redo', 'separator', 'blockFormat', 'bold', 'italic', 'separator',
  'bulletList', 'orderedList', 'separator', 'link', stamp,
];`,
      body: `const [notes, setNotes] = useState('<h3>1.2.0</h3><ul><li>New rich-text editor</li></ul>');`,
      jsx: `<OgeEditor label="Release notes" toolbar={tools} value={notes} onValueChange={setNotes} />`,
    }),
  },
  {
    title: 'Keyboard and markdown',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-editor': ['OgeEditor'] },
      name: 'MeetingNotes',
      body: `// Markdown shortcuts: "# " … "###### ", "- ", "1. ", "> ", "\`\`\` " at the start
// of a paragraph, and "---" + Enter for a horizontal line. One undo brings the
// typed characters back. Tab / Shift+Tab nest list items; Tab anywhere else
// leaves the editor, so the keyboard is never trapped.
const [notes, setNotes] = useState('');`,
      jsx: `<OgeEditor
  label="Meeting notes"
  markdownShortcuts
  headingLevels={[1, 2, 3]}
  value={notes}
  onValueChange={setNotes}
/>`,
    }),
  },
  {
    title: 'Links and images',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-editor': ['OgeEditor'] },
      types: { '@oge-ui/react-editor': ['OgeEditorHandle'] },
      name: 'ArticleEditor',
      body: `// The link and image tools open the overlay's prompt dialog; the handle does
// the same from code. A javascript: link is refused, and "ogeui.com" typed
// into the dialog becomes https://ogeui.com instead of a relative link.
const editor = useRef<OgeEditorHandle>(null);`,
      jsx: `<>
  <OgeEditor ref={editor} label="Article" defaultValue="<p>Read the docs.</p>" />
  <button type="button" onClick={() => editor.current?.insertLink('https://www.ogeui.com', 'OGE UI')}>
    Insert a link
  </button>
  <button type="button" onClick={() => editor.current?.insertImage('/favicon.ico', 'OGE logo')}>
    Insert an image
  </button>
  <button type="button" onClick={() => void editor.current?.openLinkDialog()}>
    Open the link dialog
  </button>
</>`,
    }),
  },
  {
    title: 'Paste and sanitizing',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-editor': ['OgeEditor', 'ogeSanitizeEditorHtml'] },
      types: { '@oge-ui/react-editor': ['OgeEditorPastingEvent'] },
      name: 'PasteTarget',
      before: `// The same sanitizer, for HTML that did not come through the editor.
const clean = ogeSanitizeEditorHtml(
  '<p>Hi <a href="javascript:alert(1)">there</a><img src=x onerror=alert(1)></p><script>alert(1)</script>',
);

// onPasting is cancelable and may rewrite the payload.
const onPasting = (event: OgeEditorPastingEvent) => {
  event.cancel = event.html.includes('1x1.gif');
};`,
      body: `const [pasted, setPasted] = useState('');`,
      jsx: `<>
  <OgeEditor label="Paste here" pasteMode="html" onPasting={onPasting} value={pasted} onValueChange={setPasted} />
  <pre>{clean}</pre>
</>`,
    }),
  },
  {
    title: 'Controlled value and validation',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-editor': ['OgeEditor', 'ogeEditorHtmlLength'] },
      name: 'SummaryField',
      body: `// maxLength stops typing and pasting at 200 characters of text and the
// counter shows the budget. In your form library, validate with
// ogeEditorHtmlLength() — the string length would count the HTML markup.
const [summary, setSummary] = useState('');
const [touched, setTouched] = useState(false);
const valid = summary !== '' && ogeEditorHtmlLength(summary) <= 200;`,
      jsx: `<>
  <OgeEditor
    label="Summary"
    required
    maxLength={200}
    counter="characters"
    value={summary}
    onValueChange={setSummary}
    onBlur={() => setTouched(true)}
    touched={touched}
    invalid={!valid}
  />
  <p>valid: {String(valid)}</p>
</>`,
    }),
  },
  {
    title: 'Read-only, sizing and counter',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-editor': ['OgeEditor'] },
      name: 'TermsEditor',
      body: `// readonly keeps the text focusable and selectable; disabled takes the
// editor out of the Tab order. height / minHeight / maxHeight take px or
// any CSS length; resizable adds a vertical resize handle.
const [readonly, setReadonly] = useState(false);
const [disabled, setDisabled] = useState(false);`,
      jsx: `<>
  <label>
    <input type="checkbox" checked={readonly} onChange={() => setReadonly(!readonly)} /> Read-only
  </label>
  <label>
    <input type="checkbox" checked={disabled} onChange={() => setDisabled(!disabled)} /> Disabled
  </label>
  <OgeEditor
    label="Terms"
    readonly={readonly}
    disabled={disabled}
    minHeight={120}
    maxHeight={260}
    resizable
    counter="both"
    defaultValue="<h3>Terms</h3><p>By using this service you agree to <em>everything</em>.</p>"
  />
</>`,
    }),
  },
  {
    title: 'Configuration',
    source: reactDemoSource({
      use: { '@oge-ui/react-editor': ['OgeEditor', 'OgeEditorConfigProvider'] },
      name: 'ConfiguredEditors',
      body: `// Subtree-wide defaults and strings (<OgeLocaleProvider> covers the strings
// too). A page with require-trusted-types-for 'script' lists the editor's
// policy: trusted-types oge-ui#editor`,
      jsx: `<OgeEditorConfigProvider
  config={{
    headingLevels: [2, 3],
    pasteMode: 'html',
    markdownShortcuts: true,
    textColors: 'office',
    messages: { tools: { bold: 'Kalın', italic: 'İtalik' } },
  }}
>
  <OgeEditor label="Notes" />
</OgeEditorConfigProvider>`,
    }),
  },
];
