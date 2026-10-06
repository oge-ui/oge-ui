'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  OGE_DEFAULT_EDITOR_TOOLBAR,
  OgeEditorCore,
  buildOgeEditorToolbar,
  mergeOgeEditorMessages,
  ogeEditorBlockFormatCommand,
  ogeEditorBlockFormatMenu,
  ogeEditorCommandFromName,
  ogeEditorCounterText,
  ogeEditorCssLength,
  ogeEditorDescribedBy,
  ogeEditorErrorText,
  ogeEditorImagePrompts,
  ogeEditorLinkCommand,
  ogeEditorLinkPrompt,
  ogeEditorToolAction,
  ogeEditorToolbarItems,
  type OgeColorPalettePreset,
  type OgeEditorActiveState,
  type OgeEditorBlockFormatValue,
  type OgeEditorCommand,
  type OgeEditorCommandExecutedEvent,
  type OgeEditorCommandName,
  type OgeEditorConfig,
  type OgeEditorCounterMode,
  type OgeEditorDialogOpeningEvent,
  type OgeEditorHeadingLevel,
  type OgeEditorMessagesInput,
  type OgeEditorPasteMode,
  type OgeEditorPastingEvent,
  type OgeEditorPopupKind,
  type OgeEditorSelectionChangedEvent,
  type OgeEditorToolClickEvent,
  type OgeEditorToolView,
  type OgeEditorToolbarEntry,
  type OgeEditorValueCommittedEvent,
  type OgeFieldError,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeToolbarItemClickEvent,
  type OgeToolbarOverflow,
} from '@oge-ui/behavior';
import { OgeColorPalette } from '@oge-ui/react-inputs';
import { OgeToolbar } from '@oge-ui/react-layout';
import {
  OgeMenuList,
  OgeModalProvider,
  OgePopup,
  useAnchoredPanel,
  useOgeModals,
  type OgeMenuListHandle,
} from '@oge-ui/react-overlay';
import { useOgeEditorConfig } from './editor-config';

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * React's face of the reactivity contract for the editor machine: cells bump
 * a version (and re-render), derived values are memoized per version — the
 * active state and the serialized value are read several times per render.
 */
function createEditorAdapter(bump: () => void): OgeReactivityAdapter {
  let version = 0;
  return {
    cell<T>(initial: T): OgeReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeReactiveCell<T>;
      cell.set = (next) => {
        if (Object.is(next, value)) return;
        value = next;
        version++;
        bump();
      };
      return cell;
    },
    derived<T>(compute: () => T): () => T {
      let seen = -1;
      let cached: T;
      return () => {
        if (seen !== version) {
          cached = compute();
          seen = version;
        }
        return cached;
      };
    },
  };
}

