'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { withInputWidth } from './field-extras';
import {
  buildTreeViewIndex,
  formatPattern,
  ogeChipOverflow,
  treeAccessor,
  type OgeTreeCheckBoxesMode,
  type OgeTreeDataStructure,
  type OgeTreeExpr,
  type OgeTreeLoadChildren,
  type OgeTreeSearchMode,
  type OgeTreeSelectedKeysMode,
  type OgeTreeVirtualScrollOptions,
  type RowKey,
  type TreeFilterMode,
} from '@oge-ui/behavior';
import {
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgePopupPlacement,
} from '@oge-ui/react-overlay';
import { OgeTreeView, type OgeTreeViewHandle } from '@oge-ui/react-navigation';
import { OgeFieldChrome } from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeField, type OgeControlProps } from './use-field';
import { SheetDone, useAdaptivePopup, type OgeAdaptiveProps } from './adaptive';

/** How many nodes the tree select may commit. */
export type OgeTreeSelectSelectionMode = 'single' | 'multiple';

/** How a multiple-selection value is rendered in the closed field. */
export type OgeTreeSelectDisplayMode = 'text' | 'count';

/**
 * Whether the closed field shows the selection as text (`displayMode`
 * applies) or as removable chips.
 */
export type OgeTreeSelectShowSelectionAs = 'text' | 'chips';

