/**
 * The editor's extension points beyond the properties panel (G5b): custom
 * palette entries, custom context-pad actions and per-type renderer
 * overrides. Everything is data plus callbacks; icons and shapes are
 * {@link OgeBpmnSvgNode} trees built with `bpmnSvg` and sanitized before
 * they render — there is no raw-markup path.
 */
import type { BpmnDiagram, BpmnNode, BpmnNodeType } from './bpmn-model';
import type { BpmnCommand } from './command-stack';
import type { BpmnPaletteItemType } from './config';
import type { OgeBpmnElementTemplate } from './element-templates';
import type { OgeBpmnSvgNode } from './svg-node';
import { sanitizeBpmnSvg } from './svg-node';

/** What a palette or context-pad action may do with the editor. */
export interface OgeBpmnEditorApi {
  /** The current diagram model. */
  getDiagram(): BpmnDiagram;
  /** The selected element ids. */
  getSelection(): readonly string[];
  /** Selects elements (unknown ids are ignored). */
  select(ids: readonly string[]): void;
  /** Executes an engine command as one undoable step (ignored while locked). */
  execute(command: BpmnCommand): void;
  /**
   * Arms the click-then-place tool for a type, exactly like a built-in
   * palette entry; with `template` the placed element gets it applied.
   */
  armPlace(
    type: BpmnPaletteItemType,
    options?: { readonly template?: OgeBpmnElementTemplate },
  ): void;
  /**
   * Appends a connected element after `sourceId` (the built-in context-pad
   * append), optionally applying a template. Returns the new id, or null.
   */
  appendElement(
    sourceId: string,
    type: BpmnNodeType,
    options?: { readonly template?: OgeBpmnElementTemplate },
  ): string | null;
  /** Writes a message to the editor's polite live region. */
  announce(text: string): void;
  /** Moves focus back to the canvas. */
  focus(): void;
}

/** A custom palette entry, rendered after the built-in items. */
export interface OgeBpmnPaletteEntry {
  /** Stable id (DOM id suffix, React key). */
  readonly id: string;
  /** Tooltip and accessible name. */
  readonly label: string;
  /** 24×24 icon (`viewBox="0 0 24 24"`). */
  readonly icon: readonly OgeBpmnSvgNode[];
  /**
   * Single-character canvas shortcut (case-insensitive, no modifiers). Keys
   * the canvas already uses (H L S C A F + -) are ignored.
   */
  readonly hotkey?: string;
  /** What picking the entry does — typically `api.armPlace(type, { template })`. */
  action(api: OgeBpmnEditorApi): void;
}

/** Supplies the custom palette entries for the current diagram. */
export type OgeBpmnPaletteProvider = (context: {
  readonly diagram: BpmnDiagram;
}) => readonly OgeBpmnPaletteEntry[];

/** A custom context-pad action of the single selected element. */
export interface OgeBpmnContextPadEntry {
  readonly id: string;
  /** Tooltip and accessible name. */
  readonly label: string;
  /** 16×16 icon (`viewBox="0 0 16 16"`). */
  readonly icon: readonly OgeBpmnSvgNode[];
  /** Single-character shortcut while the element is selected (built-in keys ignored). */
  readonly hotkey?: string;
  action(api: OgeBpmnEditorApi, elementId: string): void;
}

/** Supplies the custom context-pad actions of one selected element. */
export type OgeBpmnContextPadProvider = (context: {
  readonly diagram: BpmnDiagram;
  readonly elementId: string;
}) => readonly OgeBpmnContextPadEntry[];

/** What a renderer override receives for one shape. */
export interface OgeBpmnRenderContext {
  readonly node: BpmnNode;
  readonly width: number;
  readonly height: number;
  /** The DI fill / stroke colors, or null for the theme defaults. */
  readonly fill: string | null;
  readonly stroke: string | null;
}

/**
 * Draws one shape in local coordinates (0,0 = top-left of its bounds).
 * Return null to fall back to the built-in glyph for this element. Labels,
 * markers, selection and badges are still drawn by the editor.
 */
export type OgeBpmnElementRenderer = (
  context: OgeBpmnRenderContext,
) => readonly OgeBpmnSvgNode[] | null;

/** Renderer overrides by node type (`renderers` input / prop). */
export type OgeBpmnRenderers = Partial<
  Record<BpmnNodeType, OgeBpmnElementRenderer>
>;

/** Canvas keys with a built-in meaning — custom hotkeys never shadow them. */
export const BPMN_RESERVED_HOTKEYS: ReadonlySet<string> = new Set([
  'h',
  'l',
  's',
  'c',
  'a',
  'f',
  '+',
  '=',
  '-',
  '_',
  ' ',
]);

/** Normalizes a hotkey for matching (`'T'` → `'t'`), or null when unusable. */
export function bpmnHotkey(hotkey: string | undefined): string | null {
  if (hotkey === undefined || hotkey.length !== 1) return null;
  const key = hotkey.toLowerCase();
  return BPMN_RESERVED_HOTKEYS.has(key) ? null : key;
}

/**
 * Runs the renderer override for a shape, sanitized; null when there is no
 * override, it returns null, or it throws (a broken renderer falls back to
 * the built-in glyph instead of breaking the canvas).
 */
export function bpmnCustomGlyph(
  renderers: OgeBpmnRenderers | undefined,
  context: OgeBpmnRenderContext,
): readonly OgeBpmnSvgNode[] | null {
  const renderer = renderers?.[context.node.type];
  if (renderer === undefined) return null;
  try {
    const nodes = renderer(context);
    return nodes === null ? null : sanitizeBpmnSvg(nodes);
  } catch {
    return null;
  }
}
