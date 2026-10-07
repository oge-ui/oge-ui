'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  beginPointerDragDrop,
  choiceIncludes,
  ogeIsRtl,
  ogeSelectSearchFilter,
  ogeSelectSearchStrings,
  ogeTransferAnnouncement,
  ogeTransferCountText,
  ogeTransferDropTarget,
  ogeTransferKeyCommand,
  ogeTransferKeyShortcuts,
  ogeTransferMovableValues,
  ogeTransferMove,
  ogeTransferOpposite,
  ogeTransferReorderLine,
  ogeTransferReorderSource,
  ogeTransferReorderTarget,
  ogeTransferReorderable,
  ogeTransferSplit,
  prepareTouchDrag,
  resolveDisabled,
  resolveValue,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectGroupExpr,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeListBoxReorderCause,
  type OgeSelectValueExpr,
  type OgeTransferListDropTarget,
  type OgeTransferListMoveCause,
  type OgeTransferListMoveCommand,
  type OgeTransferListReorderSides,
  type OgeTransferListSide,
} from '@oge-ui/behavior';
import { useOgeLiveAnnouncer } from '@oge-ui/react-overlay';
import { useOgeInputsConfig } from './inputs-config';
import {
  OgeListBox,
  type OgeListBoxHandle,
  type OgeListBoxRenderItemContext,
  type OgeListBoxReorderedEvent,
  type OgeListBoxReorderingEvent,
} from './list-box';
import { useOgeField, type OgeControlProps } from './use-field';

/** SSR-safe layout effect (client components still server-render). */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Payload of the cancelable `onReordering` — a reorder inside one list. */
export interface OgeTransferListReorderingEvent<TItem = unknown> {
  /** The list being reordered. */
  side: OgeTransferListSide;
  item: TItem;
  /** Index in that list before the move. */
  fromIndex: number;
  /** Index it lands at. */
  toIndex: number;
  /** `'keyboard'` (Alt+arrows), `'drag'` or `'api'`. */
  cause: OgeListBoxReorderCause;
  event: Event | undefined;
  /** Set to `true` to keep the order. */
  cancel: boolean;
}

/** Payload of `onReordered` — an item moved inside one list. */
export interface OgeTransferListReorderedEvent<TItem = unknown> {
  side: OgeTransferListSide;
  item: TItem;
  fromIndex: number;
  toIndex: number;
  cause: OgeListBoxReorderCause;
  /** That list's items in the new order. */
  items: TItem[];
  /** The value after the reorder (a target reorder changes its order). */
  value: readonly unknown[];
  event: Event | undefined;
}

/** Payload of the cancelable `onMoving` pre-event. */
export interface OgeTransferListMovingEvent<TItem = unknown> {
  /** The items about to move. */
  items: TItem[];
  /** Their `valueExpr` results. */
  values: unknown[];
  /** The side they leave. */
  from: OgeTransferListSide;
  /** The side they join. */
  to: OgeTransferListSide;
  /** `'button'`, `'keyboard'` or `'drag'` — all three run the same move. */
  cause: OgeTransferListMoveCause;
  /** Set to `true` to veto the move. */
  cancel: boolean;
}

