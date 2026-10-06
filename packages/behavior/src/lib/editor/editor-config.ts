/**
 * The rich-text editor's message catalog and package defaults (W8e),
 * shared by both render layers so `provideOgeEditorConfig()` and
 * `<OgeEditorConfigProvider>` resolve against one object — and a
 * translation written for one layer is the translation for the other.
 */
import type { OgeColorPalettePreset } from '../input/color-core';
import type { OgeEditorHeadingLevel } from './editor-model';

/** Labels of the built-in toolbar tools (also their accessible names). */
export interface OgeEditorToolMessages {
  readonly undo: string;
  readonly redo: string;
  readonly blockFormat: string;
  readonly bold: string;
  readonly italic: string;
  readonly underline: string;
  readonly strike: string;
  readonly code: string;
  readonly subscript: string;
  readonly superscript: string;
  readonly textColor: string;
  readonly backgroundColor: string;
  readonly link: string;
  readonly unlink: string;
  readonly image: string;
  readonly bulletList: string;
  readonly orderedList: string;
  readonly indent: string;
  readonly outdent: string;
  readonly blockquote: string;
  readonly codeBlock: string;
  readonly horizontalRule: string;
  readonly alignStart: string;
  readonly alignCenter: string;
  readonly alignEnd: string;
  readonly alignJustify: string;
  readonly directionLtr: string;
  readonly directionRtl: string;
  readonly clearFormatting: string;
}

/** Names of the block formats (the block-format menu and its button). */
export interface OgeEditorBlockMessages {
  readonly paragraph: string;
  /** `{level}` is the heading level. */
  readonly heading: string;
  readonly blockquote: string;
  readonly codeBlock: string;
  /** Shown when the selection spans several formats. */
  readonly mixed: string;
}

/** The link and image dialogs (the overlay prompt). */
export interface OgeEditorDialogMessages {
  readonly linkTitle: string;
  readonly linkEditTitle: string;
  readonly linkLabel: string;
  readonly linkPlaceholder: string;
  /** Hint under the link field: an empty address removes the link. */
  readonly linkMessage: string;
  readonly linkInvalid: string;
  readonly linkOk: string;
  readonly imageTitle: string;
  readonly imageLabel: string;
  readonly imagePlaceholder: string;
  readonly imageInvalid: string;
  readonly imageOk: string;
  readonly imageAltTitle: string;
  readonly imageAltLabel: string;
  /** Explains what alternative text is for. */
  readonly imageAltMessage: string;
}

/** The colour popups. */
export interface OgeEditorColorMessages {
  readonly textColorLabel: string;
  readonly backgroundColorLabel: string;
  /** The "remove colour" button under the palette. */
  readonly removeColor: string;
}

/** The character / word counter under the editor. ICU plurals. */
export interface OgeEditorCounterMessages {
  readonly characters: string;
  readonly words: string;
  /** With `maxLength`: `{count}` and `{max}`. */
  readonly limit: string;
}

/** Polite live-region texts. `{format}` is a tool or block name. */
export interface OgeEditorAnnouncementMessages {
  readonly formatOn: string;
  readonly formatOff: string;
  readonly blockFormat: string;
  readonly undone: string;
  readonly redone: string;
  readonly linkInserted: string;
  readonly linkRemoved: string;
  readonly imageInserted: string;
  readonly ruleInserted: string;
  readonly pasted: string;
  readonly limitReached: string;
}

/** Validation messages of the built-in checks. */
export interface OgeEditorValidationMessages {
  readonly required: string;
  /** `{max}` and `{count}`. */
  readonly maxLength: string;
  readonly invalid: string;
}

/** Key names in tooltips (`Bold (Ctrl+B)`). */
export interface OgeEditorKeyMessages {
  readonly mod: string;
  readonly modMac: string;
  readonly shift: string;
  readonly alt: string;
  readonly altMac: string;
}

