/**
 * The framework-free half of the panel bar (ADR 0001) — Kendo's PanelBar: a
 * vertical stack of headers whose groups nest. This module owns the item
 * vocabulary, the flattening into addressable nodes, the `expandMode` rules
 * and the keyboard map; each render layer renders the nested markup and
 * routes every expand / collapse through `runOgeExpansionToggle`.
 *
 * **Pattern: APG disclosure (navigation), not treeview.** Kendo renders its
 * PanelBar as `role="tree"`, but a tree may own nothing but `treeitem`s —
 * and a panel bar's groups also hold free content (forms, text, templates),
 * which inside a `treeitem` is `nested-interactive`. So every header is a
 * `<button aria-expanded aria-controls>` (a group) or a plain `<button>` (a
 * selectable leaf, `aria-current` when selected), all in the Tab sequence;
 * collapsed groups are `inert`. Up / Down / Home / End and Right / Left
 * (expand-or-enter / collapse-or-parent, mirrored in RTL) are layered on top
 * as the accordion's opt-in enhancement.
 */

/**
 * How groups expand. `multiple` (default) lets any number stay open;
 * `single` collapses a group's open siblings when it expands; `full` is
 * `single` plus a layout rule — the open root group fills the panel bar's
 * height, so give the host one.
 */
export type OgePanelBarExpandMode = 'single' | 'multiple' | 'full';

/** One entry of the panel bar's `items` tree. */
export interface OgePanelBarItem {
  /**
   * Stable identity — required for `selectedKey` / `expandedKeys` and for
   * state to survive reordering. Without it the item is addressed by its
   * position path.
   */
  readonly key?: string;
  /** Header text. */
  readonly title?: string;
  /** Secondary line under the title. */
  readonly description?: string;
  /** SVG path data (`d`) rendered as a 24×24 aria-hidden icon before the title. */
  readonly icon?: string;
  /** Pill rendered after the title. */
  readonly badge?: string | number;
  /** Native `title` tooltip of the header. */
  readonly hint?: string;
  /** Blocks expanding / selecting; a disabled group disables its subtree. */
  readonly disabled?: boolean;
  /** `false` removes the item (and its subtree) entirely. */
  readonly visible?: boolean;
  /** Expands the group on first render. */
  readonly expanded?: boolean;
  /**
   * Whether activating the header selects the item. Defaults to `true` for
   * leaves and `false` for groups (activating a group toggles it).
   */
  readonly selectable?: boolean;
  /**
   * Plain-text body of a content item — a group that expands into free
   * content instead of child items. Rendered lazily on first expand; the
   * content template / `renderContent` replaces the text. Ignored when the
   * item has `children`.
   */
  readonly content?: string;
  /** Child items — makes this entry an expandable group. */
  readonly children?: readonly OgePanelBarItem[];
}

/** The structural contract the node helpers read — both layers' item types fit. */
export interface OgePanelBarItemLike {
  readonly key?: string;
  readonly title?: string;
  readonly disabled?: boolean;
  readonly visible?: boolean;
  readonly expanded?: boolean;
  readonly selectable?: boolean;
  readonly content?: unknown;
  readonly children?: readonly OgePanelBarItemLike[];
}

/** One flattened, addressable panel-bar entry. */
export interface OgePanelBarNode<T extends OgePanelBarItemLike> {
  /** `key` when present, else the position path (`p0-2-1`). */
  readonly id: string;
  readonly key?: string;
  readonly item: T;
  /** 1-based nesting depth. */
  readonly level: number;
  readonly parentId: string | null;
  /** Ids of the visible children, in order. */
  readonly childIds: readonly string[];
  readonly hasChildren: boolean;
  /** A content item: it expands into free content, not child items. */
  readonly hasContent: boolean;
  /** `hasChildren || hasContent` — the header is a disclosure button. */
  readonly expandable: boolean;
  /** Own `disabled` or a disabled ancestor. */
  readonly disabled: boolean;
  /** Whether activating the header selects the item. */
  readonly selectable: boolean;
}

/**
 * Flattens the visible `items` tree into nodes in document (pre-)order.
 * Hidden items drop with their subtree; children win over `content`.
 */