/** Payload of `onMoved` — items changed sides. */
export interface OgeTransferListMovedEvent<TItem = unknown> {
  items: TItem[];
  values: unknown[];
  from: OgeTransferListSide;
  to: OgeTransferListSide;
  cause: OgeTransferListMoveCause;
  /** The new value (the target side's values, in arrival order). */
  value: readonly unknown[];
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeTransferListHandle {
  /** Moves keyboard focus to the source list. */
  focus(): void;
  blur(): void;
  /** Moves the source selection to the target list. */
  moveSelectedToTarget(): void;
  /** Moves every shown, enabled source item to the target list. */
  moveAllToTarget(): void;
  /** Moves the target selection back to the source list. */
  moveSelectedToSource(): void;
  /** Moves every shown, enabled target item back to the source list. */
  moveAllToSource(): void;
}

export interface OgeTransferListProps<TItem = unknown> extends OgeControlProps<
  readonly unknown[]
> {
  /** Every item; those not in `value` form the source list. */
  items?: readonly TItem[];
  /** Item → option text. Omitted, the item itself is stringified. */
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  /** Item → value. Omitted, the whole item is the value. */
  valueExpr?: OgeSelectValueExpr<TItem>;
  /** Items that cannot be selected or moved (they stay on their side). */
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  /** Groups both lists' options under headers. */
  groupBy?: OgeSelectGroupExpr<TItem>;
  /** Title of the source list; `undefined` = messages `transferSourceTitle`. */
  sourceTitle?: string;
  /** Title of the target list; `undefined` = messages `transferTargetTitle`. */
  targetTitle?: string;
  /** A search field above each list. */
  searchEnabled?: boolean;
  /** Which text the search matches; omitted, the display text. */
  searchExpr?: OgeSelectSearchExpr<TItem>;
  /** `'contains'` (default) or `'startswith'` matching. */
  searchMode?: OgeSelectSearchMode;
  /** Check glyphs on the options of both lists. */
  showCheckBoxes?: boolean;
  /** Maximum height of each list — px number or CSS length. */
  height?: number | string;
  /** Text of an empty list. */
  noDataText?: string;
  /** Visible group label above both lists; the group's accessible name. */
  label?: string;
  /** Helper text under the lists (hidden while an error shows). */
  hint?: string;
  /**
   * Lets the user reorder a list: `true` both, `'source'` / `'target'` only
   * that one. Alt+↑/↓ moves the active option; a drag dropped inside its
   * own list reorders, over the other list it moves. The target's order is
   * the value's order; a reordered source keeps its order until `items`
   * changes.
   */
  allowReordering?: OgeTransferListReorderSides;
  /** Option content for both lists. */
  renderItem?: (item: TItem, context: OgeListBoxRenderItemContext) => ReactNode;
  /** Group header content for both lists. */
  renderGroup?: (label: string, context: { count: number }) => ReactNode;
  /** Cancelable pre-event of every move (buttons, keyboard, drag). */
  onMoving?: (event: OgeTransferListMovingEvent<TItem>) => void;
  /** Items changed sides. */
  onMoved?: (event: OgeTransferListMovedEvent<TItem>) => void;
  /** Cancelable pre-event of a reorder inside one list (`allowReordering`). */
  onReordering?: (event: OgeTransferListReorderingEvent<TItem>) => void;
  /** An item moved inside one list — the target's reorder also changes `value`. */
  onReordered?: (event: OgeTransferListReorderedEvent<TItem>) => void;
  className?: string;
  style?: CSSProperties;
}

const toArray = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? value : [];

/**
 * A dual list box — the React render of the Angular `<oge-transfer-list>`:
 * "available" and "selected" `<OgeListBox>`es (multiple selection, every
 * listbox key) with four move buttons between them. The value is the target
 * side's `valueExpr` results in arrival order. Ctrl/⌘+→ / ← on a focused
 * list moves its selection toward the other list (Shift: everything;
 * mirrored in RTL), and options drag between the lists on the shared pointer
 * machine. All three paths run one move — `onMoving` (cancelable), the
 * commit, a polite announcement, `onMoved` — from `@oge-ui/behavior`'s
 * transfer-list rules, shared with Angular.
 *
 * ```tsx
 * <OgeTransferList items={permissions} displayExpr="name" valueExpr="id"
 *   targetTitle="Granted" searchEnabled value={granted} onValueChange={setGranted} />
 * ```
 */
export const OgeTransferList = forwardRef(function OgeTransferListRender<TItem>(
  props: OgeTransferListProps<TItem>,
  ref: React.ForwardedRef<OgeTransferListHandle>,
) {
  const {
    items = [],
    displayExpr,
    valueExpr,
    disabledExpr,
    groupBy,
    searchEnabled = false,
    searchExpr,
    searchMode,
    showCheckBoxes = false,
    height,
    noDataText,
    label = '',
    hint,
    renderItem,
    renderGroup,
    className,
    style,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<OgeListBoxHandle<TItem>>(null);
  const targetRef = useRef<OgeListBoxHandle<TItem>>(null);
  const config = useOgeInputsConfig();
  const announcer = useOgeLiveAnnouncer();
  const field = useOgeField<readonly unknown[]>({
    props,
    emptyValue: [],
    isEmpty: (value) => !value || value.length === 0,
    focusNative: () => sourceRef.current?.focus(),
  });
  const readonly = props.readonly ?? false;
  const editable = !field.effectiveDisabled && !readonly;
  const value = toArray(field.value);

  const [sourceSelection, setSourceSelection] = useState<unknown>([]);
  const [targetSelection, setTargetSelection] = useState<unknown>([]);
  const [dropSide, setDropSide] = useState<OgeTransferListSide | null>(null);
  // each list's search text, read from its search field's `input` events
  const [searchTexts, setSearchTexts] = useState<
    Record<OgeTransferListSide, string>
  >({ source: '', target: '' });
  const [reorderLine, setReorderLine] = useState<{
    side: OgeTransferListSide;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  // every item in display order — the source keeps a user reorder here
  // until `items` changes
  const [sourceOrder, setSourceOrder] = useState<{
    source: readonly TItem[];
    order: TItem[];
  } | null>(null);
  const ordered =
    sourceOrder && sourceOrder.source === items ? sourceOrder.order : items;
  const allowReordering = props.allowReordering ?? false;
  const reorderable = (side: OgeTransferListSide) =>
    ogeTransferReorderable(allowReordering, side);
  const [rtl, setRtl] = useState(false);

  useIsomorphicLayoutEffect(() => {
    prepareTouchDrag();
    setRtl(ogeIsRtl(hostRef.current));
  }, []);

  const valueOf = (item: TItem): unknown => resolveValue(valueExpr, item);
  const isItemDisabled = (item: TItem): boolean =>
    resolveDisabled(disabledExpr, item);
  const split = ogeTransferSplit(ordered, value, valueOf);

  const sourceTitle = props.sourceTitle ?? field.msg.transferSourceTitle;
  const targetTitle = props.targetTitle ?? field.msg.transferTargetTitle;
  const titleId = (side: OgeTransferListSide) =>
    `${field.ids.inputId}-${side}-title`;

  const latest = useRef({
    props,
    field,
    value,
    ordered,
    split,
    sourceSelection,
    targetSelection,
    sourceTitle,
    targetTitle,
  });
  latest.current = {
    props,
    field,
    value,
    ordered,
    split,
    sourceSelection,
    targetSelection,
    sourceTitle,
    targetTitle,
  };

  const selectionOf = (side: OgeTransferListSide): readonly unknown[] =>
    toArray(
      side === 'source'
        ? latest.current.sourceSelection
        : latest.current.targetSelection,
    );
  const shownItems = (side: OgeTransferListSide): readonly TItem[] =>
    (side === 'source' ? sourceRef : targetRef).current?.getVisibleItems() ??
    (side === 'source'
      ? latest.current.split.source
      : latest.current.split.target);
  const movableValues = (
    scope: 'selected' | 'all',
    from: OgeTransferListSide,
    shown: readonly TItem[] = shownItems(from),
  ): unknown[] =>
    ogeTransferMovableValues(
      scope,
      shown,
      selectionOf(from),
      valueOf,
      isItemDisabled,
    );

  const moveValues = (
    values: readonly unknown[],
    from: OgeTransferListSide,
    cause: OgeTransferListMoveCause,
    event: Event | undefined,
  ): void => {
    const current = latest.current;
    const isEditable =
      !current.field.effectiveDisabled && !(current.props.readonly ?? false);
    if (!isEditable || values.length === 0) return;
    const to = ogeTransferOpposite(from);
    const moved = (current.props.items ?? []).filter((item) =>
      choiceIncludes(values, valueOf(item)),
    );
    const moving: OgeTransferListMovingEvent<TItem> = {
      items: moved,
      values: [...values],
      from,
      to,
      cause,
      cancel: false,
    };
    current.props.onMoving?.(moving);
    if (moving.cancel) return;
    const next = ogeTransferMove(current.value, values, to);
    current.field.commit.commitNow(next, event);
    const remaining = selectionOf(from).filter(
      (entry) => !choiceIncludes(values, entry),
    );
    if (from === 'source') {
      setSourceSelection(remaining);
      setTargetSelection([...values]);
    } else {
      setTargetSelection(remaining);
      setSourceSelection([...values]);
    }
    announcer.announce(
      ogeTransferAnnouncement(
        current.field.msg.transferMovedAnnouncement,
        values.length,
        to === 'target' ? current.targetTitle : current.sourceTitle,
        config.locale,
      ),
    );
    current.props.onMoved?.({
      items: moved,
      values: [...values],
      from,
      to,
      cause,
      value: next,
    });
  };

  const moveCommand = (
    command: OgeTransferListMoveCommand,
    cause: OgeTransferListMoveCause,
    event?: Event,
  ): void =>
    moveValues(
      movableValues(command.scope, command.from),
      command.from,
      cause,
      event,
    );

  useImperativeHandle(ref, () => ({
    focus: () => sourceRef.current?.focus(),
    blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
    moveSelectedToTarget: () =>
      moveCommand({ scope: 'selected', from: 'source' }, 'button'),
    moveAllToTarget: () =>
      moveCommand({ scope: 'all', from: 'source' }, 'button'),
    moveSelectedToSource: () =>
      moveCommand({ scope: 'selected', from: 'target' }, 'button'),
    moveAllToSource: () =>
      moveCommand({ scope: 'all', from: 'target' }, 'button'),
  }));

  // What each list shows after its search — derived here from the same
  // filter the list box runs, so the buttons are right in this render (the
  // child's own view is a render behind). "Move all" needs a movable item in
  // the filtered view, "move selected" a selected one that is visible.
  const shownSide = (from: OgeTransferListSide): readonly TItem[] => {
    const items = from === 'source' ? split.source : split.target;
    if (!searchEnabled) return items;
    return ogeSelectSearchFilter(
      items,
      searchTexts[from],
      searchMode ?? 'contains',
      (item) => ogeSelectSearchStrings(item, searchExpr, displayExpr),
    );
  };
  const can = (scope: 'selected' | 'all', from: OgeTransferListSide) =>
    editable && movableValues(scope, from, shownSide(from)).length > 0;

  const onPaneInput = (
    event: ReactFormEvent<HTMLDivElement>,
    side: OgeTransferListSide,
  ): void => {
    const target = event.target as HTMLInputElement | null;
    if (!target?.classList?.contains('oge-list-box-search-input')) return;
    const text = target.value;
    setSearchTexts((texts) => ({ ...texts, [side]: text }));
  };

  const onListReordering = (
    side: OgeTransferListSide,
    inner: OgeListBoxReorderingEvent<TItem>,
  ): void => {
    const pre: OgeTransferListReorderingEvent<TItem> = {
      side,
      item: inner.item,
      fromIndex: inner.fromIndex,
      toIndex: inner.toIndex,
      cause: inner.cause,
      event: inner.event,
      cancel: false,
    };
    latest.current.props.onReordering?.(pre);
    if (pre.cancel) inner.cancel = true;
  };

  const onListReordered = (
    side: OgeTransferListSide,
    inner: OgeListBoxReorderedEvent<TItem>,
  ): void => {
    const current = latest.current;
    let next = current.value;
    if (side === 'target') {
      // the target's order is the value's order
      next = ogeTransferReorderTarget(current.value, inner.items, valueOf);
      current.field.commit.commitNow(next, inner.event);
    } else {
      setSourceOrder({
        source: current.props.items ?? [],
        order: ogeTransferReorderSource(
          current.ordered,
          inner.items,
          current.value,
          valueOf,
        ),
      });
    }
    current.props.onReordered?.({
      side,
      item: inner.item,
      fromIndex: inner.fromIndex,
      toIndex: inner.toIndex,
      cause: inner.cause,
      items: inner.items,
      value: next,
      event: inner.event,
    });
  };

  const onPaneKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    side: OgeTransferListSide,
  ): void => {
    const target = event.target as Element | null;
    if (!target?.matches?.('[role="listbox"]')) return;
    const command = ogeTransferKeyCommand(
      event,
      side,
      ogeIsRtl(hostRef.current),
    );
    if (!command) return;
    event.preventDefault();
    moveCommand(command, 'keyboard', event.nativeEvent);
  };

  const onPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    from: OgeTransferListSide,
  ): void => {
    if (!editable || event.button !== 0 || !hostRef.current) return;
    const option = (event.target as Element | null)?.closest?.(
      '.oge-list-box-option',
    );
    if (!option) return;
    const shown = shownItems(from);
    const item = shown[Number(option.getAttribute('data-index'))];
    if (item === undefined || isItemDisabled(item)) return;
    const itemValue = valueOf(item);
    const values = choiceIncludes(selectionOf(from), itemValue)
      ? movableValues('selected', from)
      : [itemValue];
    const host = hostRef.current;
    const nativeEvent = event.nativeEvent;
    // a reorderable side also resolves drops on its own options
    const list = reorderable(from) ? option.closest('[role="listbox"]') : null;
    const pane = option.closest('.oge-transfer-list-pane');
    beginPointerDragDrop<OgeTransferListDropTarget>(event, {
      source: option,
      autoScroll: list instanceof HTMLElement ? list : null,
      resolve: (hit, move) =>
        ogeTransferDropTarget(hit, host, from, list, move.clientY),
      onOver: (target) => {
        setDropSide(target?.kind === 'move' ? target.side : null);
        const over =
          target?.kind === 'reorder'
            ? list?.querySelector(`[data-index="${target.index}"]`)
            : null;
        setReorderLine(
          over && pane && target?.kind === 'reorder'
            ? {
                side: from,
                ...ogeTransferReorderLine(over, pane, target.position),
              }
            : null,
        );
      },
      onDrop: (target) => {
        if (target.kind === 'move') {
          moveValues(values, from, 'drag', nativeEvent);
          return;
        }
        const over = shown[target.index];
        const box = (from === 'source' ? sourceRef : targetRef).current;
        if (over !== undefined) {
          box?.reorderItem(item, over, target.position, 'drag');
        }
      },
      onEnd: () => {
        setDropSide(null);
        setReorderLine(null);
      },
    });
  };

  const onFocusIn = (event: ReactFocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    setRtl(ogeIsRtl(hostRef.current));
    field.handleFocus(event);
  };
  const onFocusOut = (event: ReactFocusEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    field.handleBlur(event);
  };

  const subscript =
    field.showError && field.resolvedErrorText
      ? { id: field.ids.errorId, text: field.resolvedErrorText, error: true }
      : hint
        ? { id: field.ids.hintId, text: hint, error: false }
        : null;

  const countText = (count: number) =>
    ogeTransferCountText(field.msg.transferItemCount, count, config.locale);

  const hostClasses = [
    'oge-transfer-list',
    field.showError && 'oge-transfer-list-invalid',
    readonly && 'oge-transfer-list-readonly',
    (dropSide !== null || reorderLine !== null) && 'oge-transfer-list-dragging',
    field.effectiveDisabled && 'oge-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const pane = (side: OgeTransferListSide): ReactNode => {
    const isSource = side === 'source';
    return (
      <div
        className={[
          'oge-transfer-list-pane',
          dropSide === side && 'oge-transfer-list-pane-drop',
        ]
          .filter(Boolean)
          .join(' ')}
        data-oge-transfer-side={side}
        onInput={(event) => onPaneInput(event, side)}
        onPointerDown={(event) => onPointerDown(event, side)}
        onKeyDown={(event) => onPaneKeyDown(event, side)}
      >
        <div className="oge-transfer-list-header">
          <span className="oge-transfer-list-title" id={titleId(side)}>
            {isSource ? sourceTitle : targetTitle}
          </span>
          <span className="oge-transfer-list-count">
            {countText(isSource ? split.source.length : split.target.length)}
          </span>
        </div>
        <OgeListBox<TItem>
          ref={isSource ? sourceRef : targetRef}
          className="oge-transfer-list-list"
          selectionMode="multiple"
          items={isSource ? split.source : split.target}
          displayExpr={displayExpr}
          valueExpr={valueExpr}
          disabledExpr={disabledExpr}
          groupBy={groupBy}
          showCheckBoxes={showCheckBoxes}
          searchEnabled={searchEnabled}
          searchExpr={searchExpr}
          searchMode={searchMode}
          height={height}
          noDataText={noDataText}
          labelledBy={titleId(side)}
          keyShortcuts={ogeTransferKeyShortcuts(side, rtl)}
          allowReordering={reorderable(side)}
          onReordering={(event) => onListReordering(side, event)}
          onReordered={(event) => onListReordered(side, event)}
          renderItem={renderItem}
          renderGroup={renderGroup}
          disabled={field.effectiveDisabled}
          readonly={readonly}
          size={props.size}
          messages={props.messages}
          tabIndex={props.tabIndex}
          value={isSource ? sourceSelection : targetSelection}
          onValueChange={isSource ? setSourceSelection : setTargetSelection}
        />
        {reorderLine?.side === side && (
          <div
            className="oge-transfer-list-reorder-line"
            aria-hidden="true"
            style={{
              top: reorderLine.top,
              left: reorderLine.left,
              width: reorderLine.width,
            }}
          />
        )}
      </div>
    );
  };

  const action = (
    text: string,
    enabled: boolean,
    direction: 'to-target' | 'to-source',
    path: string,
    run: () => void,
  ): ReactNode => (
    <button
      type="button"
      className={`oge-transfer-list-action oge-transfer-list-${direction}`}
      disabled={!enabled}
      aria-label={text}
      title={text}
      onClick={run}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d={path} />
      </svg>
    </button>
  );

  return (
    <div
      ref={hostRef}
      className={hostClasses}
      style={style}
      role="group"
      aria-labelledby={label ? field.ids.labelId : undefined}
      aria-describedby={subscript?.id}
      aria-disabled={field.effectiveDisabled ? true : undefined}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      {label && (
        <span className="oge-transfer-list-label" id={field.ids.labelId}>
          {label}
          {props.required && (
            <span className="oge-transfer-list-required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
      <div className="oge-transfer-list-body">
        {pane('source')}
        <div
          className="oge-transfer-list-actions"
          role="group"
          aria-label={field.msg.transferActionsLabel}
        >
          {action(
            field.msg.transferAddSelected,
            can('selected', 'source'),
            'to-target',
            'M6 3.5 10.5 8 6 12.5',
            () => moveCommand({ scope: 'selected', from: 'source' }, 'button'),
          )}
          {action(
            field.msg.transferAddAll,
            can('all', 'source'),
            'to-target',
            'M3.5 3.5 8 8l-4.5 4.5M8.5 3.5 13 8l-4.5 4.5',
            () => moveCommand({ scope: 'all', from: 'source' }, 'button'),
          )}
          {action(
            field.msg.transferRemoveSelected,
            can('selected', 'target'),
            'to-source',
            'M10 3.5 5.5 8l4.5 4.5',
            () => moveCommand({ scope: 'selected', from: 'target' }, 'button'),
          )}
          {action(
            field.msg.transferRemoveAll,
            can('all', 'target'),
            'to-source',
            'M12.5 3.5 8 8l4.5 4.5M7.5 3.5 3 8l4.5 4.5',
            () => moveCommand({ scope: 'all', from: 'target' }, 'button'),
          )}
        </div>
        {pane('target')}
      </div>
      {subscript && (
        <div
          className={[
            'oge-transfer-list-subscript',
            subscript.error && 'oge-transfer-list-error',
          ]
            .filter(Boolean)
            .join(' ')}
          id={subscript.id}
        >
          {subscript.text}
        </div>
      )}
    </div>
  );
}) as <TItem = unknown>(
  props: OgeTransferListProps<TItem> & {
    ref?: React.ForwardedRef<OgeTransferListHandle>;
  },
) => ReactNode;
