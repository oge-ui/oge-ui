import { demoSource } from '../../shared/demo-source';

export const GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/editor': ['OgeEditor'] },
  template: `<!-- The value is sanitized HTML ('' when empty). Every edit is a command on
     the editor's own document model — no document.execCommand — so every
     browser produces the same markup, and undo is the editor's own history. -->
<oge-editor
  label="Description"
  placeholder="Write something…"
  hint="Try Ctrl+B, Ctrl+K, or type “# ” at the start of a line."
  [(value)]="html"
/>

<pre>{{ html() }}</pre>`,
  body: `protected readonly html = signal('<p>Hello <strong>world</strong></p>');`,
});

export const TOOLBAR_SNIPPET = demoSource({
  use: { '@oge-ui/editor': ['OgeEditor'] },
  types: { '@oge-ui/editor': ['OgeEditorCustomTool', 'OgeEditorToolbarEntry'] },
  template: `<!-- Built-in tool names, 'separator' and your own tools, in any order.
     The toolbar is the APG toolbar from @oge-ui/layout: one Tab stop, arrow
     keys between tools, and what does not fit moves into an overflow menu. -->
<oge-editor
  label="Release notes"
  [toolbar]="tools"
  [(value)]="notes"
/>`,
  body: `/** A custom tool: a label, an optional 16×16 stroke icon, and what it does. */
private readonly stamp: OgeEditorCustomTool = {
  key: 'stamp',
  text: 'Insert today’s date',
  icon: 'M3 4.5h10v9H3zM3 7.5h10M6 2.5v3M10 2.5v3',
  run: (editor) => editor.insertText(new Date().toLocaleDateString('en-GB')),
};

protected readonly tools: readonly OgeEditorToolbarEntry[] = [
  'undo',
  'redo',
  'separator',
  'blockFormat',
  'bold',
  'italic',
  'separator',
  'bulletList',
  'orderedList',
  'separator',
  'link',
  this.stamp,
];

protected readonly notes = signal('<h3>1.2.0</h3><ul><li>New rich-text editor</li></ul>');`,
});

export const KEYBOARD_SNIPPET = demoSource({
  use: { '@oge-ui/editor': ['OgeEditor'] },
  types: { '@oge-ui/editor': ['OgeEditorHeadingLevel'] },
  template: `<!-- Markdown shortcuts: "# " … "###### ", "- ", "1. ", "> ", "\`\`\` " at the
     start of a paragraph, and "---" + Enter for a horizontal line. One undo
     brings the typed characters back. Tab / Shift+Tab nest list items; Tab
     anywhere else leaves the editor, so the keyboard is never trapped. -->
<oge-editor
  label="Meeting notes"
  [markdownShortcuts]="true"
  [headingLevels]="levels"
  [(value)]="notes"
/>`,
  body: `protected readonly levels: readonly OgeEditorHeadingLevel[] = [1, 2, 3];
protected readonly notes = signal('');`,
});

export const LINKS_SNIPPET = demoSource({
  use: { '@oge-ui/editor': ['OgeEditor'] },
  template: `<!-- The link and image tools open the overlay's prompt dialog; the methods
     below do the same from code. Every address goes through the URL
     allowlist — a javascript: link is refused, and "ogeui.com" typed into
     the dialog becomes https://ogeui.com instead of a relative link. -->
<oge-editor #editor label="Article" [allowedSchemes]="['web+app']" [(value)]="article" />

<button type="button" (click)="editor.insertLink('https://www.ogeui.com', 'OGE UI')">
  Insert a link
</button>
<button type="button" (click)="editor.insertImage('/favicon.ico', 'OGE logo')">
  Insert an image
</button>
<button type="button" (click)="editor.openLinkDialog()">Open the link dialog</button>`,
  body: `protected readonly article = signal('<p>Read the docs.</p>');`,
});

export const PASTE_SNIPPET = demoSource({
  use: { '@oge-ui/editor': ['OgeEditor'] },
  helpers: { '@oge-ui/editor': ['ogeSanitizeEditorHtml'] },
  types: { '@oge-ui/editor': ['OgeEditorPastingEvent'] },
  template: `<!-- One allowlist parser handles the bound value, pastes (Word and Google
     Docs markup is cleaned up) and insertHtml(). (pasting) is cancelable and
     may rewrite the payload; pasteMode="text" keeps text only. -->
<oge-editor
  label="Paste here"
  pasteMode="html"
  (pasting)="onPasting($event)"
  [(value)]="pasted"
/>

<p>Sanitized on the server side too:</p>
<pre>{{ clean }}</pre>`,
  body: `protected readonly pasted = signal('');

/** The same sanitizer, for HTML that did not come through the editor. */
protected readonly clean = ogeSanitizeEditorHtml(
  '<p>Hi <a href="javascript:alert(1)">there</a><img src=x onerror=alert(1)></p><script>alert(1)</script>',
);

protected onPasting(event: OgeEditorPastingEvent): void {
  // refuse pastes that carry tracking pixels, keep everything else
  event.cancel = event.html.includes('1x1.gif');
}`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/editor': ['OgeEditor'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: {
    '@angular/forms': ['FormControl', 'Validators'],
    '@oge-ui/editor': ['ogeEditorMaxLength'],
  },
  template: `<!-- maxLength stops typing and pasting at 200 characters of text and the
     counter shows the budget. ogeEditorMaxLength() is the matching validator:
     Validators.maxLength would count the HTML markup. Signal Forms binds the
     same component through [formField], and [(value)] needs no forms at all. -->
<oge-editor
  label="Summary"
  [formControl]="summary"
  [required]="true"
  [maxLength]="200"
  counter="characters"
/>

<p>valid: {{ summary.valid }}</p>`,
  body: `protected readonly summary = new FormControl('', {
  nonNullable: true,
  validators: [Validators.required, ogeEditorMaxLength(200)],
});`,
});

export const MODES_SNIPPET = demoSource({
  use: { '@oge-ui/editor': ['OgeEditor'] },
  template: `<!-- readonly keeps the text focusable and selectable; disabled takes the
     editor out of the Tab order. height / minHeight / maxHeight take px or any
     CSS length; resizable adds a vertical resize handle. -->
<label><input type="checkbox" [checked]="readonly()" (change)="readonly.set(!readonly())" /> Read-only</label>
<label><input type="checkbox" [checked]="disabled()" (change)="disabled.set(!disabled())" /> Disabled</label>

<oge-editor
  label="Terms"
  [readonly]="readonly()"
  [disabled]="disabled()"
  [minHeight]="120"
  [maxHeight]="260"
  [resizable]="true"
  counter="both"
  [(value)]="terms"
/>`,
  body: `protected readonly readonly = signal(false);
protected readonly disabled = signal(false);
protected readonly terms = signal(
  '<h3>Terms</h3><p>By using this service you agree to <em>everything</em>.</p>',
);`,
});

export const CONFIG_SNIPPET = `// app.config.ts — app-wide defaults; a function makes them live
import { provideOgeEditorConfig } from '@oge-ui/editor';

export const appConfig = {
  providers: [
    provideOgeEditorConfig({
      headingLevels: [2, 3],
      pasteMode: 'html',
      markdownShortcuts: true,
      textColors: 'office',
      messages: { tools: { bold: 'Kalın', italic: 'İtalik' } },
    }),
  ],
};

// A page with require-trusted-types-for 'script' lists the editor's policy:
// Content-Security-Policy: require-trusted-types-for 'script'; trusted-types angular oge-ui#editor`;
