// Hand-compiled from packages/react/editor/src/lib/** and the shared machine
// in packages/behavior/src/lib/editor/** — keep in sync with the source TSDoc.
//
// Mirrors `pages/editor/editor-api-data.ts` block for block and group for
// group, so the two views read as one page across the switch and the parity
// gate can diff them member by member. What differs is the idiom — a
// controlled `value` pair instead of `model()`, `on`-prefixed callbacks
// instead of outputs, a `ref` handle instead of public members and signals,
// a context provider instead of a DI token.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_EDITOR_API: ApiSections = {
  properties: [
    {
      title: 'Value and forms',
      entries: [
        {
          name: 'value',
          type: 'string',
          default: 'undefined',
          description:
            'The sanitized HTML value — controlled when provided (pair it with <code>onValueChange</code>), <code>defaultValue</code> for uncontrolled use. The empty string when the document is empty. The editor ignores its own echo, so the caret and the history survive a controlled round trip.',
        },
        {
          name: 'defaultValue',
          type: 'string',
          default: "''",
          description: 'Uncontrolled initial value.',
        },
        {
          name: 'onValueChange',
          type: '(value: string) => void',
          description:
            'Every change of the value — the controlled half of <code>value</code>.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Not editable and out of the Tab order (<code>aria-disabled</code>).',
        },
        {
          name: 'readonly',
          type: 'boolean',
          default: 'false',
          description:
            'Focusable and selectable, but not editable (<code>aria-readonly</code>); every tool is disabled.',
        },
        {
          name: 'required',
          type: 'boolean',
          default: 'false',
          description:
            'Sets <code>aria-required</code> and the asterisk; validation is the form library’s.',
        },
        {
          name: 'name',
          type: 'string',
          default: "''",
          description:
            'Written as <code>data-name</code> on the editing surface.',
        },
        {
          name: 'invalid',
          type: 'boolean',
          default: 'false',
          description: 'External invalid state (from your form library).',
        },
        {
          name: 'touched / dirty',
          type: 'boolean',
          default: 'false',
          description:
            'External touched / dirty state; errors show once the field is touched.',
        },
        {
          name: 'errors',
          type: 'readonly OgeFieldError[]',
          default: '[]',
          description:
            'Validation errors to show (the first one’s message, or the matching catalog string).',
        },
        {
          name: 'maxLength',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'Most characters (grapheme clusters) of <em>text</em> the document may hold. Typing and pasting stop there (announced), the counter shows the budget, and a longer external value shows the error.',
        },
      ],
    },
    {
      title: 'Chrome',
      entries: [
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Visible label above the editor; also its accessible name (<code>aria-labelledby</code>).',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'Accessible name when there is no visible label; falls back to <code>messages.editorLabel</code>.',
        },
        {
          name: 'placeholder',
          type: 'string',
          default: "''",
          description:
            'Shown while the document is empty; also <code>aria-placeholder</code>.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'Helper text under the editor, hidden while an error shows; part of <code>aria-describedby</code>.',
        },
        {
          name: 'errorText',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'Explicit error message — always wins over the resolved messages.',
        },
        {
          name: 'counter',
          type: "'none' | 'characters' | 'words' | 'both'",
          default: "'none'",
          description:
            'Character / word counter under the editor (ICU plurals from <code>messages.counter</code>). With <code>maxLength</code> the character count reads <code>12 / 200</code>.',
        },
        {
          name: 'toolbar',
          type: 'readonly OgeEditorToolbarEntry[] | false | undefined',
          default: 'undefined',
          description:
            "Toolbar entries: built-in tool names, <code>'separator'</code> and <code>OgeEditorCustomTool</code> objects. <code>undefined</code> is the full default toolbar, <code>false</code> hides it.",
        },
        {
          name: 'toolbarOverflow',
          type: "'menu' | 'scroll' | 'wrap' | 'extended' | 'none'",
          default: "'menu'",
          description:
            'What the toolbar does with tools that do not fit (the layout toolbar’s <code>overflow</code>).',
        },
        {
          name: 'height / minHeight / maxHeight',
          type: 'number | string | undefined',
          default: 'undefined',
          description:
            'Size of the editing area — a number is px, a string any CSS length. Without them the area starts at 160px and grows with its content.',
        },
        {
          name: 'resizable',
          type: 'boolean',
          default: 'false',
          description: 'Adds a vertical resize handle to the editing area.',
        },
        {
          name: 'spellcheck',
          type: 'boolean',
          default: 'true',
          description: 'The browser’s spell checking on the editing surface.',
        },
        {
          name: 'tabIndex',
          type: 'number',
          default: '0',
          description: 'Tab index of the editing surface.',
        },
        {
          name: 'autofocus',
          type: 'boolean',
          default: 'false',
          description: 'Focuses the editor after it mounts.',
        },
        {
          name: 'id',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'Base of the generated element ids; defaults to one derived from <code>useId()</code> (SSR-safe).',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          default: 'undefined',
          description: 'Classes and inline style of the host element.',
        },
      ],
    },
    {
      title: 'Behaviour (undefined = config)',
      entries: [
        {
          name: 'markdownShortcuts',
          type: 'boolean | undefined',
          default: 'true',
          description:
            '<code># </code>…<code>###### </code>, <code>- </code>, <code>1. </code>, <code>&gt; </code>, <code>``` </code> at the start of a paragraph and <code>---</code> + Enter turn into formats. One undo brings the typed characters back.',
        },
        {
          name: 'pasteMode',
          type: "'html' | 'text' | undefined",
          default: "'html'",
          description:
            "<code>'html'</code> keeps (sanitized) formatting from the clipboard; <code>'text'</code> inserts text only.",
        },
        {
          name: 'headingLevels',
          type: 'readonly OgeEditorHeadingLevel[] | undefined',
          default: '[1, 2, 3, 4]',
          description: 'Heading levels the block-format menu offers.',
        },
        {
          name: 'textColors / backgroundColors',
          type: 'OgeColorPalettePreset | readonly string[] | undefined',
          default: "'default'",
          description:
            'Palettes of the two colour popups — an <code>@oge-ui/react-inputs</code> palette preset or your own colour list. Colours are validated (no <code>url()</code>, <code>var()</code> or expressions).',
        },
        {
          name: 'allowedSchemes',
          type: 'readonly string[] | undefined',
          default: '[]',
          description:
            'Extra link schemes on top of <code>sanitizeUrl</code>’s allowlist (<code>http</code>, <code>https</code>, <code>mailto</code>, <code>tel</code>, <code>ftp</code>, <code>sms</code>). Script schemes can never be allowed.',
        },
        {
          name: 'allowDataImages',
          type: 'boolean | undefined',
          default: 'false',
          description:
            'Keep <code>data:image/*</code> sources (PNG, JPEG, GIF, WebP, AVIF, BMP — never SVG). <code>blob:</code> and <code>file:</code> images are always dropped.',
        },
        {
          name: 'messages',
          type: 'OgeEditorMessagesInput | undefined',
          default: 'undefined',
          description:
            'Per-instance overrides of the user-facing strings, merged group by group over the <code>&lt;OgeEditorConfigProvider&gt;</code> values.',
        },
      ],
    },
    {
      title: 'Read-only state',
      entries: [
        {
          name: 'activeState',
          type: 'OgeEditorActiveState',
          description:
            'Handle getter: the formats under the selection — what the toolbar shows.',
        },
        {
          name: 'characterCount / wordCount',
          type: 'number',
          description:
            'Handle getters: grapheme clusters and words (<code>Intl.Segmenter</code>) of the text.',
        },
        {
          name: 'canUndo / canRedo',
          type: 'boolean',
          description:
            'Handle getters: whether the history has a step back / forward.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeEditorHandle)',
      entries: [
        {
          name: 'focus()',
          type: 'void',
          description:
            'Moves focus into the editing area and restores the caret.',
        },
        {
          name: 'blur()',
          type: 'void',
          description: 'Removes keyboard focus.',
        },
        {
          name: 'exec(command)',
          type: '(command: OgeEditorCommandName | OgeEditorCommand) => boolean',
          description:
            "Runs a command — a name (<code>'bold'</code>, <code>'heading2'</code>, <code>'bulletList'</code>…) or a command object (<code>{ type: 'color', color: '#c00' }</code>). Returns <code>true</code> when it changed something.",
        },
        {
          name: 'undo() / redo()',
          type: '() => boolean',
          description: 'Steps through the editor’s own history.',
        },
        {
          name: 'insertText(text)',
          type: '(text: string) => void',
          description:
            'Inserts plain text at the selection (newlines become paragraphs).',
        },
        {
          name: 'insertHtml(html)',
          type: '(html: string) => void',
          description:
            'Inserts HTML at the selection — parsed through the editor’s allowlist first, like a paste.',
        },
        {
          name: 'insertLink(href, text?, newTab?)',
          type: '(href: string, text?: string, newTab?: boolean) => boolean',
          description:
            'Links the selection, or inserts <code>text</code> (default: the address) as a link. Unsafe addresses are refused (<code>false</code>); new-tab links get <code>rel="noopener noreferrer"</code>.',
        },
        {
          name: 'removeLink()',
          type: '() => boolean',
          description:
            'Removes the link under the selection or around the caret.',
        },
        {
          name: 'insertImage(src, alt?)',
          type: '(src: string, alt?: string) => boolean',
          description: 'Inserts an image by URL; unsafe sources are refused.',
        },
        {
          name: 'selectAll()',
          type: 'void',
          description: 'Selects the whole document.',
        },
        {
          name: 'getHtml() / getText()',
          type: '() => string',
          description:
            'The current value, or its text with blocks separated by newlines.',
        },
        {
          name: 'clear()',
          type: 'void',
          description: 'Empties the editor as one undoable change.',
        },
        {
          name: 'reset(value?)',
          type: '(value?: string) => void',
          description:
            'Loads <code>value</code> (default: empty), clears the history and the touched / dirty state, and reports the change.',
        },
        {
          name: 'openLinkDialog() / openImageDialog()',
          type: '() => Promise<void>',
          description:
            'Opens the link or image prompt for the selection (also Ctrl+K and the toolbar tools), subject to <code>onDialogOpening</code>.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onValueCommitted',
          type: '(event: OgeEditorValueCommittedEvent) => void',
          description:
            'Every committed change: <code>{ value, previousValue, event }</code>.',
        },
        {
          name: 'onFocus / onBlur',
          type: '(event: FocusEvent) => void',
          description: 'Focus entered or left the editor (popups included).',
        },
        {
          name: 'onSelectionChange',
          type: '(event: OgeEditorSelectionChangedEvent) => void',
          description:
            'The selection moved or its formats changed: <code>{ active }</code>.',
        },
        {
          name: 'onCommandExecuted',
          type: '(event: OgeEditorCommandExecutedEvent) => void',
          description:
            'A command ran (keyboard, toolbar or <code>exec</code>): <code>{ command, event }</code>.',
        },
        {
          name: 'onToolClick',
          type: '(event: OgeEditorToolClickEvent) => void',
          description:
            'A toolbar tool was activated: <code>{ key, inMenu, event }</code>.',
        },
        {
          name: 'onPasting',
          type: '(event: OgeEditorPastingEvent) => void',
          description:
            'Cancelable: a paste or drop is about to be inserted. Set <code>cancel</code>, or rewrite <code>html</code> / <code>text</code>.',
        },
        {
          name: 'onDialogOpening',
          type: '(event: OgeEditorDialogOpeningEvent) => void',
          description:
            'Cancelable: the link or image dialog is about to open (<code>{ kind, link, cancel }</code>). Cancel it to show your own dialog, then call <code>insertLink()</code> / <code>insertImage()</code> on the handle.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeEditorToolName',
          type: "'undo' | 'redo' | 'blockFormat' | 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'subscript' | 'superscript' | 'textColor' | 'backgroundColor' | 'link' | 'unlink' | 'image' | 'bulletList' | 'orderedList' | 'indent' | 'outdent' | 'blockquote' | 'codeBlock' | 'horizontalRule' | 'alignStart' | 'alignCenter' | 'alignEnd' | 'alignJustify' | 'directionLtr' | 'directionRtl' | 'clearFormatting'",
          description:
            'Built-in toolbar tools. <code>OGE_DEFAULT_EDITOR_TOOLBAR</code> is the default arrangement.',
        },
        {
          name: 'OgeEditorToolbarEntry',
          type: "OgeEditorToolName | 'separator' | OgeEditorCustomTool",
          description:
            'One toolbar entry. Leading, trailing and doubled separators are dropped.',
        },
        {
          name: 'OgeEditorCustomTool',
          type: '{ key; text; icon?; hint?; shortcut?; isActive?(active); isDisabled?(active); run(context: OgeEditorToolContext) }',
          description:
            'A tool of your own. <code>isActive</code> makes it a toggle (<code>aria-pressed</code>); <code>run</code> receives <code>exec</code>, <code>insertHtml</code>, <code>insertText</code>, <code>getHtml</code> and the active state.',
        },
        {
          name: 'OgeEditorCommandName',
          type: "'bold' | 'italic' | … | 'heading1'…'heading6' | 'blockquote' | 'codeBlock' | 'bulletList' | 'orderedList' | 'indent' | 'outdent' | 'alignStart' | 'alignCenter' | 'alignEnd' | 'alignJustify' | 'horizontalRule' | 'clearFormatting' | 'unlink' | 'undo' | 'redo' | 'selectAll'",
          description:
            'Parameterless commands by name, for <code>exec()</code>.',
        },
        {
          name: 'OgeEditorCommand',
          type: "{ type: 'toggleMark'; mark } | { type: 'blockFormat'; format; level? } | { type: 'list'; list } | { type: 'align'; align } | { type: 'color' | 'background'; color } | { type: 'link'; href; text?; newTab? } | { type: 'image'; src; alt? } | …",
          description:
            'A command object — the same vocabulary the toolbar and the keyboard map issue.',
        },
        {
          name: 'OgeEditorActiveState',
          type: '{ marks; blockFormat; list; align; dir; link; color; background; canIndent; canOutdent; collapsed }',
          description: 'What the selection currently is.',
        },
        {
          name: 'OgeEditorMessages',
          type: 'interface',
          description:
            'Every user-facing string: tool names, block names, dialogs, colours, counter (ICU plurals), announcements, validation and key names. Translated in all ten <code>@oge-ui/locales</code> packs (<code>&lt;OgeLocaleProvider&gt;</code> wires them).',
        },
        {
          name: 'OgeEditorConfigProvider',
          type: '({ config?: OgeEditorConfigInput; children }) => ReactNode',
          description:
            'Subtree-wide defaults and strings; nested providers merge over the outer one.',
        },
        {
          name: 'ogeSanitizeEditorHtml(html, options?)',
          type: '(html: string | null | undefined, options?: OgeEditorParseOptions) => string',
          description:
            'The editor’s allowlist as a function — for values that did not come through the editor. Only the editor’s own tags and attributes come out.',
        },
        {
          name: 'ogeEditorHtmlLength(html)',
          type: '(html: string | null | undefined, options?: OgeEditorParseOptions) => number',
          description:
            'Characters of an HTML value’s text — the measure <code>maxLength</code> applies; use it in your form library’s validator.',
        },
        {
          name: 'ogeEditorCommandFromName(name)',
          type: '(name: OgeEditorCommandName) => OgeEditorCommand',
          description: 'Expands a command name into its command object.',
        },
        {
          name: 'OGE_EDITOR_TRUSTED_TYPES_POLICY',
          type: "'oge-ui#editor'",
          description:
            'Name of the Trusted Types policy behind the editor’s one <code>DOMParser</code> call. List it in a <code>trusted-types</code> CSP directive.',
        },
        {
          name: 'useOgeEditorConfig() / OGE_DEFAULT_EDITOR_CONFIG / OGE_DEFAULT_EDITOR_MESSAGES',
          type: '() => OgeEditorConfig / OgeEditorConfig / OgeEditorMessages',
          description:
            'The resolved config of the subtree, and the shipped defaults.',
        },
        {
          name: 'OGE_DEFAULT_EDITOR_TOOLBAR',
          type: 'readonly OgeEditorToolbarEntry[]',
          description:
            'The default toolbar arrangement — spread it to extend the default instead of replacing it.',
        },
      ],
    },
  ],
};
