import {
  createTypeAheadBuffer,
  matchByPrefix,
  type OgeTypeAheadBuffer,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { choiceIncludes } from './choice-group-core';
import {
  OgeSelectListCore,
  type OgeSelectListCoreDeps,
  type OgeSelectListRow,
} from './select-list-core';

/**
 * The list box's selection model: one value (`'single'`, the native
 * `<select>` shape — selection follows focus) or an array of values
 * (`'multiple'`, `aria-multiselectable`).
 */
export type OgeListBoxSelectionMode = 'single' | 'multiple';

/** The slice of a `keydown` event the list box reads. */
export interface OgeListBoxKeyInput {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

/** The slice of a `click` the list box reads (Shift extends a range). */
export interface OgeListBoxClickInput {
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

/**
 * What a key press did. `handled` → the host calls `preventDefault()`;
 * `value` present → the host commits it (the selection changed).
 */
export interface OgeListBoxKeyResult {
  readonly handled: boolean;
  readonly value?: unknown;
}

/** Reactive getters the owning component wires into the list box machine. */
export interface OgeListBoxCoreDeps<TItem> extends Omit<
  OgeSelectListCoreDeps<TItem>,
  'opened' | 'imageExpr'
> {
  /** `'single'` or `'multiple'`. */
  selectionMode: () => OgeListBoxSelectionMode;
  /** The committed value — one value / `null`, or an array in multiple mode. */
  value: () => unknown;
  /** Rows a PageUp / PageDown jumps. Default 10. */
  pageSize?: () => number;
  /** Type-ahead idle timeout in ms. Default 500. */
  typeAheadTimeoutMs?: number;
}

/**
 * The WAI-ARIA APG **listbox** machine shared by both render layers'
 * `OgeListBox` (and through it the transfer list). It is the dropdown
 * editors' `OgeSelectListCore` generalized to an always-open list —
 * expression resolution, option ids, client-side search, grouping and the
 * active-option bookkeeping are inherited unchanged — plus what a standing
 * list adds: the selection model (single / multiple, Shift ranges from an
 * anchor, select all), the APG key map and type-ahead.
 *
 * The machine never commits: selection methods return the next value and
 * the host runs it through its own commit pipeline (`OgeControlBase` /
 * `useOgeField`), so debounce, forms and events stay the editors' own.
 * Values compare with `Object.is`, the select family's equality.
 */
export class OgeListBoxCore<TItem> extends OgeSelectListCore<TItem> {
  /** Visible index the next Shift range starts from. */
  readonly anchorIndex: OgeReactiveCell<number>;
  private readonly typeAhead: OgeTypeAheadBuffer;

  constructor(
    private readonly boxDeps: OgeListBoxCoreDeps<TItem>,
    rx: OgeReactivityAdapter,
  ) {
    super(
      {
        ...boxDeps,
        opened: () => true,
        imageExpr: () => undefined,
      },
      rx,
    );
    this.anchorIndex = rx.cell(-1);
    this.typeAhead = createTypeAheadBuffer(boxDeps.typeAheadTimeoutMs ?? 500);
  }

  // --- selection state -------------------------------------------------------

  get multiple(): boolean {
    return this.boxDeps.selectionMode() === 'multiple';
  }

  /** The committed value as an array of selected values (either mode). */
  selectedValues(): readonly unknown[] {
    const value = this.boxDeps.value();
    if (this.multiple) return Array.isArray(value) ? value : [];
    return value === null || value === undefined ? [] : [value];
  }

  /** Whether `item` is selected. */
  isSelected(item: TItem): boolean {
    return choiceIncludes(this.selectedValues(), this.itemValue(item));
  }

  /** The selected items among the full item set, in items order. */
  selectedItems(): TItem[] {
    const values = this.selectedValues();
    return this.resolvedItems().filter((item) =>
      choiceIncludes(values, this.itemValue(item)),
    );
  }

  /**
   * Turns a set of selected values into the committed value shape: the first
   * value (or `null`) in single mode, an items-ordered array in multiple mode
   * — values no item produces are kept after the known ones.
   */
  toValue(values: readonly unknown[]): unknown {
    if (!this.multiple) return values.length > 0 ? values[0] : null;
    const order = this.resolvedItems().map((item) => this.itemValue(item));
    const known = order.filter((value) => choiceIncludes(values, value));
    const unknown = values.filter((value) => !choiceIncludes(order, value));
    return [...known, ...unknown];
  }

  /** The value selecting every enabled item (disabled ones keep their state). */
  selectAllValue(): unknown {
    if (!this.multiple) return this.boxDeps.value() ?? null;
    const current = this.selectedValues();
    const enabled = this.resolvedItems()
      .filter((item) => !this.isItemDisabled(item))
      .map((item) => this.itemValue(item));
    return this.toValue([...current, ...enabled]);
  }

  /** The value deselecting every enabled item (disabled ones keep theirs). */
  unselectAllValue(): unknown {
    if (!this.multiple) return null;
    const kept = this.selectedValues().filter((value) => {
      const item = this.resolvedItems().find((entry) =>
        Object.is(this.itemValue(entry), value),
      );
      return item !== undefined && this.isItemDisabled(item);
    });
    return this.toValue(kept);
  }

  /**
   * The items a change from `previous` to `next` (committed value shapes)
   * selected and deselected — the `selectionChanged` payload. `changed` is
   * false when both hold the same values in the same order.
   */
  selectionDelta(
    previous: unknown,
    next: unknown,
  ): { changed: boolean; added: TItem[]; removed: TItem[] } {
    const toList = (value: unknown): readonly unknown[] =>
      Array.isArray(value)
        ? value
        : value === null || value === undefined
          ? []
          : [value];
    const before = toList(previous);
    const after = toList(next);
    const changed =
      before.length !== after.length ||
      before.some((value, i) => !Object.is(value, after[i]));
    const items = this.resolvedItems();
    const pick = (values: readonly unknown[]) =>
      items.filter((item) => choiceIncludes(values, this.itemValue(item)));
    return {
      changed,
      added: pick(after.filter((value) => !choiceIncludes(before, value))),
      removed: pick(before.filter((value) => !choiceIncludes(after, value))),
    };
  }

  /** Every selectable (enabled) visible item is selected. */
  allVisibleSelected(): boolean {
    const enabled = this.visibleItems().filter(
      (item) => !this.isItemDisabled(item),
    );
    return enabled.length > 0 && enabled.every((item) => this.isSelected(item));
  }

  // --- focus -----------------------------------------------------------------

  /**
   * Gives the list an active option when it receives focus without one: the
   * first selected visible option, else the first enabled one (APG).
   */
  ensureActive(): void {
    const items = this.visibleItems();
    const current = this.activeIndex();
    if (
      current >= 0 &&
      current < items.length &&
      !this.isItemDisabled(items[current])
    ) {
      return;
    }
    const selected = items.findIndex(
      (item) => this.isSelected(item) && !this.isItemDisabled(item),
    );
    const index = selected >= 0 ? selected : this.edgeEnabledIndex(1);
    this.setActive(index);
    if (this.anchorIndex() < 0) this.anchorIndex.set(index);
  }

  /** Activates the visible option showing `item` (no selection change). */
  activateItem(item: TItem): boolean {
    const index = this.visibleItems().indexOf(item);
    if (index < 0) return false;
    this.setActive(index);
    return true;
  }

  // --- pointer ---------------------------------------------------------------

  /**
   * A click on the visible option at `index`: activates it and returns the
   * next value, `undefined` when nothing changes (disabled option). Single
   * mode selects; multiple mode toggles, Shift adds the range from the
   * anchor.
   */
  clickOption(index: number, input: OgeListBoxClickInput = {}): unknown {
    const item = this.visibleItems()[index];
    if (item === undefined || this.isItemDisabled(item)) return undefined;
    this.setActive(index);
    if (!this.multiple) {
      this.anchorIndex.set(index);
      return this.toValue([this.itemValue(item)]);
    }
    if (input.shiftKey && this.anchorIndex() >= 0) {
      return this.rangeValue(this.anchorIndex(), index);
    }
    this.anchorIndex.set(index);
    return this.toggleValue(item);
  }

  // --- keyboard --------------------------------------------------------------

  /**
   * The APG listbox key map. Navigation always works; selection changes are
   * returned only when `editable` (not disabled / read-only).
   *
   * - ↑ / ↓, Home / End, PageUp / PageDown move the active option (single
   *   mode: selection follows focus).
   * - Multiple: Space / Enter toggle; Shift+↑/↓ and Shift+Space extend the
   *   range from the anchor; Ctrl+Shift+Home / End select to the edge;
   *   Ctrl+A (⌘A) selects all — or clears when everything is selected.
   * - Printable characters run the type-ahead (accent-insensitive prefix).
   */
  handleKey(input: OgeListBoxKeyInput, editable = true): OgeListBoxKeyResult {
    const items = this.visibleItems();
    const mod = !!(input.ctrlKey || input.metaKey);
    if (input.altKey) return { handled: false };
    const move = (target: number): OgeListBoxKeyResult => {
      if (target < 0) return { handled: true };
      const from = this.activeIndex();
      this.setActive(target);
      if (!editable) return { handled: true };
      if (!this.multiple) {
        this.anchorIndex.set(target);
        const item = items[target];
        if (item === undefined || this.isSelected(item))
          return { handled: true };
        return { handled: true, value: this.toValue([this.itemValue(item)]) };
      }
      if (input.shiftKey) {
        const anchor = this.anchorIndex() >= 0 ? this.anchorIndex() : from;
        if (anchor < 0) return { handled: true };
        this.anchorIndex.set(anchor);
        return { handled: true, value: this.rangeValue(anchor, target) };
      }
      return { handled: true };
    };

    switch (input.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (mod) return { handled: false };
        const delta = input.key === 'ArrowDown' ? 1 : -1;
        if (this.activeIndex() < 0) {
          return move(this.edgeEnabledIndex(delta === 1 ? 1 : -1));
        }
        return move(this.steppedIndex(delta));
      }
      case 'PageDown':
      case 'PageUp': {
        const page = Math.max(1, this.boxDeps.pageSize?.() ?? 10);
        return move(this.steppedIndex(input.key === 'PageDown' ? page : -page));
      }
      case 'Home':
      case 'End': {
        const edge = this.edgeEnabledIndex(input.key === 'Home' ? 1 : -1);
        if (this.multiple && mod && input.shiftKey && editable) {
          const from = this.activeIndex() >= 0 ? this.activeIndex() : edge;
          if (edge < 0) return { handled: true };
          this.setActive(edge);
          this.anchorIndex.set(from);
          return { handled: true, value: this.rangeValue(from, edge) };
        }
        if (mod) return { handled: false };
        return move(edge);
      }
      case ' ':
      case 'Enter': {
        if (mod) return { handled: false };
        const index = this.activeIndex();
        const item = items[index];
        if (item === undefined || this.isItemDisabled(item)) {
          return { handled: input.key === ' ' };
        }
        if (!editable) return { handled: true };
        if (!this.multiple) {
          this.anchorIndex.set(index);
          return { handled: true, value: this.toValue([this.itemValue(item)]) };
        }
        if (input.shiftKey && input.key === ' ' && this.anchorIndex() >= 0) {
          return {
            handled: true,
            value: this.rangeValue(this.anchorIndex(), index),
          };
        }
        this.anchorIndex.set(index);
        return { handled: true, value: this.toggleValue(item) };
      }
      case 'a':
      case 'A': {
        if (mod && !input.shiftKey) {
          if (!this.multiple) return { handled: false };
          if (!editable) return { handled: true };
          return {
            handled: true,
            value: this.allVisibleSelected()
              ? this.unselectAllValue()
              : this.selectAllValue(),
          };
        }
        break;
      }
    }
    if (input.key.length === 1 && !mod && input.key !== ' ') {
      return move(this.typeAheadIndex(input.key));
    }
    return { handled: false };
  }

  /** Drops the type-ahead prefix (blur). */
  resetTypeAhead(): void {
    this.typeAhead.clear();
  }

  // --- internals -------------------------------------------------------------

  /** `delta` steps from the active option over enabled items, clamped. */
  private steppedIndex(delta: number): number {
    const items = this.visibleItems();
    if (items.length === 0) return -1;
    const direction = delta > 0 ? 1 : -1;
    let index = this.activeIndex();
    if (index < 0) return this.edgeEnabledIndex(direction === 1 ? 1 : -1);
    let remaining = Math.abs(delta);
    while (remaining > 0) {
      let candidate = index + direction;
      while (
        candidate >= 0 &&
        candidate < items.length &&
        this.isItemDisabled(items[candidate])
      ) {
        candidate += direction;
      }
      if (candidate < 0 || candidate >= items.length) break;
      index = candidate;
      remaining--;
    }
    return index;
  }

  private typeAheadIndex(char: string): number {
    const prefix = this.typeAhead.push(char);
    const labels = this.visibleItems().map((item) => this.displayOf(item));
    const active = this.activeIndex();
    // a longer prefix may still match the active option; a fresh letter
    // searches past it (s-s-s cycles through the "s" entries)
    const start = prefix.length > 1 ? active - 1 : active;
    const items = this.visibleItems();
    const index = matchByPrefix(labels, prefix, start, (i) =>
      this.isItemDisabled(items[i]),
    );
    return index ?? -1;
  }

  private toggleValue(item: TItem): unknown {
    const value = this.itemValue(item);
    const current = this.selectedValues();
    return this.toValue(
      choiceIncludes(current, value)
        ? current.filter((entry) => !Object.is(entry, value))
        : [...current, value],
    );
  }

  /** The current selection plus every enabled visible option between two indices. */
  private rangeValue(from: number, to: number): unknown {
    const items = this.visibleItems();
    const [start, end] = from <= to ? [from, to] : [to, from];
    const range: unknown[] = [];
    for (let i = Math.max(0, start); i <= end && i < items.length; i++) {
      if (!this.isItemDisabled(items[i])) range.push(this.itemValue(items[i]));
    }
    return this.toValue([...this.selectedValues(), ...range]);
  }
}

/** One rendered section of a list box: an optional group header and its options. */
export interface OgeListBoxSection<TItem> {
  /** Group label; `null` for the ungrouped list. */
  readonly label: string | null;
  readonly options: readonly { readonly item: TItem; readonly index: number }[];
}

/**
 * Folds the flat `rows()` of an {@link OgeSelectListCore} (group headers
 * interleaved with options) into sections, so a list box can render each
 * group as a `role="group"` labelled by its header (APG grouped listbox).
 */
export function ogeListBoxSections<TItem>(
  rows: readonly OgeSelectListRow<TItem>[],
): OgeListBoxSection<TItem>[] {
  const sections: {
    label: string | null;
    options: { item: TItem; index: number }[];
  }[] = [];
  for (const row of rows) {
    if (row.kind === 'group') {
      sections.push({ label: row.label, options: [] });
      continue;
    }
    if (sections.length === 0) sections.push({ label: null, options: [] });
    sections[sections.length - 1].options.push({
      item: row.item,
      index: row.index,
    });
  }
  return sections;
}
