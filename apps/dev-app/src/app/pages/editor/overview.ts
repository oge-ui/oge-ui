import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OgeEditor,
  ogeEditorMaxLength,
  ogeSanitizeEditorHtml,
  type OgeEditorCustomTool,
  type OgeEditorHeadingLevel,
  type OgeEditorPastingEvent,
  type OgeEditorToolbarEntry,
} from '@oge-ui/editor';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_EDITOR_OVERVIEW_SECTIONS,
  ReactEditorOverviewDemos,
} from '../react-editor/overview';
import {
  CONFIG_SNIPPET,
  FORMS_SNIPPET,
  GETTING_STARTED_SNIPPET,
  KEYBOARD_SNIPPET,
  LINKS_SNIPPET,
  MODES_SNIPPET,
  PASTE_SNIPPET,
  TOOLBAR_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Getting started',
  'Toolbar and custom tools',
  'Keyboard and markdown',
  'Links and images',
  'Paste and sanitizing',
  'Angular forms',
  'Read-only, sizing and counter',
  'Configuration',
] as const;

@Component({
  selector: 'app-editor-overview',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    ReactiveFormsModule,
    RouterLink,
    OgeEditor,
    ReactEditorOverviewDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Rich Text Editor"
      category="Editor"
      categoryLink="/components/editor"
      [chips]="[
        'contenteditable',
        'sanitized HTML',
        'markdown shortcuts',
        'forms',
      ]"
    >
      <p>
        A rich-text editor whose value is sanitized HTML. The editing surface is
        a
        <code>contenteditable</code> element, but the browser never edits it on
        its own: every keystroke, toolbar click and paste becomes a command on
        the editor's own document model, and the DOM is rendered from that
        model. There is no <code>document.execCommand</code> — deprecated,
        different in every engine, and the reason most editors produce different
        markup per browser — so the output is the same everywhere and undo/redo
        is the editor's own history.
      </p>
      <p>
        The same allowlist parser reads the bound value, every paste (Word and
        Google Docs markup is cleaned up on the way in) and
        <code>insertHtml()</code>. Scripts, event handlers, unknown attributes
        and unsafe URLs cannot survive it; its one <code>DOMParser</code> call
        runs behind the <code>oge-ui#editor</code> Trusted Types policy, and the
        live DOM is built with <code>createElement</code>, never
        <code>innerHTML</code>.
        @if (fw.isReact()) {
          The React editor runs the same machine from
          <code>&#64;oge-ui/behavior</code> and loads the same stylesheet.
        }
        <a routerLink="/components/editor/api">Full API reference →</a>
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-editor-overview-demos />
    } @else {
      <app-demo-card
        [chips]="['[(value)]', 'placeholder', 'hint']"
        heading="Getting started"
        description="Type, select and format. The box under the editor is the live value — sanitized HTML, the empty string when the document is empty."
        [code]="gettingStartedSnippet"
        language="ts"
      >
        <oge-editor
          label="Description"
          placeholder="Write something…"
          hint="Try Ctrl+B, Ctrl+K, or type “# ” at the start of a line."
          [(value)]="html"
        />
        <pre
          class="mt-3 overflow-x-auto rounded-md bg-gray-50 p-3 text-xs whitespace-pre-wrap dark:bg-gray-900"
          data-testid="editor-value"
          >{{ html() }}</pre>
      </app-demo-card>

      <app-demo-card
        [chips]="['toolbar', 'OgeEditorCustomTool', 'overflow']"
        heading="Toolbar and custom tools"
        description="Built-in tool names, separators and your own tools in any order. Narrow the window: tools that do not fit move into the overflow menu, toggles keep their check mark there."
        [code]="toolbarSnippet"
        language="ts"
      >
        <oge-editor label="Release notes" [toolbar]="tools" [(value)]="notes" />
      </app-demo-card>

      <app-demo-card
        [chips]="['shortcuts', 'markdownShortcuts', 'headingLevels']"
        heading="Keyboard and markdown"
        description="Every shortcut is in its tool’s tooltip and &lt;code&gt;aria-keyshortcuts&lt;/code&gt;. Start a line with &lt;code&gt;# &lt;/code&gt;, &lt;code&gt;- &lt;/code&gt;, &lt;code&gt;1. &lt;/code&gt; or &lt;code&gt;&amp;gt; &lt;/code&gt;; Tab and Shift+Tab nest list items."
        [code]="keyboardSnippet"
        language="ts"
      >
        <oge-editor
          label="Meeting notes"
          [headingLevels]="levels"
          [(value)]="meeting"
        />
        <table class="mt-4 w-full max-w-md text-sm">
          <tbody>
            <tr>
              <th
                scope="row"
                class="py-1 pe-4 text-start font-mono font-medium"
              >
                Ctrl/⌘ + B, I, U
              </th>
              <td>Bold, italic, underline</td>
            </tr>
            <tr>
              <th
                scope="row"
                class="py-1 pe-4 text-start font-mono font-medium"
              >
                Ctrl/⌘ + Shift + X
              </th>
              <td>Strikethrough</td>
            </tr>
            <tr>
              <th
                scope="row"
                class="py-1 pe-4 text-start font-mono font-medium"
              >
                Ctrl/⌘ + K
              </th>
              <td>Link dialog</td>
            </tr>
            <tr>
              <th
                scope="row"
                class="py-1 pe-4 text-start font-mono font-medium"
              >
                Ctrl/⌘ + Z, Y
              </th>
              <td>Undo, redo</td>
            </tr>
            <tr>
              <th
                scope="row"
                class="py-1 pe-4 text-start font-mono font-medium"
              >
                Ctrl/⌘ + Alt + 0 … 6
              </th>
              <td>Paragraph, heading 1–6</td>
            </tr>
            <tr>
              <th
                scope="row"
                class="py-1 pe-4 text-start font-mono font-medium"
              >
                Ctrl/⌘ + Shift + 7, 8
              </th>
              <td>Numbered, bulleted list</td>
            </tr>
            <tr>
              <th
                scope="row"
                class="py-1 pe-4 text-start font-mono font-medium"
              >
                Shift + Enter
              </th>
              <td>Line break inside the block</td>
            </tr>
          </tbody>
        </table>
      </app-demo-card>

      <app-demo-card
        [chips]="['insertLink()', 'insertImage()', 'openLinkDialog()']"
        heading="Links and images"
        description="The link and image tools open the overlay’s prompt dialog. A &lt;code&gt;javascript:&lt;/code&gt; address is refused, and a bare domain typed into the dialog gets &lt;code&gt;https://&lt;/code&gt; instead of becoming a relative link."
        [code]="linksSnippet"
        language="ts"
      >
        <oge-editor #editor label="Article" [(value)]="article" />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            (click)="editor.insertLink('https://www.ogeui.com', 'OGE UI')"
          >
            Insert a link
          </button>
          <button
            type="button"
            (click)="editor.insertImage('/favicon.ico', 'OGE logo')"
          >
            Insert an image
          </button>
          <button type="button" (click)="editor.openLinkDialog()">
            Open the link dialog
          </button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['pasteMode', '(pasting)', 'ogeSanitizeEditorHtml']"
        heading="Paste and sanitizing"
        description="Paste from Word, Google Docs or a web page: formatting the editor knows survives, everything else is dropped. The second box shows the sanitizer applied to hostile HTML."
        [code]="pasteSnippet"
        language="ts"
      >
        <oge-editor
          label="Paste here"
          (pasting)="onPasting($event)"
          [(value)]="pasted"
        />
        <pre
          class="mt-3 overflow-x-auto rounded-md bg-gray-50 p-3 text-xs whitespace-pre-wrap dark:bg-gray-900"
          >{{ clean }}</pre>
      </app-demo-card>

      <app-demo-card
        [chips]="['formControl', 'ogeEditorMaxLength', 'maxLength']"
        heading="Angular forms"
        description="Reactive forms, Signal Forms and plain &lt;code&gt;[(value)]&lt;/code&gt; bind the same component. &lt;code&gt;ogeEditorMaxLength()&lt;/code&gt; counts text, not markup."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-editor
          label="Summary"
          [formControl]="summary"
          [required]="true"
          [maxLength]="200"
          counter="characters"
        />
        <p>valid: {{ summary.valid }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['readonly', 'disabled', 'resizable', 'counter']"
        heading="Read-only, sizing and counter"
        description="Read-only keeps the text focusable and selectable; disabled takes the editor out of the Tab order. Drag the corner to resize."
        [code]="modesSnippet"
        language="ts"
      >
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <label
            ><input
              type="checkbox"
              [checked]="readonly()"
              (change)="readonly.set(!readonly())"
            />
            Read-only</label
          >
          <label
            ><input
              type="checkbox"
              [checked]="disabled()"
              (change)="disabled.set(!disabled())"
            />
            Disabled</label
          >
        </div>
        <oge-editor
          label="Terms"
          [readonly]="readonly()"
          [disabled]="disabled()"
          [minHeight]="120"
          [maxHeight]="260"
          [resizable]="true"
          counter="both"
          [(value)]="terms"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['provideOgeEditorConfig', 'Trusted Types']"
        heading="Configuration"
        description="App-wide defaults and strings through &lt;code&gt;provideOgeEditorConfig()&lt;/code&gt; (also covered by &lt;code&gt;provideOgeLocale()&lt;/code&gt;), and the Trusted Types policy name a strict CSP lists."
        [code]="configSnippet"
        language="ts"
      />
    }
  `,
})
export class EditorOverviewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_EDITOR_OVERVIEW_SECTIONS;

  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly toolbarSnippet = TOOLBAR_SNIPPET;
  protected readonly keyboardSnippet = KEYBOARD_SNIPPET;
  protected readonly linksSnippet = LINKS_SNIPPET;
  protected readonly pasteSnippet = PASTE_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;
  protected readonly modesSnippet = MODES_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly html = signal('<p>Hello <strong>world</strong></p>');

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
  protected readonly notes = signal(
    '<h3>1.2.0</h3><ul><li>New rich-text editor</li></ul>',
  );

  protected readonly levels: readonly OgeEditorHeadingLevel[] = [1, 2, 3];
  protected readonly meeting = signal('');

  protected readonly article = signal('<p>Read the docs.</p>');

  protected readonly pasted = signal('');
  protected readonly clean = ogeSanitizeEditorHtml(
    '<p>Hi <a href="javascript:alert(1)">there</a><img src=x onerror=alert(1)></p><script>alert(1)</script>',
  );
  protected onPasting(event: OgeEditorPastingEvent): void {
    event.cancel = event.html.includes('1x1.gif');
  }

  protected readonly summary = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, ogeEditorMaxLength(200)],
  });

  protected readonly readonly = signal(false);
  protected readonly disabled = signal(false);
  protected readonly terms = signal(
    '<h3>Terms</h3><p>By using this service you agree to <em>everything</em>.</p>',
  );
}
