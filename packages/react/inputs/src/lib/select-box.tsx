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
  type OgeSelectValueExpr,
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

/** Payload of `onSelectionChange` — fires whenever the resolved item changes. */
export interface OgeSelectBoxSelectionChangedEvent<TItem> {
  item: TItem | null;
  previousItem: TItem | null;
}

/**
 * Payload of `onCustomItemCreating` (`acceptCustomValue`). Mutate
 * `customItem` to map the typed text to an item — or set it to `null` to
 * reject the text; a promise defers the decision.
 */
export interface OgeSelectBoxCustomItemEvent<TItem> {
  text: string;
  customItem?: TItem | null | PromiseLike<TItem | null>;
}

/** Payload of `onItemClick` — an option was activated by click or keyboard. */
export interface OgeSelectBoxItemClickEvent<TItem> {
  item: TItem;
  index: number;
  event: Event;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeSelectBoxHandle {
  focus(): void;
  blur(): void;
  clear(): void;
  open(): void;
  close(): void;
  toggle(): void;
}

export interface OgeSelectBoxProps<TItem = unknown>
  extends OgeControlProps<unknown>, OgeFieldExtrasProps {
  /** Item source: an array, or a function invoked lazily on first open. */
  items?: readonly TItem[] | OgeSelectItemsFn<TItem>;
  displayExpr?: OgeSelectDisplayExpr<TItem>;
  valueExpr?: OgeSelectValueExpr<TItem>;
  disabledExpr?: OgeSelectDisabledExpr<TItem>;
  /** Item → image URL rendered before the option text. */
  imageExpr?: OgeSelectImageExpr<TItem>;
  searchExpr?: OgeSelectSearchExpr<TItem>;
  /** Turns the field into a typeable filter input. */
  searchEnabled?: boolean;
  searchMode?: OgeSelectSearchMode;
  /** Debounce before typed text filters the list; config default otherwise. */
  searchTimeout?: number;
  minSearchLength?: number;
  showDataBeforeSearch?: boolean;
  /** Groups flat items under headers; items re-order by first-seen group. */
  groupBy?: OgeSelectGroupExpr<TItem>;
  /** Wraps long option text instead of ellipsizing it. */
  wrapItemText?: boolean;
  /** Mirrors each option's display text into its `title` attribute. */
  useItemTextAsTitle?: boolean;
  /** Renders the chevron toggle in the field rail. */
  showDropDownButton?: boolean;
  /** Clicking the field opens the popup (select-only mode toggles it). */
  openOnFieldClick?: boolean;
  /** Shows a loading row instead of items — server-side filtering escape hatch. */
  loading?: boolean;
  dropdownPlacement?: OgePopupPlacement;
  /** Panel width: fixed pixels or `'anchor'` to match the field box. */
  dropdownWidth?: number | 'anchor';
  /** Scrollable list height cap; `undefined` = the CSS default (320px). */
  dropdownMaxHeight?: number;
  /**
   * Windowed rendering for large lists: `true` or `{ itemHeight, overscan }`.
   * Rows get a fixed size-matched height; `groupBy` is ignored while active.
   */
  virtualScroll?: boolean | OgeVirtualScrollOptions;
  /** Lets Enter commit typed text that matches no option — see `onCustomItemCreating`. */
  acceptCustomValue?: boolean;
  /** Maps typed text to an item when `acceptCustomValue` is on. */
  onCustomItemCreating?: (payload: OgeSelectBoxCustomItemEvent<TItem>) => void;
  /** Custom option row rendering. */
  renderItem?: (
    item: TItem,
    context: { index: number; selected: boolean; active: boolean },
  ) => ReactNode;
  /** Popup visibility — controlled when provided. */
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  /** Fires whenever the resolved selected item changes (user or programmatic). */
  onSelectionChange?: (event: OgeSelectBoxSelectionChangedEvent<TItem>) => void;
  /** An option row was activated by click or keyboard. */
  onItemClick?: (event: OgeSelectBoxItemClickEvent<TItem>) => void;
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
 * Single-select dropdown editor — the React render of the Angular
 * `<oge-select-box>`: the WAI-ARIA combobox pattern
 * (`aria-activedescendant`, options never take focus), select-only
 * type-ahead or a typeable search filter with debounce, flat-data grouping,
 * lazy item functions with loading/empty/error rows and the full field
 * chrome — over `@oge-ui/behavior`'s `OgeSelectListCore`, the exact list
 * machine the Angular editor runs, plus `virtualScroll` windowing and
 * `acceptCustomValue` custom entries.
 *
 * ```tsx
 * <OgeSelectBox label="City" items={cities} value={city} onValueChange={setCity} />
 * ```
 */
export const OgeSelectBox = forwardRef(function OgeSelectBoxRender<TItem>(
  props: OgeSelectBoxProps<TItem>,
  ref: React.ForwardedRef<OgeSelectBoxHandle>,
) {
  // searchMode / dropdownPlacement / dropdownWidth are read through
  // `latest.current` inside the machine/panel getters, not destructured.
  const {
    items = [],
    searchEnabled = false,
    wrapItemText = false,
    useItemTextAsTitle = false,
    showDropDownButton = true,
    openOnFieldClick = true,
    loading = false,
    dropdownMaxHeight,
    virtualScroll = false,
    acceptCustomValue = false,
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

  const field = useOgeField<unknown>({
    props,
    emptyValue: null,
    isEmpty: (value) => value == null,
    focusNative: () => nativeRef.current?.focus(),
  });
  const readonly = props.readonly ?? false;

  // --- opened (controlled/uncontrolled) -------------------------------------

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

  // --- virtual window (fixed-height rows over the shared core model) --------

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
        'OgeSelectBox: virtualScroll ignores groupBy — group headers are not rendered in virtual mode.',
      );
    }
    if (wrapItemText) {
      console.warn(
        'OgeSelectBox: virtualScroll forces fixed-height rows — wrapItemText is ignored.',
      );
    }
  }, [virtual.active, props.groupBy, wrapItemText]);

