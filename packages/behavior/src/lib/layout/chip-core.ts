/**
 * The framework-free half of the chip and chip list (W8a): the vocabulary,
 * the message catalog, the ARIA role decision, the keyboard map, roving-focus
 * navigation, selection toggling and the focus target after a removal.
 *
 * A chip list takes one of three APG shapes, decided by
 * {@link ogeChipListRole}:
 *
 * - **`listbox`** (`selectionMode: 'single' | 'multiple'`) — chips are
 *   `role="option"`s with `aria-selected`, one roving tab stop, Space/Enter
 *   toggles. A remove ✕ inside an option would be a nested interactive
 *   control (axe `nested-interactive`), so it is an `aria-hidden` glyph and
 *   Delete/Backspace — advertised with `aria-keyshortcuts` — is the keyboard
 *   path (the tab strip's close ✕ precedent).
 * - **`grid`** (`selectionMode: 'none'` with removable chips) — APG layout
 *   grid: each chip is a `row` with a label `gridcell` and a remove
 *   `gridcell` holding a real `<button>`; the arrows walk the flat sequence
 *   of cells ({@link ogeChipGridStops}), one tab stop for the whole grid.
 * - **`list`** — static chips: a plain `role="list"`, nothing focusable.
 */

/** How many chips can be selected; `none` makes the list non-selectable. */
export type OgeChipSelectionMode = 'none' | 'single' | 'multiple';

/** Height/padding preset. */
export type OgeChipSize = 'sm' | 'md' | 'lg';

/** `filled` is the tinted surface, `outlined` a hairline frame. */
export type OgeChipStylingMode = 'filled' | 'outlined';

/** Colour of the chip — the suite's severity vocabulary plus `neutral`. */
export type OgeChipSeverity =
  'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/** The ARIA shape a chip list renders (see the module comment). */
export type OgeChipListRole = 'listbox' | 'grid' | 'list';

/** Identity of a chip in a list. */
export type OgeChipKey = string | number;

/** The leading avatar of a chip (rendered by the avatar entry). */
export interface OgeChipAvatar {
  src?: string;
  name?: string;
  initials?: string;
}

/** One chip of a data-driven chip list. */
export interface OgeChipItem {
  /** Stable identity — selection and removal events report it. */
  key: OgeChipKey;
  /** Visible text and accessible name. */
  label: string;
  /** SVG path data (`d`) of a leading `aria-hidden` icon. */
  icon?: string;
  /** A leading avatar instead of an icon. */
  avatar?: OgeChipAvatar;
  /** Not selectable, not removable, skipped by the arrow keys. */
  disabled?: boolean;
  /** Per-chip override of the list's `removable`. */
  removable?: boolean;
  /** Per-chip colour. */
  severity?: OgeChipSeverity;
}

/** Every user-facing string the chip family renders, aria labels included. */
export interface OgeChipMessages {
  /** Accessible name of a chip's remove button — `{label}` placeholder. */
  remove: string;
  /** Accessible name of a chip list when the application supplies none. */
  chipList: string;
}

export const OGE_DEFAULT_CHIP_MESSAGES: OgeChipMessages = {
  remove: 'Remove {label}',
  chipList: 'Chips',
};

/** Application-wide defaults for `oge-chip` and `oge-chip-list`. */
export interface OgeChipConfig {
  messages: OgeChipMessages;
  /** Default for the `size` input. */
  size?: OgeChipSize;
  /** Default for the `stylingMode` input. */
  stylingMode?: OgeChipStylingMode;
}

export const OGE_DEFAULT_CHIP_CONFIG: OgeChipConfig = {
  messages: OGE_DEFAULT_CHIP_MESSAGES,
};

export type OgeChipConfigInput = Partial<Omit<OgeChipConfig, 'messages'>> & {
  messages?: Partial<OgeChipMessages>;
};

export function resolveOgeChipConfig(
  input: OgeChipConfigInput | undefined,
): OgeChipConfig {
  return {
    ...OGE_DEFAULT_CHIP_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_CHIP_MESSAGES, ...input?.messages },
  };
}

