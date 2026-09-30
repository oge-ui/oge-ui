import { signal, type TemplateRef } from '@angular/core';
import type { ValidatorFn } from '@angular/forms';
import type {
  FilterExpr,
  FilterOperator,
  GroupInterval,
  SummaryType,
} from '@oge-ui/core';
import type {
  OgeColumnAlignment,
  OgeColumnLookup,
  OgeDataType,
} from '@oge-ui/grid/foundation';
import type { OgeColumn } from './column';

/**
 * Programmatic column definition — the plain-object twin of `<oge-column>`,
 * accepting the same options. It exists for what content projection cannot
 * do: a wrapper component that owns the grid can pass shared columns
 * (`[columns]="[...commonColumns, ...pageColumns]"`), because Angular's
 * content queries never see `<oge-column>` elements projected into the grid
 * through another component's `<ng-content>`.
 *
 * Used only when the grid has no declarative `<oge-column>` children.
 * Templates are `TemplateRef`s (take them with `viewChild` or `#ref`).
 */
export interface OgeColumnDef<T = unknown> {
  /** Dotted paths are supported. Omit for display-only `calculateCellValue` columns. */
  field?: string;
  caption?: string;
  width?: number | string;
  minWidth?: number;
  dataType?: OgeDataType;
  alignment?: OgeColumnAlignment;
  format?: (value: unknown) => string;
  /** Initial visibility; the column chooser and state restore change it later. */
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  filterOperator?: FilterOperator;
  lookup?: OgeColumnLookup;
  calculateCellValue?: (row: T) => unknown;
  calculateSortValue?: (row: T) => unknown;
  calculateFilterExpression?: (
    value: unknown,
    operator: FilterOperator,
  ) => FilterExpr | null;
  sortOrder?: 'asc' | 'desc';
  sortIndex?: number;
  groupIndex?: number;
  groupInterval?: GroupInterval;
  hidingPriority?: number;
  pinned?: false | 'left' | 'right';
  groupSummary?: SummaryType | readonly SummaryType[];
  groupSummaryPosition?: 'row' | 'footer';
  totalSummary?: SummaryType | readonly SummaryType[];
  calculateCustomSummary?: (rows: readonly T[]) => unknown;
  editable?: boolean;
  required?: boolean;
  validators?: readonly ValidatorFn[];
  cellTemplate?: TemplateRef<unknown>;
  headerTemplate?: TemplateRef<unknown>;
  editTemplate?: TemplateRef<unknown>;
}

/**
 * Builds the signal surface of an `OgeColumn` from a definition, so every part
 * of the grid reads programmatic and declarative columns through one path.
 * `visible` is a writable signal (the chooser toggles it), like the directive's model.
 */
export function ogeColumnFromDef<T>(def: OgeColumnDef<T>): OgeColumn<T> {
  const value =
    <K extends keyof OgeColumnDef<T>>(key: K) =>
    () =>
      def[key];
  const withDefault =
    <K extends keyof OgeColumnDef<T>>(
      key: K,
      fallback: NonNullable<OgeColumnDef<T>[K]>,
    ) =>
    () =>
      def[key] ?? fallback;
  const slot = (ref: TemplateRef<unknown> | undefined) => () =>
    ref ? { templateRef: ref } : undefined;
  const column = {
    field: value('field'),
    caption: value('caption'),
    width: value('width'),
    minWidth: value('minWidth'),
    dataType: withDefault('dataType', 'string'),
    alignment: value('alignment'),
    format: value('format'),
    visible: signal(def.visible ?? true),
    sortable: withDefault('sortable', true),
    filterable: withDefault('filterable', true),
    filterOperator: value('filterOperator'),
    lookup: value('lookup'),
    calculateCellValue: value('calculateCellValue'),
    calculateSortValue: value('calculateSortValue'),
    calculateFilterExpression: value('calculateFilterExpression'),
    sortOrder: value('sortOrder'),
    sortIndex: value('sortIndex'),
    groupIndex: value('groupIndex'),
    groupInterval: value('groupInterval'),
    hidingPriority: value('hidingPriority'),
    pinned: withDefault('pinned', false),
    groupSummary: value('groupSummary'),
    groupSummaryPosition: withDefault('groupSummaryPosition', 'row'),
    totalSummary: value('totalSummary'),
    calculateCustomSummary: value('calculateCustomSummary'),
    editable: withDefault('editable', true),
    required: withDefault('required', false),
    validators: value('validators'),
    cellTemplate: slot(def.cellTemplate),
    headerTemplate: slot(def.headerTemplate),
    editTemplate: slot(def.editTemplate),
  };
  // structurally the directive's public surface; the directive itself cannot
  // be instantiated outside a template
  return column as unknown as OgeColumn<T>;
}

/**
 * Per-component cache so a definition keeps its column (and its `visible`
 * state) across change detection, while a new definition object gets a fresh one.
 */
export class OgeColumnDefCache<T> {
  private readonly byDef = new WeakMap<object, OgeColumn<T>>();
  private readonly byField = new Map<string, OgeColumn<T>>();

  resolve(
    defs: readonly (string | OgeColumnDef<T>)[] | undefined,
  ): OgeColumn<T>[] {
    if (!defs?.length) return [];
    return defs.map((def) => {
      if (typeof def === 'string') {
        let column = this.byField.get(def);
        if (!column) {
          column = ogeColumnFromDef<T>({ field: def });
          this.byField.set(def, column);
        }
        return column;
      }
      let column = this.byDef.get(def);
      if (!column) {
        column = ogeColumnFromDef(def);
        this.byDef.set(def, column);
      }
      return column;
    });
  }
}