  // --- the shared list machine, on a version-bump reactivity adapter --------

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const listRef = useRef<OgeSelectListCore<TItem>>(undefined);
  if (!listRef.current) {
    const rx = createBumpAdapter(bump);
    listRef.current = new OgeSelectListCore<TItem>(
      {
        inputId: () => latest.current.field.ids.inputId,
        opened: () => openedRef.current,
        items: () => latest.current.props.items ?? [],
        displayExpr: () => latest.current.props.displayExpr,
        valueExpr: () => latest.current.props.valueExpr,
        disabledExpr: () => latest.current.props.disabledExpr,
        imageExpr: () => latest.current.props.imageExpr,
        searchExpr: () => latest.current.props.searchExpr,
        searchEnabled: () => latest.current.props.searchEnabled ?? false,
        searchMode: () => latest.current.props.searchMode ?? 'contains',
        searchDebounceMs: () =>
          latest.current.props.searchTimeout ?? config.searchTimeoutMs,
        minSearchLength: () => latest.current.props.minSearchLength ?? 0,
        showDataBeforeSearch: () =>
          latest.current.props.showDataBeforeSearch ?? false,
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
      rx,
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

  // --- selection ------------------------------------------------------------

  /**
   * Custom value cache: an `acceptCustomValue` item is not in `items`, so
   * `selectedItem` falls back to it — otherwise the field text would blank.
   */
  const [customSelected, setCustomSelected] = useState<TItem | null>(null);
  const customSeq = useRef(0);

  /** The item whose `valueExpr` matches `value` — from the full item set. */
  const selectedItem: TItem | null = (() => {
    const currentValue = field.value;
    if (currentValue == null) return null;
    const found = list
      .resolvedItems()
      .find((item) => Object.is(list.itemValue(item), currentValue));
    if (found !== undefined) return found;
    return customSelected !== null &&
      Object.is(list.itemValue(customSelected), currentValue)
      ? customSelected
      : null;
  })();

  /** Display text of the selected item (`''` when empty). */
  const displayText = selectedItem === null ? '' : list.displayOf(selectedItem);
  const inputText = list.searchText() ?? displayText;

  // selectionChanged fires on every resolved-item change, including
  // programmatic value writes (reference parity) — but not on init.
  const previousItemRef = useRef<{ first: boolean; item: TItem | null }>({
    first: true,
    item: null,
  });
  useEffect(() => {
    const previous = previousItemRef.current;
    if (previous.first) {
      previousItemRef.current = { first: false, item: selectedItem };
      return;
    }
    if (selectedItem !== previous.item) {
      latest.current.props.onSelectionChange?.({
        item: selectedItem,
        previousItem: previous.item,
      });
      previousItemRef.current = { first: false, item: selectedItem };
    }
  });

  // --- panel ----------------------------------------------------------------

  const panel = useAnchoredPanel({
    // anchor on the bordered container, not the host — the host also holds
    // the label and subscript, which the popup must ignore
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

  const initActiveFromSelection = (): void =>
    list.activateItemOrFirst(selectedItemRef.current);
  const selectedItemRef = useRef(selectedItem);
  selectedItemRef.current = selectedItem;

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
      if (list.activeIndex() < 0) initActiveFromSelection();
      latest.current.props.onDropDownOpened?.();
    } else {
      if (machine.isOpen) machine.close('api');
      if (!announcedOpen.current) return;
      announcedOpen.current = false;
      list.activeIndex.set(-1);
      userNavigated.current = false;
      list.resetSearch();
      virtualRef.current.reset();
      latest.current.props.onDropDownClosed?.();
    }
  }, [opened, panel.isOpen]);

  // --- open/close/select ----------------------------------------------------

  const open = (): void => {
    if (field.effectiveDisabled || readonly) return;
    setOpened(true);
    if (list.activeIndex() < 0) initActiveFromSelection();
  };
  const close = (): void => setOpened(false);
  const toggle = (): void => (openedRef.current ? close() : open());

  const selectItem = (item: TItem, index: number, event: Event): void => {
    if (list.isItemDisabled(item)) return;
    latest.current.props.onItemClick?.({ item, index, event });
    setCustomSelected(null);
    field.commit.commitNow(list.itemValue(item), event);
    list.resetSearch();
    close();
    nativeRef.current?.focus();
  };

  const commitActive = (event: Event): void => {
    const visible = list.visibleItems();
    const index = list.activeIndex();
    if (index < 0 || index >= visible.length) {
      close();
      return;
    }
    selectItem(visible[index], index, event);
  };

  // --- custom values --------------------------------------------------------

  const applyCustomItem = (item: TItem, event?: Event): void => {
    setCustomSelected(item);
    field.commit.commitNow(list.itemValue(item), event);
    list.resetSearch();
    close();
  };

  /** Returns `true` when the typed text was handled (created or rejected). */
  const tryCreateCustomItem = (event?: Event): boolean => {
    const text = (list.searchText() ?? '').trim();
    if (!text) return false;
    // exact display match selects the existing item instead of creating one
    const existing = list
      .resolvedItems()
      .find(
        (item) =>
          list.displayOf(item).toLocaleLowerCase() === text.toLocaleLowerCase(),
      );
    if (existing !== undefined) {
      if (!list.isItemDisabled(existing)) {
        selectItem(
          existing,
          list.visibleItems().indexOf(existing),
          event ?? new Event('change'),
        );
      }
      return true;
    }
    const payload: OgeSelectBoxCustomItemEvent<TItem> = { text };
    latest.current.props.onCustomItemCreating?.(payload);
    const candidate =
      payload.customItem !== undefined
        ? payload.customItem
        : (text as unknown as TItem);
    if (candidate === null) return true; // handler rejected the text
    if (typeof (candidate as PromiseLike<unknown>)?.then === 'function') {
      const runId = ++customSeq.current;
      (candidate as PromiseLike<TItem | null>).then(
        (resolved) => {
          if (runId === customSeq.current && resolved != null) {
            applyCustomItem(resolved, event);
          }
        },
        () => undefined,
      );
      return true;
    }
    applyCustomItem(candidate as TItem, event);
    return true;
  };

  // --- keyboard -------------------------------------------------------------

  const userNavigated = useRef(false);
  const typeBuffer = useRef('');
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (typeTimer.current !== null) clearTimeout(typeTimer.current);
    },
    [],
  );