export function flattenOgePanelBarItems<T extends OgePanelBarItemLike>(
  items: readonly T[] | undefined,
): OgePanelBarNode<T>[] {
  const out: OgePanelBarNode<T>[] = [];
  const walk = (
    list: readonly T[],
    level: number,
    parentId: string | null,
    path: string,
    parentDisabled: boolean,
  ): string[] => {
    const ids: string[] = [];
    list.forEach((item, index) => {
      if (item.visible === false) return;
      const id = item.key ?? `p${path}${path ? '-' : ''}${index}`;
      const children = (item.children ?? []) as readonly T[];
      const hasChildren = children.some((child) => child.visible !== false);
      const hasContent = !hasChildren && item.content !== undefined;
      const disabled = parentDisabled || item.disabled === true;
      const slot = out.length;
      // placeholder keeps pre-order; the children fill in after it
      out.push(undefined as unknown as OgePanelBarNode<T>);
      const childIds = hasChildren
        ? walk(
            children,
            level + 1,
            id,
            `${path}${path ? '-' : ''}${index}`,
            disabled,
          )
        : [];
      const expandable = hasChildren || hasContent;
      out[slot] = {
        id,
        key: item.key,
        item,
        level,
        parentId,
        childIds,
        hasChildren,
        hasContent,
        expandable,
        disabled,
        selectable: item.selectable ?? !expandable,
      };
      ids.push(id);
    });
    return ids;
  };
  walk(items ?? [], 1, null, '', false);
  return out;
}

/** Id → node lookup over {@link flattenOgePanelBarItems}' output. */
export function ogePanelBarIndex<T extends OgePanelBarItemLike>(
  nodes: readonly OgePanelBarNode<T>[],
): ReadonlyMap<string, OgePanelBarNode<T>> {
  return new Map(nodes.map((node) => [node.id, node]));
}

/** Whether a mode lets only one sibling group stay open. */
export function isOgePanelBarSingle(mode: OgePanelBarExpandMode): boolean {
  return mode !== 'multiple';
}

/**
 * The initially expanded ids: every expandable item flagged `expanded`, and
 * in `single` / `full` only the first of each sibling set.
 */
export function ogePanelBarInitialExpanded<T extends OgePanelBarItemLike>(
  nodes: readonly OgePanelBarNode<T>[],
  mode: OgePanelBarExpandMode,
): ReadonlySet<string> {
  const ids = new Set<string>();
  const openParents = new Set<string | null>();
  for (const node of nodes) {
    if (!node.expandable || node.item.expanded !== true) continue;
    if (isOgePanelBarSingle(mode)) {
      if (openParents.has(node.parentId)) continue;
      openParents.add(node.parentId);
    }
    ids.add(node.id);
  }
  return ids;
}

/** The expanded set after one expand / collapse, plus the siblings it closed. */
export interface OgePanelBarExpansionChange {
  readonly next: ReadonlySet<string>;
  /** Siblings a `single` / `full` expand collapsed, in document order. */
  readonly collapsed: readonly string[];
}

/**
 * Applies one expand or collapse of `id` under `mode`. A collapsed group's
 * descendants keep their own state, so re-opening it restores the subtree.
 */
export function ogePanelBarExpansionAfter<T extends OgePanelBarItemLike>(
  nodes: readonly OgePanelBarNode<T>[],
  current: ReadonlySet<string>,
  id: string,
  expand: boolean,
  mode: OgePanelBarExpandMode,
): OgePanelBarExpansionChange {
  const next = new Set(current);
  if (!expand) {
    next.delete(id);
    return { next, collapsed: [] };
  }
  next.add(id);
  const collapsed: string[] = [];
  if (isOgePanelBarSingle(mode)) {
    const node = nodes.find((n) => n.id === id);
    for (const other of nodes) {
      if (other.id === id || other.parentId !== node?.parentId) continue;
      if (next.delete(other.id)) collapsed.push(other.id);
    }
  }
  return { next, collapsed };
}

/** Ids of the nodes whose every ancestor is expanded — the rendered headers. */
export function ogePanelBarVisibleIds<T extends OgePanelBarItemLike>(
  nodes: readonly OgePanelBarNode<T>[],
  expanded: ReadonlySet<string>,
): string[] {
  const shown = new Set<string>();
  const out: string[] = [];
  for (const node of nodes) {
    if (
      node.parentId === null ||
      (shown.has(node.parentId) && expanded.has(node.parentId))
    ) {
      shown.add(node.id);
      out.push(node.id);
    }
  }
  return out;
}

/** What a header keystroke asks for. */
export type OgePanelBarKeyIntent =
  'next' | 'previous' | 'first' | 'last' | 'expand' | 'collapse';

