/**
 * The hierarchy behind the treemap and the sunburst: nested items
 * (`childrenField`) or a flat list (`idField` + `parentField`) normalized
 * into one tree with summed group values, plus the drill-down breadcrumb
 * and the keyboard map both charts share. Pure.
 */
import { createFieldAccessor } from '@oge-ui/core';

type FieldExpr<T> = string | ((item: T) => unknown);

const accessorOf = <T>(expr: FieldExpr<T>): ((item: T) => unknown) =>
  typeof expr === 'string' ? createFieldAccessor<T>(expr) : expr;

export interface OgeChartHierarchyInput<T> {
  readonly dataSource: readonly T[];
  /** Nested data: the field holding an item's children. Default `'items'`. */
  readonly childrenField?: FieldExpr<T>;
  /** Flat data: an item's id. Setting `parentField` switches to flat mode. */
  readonly idField?: FieldExpr<T>;
  /** Flat data: the parent's id (`null` / missing = top level). */
  readonly parentField?: FieldExpr<T>;
  /** Default `'name'`. */
  readonly labelField?: FieldExpr<T>;
  /** Leaf value; groups sum their children. Default `'value'`. */
  readonly valueField?: FieldExpr<T>;
  readonly colorField?: FieldExpr<T>;
  /** The root's name (the first breadcrumb). */
  readonly rootLabel: string;
}

/** One node; the synthetic root has `depth` 0 and `source` `null`. */
export interface OgeChartHierarchyNode<T = unknown> {
  /** Stable path key (`'0/2/1'`; the root is `''`). */
  readonly key: string;
  readonly name: string;
  readonly value: number;
  readonly depth: number;
  /** Position among its siblings. */
  readonly index: number;
  readonly parent: OgeChartHierarchyNode<T> | null;
  readonly children: readonly OgeChartHierarchyNode<T>[];
  readonly source: T | null;
  /** From `colorField`; `undefined` = derive from the palette. */
  readonly color?: string;
}

interface MutableNode<T> {
  key: string;
  name: string;
  value: number;
  depth: number;
  index: number;
  parent: MutableNode<T> | null;
  children: MutableNode<T>[];
  source: T | null;
  color?: string;
}

/** The normalized tree plus a key → node index. */
export interface OgeChartHierarchy<T = unknown> {
  readonly root: OgeChartHierarchyNode<T>;
  readonly byKey: ReadonlyMap<string, OgeChartHierarchyNode<T>>;
}

const finiteValue = (raw: unknown): number =>
  typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0;