/** Everything the editor can say. */
export interface OgeEditorMessages {
  /** Accessible name of the editing surface when the editor has no label. */
  readonly editorLabel: string;
  /** Accessible name of the toolbar. */
  readonly toolbarLabel: string;
  /** Tooltip pattern: `{label}` and `{shortcut}`. */
  readonly shortcutHint: string;
  readonly tools: OgeEditorToolMessages;
  readonly blocks: OgeEditorBlockMessages;
  readonly dialogs: OgeEditorDialogMessages;
  readonly colors: OgeEditorColorMessages;
  readonly counter: OgeEditorCounterMessages;
  readonly announcements: OgeEditorAnnouncementMessages;
  readonly validation: OgeEditorValidationMessages;
  readonly keys: OgeEditorKeyMessages;
}

/** The English defaults. */
export const OGE_DEFAULT_EDITOR_MESSAGES: OgeEditorMessages = {
  editorLabel: 'Rich text editor',
  toolbarLabel: 'Text formatting',
  shortcutHint: '{label} ({shortcut})',
  tools: {
    undo: 'Undo',
    redo: 'Redo',
    blockFormat: 'Text style',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strike: 'Strikethrough',
    code: 'Inline code',
    subscript: 'Subscript',
    superscript: 'Superscript',
    textColor: 'Text color',
    backgroundColor: 'Highlight color',
    link: 'Link',
    unlink: 'Remove link',
    image: 'Image',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    indent: 'Increase indent',
    outdent: 'Decrease indent',
    blockquote: 'Quote',
    codeBlock: 'Code block',
    horizontalRule: 'Horizontal line',
    alignStart: 'Align start',
    alignCenter: 'Align center',
    alignEnd: 'Align end',
    alignJustify: 'Justify',
    directionLtr: 'Left-to-right text',
    directionRtl: 'Right-to-left text',
    clearFormatting: 'Clear formatting',
  },
  blocks: {
    paragraph: 'Paragraph',
    heading: 'Heading {level}',
    blockquote: 'Quote',
    codeBlock: 'Code block',
    mixed: 'Mixed',
  },
  dialogs: {
    linkTitle: 'Insert link',
    linkEditTitle: 'Edit link',
    linkLabel: 'Link address',
    linkPlaceholder: 'https://example.com',
    linkMessage: 'Leave the address empty to remove the link.',
    linkInvalid: 'Use an http, https, mailto or tel address.',
    linkOk: 'Apply',
    imageTitle: 'Insert image',
    imageLabel: 'Image address',
    imagePlaceholder: 'https://example.com/picture.png',
    imageInvalid: 'Use an http or https image address.',
    imageOk: 'Next',
    imageAltTitle: 'Describe the image',
    imageAltLabel: 'Alternative text',
    imageAltMessage:
      'Screen readers read this instead of the image. Leave it empty for a decorative image.',
  },
  colors: {
    textColorLabel: 'Text color',
    backgroundColorLabel: 'Highlight color',
    removeColor: 'No color',
  },
  counter: {
    characters: '{count, plural, one {# character} other {# characters}}',
    words: '{count, plural, one {# word} other {# words}}',
    limit: '{count} / {max}',
  },
  announcements: {
    formatOn: '{format} on',
    formatOff: '{format} off',
    blockFormat: '{format}',
    undone: 'Undone',
    redone: 'Redone',
    linkInserted: 'Link inserted',
    linkRemoved: 'Link removed',
    imageInserted: 'Image inserted',
    ruleInserted: 'Horizontal line inserted',
    pasted: 'Pasted',
    limitReached: 'Character limit reached',
  },
  validation: {
    required: 'This field is required.',
    maxLength: 'Use at most {max} characters ({count} used).',
    invalid: 'This value is not valid.',
  },
  keys: {
    mod: 'Ctrl',
    modMac: '⌘',
    shift: 'Shift',
    alt: 'Alt',
    altMac: '⌥',
  },
};

/** A built-in toolbar tool. */
export type OgeEditorToolName =
  | 'undo'
  | 'redo'
  | 'blockFormat'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'subscript'
  | 'superscript'
  | 'textColor'
  | 'backgroundColor'
  | 'link'
  | 'unlink'
  | 'image'
  | 'bulletList'
  | 'orderedList'
  | 'indent'
  | 'outdent'
  | 'blockquote'
  | 'codeBlock'
  | 'horizontalRule'
  | 'alignStart'
  | 'alignCenter'
  | 'alignEnd'
  | 'alignJustify'
  | 'directionLtr'
  | 'directionRtl'
  | 'clearFormatting';

