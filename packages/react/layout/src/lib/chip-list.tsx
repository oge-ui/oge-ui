'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  OGE_CHIP_REMOVE_SHORTCUTS,
  ogeChipFocusAfterRemove,
  ogeChipGridStops,
  ogeChipIsRemovable,
  ogeChipKeyIntent,
  ogeChipListRole,
  ogeChipNavIndex,
  ogeChipRemoveLabel,
  ogeChipTabStop,
  ogeChipToggleSelection,
  ogeIsRtl,
  type OgeChipGridStop,
  type OgeChipItem,
  type OgeChipItemClickEvent,
  type OgeChipItemRemovedEvent,
  type OgeChipItemRemovingEvent,
  type OgeChipKey,
  type OgeChipSelectionChangedEvent,
  type OgeChipSelectionMode,
  type OgeChipSize,
  type OgeChipStylingMode,
} from '@oge-ui/behavior';
import { ChipCheck, ChipCross, ChipLead } from './chip';
import { useOgeChipConfig } from './layout-config';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** Context of `renderChip` — the Angular `[ogeChipTemplate]` context. */
export interface OgeChipRenderContext {
  item: OgeChipItem;
  index: number;
  selected: boolean;
  removable: boolean;
  disabled: boolean;
}

export interface OgeChipListProps {
  /** The chips, in order. `key` identifies a chip in every event. */
  items?: readonly OgeChipItem[];
  /** `none` (default), `single` or `multiple` — selection turns the list into a listbox. */
  selectionMode?: OgeChipSelectionMode;
  /** Keys of the selected chips (controlled). */
  selectedKeys?: readonly OgeChipKey[];
  /** Initial selection when uncontrolled. */
  defaultSelectedKeys?: readonly OgeChipKey[];
  /** The committed selection — the controlled half of `selectedKeys`. */
  onSelectedKeysChange?: (keys: OgeChipKey[]) => void;
  /** Default removability of every chip (`OgeChipItem.removable` overrides it). */
  removable?: boolean;
  /** Disables every chip: nothing toggles, nothing is removed. */
  disabled?: boolean;
  /** Density preset; falls back to the config, then `md`. */
  size?: OgeChipSize;
  /** `filled` (default) or `outlined`; falls back to the config. */
  stylingMode?: OgeChipStylingMode;
  /** Accessible name; a listbox or grid falls back to the `chipList` message. */
  ariaLabel?: string;
  /** Replaces each chip's label — the Angular `[ogeChipTemplate]`. */
  renderChip?: (context: OgeChipRenderContext) => ReactNode;
  /** The selection changed through a click, Space or Enter. */
  onSelectionChanged?: (event: OgeChipSelectionChangedEvent) => void;
  /** A chip was clicked or activated with Enter / Space. */
  onItemClick?: (event: OgeChipItemClickEvent) => void;
  /** A chip is about to be removed — set `cancel` to keep it. */
  onItemRemoving?: (event: OgeChipItemRemovingEvent) => void;
  /** A chip was removed — drop it from `items` now. */
  onItemRemoved?: (event: OgeChipItemRemovedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeChipList>`. */
export interface OgeChipListHandle {
  /** Focuses the chip at `index` (default: the current tab stop). */
  focus(index?: number): void;
}

const EMPTY: readonly OgeChipItem[] = [];
const NO_KEYS: readonly OgeChipKey[] = [];

/**
 * A set of chips with one tab stop — the React render of the Angular
 * `<oge-chip-list>`, same markup and the same APG shapes: a **listbox** when
 * selectable, a **layout grid** when only removable, a static **list**
 * otherwise (`ogeChipListRole`).
 *
 * ```tsx
 * <OgeChipList
 *   items={filters}
 *   selectionMode="multiple"
 *   selectedKeys={active}
 *   onSelectedKeysChange={setActive}
 *   ariaLabel="Filters"
 * />
 * ```
 *
 * The list moves no data: drop the chip from `items` in `onItemRemoved`;
 * focus then lands on the chip that took its place (Delete) or the previous
 * one (Backspace).
 */
export const OgeChipList = forwardRef<OgeChipListHandle, OgeChipListProps>(
  function OgeChipList(props, ref) {
    const config = useOgeChipConfig();
    const {
      items = EMPTY,
      selectionMode = 'none',
      removable = false,
      disabled = false,
    } = props;
    const [uncontrolledKeys, setUncontrolledKeys] = useState<
      readonly OgeChipKey[]
    >(props.defaultSelectedKeys ?? NO_KEYS);
    const selectedKeys = props.selectedKeys ?? uncontrolledKeys;
    const size = props.size ?? config.size ?? 'md';
    const stylingMode = props.stylingMode ?? config.stylingMode ?? 'filled';

    const hostRef = useRef<HTMLDivElement>(null);
    const latest = useRef(props);
    latest.current = props;

    const role = ogeChipListRole(
      selectionMode,
      items.some((item) => ogeChipIsRemovable(item, removable)),
    );
    const isDisabled = (item: OgeChipItem) => disabled || !!item.disabled;
    const isRemovable = (item: OgeChipItem) =>
      !disabled && ogeChipIsRemovable(item, removable);

    const [focusIndex, setFocusIndex] = useState(-1);
    const [gridFocus, setGridFocus] = useState<OgeChipGridStop | null>(null);

    // derived, never effect-seeded: the first paint already has its tab stop
    const tabStop = useMemo(
      () =>
        ogeChipTabStop(
          items.map((item) => ({
            key: item.key,
            disabled: disabled || !!item.disabled,
          })),
          focusIndex,
          selectedKeys,
        ),
      [items, disabled, focusIndex, selectedKeys],
    );
    const stops = useMemo(
      () =>
        ogeChipGridStops(
          disabled ? items.map(() => ({ disabled: true })) : items,
          removable,
        ),
      [items, disabled, removable],
    );
    const gridStop =
      gridFocus &&
      stops.some(
        (s) => s.index === gridFocus.index && s.part === gridFocus.part,
      )
        ? gridFocus
        : (stops[0] ?? null);

    const focusOption = (index: number) =>
      (
        hostRef.current?.querySelector(
          `[data-oge-chip-index="${index}"]`,
        ) as HTMLElement | null
      )?.focus();
    const focusStop = (stop: OgeChipGridStop) =>
      (
        hostRef.current?.querySelector(
          `[data-oge-chip-stop="${stop.index}:${stop.part}"]`,
        ) as HTMLElement | null
      )?.focus();

    const focus = (index?: number) => {
      if (role === 'listbox') focusOption(index ?? tabStop);
      else if (role === 'grid') {
        const stop =
          index === undefined
            ? gridStop
            : (stops.find((s) => s.index === index) ?? null);
        if (stop) focusStop(stop);
      }
    };
    const focusRef = useRef(focus);
    focusRef.current = focus;
    useImperativeHandle(ref, () => ({ focus: (i) => focusRef.current(i) }), []);

    // After the app dropped a removed chip, move focus onto its neighbour.
    const pending = useRef<{
      count: number;
      index: number;
      then: 'next' | 'prev';
    } | null>(null);
    useIsomorphicLayoutEffect(() => {
      const p = pending.current;
      if (!p) return;
      pending.current = null;
      if (items.length >= p.count) return;
      const target = ogeChipFocusAfterRemove(
        p.count,
        p.index,
        p.then,
        items.map(isDisabled),
      );
      if (target >= 0) focusRef.current(target);
    }, [items]);

    const rtl = () => ogeIsRtl(hostRef.current);

    const activate = (index: number, event: Event) => {
      const item = items[index];
      if (!item || isDisabled(item)) return;
      setFocusIndex(index);
      const previousKeys = [...selectedKeys];
      const next = ogeChipToggleSelection(
        selectionMode,
        previousKeys,
        item.key,
      );
      if (latest.current.selectedKeys === undefined) setUncontrolledKeys(next);
      latest.current.onSelectedKeysChange?.(next);
      latest.current.onSelectionChanged?.({
        selectedKeys: next,
        previousKeys,
        item,
        index,
        event,
      });
      latest.current.onItemClick?.({ item, index, event });
    };

    const requestRemove = (
      index: number,
      then: 'next' | 'prev',
      event?: Event,
    ) => {
      const item = items[index];
      if (!item || !isRemovable(item)) return;
      const removing: OgeChipItemRemovingEvent = {
        item,
        index,
        event,
        cancel: false,
      };
      latest.current.onItemRemoving?.(removing);
      if (removing.cancel) return;
      pending.current = { count: items.length, index, then };
      latest.current.onItemRemoved?.({ item, index, event });
    };

    const onOptionKeyDown = (event: ReactKeyboardEvent, index: number) => {
      const intent = ogeChipKeyIntent(event.key, rtl());
      if (!intent) return;
      event.preventDefault();
      if (intent.type === 'move')
        focusOption(
          ogeChipNavIndex(items.length, index, intent.to, (i) =>
            isDisabled(items[i]),
          ),
        );
      else if (intent.type === 'toggle') activate(index, event.nativeEvent);
      else requestRemove(index, intent.then, event.nativeEvent);
    };

    const onOptionClick = (event: ReactMouseEvent, index: number) => {
      const target = event.target as Element | null;
      if (target?.closest('.oge-chip-remove'))
        requestRemove(index, 'next', event.nativeEvent);
      else activate(index, event.nativeEvent);
    };

    const gridClick = (index: number, event: Event) => {
      const item = items[index];
      if (!item || isDisabled(item)) return;
      latest.current.onItemClick?.({ item, index, event });
    };

    const onGridKeyDown = (
      event: ReactKeyboardEvent,
      index: number,
      part: 'label' | 'remove',
    ) => {
      const intent = ogeChipKeyIntent(event.key, rtl());
      if (!intent) return;
      const at = stops.findIndex((s) => s.index === index && s.part === part);
      if (intent.type === 'move') {
        event.preventDefault();
        const next = ogeChipNavIndex(stops.length, at, intent.to);
        if (next >= 0) focusStop(stops[next]);
      } else if (intent.type === 'toggle') {
        // the remove cell's button handles Enter/Space natively
        if (part === 'label') {
          event.preventDefault();
          gridClick(index, event.nativeEvent);
        }
      } else {
        event.preventDefault();
        requestRemove(index, intent.then, event.nativeEvent);
      }
    };

    const chipClass = (item: OgeChipItem, selected = false) =>
      [
        'oge-chip',
        size === 'sm' && 'oge-chip-sm',
        size === 'lg' && 'oge-chip-lg',
        stylingMode === 'outlined' && 'oge-chip-outlined',
        item.severity &&
          item.severity !== 'neutral' &&
          `oge-chip-${item.severity}`,
        role === 'listbox' && 'oge-chip-selectable',
        isRemovable(item) && 'oge-chip-removable',
        isDisabled(item) && 'oge-chip-disabled',
        selected && 'oge-chip-selected',
      ]
        .filter(Boolean)
        .join(' ');

    const body = (item: OgeChipItem, index: number) => (
      <>
        <ChipLead avatar={item.avatar} icon={item.icon} />
        <span className="oge-chip-label">
          {props.renderChip
            ? props.renderChip({
                item,
                index,
                selected: selectedKeys.includes(item.key),
                removable: isRemovable(item),
                disabled: isDisabled(item),
              })
            : item.label}
        </span>
      </>
    );

    const label =
      role === 'list'
        ? props.ariaLabel
        : (props.ariaLabel ?? config.messages.chipList);

    const hostClass = [
      'oge-chip-list',
      disabled && 'oge-chip-list-disabled',
      props.className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={hostRef}
        className={hostClass}
        style={props.style}
        role={role}
        aria-label={label}
        aria-multiselectable={
          role === 'listbox' && selectionMode === 'multiple' ? true : undefined
        }
        aria-orientation={role === 'listbox' ? 'horizontal' : undefined}
        aria-disabled={disabled && role !== 'list' ? true : undefined}
      >
        {role === 'listbox' &&
          items.map((item, i) => {
            const selected = selectedKeys.includes(item.key);
            return (
              <div
                key={item.key}
                role="option"
                className={chipClass(item, selected)}
                aria-selected={selected}
                aria-disabled={isDisabled(item) ? true : undefined}
                aria-keyshortcuts={
                  isRemovable(item) ? OGE_CHIP_REMOVE_SHORTCUTS : undefined
                }
                data-oge-chip-index={i}
                tabIndex={i === tabStop ? 0 : -1}
                onClick={(event) => onOptionClick(event, i)}
                onKeyDown={(event) => onOptionKeyDown(event, i)}
                onFocus={() => setFocusIndex(i)}
              >
                <span className="oge-chip-main">
                  <ChipCheck />
                  {body(item, i)}
                </span>
                {isRemovable(item) && (
                  <span className="oge-chip-remove" aria-hidden="true">
                    <ChipCross />
                  </span>
                )}
              </div>
            );
          })}
        {role === 'grid' &&
          items.map((item, i) => (
            <div
              key={item.key}
              role="row"
              className={chipClass(item)}
              aria-disabled={isDisabled(item) ? true : undefined}
            >
              <span
                role="gridcell"
                className="oge-chip-main"
                data-oge-chip-stop={`${i}:label`}
                tabIndex={
                  gridStop?.index === i && gridStop.part === 'label' ? 0 : -1
                }
                onClick={(event) => gridClick(i, event.nativeEvent)}
                onKeyDown={(event) => onGridKeyDown(event, i, 'label')}
                onFocus={() => setGridFocus({ index: i, part: 'label' })}
              >
                {body(item, i)}
              </span>
              {isRemovable(item) && (
                <span role="gridcell" className="oge-chip-remove-cell">
                  <button
                    type="button"
                    className="oge-chip-remove"
                    aria-label={ogeChipRemoveLabel(item.label, config.messages)}
                    data-oge-chip-stop={`${i}:remove`}
                    tabIndex={
                      gridStop?.index === i && gridStop.part === 'remove'
                        ? 0
                        : -1
                    }
                    onClick={(event) =>
                      requestRemove(i, 'next', event.nativeEvent)
                    }
                    onKeyDown={(event) => onGridKeyDown(event, i, 'remove')}
                    onFocus={() => setGridFocus({ index: i, part: 'remove' })}
                  >
                    <ChipCross />
                  </button>
                </span>
              )}
            </div>
          ))}
        {role === 'list' &&
          items.map((item, i) => (
            <div key={item.key} role="listitem" className={chipClass(item)}>
              <span className="oge-chip-main">{body(item, i)}</span>
            </div>
          ))}
      </div>
    );
  },
);