export function buildChartHierarchy<T>(
  input: OgeChartHierarchyInput<T>,
): OgeChartHierarchy<T> {
  const labelOf = accessorOf(input.labelField ?? 'name');
  const valueOf = accessorOf(input.valueField ?? 'value');
  const colorOf =
    input.colorField === undefined ? null : accessorOf(input.colorField);
  const root: MutableNode<T> = {
    key: '',
    name: input.rootLabel,
    value: 0,
    depth: 0,
    index: 0,
    parent: null,
    children: [],
    source: null,
  };
  const make = (item: T, parent: MutableNode<T>): MutableNode<T> => {
    const color = colorOf?.(item);
    const node: MutableNode<T> = {
      key: '',
      name: String(labelOf(item) ?? ''),
      value: finiteValue(valueOf(item)),
      depth: parent.depth + 1,
      index: parent.children.length,
      parent,
      children: [],
      source: item,
      ...(typeof color === 'string' && color !== '' ? { color } : {}),
    };
    node.key =
      parent.key === '' ? String(node.index) : `${parent.key}/${node.index}`;
    parent.children.push(node);
    return node;
  };

  if (input.parentField !== undefined) {
    const idOf = accessorOf(input.idField ?? 'id');
    const parentOf = accessorOf(input.parentField);
    const childrenOf = new Map<unknown, T[]>();
    const ids = new Set(input.dataSource.map((item) => idOf(item)));
    for (const item of input.dataSource) {
      const parentId = parentOf(item);
      // unknown parents and self-references become top-level items
      const key =
        parentId === null ||
        parentId === undefined ||
        !ids.has(parentId) ||
        parentId === idOf(item)
          ? null
          : parentId;
      const list = childrenOf.get(key) ?? [];
      list.push(item);
      childrenOf.set(key, list);
    }
    const visited = new Set<unknown>();
    const attach = (parentId: unknown, parent: MutableNode<T>): void => {
      for (const item of childrenOf.get(parentId) ?? []) {
        const id = idOf(item);
        if (visited.has(id)) continue; // cycles
        visited.add(id);
        attach(id, make(item, parent));
      }
    };
    attach(null, root);
  } else {
    const childrenOf = accessorOf(input.childrenField ?? 'items');
    const walk = (
      items: readonly T[],
      parent: MutableNode<T>,
      depth: number,
    ): void => {
      if (depth > 64) return;
      for (const item of items) {
        const node = make(item, parent);
        const children = childrenOf(item);
        if (Array.isArray(children) && children.length > 0) {
          walk(children as T[], node, depth + 1);
        }
      }
    };
    walk(input.dataSource, root, 0);
  }

  const sum = (node: MutableNode<T>): number => {
    if (node.children.length > 0) {
      node.value = node.children.reduce(
        (total, child) => total + sum(child),
        0,
      );
    }
    return node.value;
  };
  sum(root);
  const byKey = new Map<string, OgeChartHierarchyNode<T>>();
  const index = (node: MutableNode<T>): void => {
    byKey.set(node.key, node);
    node.children.forEach(index);
  };
  index(root);
  return { root, byKey };
}

/** Root → node, inclusive: the breadcrumb of a drill-down. */
export function chartHierarchyPath<T>(
  node: OgeChartHierarchyNode<T>,
): OgeChartHierarchyNode<T>[] {
  const path: OgeChartHierarchyNode<T>[] = [];
  for (
    let at: OgeChartHierarchyNode<T> | null = node;
    at !== null;
    at = at.parent
  ) {
    path.unshift(at);
  }
  return path;
}

/** Every node below `node` (excluding it), depth-first, up to `maxDepth` levels. */
export function chartHierarchyDescendants<T>(
  node: OgeChartHierarchyNode<T>,
  maxDepth = Infinity,
): OgeChartHierarchyNode<T>[] {
  const result: OgeChartHierarchyNode<T>[] = [];
  const walk = (at: OgeChartHierarchyNode<T>, level: number): void => {
    if (level > maxDepth) return;
    for (const child of at.children) {
      result.push(child);
      walk(child, level + 1);
    }
  };
  walk(node, 1);
  return result;
}

export type OgeChartHierarchyCommand =
  /** Make another node the active one. */
  | { readonly type: 'focus'; readonly key: string }
  /** Drill into the active group (it becomes the root). */
  | { readonly type: 'drill'; readonly key: string }
  /** Drill one level up. */
  | { readonly type: 'up' }
  /** Enter / Space on a leaf (or a group when drilling is off). */
  | { readonly type: 'activate'; readonly key: string };

/**
 * Keyboard of the drill-down charts (no APG chart pattern; the tree-like
 * keys of the APG treeview): Left/Right (mirrored in RTL) walk the
 * siblings, Down goes to the first child, Up to the parent (never above
 * the drawn root), Home/End to the first/last sibling, Enter/Space drills
 * into a group (or activates a leaf), Escape/Backspace drills up.
 * `maxDepth` limits Down to the levels actually drawn.
 */