/**
 * The intent of a header keystroke, or `null` when the key is not part of the
 * map. Right/Left are visual: `rtl` swaps expand and collapse. Modified
 * keystrokes never navigate.
 */
export function ogePanelBarKeyIntent(
  key: string,
  modifiers: { ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {},
  rtl = false,
): OgePanelBarKeyIntent | null {
  if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) return null;
  switch (key) {
    case 'ArrowDown':
      return 'next';
    case 'ArrowUp':
      return 'previous';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case 'ArrowRight':
      return rtl ? 'collapse' : 'expand';
    case 'ArrowLeft':
      return rtl ? 'expand' : 'collapse';
    default:
      return null;
  }
}

/** The action a keystroke resolves to. */
export type OgePanelBarKeyAction =
  | { readonly kind: 'focus'; readonly id: string }
  | { readonly kind: 'expand'; readonly id: string }
  | { readonly kind: 'collapse'; readonly id: string };

/**
 * Resolves a keystroke on the header `fromId` into a focus move or a toggle.
 * Focus moves skip disabled headers and walk only the rendered ones;
 * `expand` opens a closed group or enters an open one, `collapse` closes an
 * open group or moves to the parent header.
 */
export function ogePanelBarKeyAction<T extends OgePanelBarItemLike>(
  nodes: readonly OgePanelBarNode<T>[],
  expanded: ReadonlySet<string>,
  fromId: string,
  intent: OgePanelBarKeyIntent,
): OgePanelBarKeyAction | null {
  const index = ogePanelBarIndex(nodes);
  const from = index.get(fromId);
  if (!from) return null;
  const visible = ogePanelBarVisibleIds(nodes, expanded).filter(
    (id) => !index.get(id)?.disabled,
  );
  const focus = (id: string | undefined): OgePanelBarKeyAction | null =>
    id === undefined || id === fromId ? null : { kind: 'focus', id };
  switch (intent) {
    case 'first':
      return focus(visible[0]);
    case 'last':
      return focus(visible[visible.length - 1]);
    case 'next':
    case 'previous': {
      const all = ogePanelBarVisibleIds(nodes, expanded);
      const at = all.indexOf(fromId);
      const step = intent === 'next' ? 1 : -1;
      for (let i = at + step; i >= 0 && i < all.length; i += step) {
        if (!index.get(all[i])?.disabled) return focus(all[i]);
      }
      return null;
    }
    case 'expand': {
      if (!from.expandable || from.disabled) return null;
      if (!expanded.has(from.id)) return { kind: 'expand', id: from.id };
      const child = from.childIds.find((id) => !index.get(id)?.disabled);
      return focus(child);
    }
    case 'collapse': {
      if (from.expandable && expanded.has(from.id) && !from.disabled) {
        return { kind: 'collapse', id: from.id };
      }
      return from.parentId === null ? null : focus(from.parentId);
    }
  }
}

// --- event payloads --------------------------------------------------------

/** Emitted when a header is activated, before toggling or selecting. */
export interface OgePanelBarItemClickEvent<T = OgePanelBarItem> {
  readonly item: T;
  readonly key?: string;
  readonly level: number;
  readonly event: Event;
}

/** Cancelable pre-event of a group expanding. */
export interface OgePanelBarItemExpandingEvent<T = OgePanelBarItem> {
  readonly item: T;
  readonly key?: string;
  readonly level: number;
  readonly event?: Event;
  /** Set to `true` to keep the group collapsed. */
  cancel: boolean;
}

/** Cancelable pre-event of a group collapsing. */
export interface OgePanelBarItemCollapsingEvent<T = OgePanelBarItem> {
  readonly item: T;
  readonly key?: string;
  readonly level: number;
  readonly event?: Event;
  /** Set to `true` to keep the group expanded. */
  cancel: boolean;
}

/** Emitted once a group expanded or collapsed. */
export interface OgePanelBarItemToggleEvent<T = OgePanelBarItem> {
  readonly item: T;
  readonly key?: string;
  readonly level: number;
  readonly event?: Event;
}

/** Emitted when the selected item changed. */
export interface OgePanelBarSelectionChangedEvent<T = OgePanelBarItem> {
  /** The newly selected item. */
  readonly item: T;
  readonly key?: string;
  /** The key selected before, if any. */
  readonly previousKey?: string;
  readonly event?: Event;
}
