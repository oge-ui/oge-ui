/**
 * The rich-text editor's toolbar as data (W8e): which tools exist, what
 * each one is (a toggle, a button, a popup opener), its icon, its keyboard
 * shortcut, and — given the active state — whether it is pressed or
 * disabled. Both render layers draw these views inside the layout
 * package's APG toolbar, so the two toolbars cannot disagree.
 */
import { ogeFormatMessage } from '@oge-ui/core';
import type { OgeMenuItem } from '../menu/menu-types';
import type { OgeToolbarItemData } from '../layout/toolbar-core';
import type { OgeEditorCommand } from './editor-actions';
import type { OgeEditorMessages, OgeEditorToolName } from './editor-config';
import type { OgeEditorHeadingLevel } from './editor-model';
import type {
  OgeEditorActiveState,
  OgeEditorBlockFormatValue,
} from './editor-queries';

/** What a toolbar entry does when activated. */
export type OgeEditorToolKind =
  'toggle' | 'button' | 'menu' | 'color' | 'dialog' | 'separator';

/** A shortcut, platform-neutral: `mod` is Ctrl, or ⌘ on Apple platforms. */
export interface OgeEditorShortcut {
  readonly key: string;
  readonly mod?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

/** The surface a custom tool's `run` receives. */
export interface OgeEditorToolContext {
  /** Runs an editor command (`{ type: 'toggleMark', mark: 'bold' }`, …). */
  exec(command: OgeEditorCommand): boolean;
  /** Inserts sanitized HTML at the selection. */
  insertHtml(html: string): void;
  /** Inserts plain text at the selection. */
  insertText(text: string): void;
  /** The current value. */
  getHtml(): string;
  /** The current active state. */
  readonly active: OgeEditorActiveState;
}

/** A tool supplied by the application. */
export interface OgeEditorCustomTool {
  /** Stable identity (DOM ids, `toolClick`). */
  readonly key: string;
  /** Label — the accessible name; shown as text when there is no icon. */
  readonly text: string;
  /** SVG path data (`d`) of a 16×16 stroked icon. */
  readonly icon?: string;
  /** Tooltip; defaults to `text`. */
  readonly hint?: string;
  /** `aria-keyshortcuts` value (display only — bind the key yourself). */
  readonly shortcut?: string;
  /** Makes the tool a toggle and reports its pressed state. */
  readonly isActive?: (active: OgeEditorActiveState) => boolean;
  /** Disables the tool for the current selection. */
  readonly isDisabled?: (active: OgeEditorActiveState) => boolean;
  /** What activation does. */
  readonly run: (context: OgeEditorToolContext) => void;
}

/** One toolbar entry: a built-in tool, a separator or a custom tool. */
export type OgeEditorToolbarEntry =
  OgeEditorToolName | 'separator' | OgeEditorCustomTool;

/** The shipped toolbar. */
export const OGE_DEFAULT_EDITOR_TOOLBAR: readonly OgeEditorToolbarEntry[] = [
  'undo',
  'redo',
  'separator',
  'blockFormat',
  'separator',
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'separator',
  'textColor',
  'backgroundColor',
  'separator',
  'link',
  'image',
  'separator',
  'bulletList',
  'orderedList',
  'outdent',
  'indent',
  'separator',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'separator',
  'alignStart',
  'alignCenter',
  'alignEnd',
  'alignJustify',
  'separator',
  'clearFormatting',
];

interface ToolDefinition {
  readonly kind: Exclude<OgeEditorToolKind, 'separator'>;
  readonly icon: string;
  readonly shortcut?: OgeEditorShortcut;
  /** The icon is directional and mirrors in RTL. */
  readonly mirror?: boolean;
}

/** Built-in tool definitions: kind, icon (16×16 stroke paths) and shortcut. */
export const OGE_EDITOR_TOOLS: Readonly<
  Record<OgeEditorToolName, ToolDefinition>
> = {
  undo: {
    kind: 'button',
    icon: 'M5.5 9.5 2.5 6.5l3-3M2.5 6.5h7a4 4 0 0 1 0 8H7',
    shortcut: { key: 'Z', mod: true },
    mirror: true,
  },
  redo: {
    kind: 'button',
    icon: 'M10.5 9.5l3-3-3-3M13.5 6.5h-7a4 4 0 0 0 0 8H9',
    shortcut: { key: 'Y', mod: true },
    mirror: true,
  },
  blockFormat: { kind: 'menu', icon: 'M3 3.5h10M8 3.5v9M6 12.5h4' },
  bold: {
    kind: 'toggle',
    icon: 'M4.5 2.5h4a2.75 2.75 0 0 1 0 5.5h-4zM4.5 8h4.75a2.75 2.75 0 0 1 0 5.5H4.5z',
    shortcut: { key: 'B', mod: true },
  },
  italic: {
    kind: 'toggle',
    icon: 'M10.5 2.5h-4M9.5 13.5h-4M9 2.5 7 13.5',
    shortcut: { key: 'I', mod: true },
  },
  underline: {
    kind: 'toggle',
    icon: 'M4.5 2.5v5a3.5 3.5 0 0 0 7 0v-5M3.5 14h9',
    shortcut: { key: 'U', mod: true },
  },
  strike: {
    kind: 'toggle',
    icon: 'M2.5 8h11M11 4.5C10.5 3.2 9.4 2.5 8 2.5 6.2 2.5 5 3.4 5 4.8c0 1 .6 1.7 1.8 2.2M5 11.2c.5 1.4 1.7 2.3 3.2 2.3 1.9 0 3.2-1 3.2-2.5 0-.6-.2-1.1-.6-1.5',
    shortcut: { key: 'X', mod: true, shift: true },
  },
  code: {
    kind: 'toggle',
    icon: 'M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5',
    shortcut: { key: 'E', mod: true },
  },
  subscript: {
    kind: 'toggle',
    icon: 'M2.5 3.5l5 7M7.5 3.5l-5 7M10.5 10.5a1.5 1.5 0 0 1 3 0c0 1.5-3 1.5-3 3.5h3',
    shortcut: { key: ',', mod: true },
  },
  superscript: {
    kind: 'toggle',
    icon: 'M2.5 5.5l5 7M7.5 5.5l-5 7M10.5 3a1.5 1.5 0 0 1 3 0c0 1.5-3 1.5-3 3.5h3',
    shortcut: { key: '.', mod: true },
  },
  textColor: { kind: 'color', icon: 'M4.5 10.5 8 2.5l3.5 8M5.6 8h4.8' },
  backgroundColor: {
    kind: 'color',
    icon: 'M9.5 2.5l4 4-5.5 5.5H4v-4zM7 5l4 4',
  },
  link: {
    kind: 'dialog',
    icon: 'M6.8 9.2a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 0 0-4-4l-.7.7M9.2 6.8a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 0 0 4 4l.7-.7',
    shortcut: { key: 'K', mod: true },
  },
  unlink: {
    kind: 'button',
    icon: 'M6.8 9.2a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 0 0-4-4l-.7.7M9.2 6.8a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 0 0 4 4l.7-.7M2.5 2.5l11 11',
  },
  image: {
    kind: 'dialog',
    icon: 'M2.5 3.5h11v9h-11zM2.5 10.5l3-3 3 3 2-2 3 3M10.5 6h.01',
  },
  bulletList: {
    kind: 'toggle',
    icon: 'M6 4h7.5M6 8h7.5M6 12h7.5M2.5 4h.5M2.5 8h.5M2.5 12h.5',
    shortcut: { key: '8', mod: true, shift: true },
    mirror: true,
  },
  orderedList: {
    kind: 'toggle',
    icon: 'M6.5 4h7M6.5 8h7M6.5 12h7M2.5 2.5h1v3M2.3 9.2a.9.9 0 0 1 1.6.4c0 .7-1.6 1-1.6 2h1.7',
    shortcut: { key: '7', mod: true, shift: true },
    mirror: true,
  },
  indent: {
    kind: 'button',
    icon: 'M2 3.5h12M7 6.5h7M7 9.5h7M2 12.5h12M2.5 6l2.5 2-2.5 2',
    shortcut: { key: ']', mod: true },
    mirror: true,
  },
  outdent: {
    kind: 'button',
    icon: 'M2 3.5h12M7 6.5h7M7 9.5h7M2 12.5h12M5 6 2.5 8 5 10',
    shortcut: { key: '[', mod: true },
    mirror: true,
  },
  blockquote: {
    kind: 'toggle',
    icon: 'M3 5.5h3v3H4.5c0 1.5.5 2.5 1.5 3M9 5.5h3v3h-1.5c0 1.5.5 2.5 1.5 3',
    shortcut: { key: '9', mod: true, shift: true },
  },
  codeBlock: {
    kind: 'toggle',
    icon: 'M2.5 2.5h11v11h-11zM6.5 6 5 8l1.5 2M9.5 6 11 8l-1.5 2',
  },
  horizontalRule: { kind: 'button', icon: 'M2 8h12M4 4.5h8M4 11.5h8' },
  alignStart: {
    kind: 'toggle',
    icon: 'M2 3.5h12M2 6.5h8M2 9.5h12M2 12.5h8',
    shortcut: { key: 'L', mod: true, shift: true },
    mirror: true,
  },
  alignCenter: {
    kind: 'toggle',
    icon: 'M2 3.5h12M4 6.5h8M2 9.5h12M4 12.5h8',
    shortcut: { key: 'E', mod: true, shift: true },
  },
  alignEnd: {
    kind: 'toggle',
    icon: 'M2 3.5h12M6 6.5h8M2 9.5h12M6 12.5h8',
    shortcut: { key: 'R', mod: true, shift: true },
    mirror: true,
  },
  alignJustify: {
    kind: 'toggle',
    icon: 'M2 3.5h12M2 6.5h12M2 9.5h12M2 12.5h12',
    shortcut: { key: 'J', mod: true, shift: true },
  },
  directionLtr: {
    kind: 'toggle',
    icon: 'M6.5 2.5v8M9.5 2.5v8M11 2.5H6a2.5 2.5 0 0 0 0 5h.5M2.5 13h11M11.5 11l2 2-2 2',
  },
  directionRtl: {
    kind: 'toggle',
    icon: 'M6.5 2.5v8M9.5 2.5v8M11 2.5H6a2.5 2.5 0 0 0 0 5h.5M13.5 13h-11M4.5 11l-2 2 2 2',
  },
  clearFormatting: {
    kind: 'button',
    icon: 'M3 3.5h8M7.5 3.5 5.5 12.5M9.5 9.5l4 4M13.5 9.5l-4 4',
    shortcut: { key: '\\', mod: true },
  },
};

/** `aria-keyshortcuts` spelling of a shortcut (`Control+B`, `Meta+B`). */
export function ogeEditorAriaShortcut(
  shortcut: OgeEditorShortcut,
  mac: boolean,
): string {
  const parts: string[] = [];
  if (shortcut.mod) parts.push(mac ? 'Meta' : 'Control');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  parts.push(shortcut.key);
  return parts.join('+');
}

/** Human spelling of a shortcut for a tooltip (`Ctrl+Shift+X`, `⌘⇧X`). */
export function ogeEditorShortcutLabel(
  shortcut: OgeEditorShortcut,
  mac: boolean,
  messages: OgeEditorMessages,
): string {
  const keys = messages.keys;
  const parts: string[] = [];
  if (shortcut.mod) parts.push(mac ? keys.modMac : keys.mod);
  if (shortcut.alt) parts.push(mac ? keys.altMac : keys.alt);
  if (shortcut.shift) parts.push(mac ? '⇧' : keys.shift);
  parts.push(shortcut.key);
  return mac ? parts.join('') : parts.join('+');
}

/** One toolbar entry, resolved for rendering. */
export interface OgeEditorToolView {
  /** Tool name, custom tool key, or `separator-<n>`. */
  readonly key: string;
  readonly kind: OgeEditorToolKind;
  /** Accessible name. */
  readonly text: string;
  /** Tooltip, including the shortcut. */
  readonly hint: string;
  readonly icon?: string;
  /** `aria-keyshortcuts`. */
  readonly shortcut?: string;
  /** Pressed state of a toggle; `undefined` for other kinds. */
  readonly active?: boolean;
  readonly disabled: boolean;
  /** `aria-haspopup` of popup openers. */
  readonly hasPopup?: 'menu' | 'dialog';
  /** The icon mirrors in RTL. */
  readonly mirror: boolean;
  /** Current value shown on the button (the block-format name). */
  readonly valueText?: string;
  /** Current colour of a colour tool. */
  readonly swatch?: string | null;
  /** The custom tool behind the entry. */
  readonly custom?: OgeEditorCustomTool;
}

/** Context the toolbar views are resolved against. */
export interface OgeEditorToolbarContext {
  readonly active: OgeEditorActiveState;
  readonly messages: OgeEditorMessages;
  readonly mac: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** Read-only or disabled editors disable every tool. */
  readonly inert: boolean;
}

/** The label of a block format value. */
export function ogeEditorBlockFormatLabel(
  value: OgeEditorBlockFormatValue,
  messages: OgeEditorMessages,
): string {
  const blocks = messages.blocks;
  if (value.startsWith('heading')) {
    return ogeFormatMessage(blocks.heading, { level: Number(value.slice(7)) });
  }
  switch (value) {
    case 'blockquote':
      return blocks.blockquote;
    case 'codeBlock':
      return blocks.codeBlock;
    case 'mixed':
      return blocks.mixed;
    case 'listItem':
    case 'paragraph':
    default:
      return blocks.paragraph;
  }
}

function toolActive(
  name: OgeEditorToolName,
  active: OgeEditorActiveState,
): boolean | undefined {
  switch (name) {
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strike':
    case 'code':
    case 'subscript':
    case 'superscript':
      return active.marks[name];
    case 'bulletList':
      return active.list === 'bullet';
    case 'orderedList':
      return active.list === 'ordered';
    case 'blockquote':
      return active.blockFormat === 'blockquote';
    case 'codeBlock':
      return active.blockFormat === 'codeBlock';
    case 'alignStart':
      return active.align === 'start';
    case 'alignCenter':
      return active.align === 'center';
    case 'alignEnd':
      return active.align === 'end';
    case 'alignJustify':
      return active.align === 'justify';
    case 'directionLtr':
      return active.dir === 'ltr';
    case 'directionRtl':
      return active.dir === 'rtl';
    default:
      return undefined;
  }
}

function toolDisabled(
  name: OgeEditorToolName,
  context: OgeEditorToolbarContext,
): boolean {
  const { active } = context;
  const inCode = active.blockFormat === 'codeBlock';
  switch (name) {
    case 'undo':
      return !context.canUndo;
    case 'redo':
      return !context.canRedo;
    case 'indent':
      return !active.canIndent;
    case 'outdent':
      return !active.canOutdent;
    case 'unlink':
      return active.link === null;
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strike':
    case 'code':
    case 'subscript':
    case 'superscript':
    case 'textColor':
    case 'backgroundColor':
    case 'link':
    case 'image':
      return inCode;
    default:
      return false;
  }
}

/** Resolves toolbar entries into views. */
export function buildOgeEditorToolbar(
  entries: readonly OgeEditorToolbarEntry[],
  context: OgeEditorToolbarContext,
): OgeEditorToolView[] {
  const { messages, mac, active, inert } = context;
  const views: OgeEditorToolView[] = [];
  let separators = 0;
  for (const entry of entries) {
    if (entry === 'separator') {
      // no leading, trailing or doubled separators
      if (views.length > 0 && views[views.length - 1].kind !== 'separator') {
        views.push({
          key: `separator-${separators++}`,
          kind: 'separator',
          text: '',
          hint: '',
          disabled: false,
          mirror: false,
        });
      }
      continue;
    }
    if (typeof entry !== 'string') {
      const pressed = entry.isActive?.(active);
      views.push({
        key: entry.key,
        kind: pressed === undefined ? 'button' : 'toggle',
        text: entry.text,
        hint: entry.hint ?? entry.text,
        ...(entry.icon ? { icon: entry.icon } : {}),
        ...(entry.shortcut ? { shortcut: entry.shortcut } : {}),
        ...(pressed === undefined ? {} : { active: pressed }),
        disabled: inert || (entry.isDisabled?.(active) ?? false),
        mirror: false,
        custom: entry,
      });
      continue;
    }
    const definition = OGE_EDITOR_TOOLS[entry];
    if (!definition) continue;
    const text = messages.tools[entry];
    const hint = definition.shortcut
      ? ogeFormatMessage(messages.shortcutHint, {
          label: text,
          shortcut: ogeEditorShortcutLabel(definition.shortcut, mac, messages),
        })
      : text;
    const pressed =
      definition.kind === 'toggle'
        ? (toolActive(entry, active) ?? false)
        : undefined;
    views.push({
      key: entry,
      kind: definition.kind,
      text,
      hint,
      icon: definition.icon,
      ...(definition.shortcut
        ? { shortcut: ogeEditorAriaShortcut(definition.shortcut, mac) }
        : {}),
      ...(pressed === undefined ? {} : { active: pressed }),
      disabled: inert || toolDisabled(entry, context),
      ...(definition.kind === 'menu'
        ? {
            hasPopup: 'menu' as const,
            valueText: ogeEditorBlockFormatLabel(active.blockFormat, messages),
          }
        : {}),
      ...(definition.kind === 'dialog' ? { hasPopup: 'dialog' as const } : {}),
      ...(definition.kind === 'color'
        ? {
            hasPopup: 'dialog' as const,
            swatch: entry === 'textColor' ? active.color : active.background,
          }
        : {}),
      mirror: definition.mirror ?? false,
    });
  }
  while (views.length > 0 && views[views.length - 1].kind === 'separator')
    views.pop();
  return views;
}

/**
 * The views as `@oge-ui/layout` toolbar items — what the toolbar measures
 * and what its overflow menu lists (a toggle keeps its check mark there).
 * The bar itself renders the views through an item template.
 */
export function ogeEditorToolbarItems(
  views: readonly OgeEditorToolView[],
): OgeToolbarItemData[] {
  return views.map((view) =>
    view.kind === 'separator'
      ? { key: view.key, type: 'separator' }
      : {
          key: view.key,
          text:
            view.kind === 'menu' && view.valueText
              ? `${view.text}: ${view.valueText}`
              : view.text,
          hint: view.hint,
          ...(view.icon ? { icon: view.icon } : {}),
          disabled: view.disabled,
          ...(view.active === undefined ? {} : { active: view.active }),
          data: view.key,
        },
  );
}

/** The block-format menu: paragraph, the configured headings, quote and code block. */
export function ogeEditorBlockFormatMenu(
  active: OgeEditorBlockFormatValue,
  headingLevels: readonly OgeEditorHeadingLevel[],
  messages: OgeEditorMessages,
): OgeMenuItem<OgeEditorBlockFormatValue>[] {
  const values: OgeEditorBlockFormatValue[] = [
    'paragraph',
    ...headingLevels.map(
      (level) => `heading${level}` as OgeEditorBlockFormatValue,
    ),
    'blockquote',
    'codeBlock',
  ];
  return values.map((value) => ({
    text: ogeEditorBlockFormatLabel(value, messages),
    value,
    type: 'radio',
    group: 'block-format',
    checked:
      active === value || (value === 'paragraph' && active === 'listItem'),
  }));
}

/** The command a block-format menu value stands for. */
export function ogeEditorBlockFormatCommand(
  value: OgeEditorBlockFormatValue,
): OgeEditorCommand | null {
  if (value.startsWith('heading')) {
    return {
      type: 'blockFormat',
      format: 'heading',
      level: Number(value.slice(7)) as OgeEditorHeadingLevel,
    };
  }
  if (
    value === 'paragraph' ||
    value === 'blockquote' ||
    value === 'codeBlock'
  ) {
    return { type: 'blockFormat', format: value };
  }
  return null;
}

/** The command a built-in toggle/button tool runs (popup openers return `null`). */
export function ogeEditorToolCommand(
  name: OgeEditorToolName,
): OgeEditorCommand | null {
  switch (name) {
    case 'undo':
    case 'redo':
    case 'indent':
    case 'outdent':
    case 'horizontalRule':
    case 'clearFormatting':
      return { type: name };
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strike':
    case 'code':
    case 'subscript':
    case 'superscript':
      return { type: 'toggleMark', mark: name };
    case 'unlink':
      return { type: 'link', href: null };
    case 'bulletList':
      return { type: 'list', list: 'bullet' };
    case 'orderedList':
      return { type: 'list', list: 'ordered' };
    case 'blockquote':
    case 'codeBlock':
      return { type: 'blockFormat', format: name, toggle: true };
    case 'alignStart':
      return { type: 'align', align: 'start' };
    case 'alignCenter':
      return { type: 'align', align: 'center' };
    case 'alignEnd':
      return { type: 'align', align: 'end' };
    case 'alignJustify':
      return { type: 'align', align: 'justify' };
    case 'directionLtr':
      return { type: 'direction', dir: 'ltr' };
    case 'directionRtl':
      return { type: 'direction', dir: 'rtl' };
    default:
      return null;
  }
}

/** `true` on Apple platforms (⌘ is the shortcut modifier). SSR-safe. */
export function ogeEditorIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ??
    navigator.platform ??
    '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}
