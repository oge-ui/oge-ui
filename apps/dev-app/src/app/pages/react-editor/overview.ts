import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeEditor,
  OgeEditorConfigProvider,
  ogeEditorHtmlLength,
  ogeSanitizeEditorHtml,
  type OgeEditorCustomTool,
  type OgeEditorHandle,
  type OgeEditorPastingEvent,
  type OgeEditorToolbarEntry,
} from '@oge-ui/react-editor';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { EDITOR_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section); the forms
 * section demos the controlled value instead of `formControl` (a recorded
 * exception).
 */
export const REACT_EDITOR_OVERVIEW_SECTIONS = [
  'Getting started',
  'Toolbar and custom tools',
  'Keyboard and markdown',
  'Links and images',
  'Paste and sanitizing',
  'Controlled value and validation',
  'Read-only, sizing and counter',
  'Configuration',
] as const;

const PRE =
  'mt-3 overflow-x-auto rounded-md bg-gray-50 p-3 text-xs whitespace-pre-wrap dark:bg-gray-900';
const ACTIONS = 'mt-3 flex flex-wrap items-center gap-3';

function GettingStartedDemo(): ReactNode {
  const [html, setHtml] = useState('<p>Hello <strong>world</strong></p>');
  return createElement(
    'div',
    null,
    createElement(OgeEditor, {
      label: 'Description',
      placeholder: 'Write something…',
      hint: 'Try Ctrl+B, Ctrl+K, or type “# ” at the start of a line.',
      value: html,
      onValueChange: setHtml,
    }),
    createElement(
      'pre',
      { className: PRE, 'data-testid': 'editor-value' },
      html,
    ),
  );
}

const stamp: OgeEditorCustomTool = {
  key: 'stamp',
  text: 'Insert today’s date',
  icon: 'M3 4.5h10v9H3zM3 7.5h10M6 2.5v3M10 2.5v3',
  run: (editor) => editor.insertText(new Date().toLocaleDateString('en-GB')),
};
const tools: readonly OgeEditorToolbarEntry[] = [
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
  stamp,
];

function ToolbarDemo(): ReactNode {
  const [notes, setNotes] = useState(
    '<h3>1.2.0</h3><ul><li>New rich-text editor</li></ul>',
  );
  return createElement(OgeEditor, {
    label: 'Release notes',
    toolbar: tools,
    value: notes,
    onValueChange: setNotes,
  });
}

function KeyboardDemo(): ReactNode {
  const [notes, setNotes] = useState('');
  return createElement(OgeEditor, {
    label: 'Meeting notes',
    markdownShortcuts: true,
    headingLevels: [1, 2, 3],
    value: notes,
    onValueChange: setNotes,
  });
}

function LinksDemo(): ReactNode {
  const editor = useRef<OgeEditorHandle>(null);
  return createElement(
    'div',
    null,
    createElement(OgeEditor, {
      ref: editor,
      label: 'Article',
      defaultValue: '<p>Read the docs.</p>',
    }),
    createElement(
      'div',
      { className: ACTIONS },
      createElement(
        'button',
        {
          type: 'button',
          onClick: () =>
            editor.current?.insertLink('https://www.ogeui.com', 'OGE UI'),
        },
        'Insert a link',
      ),
      createElement(
        'button',
        {
          type: 'button',
          onClick: () =>
            editor.current?.insertImage('/favicon.ico', 'OGE logo'),
        },
        'Insert an image',
      ),
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => void editor.current?.openLinkDialog(),
        },
        'Open the link dialog',
      ),
    ),
  );
}

const clean = ogeSanitizeEditorHtml(
  '<p>Hi <a href="javascript:alert(1)">there</a><img src=x onerror=alert(1)></p><script>alert(1)</script>',
);

function PasteDemo(): ReactNode {
  const [pasted, setPasted] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeEditor, {
      label: 'Paste here',
      pasteMode: 'html',
      onPasting: (event: OgeEditorPastingEvent) => {
        event.cancel = event.html.includes('1x1.gif');
      },
      value: pasted,
      onValueChange: setPasted,
    }),
    createElement('pre', { className: PRE }, clean),
  );
}

function FormsDemo(): ReactNode {
  const [summary, setSummary] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = summary !== '' && ogeEditorHtmlLength(summary) <= 200;
  return createElement(
    'div',
    null,
    createElement(OgeEditor, {
      label: 'Summary',
      required: true,
      maxLength: 200,
      counter: 'characters',
      value: summary,
      onValueChange: setSummary,
      onBlur: () => setTouched(true),
      touched,
      invalid: !valid,
    }),
    createElement('p', null, `valid: ${String(valid)}`),
  );
}

function ModesDemo(): ReactNode {
  const [readonly, setReadonly] = useState(false);
  const [disabled, setDisabled] = useState(false);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: ACTIONS },
      createElement(
        'label',
        null,
        createElement('input', {
          type: 'checkbox',
          checked: readonly,
          onChange: () => setReadonly(!readonly),
        }),
        ' Read-only',
      ),
      createElement(
        'label',
        null,
        createElement('input', {
          type: 'checkbox',
          checked: disabled,
          onChange: () => setDisabled(!disabled),
        }),
        ' Disabled',
      ),
    ),
    createElement(OgeEditor, {
      label: 'Terms',
      readonly,
      disabled,
      minHeight: 120,
      maxHeight: 260,
      resizable: true,
      counter: 'both',
      defaultValue:
        '<h3>Terms</h3><p>By using this service you agree to <em>everything</em>.</p>',
    }),
  );
}

