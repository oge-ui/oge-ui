'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  OgeMentionCore,
  ogeCaretRect,
  ogeMentionKeyCommand,
  type OgeMentionItemContext,
  type OgeMentionItemsSource,
  type OgeMentionSearchChangedEvent,
  type OgeMentionSelectedEvent,
  type OgeMentionToken,
  type OgeMentionTrigger,
  type OgeRect,
  type OgeSelectDisplayExpr,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
} from '@oge-ui/behavior';
import {
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
} from '@oge-ui/react-overlay';
import { OgeFieldChrome } from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  withInputWidth,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeInputsConfig } from './inputs-config';
import { createBumpAdapter } from './rx-adapter';
import { useOgeField, type OgeControlProps } from './use-field';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeMentionHandle {
  focus(): void;
  blur(): void;
  clear(): void;
  /** Closes the suggestion list. */
  close(): void;
}

export interface OgeMentionProps<T = unknown>
  extends OgeControlProps<string>, OgeFieldExtrasProps {
  label?: string;
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  placeholder?: string;
  hint?: string;
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';
  fluid?: boolean;
  showClearButton?: boolean;
  /** The inserted mentions in text order — controlled when provided. */
  mentions?: readonly OgeMentionToken<T>[];
  /** Uncontrolled initial mentions. */
  defaultMentions?: readonly OgeMentionToken<T>[];
  /** The mentions changed (insert, or an edit that shifted / dropped one). */
  onMentionsChange?: (mentions: readonly OgeMentionToken<T>[]) => void;
  /** Several trigger characters with their own items; overrides the shorthand props. */
  triggers?: readonly OgeMentionTrigger<T>[];
  /** Shorthand single trigger: its suggestions (a list or a query function). */
  items?: OgeMentionItemsSource<T>;
  /** Shorthand single trigger: its character. */
  trigger?: string;
  /** Shorthand single trigger: item → display (and inserted) text. */
  displayExpr?: OgeSelectDisplayExpr<T>;
  /** Shorthand single trigger: item → the value reported in `mentions`. */
  valueExpr?: OgeSelectValueExpr<T>;
  /** Shorthand single trigger: which text the local filter matches. */
  searchExpr?: OgeSelectSearchExpr<T>;
  /** Substring (`contains`) or prefix (`startswith`) matching of local items. */
  searchMode?: OgeSelectSearchMode;
  /** Characters required after the trigger before suggestions show. */
  minSearchLength?: number;
  /** Caps the suggestion list. */
  maxSuggestions?: number;
  /** Lets a query contain spaces (`@Ada Love`). */
  allowSpaces?: boolean;
  /** Adds a space after the inserted token. */
  insertSpace?: boolean;
  /** Debounce (ms) before a query function is called; `undefined` = config (250). */
  searchTimeout?: number;
  /** Multi-line text area (`true`) or a single-line field. */
  multiline?: boolean;
  /** Visible rows of the text area. */
  rows?: number;
  maxLength?: number;
  spellcheck?: boolean;
  /** Scrollable suggestion list height cap; `undefined` = the CSS default (320px). */
  dropdownMaxHeight?: number;
  /** Custom suggestion row. */
  renderItem?: (item: T, context: OgeMentionItemContext<T>) => ReactNode;
  /** A suggestion was inserted. */
  onMentionSelected?: (event: OgeMentionSelectedEvent<T>) => void;
  /** The query after a trigger changed — drive server-side suggestions from here. */
  onSearchChange?: (event: OgeMentionSearchChangedEvent) => void;
  /** Raw text on every keystroke, regardless of the commit policy. */
  onInputChange?: (event: { text: string; event: Event }) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Text editor with `@`-style mentions — the React render of the Angular
 * `<oge-mention>`. A trigger character at the start or after a space opens a
 * caret-anchored suggestion list; the picked item is inserted as a plain
 * text token, and the inserted mentions (item, value, position) are the
 * `mentions` / `onMentionsChange` pair, kept in step with every later edit.
 * Arrows move, Enter/Tab insert, Escape closes until the next trigger.
 *
 * ```tsx
 * <OgeMention label="Comment" items={users} displayExpr="name"
 *             value={text} onValueChange={setText} onMentionsChange={setMentioned} />
 * ```
 */
export const OgeMention = forwardRef(function OgeMentionRender<T = unknown>(
  props: OgeMentionProps<T>,
  ref: React.ForwardedRef<OgeMentionHandle>,
) {
  const {
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
    multiline = true,
    rows = 3,
    maxLength,
    spellcheck = true,
    dropdownMaxHeight,
    renderItem,
    prefix,
    suffix,
    className,
    style,
  } = props;

  const config = useOgeInputsConfig();
  const overlayConfig = useOgeOverlayConfig();
  const hostRef = useRef<HTMLSpanElement>(null);
  const nativeRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const field = useOgeField<string>({
    props,
    emptyValue: '',
    isEmpty: (value) => value === '',
    focusNative: () => nativeRef.current?.focus(),
  });
  const readonly = props.readonly ?? false;

  const [liveText, setLiveText] = useState(field.value);
  const [prevValue, setPrevValue] = useState(field.value);
  if (prevValue !== field.value) {
    setPrevValue(field.value);
    setLiveText(field.value);
  }

  const [uncontrolledMentions, setUncontrolledMentions] = useState<
    readonly OgeMentionToken<T>[]
  >(props.defaultMentions ?? []);

  const latest = useRef({ props, field });
  latest.current = { props, field };

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const coreRef = useRef<OgeMentionCore<T>>(undefined);
  if (!coreRef.current) {
    coreRef.current = new OgeMentionCore<T>(
      {
        inputId: () => latest.current.field.ids.inputId,
        triggers: () => {
          const p = latest.current.props;
          return (
            p.triggers ?? [
              {
                char: p.trigger ?? '@',
                items: p.items ?? [],
                displayExpr: p.displayExpr,
                valueExpr: p.valueExpr,
                searchExpr: p.searchExpr,
              },
            ]
          );
        },
        minSearchLength: () => latest.current.props.minSearchLength ?? 0,
        maxSuggestions: () => latest.current.props.maxSuggestions ?? 8,
        allowSpaces: () => latest.current.props.allowSpaces ?? false,
        insertSpace: () => latest.current.props.insertSpace ?? true,
        searchMode: () => latest.current.props.searchMode ?? 'contains',
        searchDebounceMs: () =>
          latest.current.props.searchTimeout ?? config.searchTimeoutMs,
        onSearchChanged: (event) =>
          latest.current.props.onSearchChange?.(event),
      },
      createBumpAdapter(bump),
    );
  }
  const core = coreRef.current;
  useEffect(() => () => core.destroy(), [core]);

  // the text the tokens are aligned to, and the mentions last published
  const lastText = useRef(field.value);
  const lastMentions = useRef<readonly OgeMentionToken<T>[] | null>(null);
  const caretRect = useRef<OgeRect | null>(null);

  const publishMentions = (): void => {
    const tokens = core.tokens();
    lastMentions.current = tokens;
    const p = latest.current.props;
    if (p.mentions === undefined) setUncontrolledMentions(tokens);
    p.onMentionsChange?.(tokens);
  };

  // An external mentions write seeds the machine.
  const mentions = props.mentions ?? uncontrolledMentions;
  useIsomorphicLayoutEffect(() => {
    if (mentions === lastMentions.current) return;
    lastMentions.current = mentions;
    core.tokens.set(mentions);
  }, [mentions]);

  // An external text write re-aligns the tokens.
  useIsomorphicLayoutEffect(() => {
    const text = field.value;
    if (text === lastText.current) return;
    const previous = lastText.current;
    lastText.current = text;
    if (core.noteTextChange(previous, text)) publishMentions();
  }, [field.value]);

  // --- panel -----------------------------------------------------------------

  const panel = useAnchoredPanel({
    anchor: () =>
      hostRef.current?.querySelector<HTMLElement>('.oge-input-container') ??
      hostRef.current,
    panel: () => popupRef.current,
    anchorRect: () => caretRect.current,
    placement: () => 'bottom-start',
    offset: () => overlayConfig.offset,
    viewportPadding: () => overlayConfig.viewportPadding,
    restoreFocus: () => nativeRef.current?.focus(),
    onClosed: (reason) => {
      if (reason === 'escape') core.dismiss();
      else if (reason !== 'api') core.close();
    },
  });
  const opened = core.opened();
  useEffect(() => {
    if (opened && !panel.isOpen) panel.open();
    else if (!opened && panel.isOpen) panel.close('api');
  }, [opened, panel.isOpen]);

  // --- handlers --------------------------------------------------------------

  const refreshQuery = (): void => {
    const el = nativeRef.current;
    const { props: p, field: f } = latest.current;
    if (!el || f.effectiveDisabled || (p.readonly ?? false)) return;
    const text = el.value;
    const open = core.update(text, el.selectionStart ?? text.length);
    const query = core.query();
    if (open && query) {
      caretRect.current = ogeCaretRect(el, query.start);
      panel.updatePosition();
    }
  };

  const insert = (item: T, event: Event): void => {
    const el = nativeRef.current;
    if (!el) return;
    const text = el.value;
    const result = core.select(item, text, el.selectionStart ?? text.length);
    if (!result) return;
    const next = result.insertion.text;
    el.value = next;
    setLiveText(next);
    lastText.current = next;
    el.focus();
    el.setSelectionRange(result.insertion.caret, result.insertion.caret);
    field.commit.commitNow(next, event);
    publishMentions();
    latest.current.props.onMentionSelected?.({
      token: result.token,
      item,
      event,
    });
  };

  const composing = useRef(false);
  const onChange = (
    event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): void => {
    const text = event.target.value;
    setLiveText(text);
    props.onInputChange?.({ text, event: event.nativeEvent });
    const previous = lastText.current;
    lastText.current = text;
    if (core.noteTextChange(previous, text)) publishMentions();
    refreshQuery();
    if (composing.current) return;
    field.commit.queue(text, event.nativeEvent);
  };

  const onKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): void => {
    if (field.effectiveDisabled || readonly) return;
    if (core.opened() && !event.nativeEvent.isComposing) {
      const command = ogeMentionKeyCommand(event.key);
      if (command === 'select') {
        const item = core.activeItem();
        if (item !== null) {
          event.preventDefault();
          insert(item, event.nativeEvent);
          return;
        }
      } else if (command !== null) {
        event.preventDefault();
        core.move(command);
        return;
      }
    }
    field.handleEnterKey(event);
  };

  const onKeyUp = (event: ReactKeyboardEvent): void => {
    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      refreshQuery();
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      focus: () => nativeRef.current?.focus(),
      blur: () => nativeRef.current?.blur(),
      clear: () => {
        field.clear();
        setLiveText('');
      },
      close: () => core.close(),
    }),
    [],
  );

  // --- derived view state ----------------------------------------------------

  const floatUp = field.focused || !field.isEmpty;
  const placeholderText =
    labelMode === 'floating' && label && !floatUp ? '' : placeholder;
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
  const listboxId = core.list.listboxId;
  const activeDescendant = core.list.activeDescendant() ?? undefined;
  const suggestions = core.visibleItems();
  const activeIndex = core.list.activeIndex();
  const query = core.query();

  const hostClasses = [
    'oge-input',
    'oge-mention',
    multiline && 'oge-text-area',
    opened && 'oge-mention-open',
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

  const common = {
    ...extraAttrs,
    className: 'oge-input-native',
    id: field.ids.inputId,
    value: liveText,
    placeholder: placeholderText,
    disabled: field.effectiveDisabled,
    readOnly: readonly,
    spellCheck: spellcheck,
    name: props.name || undefined,
    maxLength,
    title: props.tooltip,
    tabIndex: props.tabIndex ?? 0,
    autoFocus: props.autofocus,
    'aria-autocomplete': 'list' as const,
    'aria-haspopup': 'listbox' as const,
    'aria-controls': opened ? listboxId : undefined,
    'aria-activedescendant': activeDescendant,
    'aria-label': labelMode === 'hidden' && label ? label : undefined,
    'aria-labelledby':
      labelMode !== 'hidden' && label ? field.ids.labelId : undefined,
    'aria-describedby': describedBy,
    'aria-invalid': field.showError ? true : undefined,
    'aria-required': props.required ? true : undefined,
    onChange,
    onKeyDown,
    onKeyUp,
    onClick: refreshQuery,
    onCompositionStart: () => (composing.current = true),
    onCompositionEnd: (event: { nativeEvent: Event }) => {
      composing.current = false;
      const el = nativeRef.current;
      if (el) field.commit.queue(el.value, event.nativeEvent);
    },
    onFocus: (event: React.FocusEvent) => {
      if (selectOnFocus) nativeRef.current?.select();
      field.handleFocus(event);
    },
    onBlur: (event: React.FocusEvent) => {
      core.close();
      field.handleBlur(event);
    },
  };

  const statusRow = (text: string) => (
    <div className="oge-select-status" role="presentation">
      {text}
    </div>
  );

  return (
    <span
      ref={hostRef}
      className={hostClasses}
      style={
        {
          ...withInputWidth(style, props.width),
          '--oge-ta-min-rows': multiline ? rows : undefined,
        } as CSSProperties
      }
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
          clear: () => {
            field.clear();
            setLiveText('');
          },
          subscriptSizing,
          showError: field.showError,
          resolvedErrorText: field.resolvedErrorText,
          hint,
          counter: null,
          reveal: null,
          copy: null,
          spin: null,
          dropdown: null,
        }}
        prefix={prefix}
        suffix={suffix}
      >
        {multiline ? (
          <textarea ref={nativeRef} rows={rows} {...common} />
        ) : (
          <input
            ref={nativeRef}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={opened}
            {...common}
          />
        )}
      </OgeFieldChrome>
      {panel.isOpen && (
        <OgePopup panel={panel} ref={popupRef}>
          <div
            className="oge-select-list oge-mention-list"
            role="listbox"
            id={listboxId}
            style={{ maxHeight: dropdownMaxHeight }}
            aria-label={field.msg.mentionListLabel}
            aria-busy={core.loading() || undefined}
          >
            {core.loading()
              ? statusRow(field.msg.dropDownLoading)
              : core.failed()
                ? statusRow(field.msg.dropDownLoadError)
                : suggestions.length === 0
                  ? statusRow(field.msg.noDataText)
                  : suggestions.map((item, index) => (
                      <div
                        key={index}
                        className={[
                          'oge-select-option',
                          'oge-mention-option',
                          index === activeIndex && 'oge-select-option-active',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        role="option"
                        id={core.list.optionId(index)}
                        aria-selected={index === activeIndex}
                        aria-posinset={index + 1}
                        aria-setsize={suggestions.length}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => core.list.activeIndex.set(index)}
                        onClick={(event) => insert(item, event.nativeEvent)}
                      >
                        {renderItem ? (
                          renderItem(item, {
                            item,
                            index,
                            trigger: query?.trigger ?? '',
                            query: query?.text ?? '',
                            active: index === activeIndex,
                          })
                        ) : (
                          <span className="oge-select-option-text">
                            <span
                              className="oge-mention-option-trigger"
                              aria-hidden="true"
                            >
                              {query?.trigger}
                            </span>
                            {core.displayOf(item)}
                          </span>
                        )}
                      </div>
                    ))}
          </div>
        </OgePopup>
      )}
    </span>
  );
}) as <T = unknown>(
  props: OgeMentionProps<T> & { ref?: React.ForwardedRef<OgeMentionHandle> },
) => ReactNode;