/** The remove button's accessible name for one chip. */
export function ogeChipRemoveLabel(
  label: string,
  messages: OgeChipMessages,
): string {
  return messages.remove.replace('{label}', label);
}

/** Whether a chip shows a remove affordance: its own flag, else the list's. */
export function ogeChipIsRemovable(
  item: Pick<OgeChipItem, 'removable' | 'disabled'>,
  listRemovable: boolean,
): boolean {
  if (item.disabled) return false;
  return item.removable ?? listRemovable;
}

/**
 * The APG shape of a chip list: selectable → `listbox`; non-selectable with
 * at least one removable chip → `grid`; otherwise a static `list`.
 */
export function ogeChipListRole(
  selectionMode: OgeChipSelectionMode,
  anyRemovable: boolean,
): OgeChipListRole {
  if (selectionMode !== 'none') return 'listbox';
  return anyRemovable ? 'grid' : 'list';
}

/** What a key press on a focused chip asks for. */
export type OgeChipKeyIntent =
  | { type: 'move'; to: 'next' | 'prev' | 'first' | 'last' }
  | { type: 'toggle' }
  | { type: 'remove'; then: 'next' | 'prev' }
  | null;

/**
 * The chip keyboard map, shared by the listbox and the grid. Left/Right are
 * visual and mirror in RTL; Up/Down follow document order (a wrapped list
 * reads as one sequence); Home/End jump. Space/Enter toggle a selectable
 * chip (a grid's remove cell treats them as a press of its button);
 * Delete removes and moves to the next chip, Backspace removes and moves to
 * the previous one (the text-editing convention Material uses).
 */
export function ogeChipKeyIntent(key: string, rtl = false): OgeChipKeyIntent {
  switch (key) {
    case 'ArrowRight':
      return { type: 'move', to: rtl ? 'prev' : 'next' };
    case 'ArrowLeft':
      return { type: 'move', to: rtl ? 'next' : 'prev' };
    case 'ArrowDown':
      return { type: 'move', to: 'next' };
    case 'ArrowUp':
      return { type: 'move', to: 'prev' };
    case 'Home':
      return { type: 'move', to: 'first' };
    case 'End':
      return { type: 'move', to: 'last' };
    case ' ':
    case 'Enter':
      return { type: 'toggle' };
    case 'Delete':
      return { type: 'remove', then: 'next' };
    case 'Backspace':
      return { type: 'remove', then: 'prev' };
    default:
      return null;
  }
}

/** `aria-keyshortcuts` of a removable chip option / label cell. */
export const OGE_CHIP_REMOVE_SHORTCUTS = 'Delete Backspace';

/**
 * The next focus index in a sequence of `count` stops, skipping the ones
 * `isDisabled` rejects. No wrap-around (APG listbox / grid). Returns
 * `current` when nothing qualifies in that direction.
 */
export function ogeChipNavIndex(
  count: number,
  current: number,
  to: 'next' | 'prev' | 'first' | 'last',
  isDisabled: (index: number) => boolean = () => false,
): number {
  if (count <= 0) return -1;
  const scan = (start: number, step: 1 | -1): number => {
    for (let i = start; i >= 0 && i < count; i += step)
      if (!isDisabled(i)) return i;
    return -1;
  };
  let found: number;
  switch (to) {
    case 'first':
      found = scan(0, 1);
      break;
    case 'last':
      found = scan(count - 1, -1);
      break;
    case 'next':
      found = scan(current + 1, 1);
      break;
    case 'prev':
      found = scan(current - 1, -1);
      break;
  }
  return found === -1 ? current : found;
}

/**
 * The roving tab stop of a list: the focused index when it still points at
 * an enabled chip, else the first selected enabled chip, else the first
 * enabled one (`-1` when there is none) — so the list is reachable on the
 * first paint, before any focus happened.
 */
export function ogeChipTabStop(
  items: readonly Pick<OgeChipItem, 'key' | 'disabled'>[],
  focused: number,
  selectedKeys: readonly OgeChipKey[] = [],
): number {
  if (focused >= 0 && focused < items.length && !items[focused].disabled)
    return focused;
  const selected = items.findIndex(
    (item) => !item.disabled && selectedKeys.includes(item.key),
  );
  if (selected >= 0) return selected;
  return items.findIndex((item) => !item.disabled);
}