function ConfigDemo(): ReactNode {
  return createElement(
    OgeEditorConfigProvider,
    {
      config: {
        headingLevels: [2, 3],
        pasteMode: 'html',
        markdownShortcuts: true,
        textColors: 'office',
        messages: { tools: { bold: 'Kalın', italic: 'İtalik' } },
      },
    },
    createElement(OgeEditor, { label: 'Notes' }),
  );
}

/**
 * Carries the React layout stylesheet (the toolbar) for the demos below.
 * It is its own component because the docs inline every stylesheet per
 * component, and the four sheets the editor composes would together pass
 * the `anyComponentStyle` budget that one component may carry.
 */
@Component({
  selector: 'app-react-editor-toolbar-styles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/layout/src/styles.scss'],
  template: '',
})
export class ReactEditorToolbarStyles {}

/**
 * The React half of the editor overview — the same demo sections as the
 * Angular page, rendered as real React trees inside `/components/editor`
 * when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-editor-overview-demos',
  imports: [DemoCard, ReactHost, ReactEditorToolbarStyles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editor carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles, plus the popups and
  // the prompt (overlay) and the palette (inputs); the toolbar's sheet
  // (layout) rides on its own carrier component.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/editor/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-react-editor-toolbar-styles />
    <app-demo-card
      [chips]="['value / onValueChange', 'placeholder', 'hint']"
      heading="Getting started"
      description="Type, select and format. The box under the editor is the live value — sanitized HTML, the empty string when the document is empty."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['toolbar', 'OgeEditorCustomTool', 'overflow']"
      heading="Toolbar and custom tools"
      description="Built-in tool names, separators and your own tools in any order. Narrow the window: tools that do not fit move into the overflow menu, toggles keep their check mark there."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="toolbar" />
    </app-demo-card>

    <app-demo-card
      [chips]="['shortcuts', 'markdownShortcuts', 'headingLevels']"
      heading="Keyboard and markdown"
      description="Every shortcut is in its tool’s tooltip and &lt;code&gt;aria-keyshortcuts&lt;/code&gt;. Start a line with &lt;code&gt;# &lt;/code&gt;, &lt;code&gt;- &lt;/code&gt;, &lt;code&gt;1. &lt;/code&gt; or &lt;code&gt;&amp;gt; &lt;/code&gt;; Tab and Shift+Tab nest list items."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="keyboard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['insertLink()', 'insertImage()', 'openLinkDialog()']"
      heading="Links and images"
      description="The link and image tools open the overlay’s prompt dialog. A &lt;code&gt;javascript:&lt;/code&gt; address is refused, and a bare domain typed into the dialog gets &lt;code&gt;https://&lt;/code&gt; instead of becoming a relative link."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="links" />
    </app-demo-card>

    <app-demo-card
      [chips]="['pasteMode', 'onPasting', 'ogeSanitizeEditorHtml']"
      heading="Paste and sanitizing"
      description="Paste from Word, Google Docs or a web page: formatting the editor knows survives, everything else is dropped. The second box shows the sanitizer applied to hostile HTML."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="paste" />
    </app-demo-card>

    <app-demo-card
      [chips]="['value', 'maxLength', 'ogeEditorHtmlLength']"
      heading="Controlled value and validation"
      description="The controlled &lt;code&gt;value&lt;/code&gt; pair feeds any form library; &lt;code&gt;ogeEditorHtmlLength()&lt;/code&gt; counts text, not markup."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="forms" />
    </app-demo-card>

    <app-demo-card
      [chips]="['readonly', 'disabled', 'resizable', 'counter']"
      heading="Read-only, sizing and counter"
      description="Read-only keeps the text focusable and selectable; disabled takes the editor out of the Tab order. Drag the corner to resize."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="modes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeEditorConfigProvider', 'Trusted Types']"
      heading="Configuration"
      description="Subtree-wide defaults and strings through &lt;code&gt;&amp;lt;OgeEditorConfigProvider&amp;gt;&lt;/code&gt; (also covered by &lt;code&gt;&amp;lt;OgeLocaleProvider&amp;gt;&lt;/code&gt;)."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactEditorOverviewDemos {
  protected readonly demos = EDITOR_OVERVIEW_DEMOS;
  protected readonly gettingStarted = () => createElement(GettingStartedDemo);
  protected readonly toolbar = () => createElement(ToolbarDemo);
  protected readonly keyboard = () => createElement(KeyboardDemo);
  protected readonly links = () => createElement(LinksDemo);
  protected readonly paste = () => createElement(PasteDemo);
  protected readonly forms = () => createElement(FormsDemo);
  protected readonly modes = () => createElement(ModesDemo);
  protected readonly config = () => createElement(ConfigDemo);
}
