import type { TemplateRef } from '@angular/core';
import type { OgeToolbarItem } from './toolbar-item';
import type {
  OgeToolbarDisplayMode,
  OgeToolbarItemData,
  OgeToolbarItemLocation,
  OgeToolbarItemSeverity,
  OgeToolbarItemTemplateContext,
  OgeToolbarItemType,
  OgeToolbarLocateInMenu,
} from './toolbar-types';

/**
 * Normalized view of one toolbar entry — declarative children and `items`
 * entries are merged into this shape before rendering. Module-internal (not
 * exported from the package barrel).
 */
export interface OgeToolbarDescriptor {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly type: OgeToolbarItemType;
  readonly text?: string;
  readonly icon?: string;
  readonly suffixIcon?: string;
  readonly iconClass?: string;
  readonly suffixIconClass?: string;
  readonly hint?: string;
  readonly width?: number | string;
  readonly htmlAttributes?: Readonly<Record<string, string>>;
  readonly location: OgeToolbarItemLocation;
  readonly locateInMenu: OgeToolbarLocateInMenu;
  readonly overflowPriority?: number;
  readonly showText?: OgeToolbarDisplayMode;
  readonly showIcon?: OgeToolbarDisplayMode;
  readonly disabled: boolean;
  readonly cssClass?: string;
  readonly severity: OgeToolbarItemSeverity;
  readonly active?: boolean;
  /** Index in the merged, visible list — the value reported by `itemClick`. */
  readonly index: number;
  /** The source `items` entry — `undefined` for declarative children. */
  readonly item?: OgeToolbarItemData;
  /** The declarative child — `undefined` for `items` entries. */
  readonly source?: OgeToolbarItem;
  /** Inline template of a declarative child, stamped by the toolbar. */
  readonly contentTemplate?: TemplateRef<OgeToolbarItemTemplateContext>;
}