/** Props of {@link OgeEditor}. */
export interface OgeEditorProps {
  /** The sanitized HTML value (`''` when empty) — controlled when provided. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Every change of the value. */
  onValueChange?: (value: string) => void;
  /** Every committed change, with `previousValue` and the originating DOM event. */
  onValueCommitted?: (event: OgeEditorValueCommittedEvent) => void;
  disabled?: boolean;
  /** Focusable and selectable, but not editable. */
  readonly?: boolean;
  required?: boolean;
  /** Written as `data-name` on the editing surface. */
  name?: string;
  invalid?: boolean;
  touched?: boolean;
  dirty?: boolean;
  errors?: readonly OgeFieldError[];
  /** Most characters (grapheme clusters) the text may hold; typing and pasting stop there. */
  maxLength?: number;
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  hint?: string;
  errorText?: string;
  counter?: OgeEditorCounterMode;
  /** Toolbar entries; `false` hides the toolbar. Default: the full toolbar. */
  toolbar?: readonly OgeEditorToolbarEntry[] | false;
  toolbarOverflow?: OgeToolbarOverflow;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  resizable?: boolean;
  spellcheck?: boolean;
  tabIndex?: number;
  autofocus?: boolean;
  id?: string;
  markdownShortcuts?: boolean;
  pasteMode?: OgeEditorPasteMode;
  headingLevels?: readonly OgeEditorHeadingLevel[];
  textColors?: OgeColorPalettePreset | readonly string[];
  backgroundColors?: OgeColorPalettePreset | readonly string[];
  allowedSchemes?: readonly string[];
  allowDataImages?: boolean;
  messages?: OgeEditorMessagesInput;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onSelectionChange?: (event: OgeEditorSelectionChangedEvent) => void;
  onCommandExecuted?: (event: OgeEditorCommandExecutedEvent) => void;
  onToolClick?: (event: OgeEditorToolClickEvent) => void;
  /** Cancelable — set `cancel`, or rewrite `html` / `text`. */
  onPasting?: (event: OgeEditorPastingEvent) => void;
  /** Cancelable — set `cancel` to show your own link / image dialog. */
  onDialogOpening?: (event: OgeEditorDialogOpeningEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** The imperative surface of `<OgeEditor>`, reached through its `ref`. */
export interface OgeEditorHandle {
  focus(): void;
  blur(): void;
  /** Runs a command — a name (`'bold'`) or a command object. */
  exec(command: OgeEditorCommandName | OgeEditorCommand): boolean;
  undo(): boolean;
  redo(): boolean;
  insertText(text: string): void;
  /** Inserts HTML, sanitized through the editor's allowlist first. */
  insertHtml(html: string): void;
  insertLink(href: string, text?: string, newTab?: boolean): boolean;
  removeLink(): boolean;
  insertImage(src: string, alt?: string): boolean;
  selectAll(): void;
  getHtml(): string;
  getText(): string;
  clear(): void;
  /** Loads `value` (default: empty) and clears the history. */
  reset(value?: string): void;
  openLinkDialog(): Promise<void>;
  openImageDialog(): Promise<void>;
  /** The formats under the selection. */
  readonly activeState: OgeEditorActiveState;
  readonly characterCount: number;
  readonly wordCount: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/**
 * A rich-text editor as a form field. The value is sanitized HTML; the
 * editing surface is a `contenteditable` element driven by the same
 * `OgeEditorCore` the Angular editor runs — no `document.execCommand`, so
 * every browser produces the same markup:
 *
 * ```tsx
 * <OgeEditor label="Description" value={html} onValueChange={setHtml} />
 * <OgeEditor toolbar={['bold', 'italic', 'link', 'separator', 'bulletList']} maxLength={2000} counter="characters" />
 * ```
 *
 * Import `@oge-ui/react-editor/styles.css` together with the layout,
 * overlay and inputs stylesheets (the toolbar, the popups and the colour
 * palette).
 */
export const OgeEditor = forwardRef<OgeEditorHandle, OgeEditorProps>(
  function OgeEditor(props, ref) {
    // the link and image prompts need a modal host; a nested provider renders
    // into document.body like any other, so an app-level one is not required
    return (
      <OgeModalProvider>
        <EditorInner {...props} handleRef={ref} />
      </OgeModalProvider>
    );
  },
);

type InnerProps = OgeEditorProps & {
  handleRef: ForwardedRef<OgeEditorHandle>;
};

function EditorInner(props: InnerProps): ReactNode {
  const { handleRef } = props;
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const config = useOgeEditorConfig();
  const modals = useOgeModals();
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const baseId = props.id ?? `oge-editor-${reactId}`;
  const ids = {
    content: `${baseId}-content`,
    label: `${baseId}-label`,
    hint: `${baseId}-hint`,
    error: `${baseId}-error`,
    counter: `${baseId}-counter`,
  };

  const messages = useMemo(
    () => mergeOgeEditorMessages(config.messages, props.messages),
    [config.messages, props.messages],
  );
  const resolved = useMemo<OgeEditorConfig>(
    () => ({
      headingLevels: props.headingLevels ?? config.headingLevels,
      textColors: props.textColors ?? config.textColors,
      backgroundColors: props.backgroundColors ?? config.backgroundColors,
      markdownShortcuts: props.markdownShortcuts ?? config.markdownShortcuts,
      pasteMode: props.pasteMode ?? config.pasteMode,
      allowedSchemes: props.allowedSchemes ?? config.allowedSchemes,
      allowDataImages: props.allowDataImages ?? config.allowDataImages,
      historyLimit: config.historyLimit,
      locale: config.locale,
      messages,
    }),
    [
      config,
      messages,
      props.headingLevels,
      props.textColors,
      props.backgroundColors,
      props.markdownShortcuts,
      props.pasteMode,
      props.allowedSchemes,
      props.allowDataImages,
    ],
  );

  const disabled = props.disabled ?? false;
  const readOnly = props.readonly ?? false;
  const editable = !disabled && !readOnly;
  const latest = useRef({ props, resolved, disabled, readOnly });
  latest.current = { props, resolved, disabled, readOnly };

  const [uncontrolled, setUncontrolled] = useState(props.defaultValue ?? '');
  const controlled = props.value !== undefined;
  const value = controlled ? (props.value as string) : uncontrolled;
  const valueRef = useRef(value);
  valueRef.current = value;

  const openLinkDialogRef = useRef<() => Promise<void>>(async () => undefined);
  const coreRef = useRef<OgeEditorCore | null>(null);
  coreRef.current ??= new OgeEditorCore(createEditorAdapter(bump), {
    options: () => ({
      config: latest.current.resolved,
      readOnly: latest.current.readOnly,
      disabled: latest.current.disabled,
      maxLength: latest.current.props.maxLength,
    }),
    valueChanged: (html, event) => {
      const previousValue = valueRef.current;
      valueRef.current = html;
      if (latest.current.props.value === undefined) setUncontrolled(html);
      setDirty(true);
      latest.current.props.onValueChange?.(html);
      if (previousValue !== html) {
        latest.current.props.onValueCommitted?.({
          value: html,
          previousValue,
          event,
        });
      }
    },
    requestLink: () => void openLinkDialogRef.current(),
    pasting: (event) => latest.current.props.onPasting?.(event),
    commandExecuted: (command, event) =>
      latest.current.props.onCommandExecuted?.({ command, event }),
  });
  const core = coreRef.current;

  const contentRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [selfTouched, setSelfTouched] = useState(false);
  const [, setDirty] = useState(false);

  // the bound value loads into the model; the editor's own echo is ignored
  useIsomorphicLayoutEffect(() => {
    core.setValue(value);
  }, [core, value]);

  // StrictMode-safe lifetime: attach (or revive) on mount, destroy on unmount
  useIsomorphicLayoutEffect(() => {
    const element = contentRef.current;
    if (element) core.revive(element);
    if (latest.current.props.autofocus) core.focus();
    return () => core.destroy();
  }, [core]);

  const active = core.active();
  const canUndo = core.canUndo();
  const canRedo = core.canRedo();
  const characters = core.characterCount();
  const words = core.wordCount();
  const empty = core.empty();

  // selection / format changes
  const lastActive = useRef<OgeEditorActiveState | null>(null);
  useEffect(() => {
    if (lastActive.current !== null && lastActive.current !== active) {
      latest.current.props.onSelectionChange?.({ active });
    }
    lastActive.current = active;
  }, [active]);

  const views = useMemo<OgeEditorToolView[]>(() => {
    if (props.toolbar === false) return [];
    return buildOgeEditorToolbar(props.toolbar ?? OGE_DEFAULT_EDITOR_TOOLBAR, {
      active,
      messages,
      mac: core.mac,
      canUndo,
      canRedo,
      inert: !editable,
    });
  }, [props.toolbar, active, messages, core, canUndo, canRedo, editable]);
  const viewMap = useMemo(
    () => new Map(views.map((view) => [view.key, view])),
    [views],
  );
  const items = useMemo(() => ogeEditorToolbarItems(views), [views]);

  const maxLength = props.maxLength;
  const overLimit = maxLength !== undefined && characters > maxLength;
  const touched = props.touched || selfTouched;
  const invalid =
    (props.invalid ?? false) || (props.errors?.length ?? 0) > 0 || overLimit;
  const showError = invalid && (touched || overLimit);
  const errorText = ogeEditorErrorText(
    {
      explicit: props.errorText,
      errors: props.errors ?? [],
      controlErrors: null,
      overLimit,
      characters,
      maxLength,
      invalid: props.invalid ?? false,
    },
    messages,
    config.locale,
  );
  const counterText = ogeEditorCounterText(
    props.counter ?? 'none',
    characters,
    words,
    maxLength,
    messages,
    config.locale,
  );
  const showErrorText = showError && errorText !== null;
  const describedBy = ogeEditorDescribedBy({
    error: showErrorText ? ids.error : null,
    hint: props.hint ? ids.hint : null,
    counter: counterText !== null ? ids.counter : null,
  });

  // --- popups -------------------------------------------------------------------

  const [popupKey, setPopupKey] = useState<OgeEditorPopupKind | null>(null);
  const popupAnchor = useRef<HTMLElement | null>(null);
  const popupReturnFocus = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<OgeMenuListHandle>(null);
  const panel = useAnchoredPanel({
    anchor: () => popupAnchor.current,
    panel: () => popupRef.current,
    placement: () => 'bottom-start',
    restoreFocus: () => {
      const target = popupReturnFocus.current;
      popupReturnFocus.current = null;
      if (target && target.isConnected) target.focus();
      else core.focus();
    },
    onClosed: () => setPopupKey(null),
  });

  useEffect(() => {
    if (popupKey === null) return;
    const timer = setTimeout(() => {
      if (popupKey === 'blockFormat') menuRef.current?.focus('first');
      else
        popupRef.current
          ?.querySelector<HTMLElement>('[tabindex="0"], button')
          ?.focus();
    });
    return () => clearTimeout(timer);
  }, [popupKey]);

  const openPopup = (
    kind: OgeEditorPopupKind,
    anchor: HTMLElement | null,
    event: Event,
  ) => {
    if (popupKey === kind) {
      panel.close('api');
      return;
    }
    if (popupKey !== null) panel.close('api');
    const doc = hostRef.current?.ownerDocument;
    popupReturnFocus.current =
      event instanceof KeyboardEvent || (event as MouseEvent).detail === 0
        ? ((doc?.activeElement as HTMLElement | null) ?? null)
        : null;
    popupAnchor.current =
      anchor ??
      hostRef.current?.querySelector<HTMLElement>('.oge-editor-toolbar') ??
      hostRef.current;
    setPopupKey(kind);
    panel.open();
  };

  // --- dialogs --------------------------------------------------------------------

  const urlOptions = useMemo(
    () => ({
      allowedSchemes: resolved.allowedSchemes,
      allowDataImages: resolved.allowDataImages,
    }),
    [resolved.allowedSchemes, resolved.allowDataImages],
  );

  const openLinkDialog = useCallback(
    async (event?: Event): Promise<void> => {
      if (latest.current.disabled || latest.current.readOnly) return;
      core.syncSelectionFromDom();
      const link = core.active().link;
      const pre: OgeEditorDialogOpeningEvent = {
        kind: 'link',
        link,
        cancel: false,
        event,
      };
      latest.current.props.onDialogOpening?.(pre);
      if (pre.cancel) return;
      const selection = core.state().selection;
      const answer = await modals.prompt(
        ogeEditorLinkPrompt(link, latest.current.resolved.messages, urlOptions),
      );
      core.state.set({ ...core.state(), selection });
      if (answer !== null) core.exec(ogeEditorLinkCommand(answer), event, true);
      core.focus();
    },
    [core, modals, urlOptions],
  );
  openLinkDialogRef.current = openLinkDialog;

  const openImageDialog = useCallback(
    async (event?: Event): Promise<void> => {
      if (latest.current.disabled || latest.current.readOnly) return;
      core.syncSelectionFromDom();
      const pre: OgeEditorDialogOpeningEvent = {
        kind: 'image',
        link: null,
        cancel: false,
        event,
      };
      latest.current.props.onDialogOpening?.(pre);
      if (pre.cancel) return;
      const selection = core.state().selection;
      const prompts = ogeEditorImagePrompts(
        latest.current.resolved.messages,
        urlOptions,
      );
      const src = await modals.prompt(prompts.source);
      const alt = src === null ? null : await modals.prompt(prompts.alt);
      core.state.set({ ...core.state(), selection });
      if (src !== null && alt !== null) {
        core.exec(
          { type: 'image', src: src.trim(), alt: alt.trim() },
          event,
          true,
        );
      }
      core.focus();
    },
    [core, modals, urlOptions],
  );

  // --- tools ----------------------------------------------------------------------

  const activateTool = (
    view: OgeEditorToolView,
    event: Event,
    anchor: HTMLElement | null,
    inMenu: boolean,
  ) => {
    const action = ogeEditorToolAction(view);
    if (!action) return;
    latest.current.props.onToolClick?.({ key: view.key, inMenu, event });
    core.syncSelectionFromDom();
    switch (action.type) {
      case 'command':
        core.exec(action.command, event, true);
        return;
      case 'custom':
        action.tool.run({
          exec: (command) => core.exec(command, event),
          insertHtml: (html) => core.insertHtml(html),
          insertText: (text) => core.insertText(text),
          getHtml: () => core.getHtml(),
          active: core.active(),
        });
        return;
      case 'dialog':
        if (action.dialog === 'link') void openLinkDialog(event);
        else void openImageDialog(event);
        return;
      case 'popup':
        openPopup(action.popup, anchor, event);
        return;
    }
  };

  const onToolbarItemClick = (event: OgeToolbarItemClickEvent) => {
    if (!event.inMenu || !event.key) return;
    const view = viewMap.get(event.key);
    if (view) activateTool(view, event.event, null, true);
  };

  const renderTool = (key: string | undefined): ReactNode => {
    const view = key === undefined ? undefined : viewMap.get(key);
    if (!view) return null;
    if (view.kind === 'separator') {
      return (
        <span
          className="oge-toolbar-separator"
          role="separator"
          aria-orientation="vertical"
        />
      );
    }
    const classes = [
      'oge-toolbar-btn',
      'oge-editor-tool',
      view.active === true ? 'oge-editor-tool-active' : '',
      view.mirror ? 'oge-editor-tool-mirror' : '',
      view.kind === 'menu' || !view.icon ? 'oge-editor-tool-text' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button
        type="button"
        className={classes}
        data-oge-editor-tool={view.key}
        aria-label={
          view.kind === 'menu' ? `${view.text}: ${view.valueText}` : view.text
        }
        aria-pressed={view.active === undefined ? undefined : view.active}
        aria-haspopup={view.hasPopup}
        aria-expanded={view.hasPopup ? popupKey === view.key : undefined}
        aria-keyshortcuts={view.shortcut}
        title={view.hint}
        disabled={view.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e: ReactMouseEvent<HTMLButtonElement>) =>
          activateTool(view, e.nativeEvent, e.currentTarget, false)
        }
      >
        {view.kind === 'menu' ? (
          <>
            <span className="oge-editor-tool-value">{view.valueText}</span>
            <svg
              className="oge-editor-tool-chevron"
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </>
        ) : view.icon ? (
          <>
            <svg
              className="oge-toolbar-icon"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={view.icon} />
            </svg>
            {view.kind === 'color' && (
              <span
                className={
                  view.swatch
                    ? 'oge-editor-tool-swatch'
                    : 'oge-editor-tool-swatch oge-editor-tool-swatch-none'
                }
                aria-hidden="true"
                style={
                  view.swatch ? { backgroundColor: view.swatch } : undefined
                }
              />
            )}
          </>
        ) : (
          <span className="oge-editor-tool-value">{view.text}</span>
        )}
      </button>
    );
  };

  // --- handle -----------------------------------------------------------------------

  useImperativeHandle(
    handleRef,
    (): OgeEditorHandle => ({
      focus: () => core.focus(),
      blur: () => contentRef.current?.blur(),
      exec: (command) =>
        core.exec(
          typeof command === 'string'
            ? ogeEditorCommandFromName(command)
            : command,
        ),
      undo: () => core.undo(),
      redo: () => core.redo(),
      insertText: (text) => core.insertText(text),
      insertHtml: (html) => core.insertHtml(html),
      insertLink: (href, text, newTab = false) =>
        core.exec({ type: 'link', href, text, newTab }),
      removeLink: () => core.exec({ type: 'link', href: null }),
      insertImage: (src, alt = '') => core.exec({ type: 'image', src, alt }),
      selectAll: () => void core.exec({ type: 'selectAll' }),
      getHtml: () => core.getHtml(),
      getText: () => core.getText(),
      clear: () => {
        if (latest.current.disabled || latest.current.readOnly) return;
        core.exec({ type: 'selectAll' });
        core.exec({ type: 'insertText', text: '' });
      },
      reset: (next = '') => {
        const previousValue = valueRef.current;
        core.setValue(next);
        valueRef.current = next;
        if (latest.current.props.value === undefined) setUncontrolled(next);
        setSelfTouched(false);
        setDirty(false);
        if (previousValue !== next) {
          latest.current.props.onValueChange?.(next);
          latest.current.props.onValueCommitted?.({
            value: next,
            previousValue,
            event: undefined,
          });
        }
      },
      openLinkDialog: () => openLinkDialog(),
      openImageDialog: () => openImageDialog(),
      get activeState() {
        return core.active();
      },
      get characterCount() {
        return core.characterCount();
      },
      get wordCount() {
        return core.wordCount();
      },
      get canUndo() {
        return core.canUndo();
      },
      get canRedo() {
        return core.canRedo();
      },
    }),
    [core, openLinkDialog, openImageDialog],
  );

  // --- focus -------------------------------------------------------------------------

  const onFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (focused) return;
    setFocused(true);
    latest.current.props.onFocus?.(event.nativeEvent);
  };
  const onBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && hostRef.current?.contains(next)) return;
    if (popupKey !== null && next === null) return;
    setFocused(false);
    setSelfTouched(true);
    latest.current.props.onBlur?.(event.nativeEvent);
  };

  const hostClass = [
    'oge-editor',
    focused ? 'oge-editor-focused' : '',
    disabled ? 'oge-editor-disabled' : '',
    readOnly ? 'oge-editor-readonly' : '',
    showError ? 'oge-editor-invalid' : '',
    props.resizable ? 'oge-editor-resizable' : '',
    empty ? 'oge-editor-empty' : '',
    props.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const hostStyle: CSSProperties = { ...props.style };
  const height = ogeEditorCssLength(props.height);
  const minHeight = ogeEditorCssLength(props.minHeight);
  const maxHeight = ogeEditorCssLength(props.maxHeight);
  const vars = hostStyle as Record<string, string | number | undefined>;
  if (height) vars['--oge-editor-height'] = height;
  if (minHeight) vars['--oge-editor-min-height'] = minHeight;
  if (maxHeight) vars['--oge-editor-max-height'] = maxHeight;

  const label = props.label ?? '';
  const placeholder = props.placeholder ?? '';
  const colorLabel =
    popupKey === 'textColor'
      ? messages.colors.textColorLabel
      : messages.colors.backgroundColorLabel;

  return (
    <div
      ref={hostRef}
      className={hostClass}
      style={hostStyle}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {label && (
        <span
          className="oge-editor-label"
          id={ids.label}
          onPointerDown={(e) => {
            e.preventDefault();
            if (!disabled) core.focus();
          }}
        >
          {label}
          {props.required && (
            <span className="oge-editor-required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
      <div className="oge-editor-frame">
        {views.length > 0 && (
          <OgeToolbar
            className="oge-editor-toolbar"
            size="sm"
            stylingMode="flat"
            items={items}
            overflow={props.toolbarOverflow ?? 'menu'}
            ariaLabel={messages.toolbarLabel}
            disabled={disabled}
            onItemClick={onToolbarItemClick}
            renderItem={({ item }) => renderTool(item?.key)}
          />
        )}
        <div className="oge-editor-body">
          <div
            ref={contentRef}
            className="oge-editor-content"
            role="textbox"
            aria-multiline="true"
            id={ids.content}
            contentEditable={editable}
            suppressContentEditableWarning
            tabIndex={disabled ? -1 : (props.tabIndex ?? 0)}
            aria-labelledby={label ? ids.label : undefined}
            aria-label={
              label ? undefined : (props.ariaLabel ?? messages.editorLabel)
            }
            aria-describedby={describedBy ?? undefined}
            aria-required={props.required ? true : undefined}
            aria-invalid={showError ? true : undefined}
            aria-readonly={readOnly ? true : undefined}
            aria-disabled={disabled ? true : undefined}
            aria-placeholder={placeholder || undefined}
            spellCheck={props.spellcheck ?? true}
            data-name={props.name || undefined}
          />
          {placeholder && empty && (
            <div className="oge-editor-placeholder" aria-hidden="true">
              {placeholder}
            </div>
          )}
        </div>
      </div>
      {(counterText !== null || props.hint || showErrorText) && (
        <div className="oge-editor-subscript">
          {showErrorText ? (
            <span className="oge-editor-error" id={ids.error}>
              {errorText}
            </span>
          ) : props.hint ? (
            <span className="oge-editor-hint" id={ids.hint}>
              {props.hint}
            </span>
          ) : null}
          {counterText !== null && (
            <span
              className={
                overLimit
                  ? 'oge-editor-counter oge-editor-counter-over'
                  : 'oge-editor-counter'
              }
              id={ids.counter}
            >
              {counterText}
            </span>
          )}
        </div>
      )}
      {popupKey !== null && panel.isOpen && (
        <OgePopup panel={panel} ref={popupRef}>
          {popupKey === 'blockFormat' ? (
            <OgeMenuList
              ref={menuRef}
              items={ogeEditorBlockFormatMenu(
                active.blockFormat,
                resolved.headingLevels,
                messages,
              )}
              ariaLabel={messages.tools.blockFormat}
              onItemClick={(e) => {
                const command = ogeEditorBlockFormatCommand(
                  e.item.value as OgeEditorBlockFormatValue,
                );
                panel.close('select');
                if (command) core.exec(command, e.event, true);
                core.focus();
              }}
              onCloseRequest={(e) => panel.close(e.reason)}
            />
          ) : (
            <div
              className="oge-editor-color-popup"
              role="dialog"
              aria-label={colorLabel}
            >
              <OgeColorPalette
                palette={
                  popupKey === 'textColor'
                    ? resolved.textColors
                    : resolved.backgroundColors
                }
                label={colorLabel}
                value={
                  popupKey === 'textColor' ? active.color : active.background
                }
                onValueCommitted={(e) => pickColor(e.value)}
              />
              <button
                type="button"
                className="oge-editor-color-none"
                onClick={() => pickColor(null)}
              >
                {messages.colors.removeColor}
              </button>
            </div>
          )}
        </OgePopup>
      )}
    </div>
  );

  function pickColor(color: string | null): void {
    const kind = popupKey;
    panel.close('select');
    if (kind === 'textColor')
      core.exec({ type: 'color', color }, undefined, true);
    else if (kind === 'backgroundColor')
      core.exec({ type: 'background', color }, undefined, true);
    core.focus();
  }
}
