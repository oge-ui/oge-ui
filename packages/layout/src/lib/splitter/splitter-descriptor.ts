import type { TemplateRef } from '@angular/core';
import type { OgeSplitterPane } from './splitter-pane';
import type {
  OgeSplitterOrientation,
  OgeSplitterPaneData,
  OgeSplitterSize,
} from './splitter-types';

/**
 * Normalized view of one pane — declarative children and `panes` entries are
 * merged into this shape before rendering. Module-internal (not exported from
 * the package barrel).
 */
export interface OgeSplitterDescriptor {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly size?: OgeSplitterSize;
  readonly minSize?: OgeSplitterSize;
  readonly maxSize?: OgeSplitterSize;
  readonly collapsible: boolean;
  readonly collapsedSize?: OgeSplitterSize;
  readonly resizable: boolean;
  readonly scrollable: boolean;
  readonly disabled: boolean;
  readonly text?: string;
  readonly cssClass?: string;
  readonly htmlAttributes?: Readonly<Record<string, string>>;
  /** Nested splitter panes, rendered by a nested `oge-splitter`. */
  readonly panes?: readonly OgeSplitterPaneData[];
  readonly orientation?: OgeSplitterOrientation;
  /** Initial collapsed state of an `items`-mode pane. */
  readonly initiallyCollapsed: boolean;
  /** The source `panes` entry — `undefined` for declarative panes. */
  readonly item?: OgeSplitterPaneData;
  /** The declarative child — `undefined` for `panes` entries. Two-way target. */
  readonly source?: OgeSplitterPane;
  readonly contentTemplate?: TemplateRef<unknown>;
}