  const typeAhead = (char: string): void => {
    if (!openedRef.current) open();
    if (typeTimer.current !== null) clearTimeout(typeTimer.current);
    typeTimer.current = setTimeout(() => {
      typeBuffer.current = '';
      typeTimer.current = null;
    }, overlayConfig.typeAheadMs);
    const lower = char.toLocaleLowerCase();
    // repeating one character cycles through its matches instead of matching "aa"
    const cycling =
      typeBuffer.current.length > 0 &&
      Array.from(typeBuffer.current).every(
        (c) => c.toLocaleLowerCase() === lower,
      );
    typeBuffer.current += char;
    const query = cycling ? lower : typeBuffer.current.toLocaleLowerCase();
    const visible = list.visibleItems();
    if (visible.length === 0) return;
    const start = Math.max(list.activeIndex(), 0);
    for (let offset = cycling ? 1 : 0; offset <= visible.length; offset++) {
      const index = (start + offset) % visible.length;
      const item = visible[index];
      if (list.isItemDisabled(item)) continue;
      if (list.displayOf(item).toLocaleLowerCase().startsWith(query)) {
        list.setActive(index);
        return;
      }
    }
  };

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
        userNavigated.current = true;
        if (event.altKey && event.key === 'ArrowUp') {
          commitActive(event.nativeEvent);
          return;
        }
        list.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Enter': {
        if (isOpen) {
          event.preventDefault();
          // typed text wins over the auto-activated option when custom
          // values are on and the user has not arrowed through the list
          if (
            acceptCustomValue &&
            list.searchText() !== null &&
            !userNavigated.current &&
            tryCreateCustomItem(event.nativeEvent)
          ) {
            return;
          }
          commitActive(event.nativeEvent);
          return;
        }
        field.handleEnterKey(event);
        return;
      }
      case 'Escape': {
        if (isOpen) {
          event.preventDefault();
          close();
          return;
        }
        // two-stage Escape: popup already closed → clear the search text
        if (list.searchText()) {
          event.preventDefault();
          list.resetSearch();
        }
        return;
      }
      case 'Tab': {
        if (isOpen) close();
        return;
      }
      case 'Home':
      case 'End': {
        // editable mode: Home/End move the text caret (APG)
        if (searchEnabled) return;
        event.preventDefault();
        list.setActive(
          event.key === 'Home'
            ? list.edgeEnabledIndex(1)
            : list.edgeEnabledIndex(-1),
        );
        if (!isOpen) open();
        return;
      }
      case 'PageDown':
      case 'PageUp': {
        if (isOpen) {
          event.preventDefault();
          userNavigated.current = true;
          list.moveActive(event.key === 'PageDown' ? 10 : -10);
        }
        return;
      }
      case ' ': {
        if (searchEnabled) return;
        event.preventDefault();
        if (!isOpen) open();
        else commitActive(event.nativeEvent);
        return;
      }
      default: {
        // select-only type-ahead on printable characters
        if (
          !searchEnabled &&
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.preventDefault();
          typeAhead(event.key);
        }
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

  // --- render ---------------------------------------------------------------

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
    'oge-select-box',
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
          <span className="oge-select-option-text">{list.displayOf(item)}</span>
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
          className={['oge-input-native', !searchEnabled && 'oge-select-plain']
            .filter(Boolean)
            .join(' ')}
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          autoComplete="off"
          id={field.ids.inputId}
          value={inputText}
          placeholder={placeholderText}
          disabled={field.effectiveDisabled}
          readOnly={readonly || !searchEnabled}
          name={props.name || undefined}
          title={props.tooltip}
          tabIndex={props.tabIndex ?? 0}
          autoFocus={props.autofocus}
          aria-expanded={opened}
          aria-controls={opened ? list.listboxId : undefined}
          aria-autocomplete={searchEnabled ? 'list' : 'none'}
          aria-activedescendant={list.activeDescendant() ?? undefined}
          aria-label={labelMode === 'hidden' && label ? label : undefined}
          aria-labelledby={
            labelMode !== 'hidden' && label ? field.ids.labelId : undefined
          }
          aria-describedby={describedBy}
          aria-invalid={field.showError ? true : undefined}
          aria-required={props.required ? true : undefined}
          onChange={(event) => {
            if (!searchEnabled) return;
            const text = event.target.value;
            userNavigated.current = false;
            list.setSearch(text);
            props.onInputChange?.({ text, event: event.nativeEvent });
            props.onSearchChange?.({ text });
            if (!openedRef.current) open();
          }}
          onClick={() => {
            if (field.effectiveDisabled || readonly) return;
            if (!openedRef.current) {
              if (openOnFieldClick) open();
              return;
            }
            // while searching, clicks reposition the caret — only
            // select-only toggles
            if (!searchEnabled) close();
          }}
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            if (selectOnFocus) nativeRef.current?.select();
            field.handleFocus(event);
          }}
          onBlur={(event) => {
            // custom values commit on blur; otherwise uncommitted search
            // text reverts to the selected display text
            if (
              acceptCustomValue &&
              list.searchText() !== null &&
              tryCreateCustomItem()
            ) {
              field.handleBlur(event);
              return;
            }
            list.resetSearch();
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
  props: OgeSelectBoxProps<TItem> & {
    ref?: React.ForwardedRef<OgeSelectBoxHandle>;
  },
) => ReactNode;