export function chartHierarchyKeyCommand<T>(
  key: string,
  ctx: {
    readonly root: OgeChartHierarchyNode<T>;
    readonly active: OgeChartHierarchyNode<T> | null;
    readonly drillDown: boolean;
    /** Levels drawn below the root. */
    readonly maxDepth: number;
    readonly rtl?: boolean;
  },
): OgeChartHierarchyCommand | null {
  const { root } = ctx;
  if (key === 'Escape' || key === 'Backspace') {
    return root.parent !== null ? { type: 'up' } : null;
  }
  const first = root.children[0];
  if (first === undefined) return null;
  const active =
    ctx.active !== null && ctx.active.depth > root.depth ? ctx.active : null;
  if (active === null) {
    return key.startsWith('Arrow') || key === 'Home' || key === 'End'
      ? { type: 'focus', key: first.key }
      : null;
  }
  const siblings = active.parent?.children ?? [active];
  const position = siblings.indexOf(active);
  const next = ctx.rtl === true ? 'ArrowLeft' : 'ArrowRight';
  const prev = ctx.rtl === true ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case next:
      return {
        type: 'focus',
        key: siblings[Math.min(siblings.length - 1, position + 1)].key,
      };
    case prev:
      return { type: 'focus', key: siblings[Math.max(0, position - 1)].key };
    case 'ArrowDown': {
      const child = active.children[0];
      return child !== undefined && child.depth - root.depth <= ctx.maxDepth
        ? { type: 'focus', key: child.key }
        : { type: 'focus', key: active.key };
    }
    case 'ArrowUp':
      return active.parent !== null && active.parent.depth > root.depth
        ? { type: 'focus', key: active.parent.key }
        : { type: 'focus', key: active.key };
    case 'Home':
      return { type: 'focus', key: siblings[0].key };
    case 'End':
      return { type: 'focus', key: siblings[siblings.length - 1].key };
    case 'Enter':
    case ' ':
      return ctx.drillDown && active.children.length > 0
        ? { type: 'drill', key: active.key }
        : { type: 'activate', key: active.key };
    default:
      return null;
  }
}

/**
 * After a drill from `previousRootKey` to `next`: whether it went up, and
 * which node takes the keyboard focus — the child that leads back to where
 * the user came from when going up, the first child when going down.
 */
export function chartHierarchyDrillFocus<T>(
  previousRootKey: string,
  next: OgeChartHierarchyNode<T>,
): { readonly up: boolean; readonly activeKey: string | null } {
  const up =
    previousRootKey !== next.key &&
    (next.key === '' || previousRootKey.startsWith(`${next.key}/`));
  if (up) {
    return {
      up,
      activeKey: previousRootKey
        .split('/')
        .slice(0, next.depth + 1)
        .join('/'),
    };
  }
  return { up, activeKey: next.children[0]?.key ?? null };
}

/** The payload of a tile / segment click. */
export interface OgeChartHierarchyNodeEvent<T = unknown> {
  readonly key: string;
  readonly name: string;
  readonly value: number;
  /** 1 = top level. */
  readonly depth: number;
  /** Share of the parent, 0–1. */
  readonly percentOfParent: number;
  readonly isGroup: boolean;
  readonly source: T | null;
}

export function chartHierarchyEvent<T>(
  node: OgeChartHierarchyNode<T>,
): OgeChartHierarchyNodeEvent<T> {
  const parentValue = node.parent?.value ?? node.value;
  return {
    key: node.key,
    name: node.name,
    value: node.value,
    depth: node.depth,
    percentOfParent: parentValue > 0 ? node.value / parentValue : 0,
    isGroup: node.children.length > 0,
    source: node.source,
  };
}

/** The palette colour of a node: its top-level ancestor's, lightened by depth. */
export function chartHierarchyColor<T>(
  node: OgeChartHierarchyNode<T>,
  palette: readonly string[],
): string {
  let top = node;
  while (top.parent !== null && top.parent.depth > 0) top = top.parent;
  if (node.color !== undefined) return node.color;
  const base = top.color ?? palette[top.index % palette.length];
  const shade = Math.min(60, (node.depth - top.depth) * 18);
  return shade === 0
    ? base
    : `color-mix(in srgb, ${base} ${100 - shade}%, var(--oge-bg))`;
}