/** Payload of `onSelectionChanged` — the committed value changed via the tree. */
export interface OgeTreeSelectSelectionChangedEvent {
  /** Selected keys after the change — a single key is still an array here. */
  readonly keys: readonly RowKey[];
  readonly previousKeys: readonly RowKey[];
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeTreeSelectHandle {
  focus(): void;
  blur(): void;
  clear(): void;
  open(): void;
  close(): void;
  toggle(): void;
}

export interface OgeTreeSelectProps<
  TItem extends object = Record<string, unknown>,
>
  extends OgeAdaptiveProps, OgeControlProps<unknown>, OgeFieldExtrasProps {
  /** Nodes to display — a flat parent-referencing list or nested children. */
  items?: readonly TItem[];
  /** Field holding a node's stable key. */
  keyExpr?: OgeTreeExpr<TItem, RowKey>;
  /** Field holding a node's parent key (flat data). */
  parentIdExpr?: OgeTreeExpr<TItem>;
  /** Field holding nested children; setting it switches to hierarchical data. */
  itemsExpr?: OgeTreeExpr<TItem, readonly TItem[] | undefined>;
  /** Field holding the display text, used for the field text too. */
  displayExpr?: OgeTreeExpr<TItem>;
  /** Field marking a node disabled. */
  disabledExpr?: OgeTreeExpr<TItem>;
  /** Field hinting at not-yet-loaded children — pairs with `loadChildren`. */
  hasItemsExpr?: OgeTreeExpr<TItem>;
  /** Field holding SVG path data (`d`) for a per-node icon. */
  iconExpr?: OgeTreeExpr<TItem>;
  /** Parent value that marks root nodes in flat data. */
  rootValue?: unknown;
  /** Explicit data shape; inferred from `itemsExpr` when unset. */
  dataStructure?: OgeTreeDataStructure;

  /** One node or many. `multiple` makes the value an array of keys. */
  selectionMode?: OgeTreeSelectSelectionMode;
  /** Checkbox column inside the popup. */
  showCheckBoxes?: OgeTreeCheckBoxesMode;
  /** Cascades selection down to descendants and up to full parents. */
  selectNodesRecursive?: boolean;
  /** Projection applied to the committed keys in `multiple` mode. */
  selectedKeysMode?: OgeTreeSelectedKeysMode;
  /** How a multiple-selection value is rendered in the closed field. */
  displayMode?: OgeTreeSelectDisplayMode;
  /**
   * `'chips'` renders the selected nodes as removable chips in the field
   * (Backspace removes the last one); `'text'` keeps the comma list /
   * `displayMode`.
   */
  showSelectionAs?: OgeTreeSelectShowSelectionAs;
  /** In chips mode, caps the rendered chips; the rest fold into `+N more`. */
  maxDisplayedTags?: number;
  /**
   * Which gesture expands a node inside the popup. Defaults to `dblclick`, not
   * the tree's own `click`: in a picker a single click should choose a node,
   * and the chevron expands either way.
   */
  expandEvent?: 'click' | 'dblclick';

  /** Renders the tree's search box inside the popup. */
  searchEnabled?: boolean;
  /** How the search text is compared. */
  searchMode?: OgeTreeSearchMode;
  /** Which relatives of a search match stay visible. */
  filterMode?: TreeFilterMode;
  /** Loads a node's children the first time it expands. */
  loadChildren?: OgeTreeLoadChildren<TItem>;
  /** Windowed rendering inside the popup for very large trees. */
  virtualScroll?: boolean | OgeTreeVirtualScrollOptions;

  /** Keys of the expanded nodes — controlled when provided. */
  expandedKeys?: readonly RowKey[];
  defaultExpandedKeys?: readonly RowKey[];
  onExpandedKeysChange?: (keys: readonly RowKey[]) => void;
  /** Popup visibility — controlled when provided. */
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;

  /** Popup placement relative to the field. */
  dropdownPlacement?: OgePopupPlacement;
  /** Popup width; `'anchor'` matches the field. */
  dropdownWidth?: number | 'anchor';
  /** Max height of the popup in pixels. */
  dropdownMaxHeight?: number;
  /** Opens the popup when the field itself is clicked, not just the chevron. */
  openOnFieldClick?: boolean;

  /** Fires after the committed selection changed. */
  onSelectionChanged?: (event: OgeTreeSelectSelectionChangedEvent) => void;
  /** Fires after the popup opened. */
  onDropDownOpened?: () => void;
  /** Fires after the popup closed. */
  onDropDownClosed?: () => void;

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

const EMPTY_KEYS: readonly RowKey[] = [];

/** The value as a key list, whatever the selection mode. */
function keysOfValue(value: unknown): readonly RowKey[] {
  if (value === null || value === undefined) return EMPTY_KEYS;
  return Array.isArray(value) ? (value as RowKey[]) : [value as RowKey];
}

function sameKeys(a: readonly RowKey[], b: readonly RowKey[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

/**
 * Drop-down editor whose popup is a full `<OgeTreeView>` — the hierarchical
 * counterpart of `OgeSelectBox`, on the same field chrome (label modes,
 * validation subscript, clear button) and the React render of the Angular
 * `<oge-tree-select>`.
 *
 * The field is a WAI-ARIA combobox with `aria-haspopup="tree"`. Unlike the
 * select box it does **not** use `aria-activedescendant`: the tree owns a
 * roving tabindex, so opening moves real DOM focus into it, which is the
 * combobox pattern's other sanctioned option and keeps the tree's own APG
 * keyboard map (arrows, Home/End, type-ahead, `*`) intact.
 *
 * The popup is the navigation package's tree component itself, not a copy of
 * it — the same edge the Angular tree select takes into `@oge-ui/navigation`
 * (ADR 0001), so the two layers can never drift in markup, behavior or
 * defaults. Tree defaults and strings come from
 * `<OgeTreeViewConfigProvider>`, exactly as the Angular tree picks up
 * `provideOgeTreeViewConfig()`.
 *
 * ```tsx
 * <OgeTreeSelect
 *   label="Folder"
 *   items={folders}
 *   keyExpr="id"
 *   parentIdExpr="parentId"
 *   displayExpr="name"
 *   value={folderId}
 *   onValueChange={setFolderId}
 * />
 * ```
 */
export const OgeTreeSelect = forwardRef(function OgeTreeSelectRender<
  TItem extends object,
>(
  props: OgeTreeSelectProps<TItem>,
  ref: React.ForwardedRef<OgeTreeSelectHandle>,
) {
  const {
    items,
    keyExpr = 'id',
    parentIdExpr = 'parentId',
    itemsExpr,
    displayExpr = 'text',
    disabledExpr = 'disabled',
    hasItemsExpr = 'hasItems',
    iconExpr,
    rootValue,
    dataStructure,
    selectionMode = 'single',
    showCheckBoxes = 'none',
    selectNodesRecursive = true,
    selectedKeysMode = 'all',
    displayMode = 'text',
    showSelectionAs = 'text',
    maxDisplayedTags,
    expandEvent = 'dblclick',
    searchEnabled = false,
    searchMode = 'contains',
    filterMode = 'withAncestors',
    loadChildren,
    virtualScroll = false,
    dropdownMaxHeight = 320,
    openOnFieldClick = true,
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

  const overlayConfig = useOgeOverlayConfig();
  const hostRef = useRef<HTMLSpanElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<OgeTreeViewHandle>(null);

  const reactId = useId();
  const treeId = `oge-tree-select-${reactId}-tree`;

  const multiple = selectionMode === 'multiple';
  const adaptive = useAdaptivePopup(props, 'sheet');
  const field = useOgeField<unknown>({
    props,
    emptyValue: multiple ? EMPTY_KEYS : null,
    isEmpty: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return Array.isArray(value) && value.length === 0;
    },
    focusNative: () => nativeRef.current?.focus(),
  });
  const readonly = props.readonly ?? false;
  const selectedKeys = keysOfValue(field.value);

  // --- opened (controlled/uncontrolled) -------------------------------------

  const [uncontrolledOpened, setUncontrolledOpened] = useState(
    props.defaultOpened ?? false,
  );
  const opened = props.opened ?? uncontrolledOpened;
  const openedRef = useRef(opened);
  openedRef.current = opened;

  // --- expandedKeys (controlled/uncontrolled) -------------------------------

  const [uncontrolledExpanded, setUncontrolledExpanded] = useState<
    readonly RowKey[]
  >(props.defaultExpandedKeys ?? EMPTY_KEYS);
  const expandedKeys = props.expandedKeys ?? uncontrolledExpanded;

  const latest = useRef({ props, field, selectedKeys });
  latest.current = { props, field, selectedKeys };

  const setOpened = (next: boolean): void => {
    if (latest.current.props.opened === undefined) setUncontrolledOpened(next);
    latest.current.props.onOpenedChange?.(next);
  };

  const setExpandedKeys = (next: readonly RowKey[]): void => {
    if (latest.current.props.expandedKeys === undefined) {
      setUncontrolledExpanded(next);
    }
    latest.current.props.onExpandedKeysChange?.(next);
  };

  // --- field text -----------------------------------------------------------

  /**
   * Key → display text, resolved from `items` so the closed field still has
   * its text with no tree mounted. The index comes from `@oge-ui/behavior`, so
   * nested and flat data resolve the same way the popup resolves them.
   */
  const labelByKey = useMemo<ReadonlyMap<RowKey, string>>(() => {
    const keyOf = treeAccessor<TItem, RowKey>(keyExpr);
    const displayAccessor = treeAccessor<TItem, unknown>(displayExpr);
    const index = buildTreeViewIndex<TItem>({
      items: items ?? [],
      keyOf,
      parentIdExpr,
      itemsExpr,
      dataStructure,
      rootValue,
    });
    const map = new Map<RowKey, string>();
    for (const [key, row] of index.byKey) {
      map.set(key, String(displayAccessor(row) ?? ''));
    }
    return map;
  }, [
    items,
    keyExpr,
    displayExpr,
    parentIdExpr,
    itemsExpr,
    dataStructure,
    rootValue,
  ]);

  const inputText = (() => {
    if (selectedKeys.length === 0) return '';
    if (displayMode === 'count' && selectedKeys.length > 1) {
      return `${selectedKeys.length}`;
    }
    return selectedKeys
      .map((key) => labelByKey.get(key) ?? String(key))
      .join(', ');
  })();

  const chipsMode = showSelectionAs === 'chips';
  const chips = selectedKeys.map((key) => ({
    key,
    text: labelByKey.get(key) ?? String(key),
  }));
  const overflow = ogeChipOverflow(chips.length, maxDisplayedTags);

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
      // Moving DOM focus into the tree is what lets its own APG keyboard map
      // work; the combobox keeps `aria-expanded`/`aria-controls` on it.
      queueMicrotask(() =>
        treeRef.current?.focus(latest.current.selectedKeys[0]),
      );
      latest.current.props.onDropDownOpened?.();
    } else {
      if (machine.isOpen) machine.close('api');
      if (!announcedOpen.current) return;
      announcedOpen.current = false;
      latest.current.props.onDropDownClosed?.();
    }
  }, [opened, panel.isOpen]);

  // --- open / close / commit ------------------------------------------------

  const open = (): void => {
    if (field.effectiveDisabled || readonly) return;
    setOpened(true);
  };
  const close = (): void => setOpened(false);
  const toggle = (): void => (openedRef.current ? close() : open());

  const onTreeSelectionChange = (keys: readonly RowKey[]): void => {
    const previous = latest.current.selectedKeys;
    if (sameKeys(keys, previous)) return;
    field.commit.commitNow(multiple ? [...keys] : (keys[0] ?? null));
    latest.current.props.onSelectionChanged?.({
      keys: [...keys],
      previousKeys: previous,
    });
    // Closing has to happen *after* the commit: the popup owns the tree, so
    // tearing it down earlier would unmount the component before its selection
    // ever reached us.
    if (!multiple && showCheckBoxes === 'none') {
      close();
      nativeRef.current?.focus();
    }
  };

  /** Removes one node from the selection (a chip's ✕, or Backspace). */
  const removeKey = (key: RowKey, event: Event): void => {
    if (field.effectiveDisabled || readonly) return;
    const previous = latest.current.selectedKeys;
    const keys = previous.filter((candidate) => candidate !== key);
    if (keys.length === previous.length) return;
    field.commit.commitNow(multiple ? [...keys] : (keys[0] ?? null), event);
    latest.current.props.onSelectionChanged?.({
      keys: [...keys],
      previousKeys: previous,
    });
    nativeRef.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (field.effectiveDisabled || readonly) return;
    switch (event.key) {
      case 'Backspace':
        if (chipsMode && selectedKeys.length > 0) {
          event.preventDefault();
          removeKey(selectedKeys[selectedKeys.length - 1], event.nativeEvent);
        }
        return;
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!openedRef.current) open();
        else treeRef.current?.focus(selectedKeys[0]);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggle();
        return;
      case 'Escape':
        if (openedRef.current) {
          event.preventDefault();
          close();
          nativeRef.current?.focus();
        }
        return;
      default:
        return;
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

  const describedBy = (() => {
    if (subscriptSizing === 'none') return undefined;
    if (field.showError && field.resolvedErrorText) return field.ids.errorId;
    return hint ? field.ids.hintId : undefined;
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
    'oge-tree-select',
    opened && 'oge-tree-select-open',
    chipsMode && 'oge-tree-select-chips',
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

  const fieldInput = (
    <input
      {...extraAttrs}
      ref={nativeRef}
      className={[
        'oge-input-native',
        'oge-select-plain',
        chipsMode && 'oge-tag-input',
      ]
        .filter(Boolean)
        .join(' ')}
      type="text"
      role="combobox"
      aria-haspopup="tree"
      autoComplete="off"
      readOnly
      id={field.ids.inputId}
      value={chipsMode ? '' : inputText}
      placeholder={chipsMode && !field.isEmpty ? '' : placeholderText}
      disabled={field.effectiveDisabled}
      name={props.name || undefined}
      title={props.tooltip}
      tabIndex={props.tabIndex ?? 0}
      autoFocus={props.autofocus}
      aria-expanded={opened}
      aria-controls={opened ? treeId : undefined}
      aria-label={labelMode === 'hidden' && label ? label : undefined}
      aria-labelledby={
        labelMode !== 'hidden' && label ? field.ids.labelId : undefined
      }
      aria-describedby={describedBy}
      aria-invalid={field.showError ? true : undefined}
      aria-required={props.required ? true : undefined}
      onClick={() => {
        if (field.effectiveDisabled || readonly) return;
        if (!openOnFieldClick) return;
        toggle();
      }}
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        if (selectOnFocus) nativeRef.current?.select();
        field.handleFocus(event);
      }}
      onBlur={field.handleBlur}
    />
  );

  return (
    <span
      ref={hostRef}
      className={hostClasses}
      style={withInputWidth(style, props.width)}
    >
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
            visible: !readonly,
            expanded: opened,
            toggle: () => {
              if (field.effectiveDisabled || readonly) return;
              toggle();
              nativeRef.current?.focus();
            },
          },
        }}
        prefix={prefix}
        suffix={suffix}
      >
        {chipsMode ? (
          <div className="oge-tag-strip">
            {chips.slice(0, overflow.shown).map((chip) => (
              <span key={String(chip.key)} className="oge-tag">
                <span className="oge-tag-text">{chip.text}</span>
                {!readonly && !field.effectiveDisabled && (
                  <button
                    type="button"
                    className="oge-tag-remove"
                    tabIndex={-1}
                    aria-label={`${field.msg.removeTagButton} ${chip.text}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => removeKey(chip.key, event.nativeEvent)}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="10"
                      height="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="m4 4 8 8m0-8-8 8" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
            {overflow.hidden > 0 && (
              <span className="oge-tag oge-tag-more">
                {formatPattern(field.msg.moreTags, {
                  count: String(overflow.hidden),
                })}
              </span>
            )}
            {fieldInput}
          </div>
        ) : (
          fieldInput
        )}
      </OgeFieldChrome>
      {opened && (
        <OgePopup
          panel={panel}
          ref={popupRef}
          adaptive={adaptive.presentation}
          adaptiveTitle={label || field.msg.adaptiveTitle}
          closeLabel={field.msg.adaptiveClose}
          sheetFooter={
            adaptive.active && multiple ? (
              <SheetDone
                label={field.msg.adaptiveDone}
                onClick={() => close()}
              />
            ) : undefined
          }
        >
          <div
            className="oge-tree-select-panel"
            style={{
              maxBlockSize: adaptive.active ? undefined : dropdownMaxHeight,
            }}
          >
            <OgeTreeView<TItem>
              ref={treeRef}
              treeId={treeId}
              items={items}
              keyExpr={keyExpr}
              parentIdExpr={parentIdExpr}
              itemsExpr={itemsExpr}
              displayExpr={displayExpr}
              disabledExpr={disabledExpr}
              hasItemsExpr={hasItemsExpr}
              iconExpr={iconExpr}
              rootValue={rootValue}
              dataStructure={dataStructure}
              selectionMode={selectionMode}
              expandEvent={expandEvent}
              showCheckBoxes={showCheckBoxes}
              selectNodesRecursive={selectNodesRecursive}
              selectedKeysMode={selectedKeysMode}
              searchEnabled={searchEnabled}
              searchMode={searchMode}
              filterMode={filterMode}
              loadChildren={loadChildren}
              virtualScroll={virtualScroll}
              height={
                virtualScroll === false
                  ? undefined
                  : adaptive.active
                    ? '60dvh'
                    : `${dropdownMaxHeight - 8}px`
              }
              ariaLabel={label || undefined}
              expandedKeys={expandedKeys}
              onExpandedKeysChange={setExpandedKeys}
              selectedKeys={selectedKeys}
              onSelectedKeysChange={onTreeSelectionChange}
            />
          </div>
        </OgePopup>
      )}
    </span>
  );
}) as <TItem extends object = Record<string, unknown>>(
  props: OgeTreeSelectProps<TItem> & {
    ref?: React.ForwardedRef<OgeTreeSelectHandle>;
  },
) => ReactNode;
