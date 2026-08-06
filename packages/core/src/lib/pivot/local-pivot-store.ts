import type { CustomSummaryMap } from '../grouping/summaries';
import { PivotEngine, pathKey } from './compute-pivot';
import { createFilterPredicate } from '../filtering/filter-evaluator';
import type {
  OgePivotStore,
  PivotAxisNode,
  PivotAxisPayloadNode,
  PivotDrillDownArgs,
  PivotFieldConfig,
  PivotFieldFns,
  PivotLoadOptions,
  PivotLoadResult,
} from './pivot-types';

export interface LocalPivotStoreOptions<T> {
  readonly fns?: Readonly<Record<string, PivotFieldFns<T>>>;
  readonly customSummaries?: CustomSummaryMap<T>;
}

/**
 * In-memory implementation of the serializable pivot contract, built on
 * {@link PivotEngine}. Answers exactly like a pre-aggregating server would,
 * so the component cannot tell local and remote pivoting apart.
 */
export class LocalPivotStore<T = unknown> implements OgePivotStore<T> {
  /** Field layout + filtered rows of the last `load`, for drill-down. */
  private lastFields: readonly PivotFieldConfig[] = [];
  private lastRows: readonly T[] = [];

  constructor(
    private readonly rows: readonly T[] | (() => readonly T[]),
    private readonly options: LocalPivotStoreOptions<T> = {}
  ) {}

  private getRows(): readonly T[] {
    return typeof this.rows === 'function' ? this.rows() : this.rows;
  }

  load(options: PivotLoadOptions): Promise<PivotLoadResult> {
    const fields: PivotFieldConfig[] = [
      ...options.rowFields.map((field, index) => ({
        id: field.dataField,
        dataField: field.dataField,
        area: 'row' as const,
        areaIndex: index,
        groupInterval: field.groupInterval,
        sortOrder: field.dir,
      })),
      ...options.columnFields.map((field, index) => ({
        id: field.dataField,
        dataField: field.dataField,
        area: 'column' as const,
        areaIndex: index,
        groupInterval: field.groupInterval,
        sortOrder: field.dir,
      })),
      ...options.measures.map((measure, index) => ({
        id: `${measure.field}:${measure.type}`,
        dataField: measure.field,
        area: 'data' as const,
        areaIndex: index,
        summaryType: measure.type,
        summaryName: measure.name,
      })),
    ];
    let rows = this.getRows();
    if (options.filter) {
      const predicate = createFilterPredicate<T>(options.filter);
      rows = rows.filter(predicate);
    }
    this.lastFields = fields;
    this.lastRows = rows;
    const engine = new PivotEngine<T>({
      rows,
      fields,
      fns: this.options.fns,
      customSummaries: this.options.customSummaries,
    });
    const toKeySet = (paths: readonly (readonly unknown[])[] | undefined) =>
      new Set((paths ?? []).map((path) => pathKey(path)));
    const result = engine.materialize({
      rowExpandedPaths: toKeySet(options.rowExpandedPaths),
      columnExpandedPaths: toKeySet(options.columnExpandedPaths),
      // the payload separates totals, so materialize plain slots only
      settings: {
        showRowTotals: false,
        showColumnTotals: false,
        showRowGrandTotals: false,
        showColumnGrandTotals: false,
      },
    });

    const grand = engine.materialize({
      rowExpandedPaths: new Set(),
      columnExpandedPaths: new Set(),
      settings: {
        showRowTotals: false,
        showColumnTotals: false,
        showRowGrandTotals: true,
        showColumnGrandTotals: true,
      },
    });
    const grandTotal = grand.values.at(-1)?.at(-1) ?? undefined;

    return Promise.resolve({
      rows: toPayload(result.rowRoot),
      columns: toPayload(result.columnRoot),
      values: result.values,
      grandTotal,
    });
  }

  drillDown(
    args: PivotDrillDownArgs & { skip?: number; take?: number }
  ): Promise<T[]> {
    // Answers from the last load's layout and filtered rows.
    const engine = new PivotEngine<T>({
      rows: this.lastRows,
      fields: this.lastFields,
      fns: this.options.fns,
    });
    const rows = engine.drillDownRows(args.rowPath, args.columnPath);
    const start = args.skip ?? 0;
    const end = args.take != null ? start + args.take : undefined;
    return Promise.resolve(rows.slice(start, end));
  }
}

function toPayload(nodes: readonly PivotAxisNode[]): PivotAxisPayloadNode[] {
  return nodes
    // expanded parents carry isTotal (their line holds the subtotals) but must
    // stay in the payload; only grand totals and childless total lines drop out
    .filter((node) => !node.isGrandTotal && !(node.isTotal && node.children.length === 0))
    .map((node) => ({
      value: node.value,
      text: node.text,
      hasChildren: node.hasChildren,
      children: node.children.length ? toPayload(node.children) : undefined,
    }));
}
