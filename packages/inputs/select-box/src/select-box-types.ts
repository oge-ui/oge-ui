/**
 * Resolves an item's display text: a field name or a function. Omitted, the
 * item itself is stringified (plain string arrays "just work").
 */
export type OgeSelectBoxDisplayExpr<TItem> = string | ((item: TItem) => string);

/**
 * Resolves an item's committed value: a field name or a function. Omitted,
 * the whole item is the value.
 */
export type OgeSelectBoxValueExpr<TItem> = string | ((item: TItem) => unknown);

/**
 * Which text the search matches against: a field name, several field names,
 * or a function. Omitted, the display text is searched.
 */
export type OgeSelectBoxSearchExpr<TItem> =
  string | readonly string[] | ((item: TItem) => string);

/** How typed search text matches an item. */
export type OgeSelectBoxSearchMode = 'contains' | 'startswith';

/** Marks individual items as non-selectable: a boolean field name or a function. */
export type OgeSelectBoxDisabledExpr<TItem> =
  string | ((item: TItem) => boolean);

/**
 * Item → image URL (avatar, flag, product photo…) rendered before the option
 * text. Empty/undefined results render no image. For inline SVG icons use
 * `itemTemplate` instead.
 */
export type OgeSelectBoxImageExpr<TItem> =
  string | ((item: TItem) => string | undefined);

/** Payload of `selectionChanged` — fires whenever the resolved item changes. */
export interface OgeSelectBoxSelectionChangedEvent<TItem> {
  item: TItem | null;
  previousItem: TItem | null;
}

/** Payload of `itemClick` — `index` is within the currently visible (filtered) list. */
export interface OgeSelectBoxItemClickEvent<TItem> {
  item: TItem;
  index: number;
  event: Event;
}

/** Payload of `searchChanged` — raw search text on every keystroke. */
export interface OgeSelectBoxSearchChangedEvent {
  text: string;
}

/** Template context of a custom option row (`[itemTemplate]`). */
export interface OgeSelectItemTemplateContext<TItem> {
  $implicit: TItem;
  index: number;
  selected: boolean;
  active: boolean;
}

/**
 * Lazy items source: invoked on first open; loading/error rows render while
 * pending. Same shape as the drop-down button's items function.
 */
export type OgeSelectBoxItemsFn<TItem> = () =>
  readonly TItem[] | PromiseLike<readonly TItem[]>;

/** Groups flat items under headers: a field name or a function returning the group label. */
export type OgeSelectBoxGroupExpr<TItem> = string | ((item: TItem) => string);

/**
 * Payload of `customItemCreating` (mutable, as in the references): the handler
 * assigns `customItem` — an item, a promise of one, or `null` to reject the
 * text. Left `undefined`, the raw text itself becomes the item.
 */
export interface OgeSelectBoxCustomItemEvent<TItem> {
  text: string;
  customItem?: TItem | PromiseLike<TItem | null> | null;
}