/**
 * The selection after toggling `key`: `multiple` adds or removes it;
 * `single` selects it alone, or clears it when it was the selected one
 * (chips are filters — a second press undoes the first); `none` changes
 * nothing.
 */
export function ogeChipToggleSelection(
  mode: OgeChipSelectionMode,
  selected: readonly OgeChipKey[],
  key: OgeChipKey,
): OgeChipKey[] {
  const has = selected.includes(key);
  switch (mode) {
    case 'multiple':
      return has ? selected.filter((k) => k !== key) : [...selected, key];
    case 'single':
      return has ? [] : [key];
    default:
      return [...selected];
  }
}

/**
 * Where focus goes after the chip at `removedIndex` left a list of `count`
 * chips (`count` before the removal): the chip that takes its place
 * (`then: 'next'`) or the previous one (`then: 'prev'`), clamped into the
 * shorter list. `disabled` (one flag per remaining chip) skips disabled
 * chips: the search continues in the preferred direction, then the other.
 * `-1` when no focusable chip is left — the host then moves focus out of the
 * list itself.
 */
export function ogeChipFocusAfterRemove(
  count: number,
  removedIndex: number,
  then: 'next' | 'prev',
  disabled?: readonly boolean[],
): number {
  const remaining = count - 1;
  if (remaining <= 0) return -1;
  const target = then === 'prev' ? removedIndex - 1 : removedIndex;
  const start = Math.min(Math.max(target, 0), remaining - 1);
  if (!disabled?.[start]) return start;
  const step = then === 'prev' ? -1 : 1;
  for (const dir of [step, -step]) {
    for (let i = start + dir; i >= 0 && i < remaining; i += dir) {
      if (!disabled[i]) return i;
    }
  }
  return -1;
}

/** One focus stop of a chip grid: a chip's label cell or its remove cell. */
export interface OgeChipGridStop {
  index: number;
  part: 'label' | 'remove';
}

/**
 * The flat focus sequence of a chip grid: each enabled chip contributes its
 * label cell and — when removable — its remove cell. Disabled chips stay in
 * the grid but are skipped (they have nothing to operate).
 */
export function ogeChipGridStops(
  items: readonly Pick<OgeChipItem, 'disabled' | 'removable'>[],
  listRemovable: boolean,
): OgeChipGridStop[] {
  const stops: OgeChipGridStop[] = [];
  items.forEach((item, index) => {
    if (item.disabled) return;
    stops.push({ index, part: 'label' });
    if (ogeChipIsRemovable(item, listRemovable))
      stops.push({ index, part: 'remove' });
  });
  return stops;
}

// --- events ------------------------------------------------------------------

/** A chip list's selection changed through a user gesture. */
export interface OgeChipSelectionChangedEvent {
  /** The selection after the change. */
  selectedKeys: OgeChipKey[];
  /** The selection before it. */
  previousKeys: OgeChipKey[];
  /** The chip that was toggled. */
  item: OgeChipItem;
  index: number;
  event?: Event;
}

/** A chip of a list was clicked or activated with Enter/Space. */
export interface OgeChipItemClickEvent {
  item: OgeChipItem;
  index: number;
  event: Event;
}

/**
 * A chip of a list is about to be removed (✕ press or Delete/Backspace).
 * Set `cancel` to keep it. The list moves no data: the application drops
 * the item from `items` on `itemRemoved` (the closable-tab precedent).
 */
export interface OgeChipItemRemovingEvent {
  item: OgeChipItem;
  index: number;
  event?: Event;
  cancel: boolean;
}

/** A chip of a list was removed; drop it from `items` now. */
export interface OgeChipItemRemovedEvent {
  item: OgeChipItem;
  index: number;
  event?: Event;
}

/** A stand-alone chip's remove button (or Delete/Backspace) was pressed. */
export interface OgeChipRemovedEvent {
  event?: Event;
}
