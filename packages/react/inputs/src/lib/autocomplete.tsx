'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  OgeSelectListCore,
  type OgeVirtualScrollOptions,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectGroupExpr,
  type OgeSelectImageExpr,
  type OgeSelectItemsFn,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
} from '@oge-ui/behavior';
import {
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgePopupPlacement,
} from '@oge-ui/react-overlay';
import { OgeFieldChrome } from './field-chrome';
import { createBumpAdapter } from './rx-adapter';
import { isDevMode } from './dev';
import { useListVirtualizer } from './use-list-virtualizer';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeField, type OgeControlProps } from './use-field';
import { useOgeInputsConfig } from './inputs-config';

/** Payload of `onSelectionChange` — the picked suggestion (or `null`). */
export interface OgeAutocompleteSelectionChangedEvent<TItem> {
  item: TItem | null;
  event?: Event;
}

/** Payload of `onItemClick` — a suggestion was activated. */
export interface OgeAutocompleteItemClickEvent<TItem> {
  item: TItem;
  index: number;
  event: Event;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeAutocompleteHandle {
  focus(): void;
  blur(): void;
  clear(): void;
  open(): void;
  close(): void;
  toggle(): void;
}

export interface OgeAutocompleteProps<TItem = unknown>
  extends OgeControlProps<string>, OgeFieldExtrasProps {
  /** Suggestion source: an array, or a function invoked lazily on open. */
  items?: readonly TItem[] | OgeSelectItemsFn<TItem>;
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  imageExpr?: OgeSelectImageExpr<TItem>;
  groupBy?: OgeSelectGroupExpr<TItem>;
  searchMode?: OgeSelectSearchMode;
  searchExpr?: OgeSelectSearchExpr<TItem>;
  /** Debounce before typed text filters the list; config default otherwise. */
  searchTimeout?: number;
  /** Characters required before suggestions open (default 1). */
  minSearchLength?: number;
  /** Caps the suggestion list length (default 10). */
  maxItemCount?: number;
  /** Reverts non-matching text to the last committed value on blur/Enter. */
  forceSelection?: boolean;
  /** Bolds the typed match inside each suggestion. */
  searchHighlight?: boolean;
  showDropDownButton?: boolean;
  openOnFieldClick?: boolean;
  /** Shows a loading row — the server-side filtering escape hatch. */
  loading?: boolean;
  dropdownPlacement?: OgePopupPlacement;
  dropdownWidth?: number | 'anchor';
  dropdownMaxHeight?: number;
  /**
   * Windowed rendering for large lists: `true` or `{ itemHeight, overscan }`.
   * Rows get a fixed size-matched height; `groupBy` is ignored while active.
   */
  virtualScroll?: boolean | OgeVirtualScrollOptions;
  /** Wraps long suggestion text instead of ellipsizing it. */
  wrapItemText?: boolean;
  useItemTextAsTitle?: boolean;
  /** Custom suggestion row rendering. */
  renderItem?: (
    item: TItem,
    context: { index: number; selected: boolean; active: boolean },
  ) => ReactNode;
  /** Popup visibility — controlled when provided. */
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  /** The last picked suggestion changed (`null` once the text diverges). */
  onSelectionChange?: (
    event: OgeAutocompleteSelectionChangedEvent<TItem>,
  ) => void;
  onItemClick?: (event: OgeAutocompleteItemClickEvent<TItem>) => void;
  onDropDownOpened?: () => void;
  onDropDownClosed?: () => void;
  /** Raw search text on every keystroke — drive server-side filtering. */
  onSearchChange?: (event: { text: string }) => void;
  onInputChange?: (event: { text: string; event: Event }) => void;
  label?: string;
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  placeholder?: string;
  hint?: string;
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';
  fluid?: boolean;
  showClearButton?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Text editor with a filtered suggestion list — the React render of the
 * Angular `<oge-autocomplete>`: the value is the **text itself** (`string`),
 * not an item value. Suggestions open while typing (from `minSearchLength`
 * characters on), the list caps at `maxItemCount`, picking a suggestion
 * writes its display text, `forceSelection` reverts non-matching text, and
 * the typed match highlights inside each row — over `@oge-ui/behavior`'s
 * `OgeSelectListCore`, the exact list machine the Angular editor runs, plus
 * `virtualScroll` windowing.
 *
 * ```tsx
 * <OgeAutocomplete label="City" items={cities} value={cityName} onValueChange={setCityName} />
 * ```
 */
export const OgeAutocomplete = forwardRef(function OgeAutocompleteRender<TItem>(
  props: OgeAutocompleteProps<TItem>,
  ref: React.ForwardedRef<OgeAutocompleteHandle>,
) {
  const {
    items = [],
    minSearchLength = 1,
    // `forceSelection` is read live through `latest.current.props` at commit
    // time, so it is deliberately not destructured here.
    searchHighlight = true,
    showDropDownButton = false,
    openOnFieldClick = false,
    loading = false,
    dropdownMaxHeight,
    virtualScroll = false,
    wrapItemText = false,
    useItemTextAsTitle = false,
    renderItem,
    showSuccessIcon = false,
    selectOnFocus = false,
    inputAttr,
    label = '',
    labelMode = 'static',
    stylingMode = 'outlined',
    placeholder = '',
    hint,
    subscriptSizing = 'fixed',
    fluid = false,
    showClearButton = false,
    prefix,
    suffix,
    className,
    style,
  } = props;

  const config = useOgeInputsConfig();
  const overlayConfig = useOgeOverlayConfig();
  const hostRef = useRef<HTMLSpanElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listElRef = useRef<HTMLDivElement>(null);

  const field = useOgeField<string>({
    props,
    emptyValue: '',
    isEmpty: (value) => value === '',
    focusNative: () => nativeRef.current?.focus(),
  });
  const readonly = props.readonly ?? false;

  const [uncontrolledOpened, setUncontrolledOpened] = useState(
    props.defaultOpened ?? false,
  );
  const opened = props.opened ?? uncontrolledOpened;
  const openedRef = useRef(opened);
  openedRef.current = opened;

  const latest = useRef({ props, field, opened });
  latest.current = { props, field, opened };

  const setOpened = (next: boolean): void => {
    if (latest.current.props.opened === undefined) setUncontrolledOpened(next);
    latest.current.props.onOpenedChange?.(next);
  };

  const virtual = useListVirtualizer({
    virtualScroll,
    size: props.size ?? 'md',
    dropdownMaxHeight,
    itemCount: () => listRef.current?.visibleItems().length ?? 0,
    listEl: listElRef,
  });
  const virtualRef = useRef(virtual);
  virtualRef.current = virtual;

  useEffect(() => {
    if (!isDevMode() || !virtual.active) return;
    if (props.groupBy !== undefined) {
      console.warn(
        'OgeAutocomplete: virtualScroll ignores groupBy — group headers are not rendered in virtual mode.',
      );
    }
    if (wrapItemText) {
      console.warn(
        'OgeAutocomplete: virtualScroll forces fixed-height rows — wrapItemText is ignored.',
      );
    }
  }, [virtual.active, props.groupBy, wrapItemText]);

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const listRef = useRef<OgeSelectListCore<TItem>>(undefined);
  if (!listRef.current) {
    listRef.current = new OgeSelectListCore<TItem>(
      {
        inputId: () => latest.current.field.ids.inputId,
        opened: () => openedRef.current,
        items: () => latest.current.props.items ?? [],
        displayExpr: () => latest.current.props.displayExpr,
        valueExpr: () => undefined,
        disabledExpr: () => latest.current.props.disabledExpr,
        imageExpr: () => latest.current.props.imageExpr,
        searchExpr: () => latest.current.props.searchExpr,
        searchEnabled: () => true,
        searchMode: () => latest.current.props.searchMode ?? 'contains',
        searchDebounceMs: () =>
          latest.current.props.searchTimeout ?? config.searchTimeoutMs,
        minSearchLength: () => latest.current.props.minSearchLength ?? 1,
        showDataBeforeSearch: () => true,
        maxItems: () => latest.current.props.maxItemCount ?? 10,
        groupBy: () =>
          virtualRef.current.active ? undefined : latest.current.props.groupBy,
        scrollActiveIntoView: (index) => {
          if (virtualRef.current.active) {
            virtualRef.current.scrollToIndex(index);
          } else {
            listRef.current?.scrollOptionIntoView(index);
          }
        },
      },
      createBumpAdapter(bump),
    );
  }
  const list = listRef.current;
  useEffect(() => () => list.destroy(), [list]);

  /** Items input changes: array ↔ function, or a new reference. */
  const armedItemsRef = useRef(items);
  useEffect(() => {
    if (armedItemsRef.current === items) return;
    armedItemsRef.current = items;
    list.syncItemsSource();
    if (openedRef.current) list.ensureItemsLoaded();
  });

  // filtering may shrink the list under the active option
  useEffect(() => {
    if (openedRef.current && list.activeIndex() >= list.visibleItems().length) {
      list.activeIndex.set(-1);
    }
  });

  // --- selected suggestion ---------------------------------------------------

  /** The last picked suggestion; `null` once the text diverges from it. */
  const [selectedItem, setSelectedItemState] = useState<TItem | null>(null);
  const selectedRef = useRef(selectedItem);
  selectedRef.current = selectedItem;

  const setSelected = (item: TItem | null, event?: Event): void => {
    if (selectedRef.current === item) return;
    selectedRef.current = item;
    setSelectedItemState(item);
    latest.current.props.onSelectionChange?.({ item, event });
  };

  // A programmatic value write clears a stale selection.
  const [prevValue, setPrevValue] = useState(field.value);
  if (prevValue !== field.value) {
    setPrevValue(field.value);
    if (
      selectedRef.current !== null &&
      list.displayOf(selectedRef.current) !== field.value
    ) {
      setSelected(null);
    }
  }

  const inputText = list.searchText() ?? field.value;

  // --- panel -----------------------------------------------------------------

  const panel = useAnchoredPanel({
    anchor: () =>
      hostRef.current?.querySelector<HTMLElement>('.oge-input-container') ??
      hostRef.current,
    panel: () => popupRef.current,
    placement: () => latest.current.props.dropdownPlacement ?? 'bottom-start',
    width: () => latest.current.props.dropdownWidth ?? 'anchor',
    offset: () => overlayConfig.offset,
    viewportPadding: () => overlayConfig.viewportPadding,
    restoreFocus: () => nativeRef.current?.focus(),
    onClosed: () => {
      if (openedRef.current) setOpened(false);
    },
  });
  const panelRef = useRef(panel);
  panelRef.current = panel;

  // Tracks what we have already announced: the panel machine can close itself
  // (Escape, outside click), so `machine.isOpen` alone would miss those closes
  // and never run the teardown.
  const announcedOpen = useRef(false);
  useEffect(() => {
    const machine = panelRef.current;
    if (opened) {
      if (!machine.isOpen) machine.open();
      if (announcedOpen.current) return;
      announcedOpen.current = true;
      list.ensureItemsLoaded();
      latest.current.props.onDropDownOpened?.();
    } else {
      if (machine.isOpen) machine.close('api');
      if (!announcedOpen.current) return;
      announcedOpen.current = false;
      list.activeIndex.set(-1);
      virtualRef.current.reset();
      latest.current.props.onDropDownClosed?.();
    }
  }, [opened, panel.isOpen]);

  const open = (): void => {
    if (field.effectiveDisabled || readonly) return;
    setOpened(true);
  };
  const close = (): void => setOpened(false);
  const toggle = (): void => (openedRef.current ? close() : open());

  // --- selection / commit ----------------------------------------------------

  const applySelection = (item: TItem, event: Event): void => {
    setSelected(item, event);
    field.commit.commitNow(list.displayOf(item), event);
    list.resetSearch();
    if (openedRef.current) close();
  };

  const selectItem = (item: TItem, index: number, event: Event): void => {
    if (list.isItemDisabled(item)) return;
    latest.current.props.onItemClick?.({ item, index, event });
    applySelection(item, event);
    nativeRef.current?.focus();
  };

  /** Commits the uncommitted typed text (blur/Enter), honoring `forceSelection`. */
  const commitTypedText = (event?: Event): void => {
    const typed = list.searchText();
    if (typed === null) return;
    const trimmed = typed.trim();
    const match = list
      .resolvedItems()
      .find(
        (item) =>
          list.displayOf(item).toLocaleLowerCase() ===
            trimmed.toLocaleLowerCase() && !list.isItemDisabled(item),
      );
    if (match !== undefined) {
      applySelection(match, event ?? new Event('change'));
      return;
    }
    if (latest.current.props.forceSelection) {
      list.resetSearch();
      return;
    }
    setSelected(null, event);
    field.commit.commitNow(typed, event);
    list.resetSearch();
  };

  // --- keyboard --------------------------------------------------------------

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (field.effectiveDisabled || readonly) return;
    const isOpen = openedRef.current;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!isOpen) {
          open();
          return;
        }
        list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        if (isOpen && list.activeIndex() >= 0) {
          event.preventDefault();
          const visible = list.visibleItems();
          const index = list.activeIndex();
          if (index < visible.length) {
            selectItem(visible[index], index, event.nativeEvent);
            return;
          }
        }
        commitTypedText(event.nativeEvent);
        if (isOpen) close();
        field.handleEnterKey(event);
        return;
      }
      case 'Escape': {
        if (isOpen) {
          event.preventDefault();
          close();
          return;
        }
        if (list.searchText() !== null) {
          event.preventDefault();
          list.resetSearch();
        }
        return;
      }
      case 'Tab': {
        if (isOpen) close();
        return;
      }
      case 'PageDown':
      case 'PageUp': {
        if (isOpen) {
          event.preventDefault();
          list.moveActive(event.key === 'PageDown' ? 10 : -10);
        }
        return;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    focus: () => nativeRef.current?.focus(),
    blur: () => nativeRef.current?.blur(),
    clear: () => field.clear(),
    open,
    close,
    toggle,
  }));

  // --- render ----------------------------------------------------------------

  /** Splits a suggestion's display text around the typed match. */
  const highlightOf = (
    item: TItem,
  ): { pre: string; match: string; post: string } | null => {
    if (!searchHighlight) return null;
    const term = (list.searchText() ?? '').trim();
    if (!term) return null;
    const text = list.displayOf(item);
    const index = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
    if (index < 0) return null;
    return {
      pre: text.slice(0, index),
      match: text.slice(index, index + term.length),
      post: text.slice(index + term.length),
    };
  };

  const floatUp = field.focused || !field.isEmpty || opened;
  const placeholderText =
    labelMode === 'floating' && label && !floatUp ? '' : placeholder;
  const itemsStatus = list.itemsStatus();
  const rows = list.rows();
  const activeIndex = list.activeIndex();

  const describedBy = (() => {
    const parts: string[] = [];
    if (subscriptSizing !== 'none') {
      if (field.showError && field.resolvedErrorText) {
        parts.push(field.ids.errorId);
      } else if (hint) parts.push(field.ids.hintId);
    }
    return parts.length ? parts.join(' ') : undefined;
  })();

  const successVisible = successIconVisible(showSuccessIcon, {
    pending: props.pending ?? false,
    invalid: field.effectiveInvalid,
    empty: field.isEmpty,
    touched: field.effectiveTouched,
  });
  const extraAttrs = nativeInputAttrs(inputAttr);

  const hostClasses = [
    'oge-input',
    'oge-autocomplete',
    opened && 'oge-select-box-open',
    field.effectiveDisabled && 'oge-disabled',
    field.focused && 'oge-input-focused',
    field.showError && 'oge-input-invalid',
    readonly && 'oge-input-readonly',
    field.isEmpty && 'oge-input-empty',
    fluid && 'oge-input-fluid',
    floatUp && 'oge-input-float-up',
    props.size === 'sm' && 'oge-input-sm',
    props.size === 'lg' && 'oge-input-lg',
    stylingMode === 'filled' && 'oge-input-filled',
    stylingMode === 'underlined' && 'oge-input-underlined',
    labelMode === 'floating' && 'oge-input-label-floating',
    labelMode === 'outside' && 'oge-input-label-outside',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const statusRow = (content: ReactNode) => (
    <div className="oge-select-status" role="presentation">
      {content}
    </div>
  );

  const visibleItems = list.visibleItems();
  const virtualWindow = virtual.window();
  /** The windowed slice rendered in virtual mode — indices stay absolute. */
  const windowedItems = virtual.active
    ? visibleItems
        .slice(virtualWindow.start, virtualWindow.end)
        .map((item, offset) => ({ item, index: virtualWindow.start + offset }))
    : [];

  const optionRow = (item: TItem, index: number, positional: boolean) => (
    <div
      key={index}
      className={[
        'oge-select-option',
        index === activeIndex && 'oge-select-option-active',
        item === selectedItem && 'oge-select-option-selected',
        list.isItemDisabled(item) && 'oge-disabled',
      ]
        .filter(Boolean)
        .join(' ')}
      role="option"
      id={list.optionId(index)}
      aria-selected={item === selectedItem}
      aria-disabled={list.isItemDisabled(item) ? true : undefined}
      aria-posinset={positional ? index + 1 : undefined}
      aria-setsize={positional ? visibleItems.length : undefined}
      title={useItemTextAsTitle ? list.displayOf(item) : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={() => {
        if (!list.isItemDisabled(item)) list.activeIndex.set(index);
      }}
      onClick={(event) => selectItem(item, index, event.nativeEvent)}
    >
      {renderItem ? (
        renderItem(item, {
          index,
          selected: item === selectedItem,
          active: index === activeIndex,
        })
      ) : (
        <>
          {list.imageOf(item) && (
            <img
              className="oge-select-option-img"
              src={list.imageOf(item) ?? undefined}
              alt=""
              loading="lazy"
            />
          )}
          <span className="oge-select-option-text">
            {(() => {
              const parts = highlightOf(item);
              if (!parts) return list.displayOf(item);
              return (
                <>
                  {parts.pre}
                  <mark className="oge-select-highlight">{parts.match}</mark>
                  {parts.post}
                </>
              );
            })()}
          </span>
        </>
      )}
    </div>
  );

  return (
    <span ref={hostRef} className={hostClasses} style={style}>
      <OgeFieldChrome
        host={{
          msg: field.msg,
          ...field.ids,
          label,
          labelMode,
          required: props.required ?? false,
          pendingVisible: props.pending ?? false,
          successVisible,
          showClear:
            showClearButton &&
            !field.isEmpty &&
            !field.effectiveDisabled &&
            !readonly,
          clear: () => field.clear(),
          subscriptSizing,
          showError: field.showError,
          resolvedErrorText: field.resolvedErrorText,
          hint,
          counter: null,
          reveal: null,
          copy: null,
          spin: null,
          dropdown: {
            visible: showDropDownButton && !field.effectiveDisabled,
            expanded: opened,
            toggle,
          },
        }}
        prefix={prefix}
        suffix={suffix}
      >
        <input
          {...extraAttrs}
          ref={nativeRef}
          className="oge-input-native"
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          autoComplete="off"
          id={field.ids.inputId}
          value={inputText}
          placeholder={placeholderText}
          disabled={field.effectiveDisabled}
          readOnly={readonly}
          name={props.name || undefined}
          title={props.tooltip}
          tabIndex={props.tabIndex ?? 0}
          autoFocus={props.autofocus}
          aria-expanded={opened}
          aria-controls={opened ? list.listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={list.activeDescendant() ?? undefined}
          aria-label={labelMode === 'hidden' && label ? label : undefined}
          aria-labelledby={
            labelMode !== 'hidden' && label ? field.ids.labelId : undefined
          }
          aria-describedby={describedBy}
          aria-invalid={field.showError ? true : undefined}
          aria-required={props.required ? true : undefined}
          onChange={(event) => {
            const text = event.target.value;
            list.setSearch(text);
            props.onInputChange?.({ text, event: event.nativeEvent });
            props.onSearchChange?.({ text });
            if (text.trim().length >= minSearchLength) {
              if (!openedRef.current) open();
            } else if (openedRef.current) {
              close();
            }
          }}
          onClick={() => {
            if (field.effectiveDisabled || readonly) return;
            if (!openedRef.current && openOnFieldClick) open();
          }}
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            if (selectOnFocus) nativeRef.current?.select();
            field.handleFocus(event);
          }}
          onBlur={(event) => {
            commitTypedText(event.nativeEvent);
            if (openedRef.current) close();
            field.handleBlur(event);
          }}
        />
      </OgeFieldChrome>
      {opened && (
        <OgePopup panel={panel} ref={popupRef}>
          <div
            ref={listElRef}
            className={[
              'oge-select-list',
              wrapItemText && !virtual.active && 'oge-select-wrap',
              virtual.active && 'oge-select-list-virtual',
            ]
              .filter(Boolean)
              .join(' ')}
            role="listbox"
            id={list.listboxId}
            style={{ maxHeight: dropdownMaxHeight }}
            aria-labelledby={
              labelMode !== 'hidden' && label ? field.ids.labelId : undefined
            }
            aria-label={labelMode === 'hidden' && label ? label : undefined}
            onScroll={virtual.onScroll}
          >
            {loading || itemsStatus === 'loading' ? (
              statusRow(field.msg.dropDownLoading)
            ) : itemsStatus === 'error' ? (
              statusRow(field.msg.dropDownLoadError)
            ) : rows.length === 0 ? (
              statusRow(field.msg.noDataText)
            ) : virtual.active ? (
              <div
                className="oge-select-spacer"
                style={{ height: virtualWindow.totalHeight }}
              >
                <div
                  className="oge-select-window"
                  style={{
                    transform: `translateY(${virtualWindow.offsetY}px)`,
                  }}
                >
                  {windowedItems.map((row) =>
                    optionRow(row.item, row.index, true),
                  )}
                </div>
              </div>
            ) : (
              rows.map((row, rowIndex) =>
                row.kind === 'group' ? (
                  <div
                    key={`g-${rowIndex}`}
                    className="oge-select-group"
                    role="presentation"
                  >
                    {row.label}
                  </div>
                ) : (
                  optionRow(row.item, row.index, false)
                ),
              )
            )}
          </div>
        </OgePopup>
      )}
    </span>
  );
}) as <TItem = unknown>(
  props: OgeAutocompleteProps<TItem> & {
    ref?: React.ForwardedRef<OgeAutocompleteHandle>;
  },
) => ReactNode;