/** How a clipboard paste is read: keep (sanitized) formatting, or text only. */
export type OgeEditorPasteMode = 'html' | 'text';

/** What the counter under the editor shows. */
export type OgeEditorCounterMode = 'none' | 'characters' | 'words' | 'both';

/** Package-wide defaults for every editor under a provider. */
export interface OgeEditorConfig {
  /** Heading levels offered by the block-format menu. */
  readonly headingLevels: readonly OgeEditorHeadingLevel[];
  /** Palette of the text-colour popup (an `@oge-ui/inputs` preset or colours). */
  readonly textColors: OgeColorPalettePreset | readonly string[];
  /** Palette of the highlight-colour popup. */
  readonly backgroundColors: OgeColorPalettePreset | readonly string[];
  /** `# `, `- `, `1. `, `> `, ```` ``` ```` and `---` turn into formats as you type. */
  readonly markdownShortcuts: boolean;
  readonly pasteMode: OgeEditorPasteMode;
  /** Extra link schemes allowed on top of `sanitizeUrl`'s allowlist. */
  readonly allowedSchemes: readonly string[];
  /** Keep `data:image/*` image sources (pasted or set). Default `false`. */
  readonly allowDataImages: boolean;
  /** Undo depth. */
  readonly historyLimit: number;
  /** Locale of the counters' number formatting and word segmentation. */
  readonly locale: string | undefined;
  readonly messages: OgeEditorMessages;
}

/** The shipped defaults. */
export const OGE_DEFAULT_EDITOR_CONFIG: OgeEditorConfig = {
  headingLevels: [1, 2, 3, 4],
  textColors: 'default',
  backgroundColors: 'default',
  markdownShortcuts: true,
  pasteMode: 'html',
  allowedSchemes: [],
  allowDataImages: false,
  historyLimit: 100,
  locale: undefined,
  messages: OGE_DEFAULT_EDITOR_MESSAGES,
};

/** A deep-partial message override, as the providers and the `messages` input take. */
export type OgeEditorMessagesInput = Partial<
  Omit<
    OgeEditorMessages,
    | 'tools'
    | 'blocks'
    | 'dialogs'
    | 'colors'
    | 'counter'
    | 'announcements'
    | 'validation'
    | 'keys'
  >
> & {
  tools?: Partial<OgeEditorToolMessages>;
  blocks?: Partial<OgeEditorBlockMessages>;
  dialogs?: Partial<OgeEditorDialogMessages>;
  colors?: Partial<OgeEditorColorMessages>;
  counter?: Partial<OgeEditorCounterMessages>;
  announcements?: Partial<OgeEditorAnnouncementMessages>;
  validation?: Partial<OgeEditorValidationMessages>;
  keys?: Partial<OgeEditorKeyMessages>;
};

/** What the providers accept: everything optional, messages deep-partial. */
export type OgeEditorConfigInput = Partial<
  Omit<OgeEditorConfig, 'messages'>
> & {
  messages?: OgeEditorMessagesInput;
};

/** Merges a deep-partial message override over a base catalog. */
export function mergeOgeEditorMessages(
  base: OgeEditorMessages,
  input: OgeEditorMessagesInput | undefined,
): OgeEditorMessages {
  if (!input) return base;
  return {
    ...base,
    ...input,
    tools: { ...base.tools, ...input.tools },
    blocks: { ...base.blocks, ...input.blocks },
    dialogs: { ...base.dialogs, ...input.dialogs },
    colors: { ...base.colors, ...input.colors },
    counter: { ...base.counter, ...input.counter },
    announcements: { ...base.announcements, ...input.announcements },
    validation: { ...base.validation, ...input.validation },
    keys: { ...base.keys, ...input.keys },
  };
}

/** Merges a config input over the defaults (messages merged group by group). */
export function resolveOgeEditorConfig(
  input: OgeEditorConfigInput | undefined,
  base: OgeEditorConfig = OGE_DEFAULT_EDITOR_CONFIG,
): OgeEditorConfig {
  const { messages, ...rest } = input ?? {};
  return {
    ...base,
    ...rest,
    messages: mergeOgeEditorMessages(base.messages, messages),
  };
}
