'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import {
  OgeActionSheetCore,
  ogeCommandPaletteFirstActive,
  ogeCommandPaletteKeyIntent,
  ogeCommandPaletteOptions,
  ogeCommandPaletteRecent,
  ogeCommandPaletteSections,
  ogeFormatMessage,
  ogeFormatShortcut,
  ogeMatchesShortcut,
  ogeOverlayMessage,
  type OgeCommand,
  type OgeOverlayMessages,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Payload of `onCommandExecute`. Set `keepOpen` to leave the palette open. */
export interface OgeCommandExecuteEvent {
  readonly command: OgeCommand;
  keepOpen: boolean;
}

export interface OgeCommandPaletteProps {
  /** The commands, in order. */
  commands: readonly OgeCommand[];
  /** Whether the palette is open (controlled). */
  opened?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpened?: boolean;
  /** The open state the hotkey, a dismissal or a method committed. */
  onOpenedChange?: (opened: boolean) => void;
  /** Ids of the recently run commands, newest first (controlled). */
  recent?: readonly string[];
  /** Initial recent list when uncontrolled. */
  defaultRecent?: readonly string[];
  /** The recent list after a run — persist it to keep it across sessions. */
  onRecentChange?: (recent: readonly string[]) => void;
  /** Global shortcut that toggles the palette (default `'Mod+K'`); `null` turns it off. */
  hotkey?: string | null;
  /** Placeholder of the search box; falls back to the `commandPalettePlaceholder` message. */
  placeholder?: string;
  /** How many recently run commands to list above an empty query (default 5; 0 turns it off). */
  recentLimit?: number;
  /** Upper bound of listed matches for a query (default 50). */
  maxResults?: number;
  /** Per-instance message overrides. */
  messages?: Partial<OgeOverlayMessages>;
  /** A command was chosen (after its own `run`); set `keepOpen` to stay open. */
  onCommandExecute?: (event: OgeCommandExecuteEvent) => void;
  /** The query changed. */
  onQueryChange?: (query: string) => void;
}

/** What a `ref` on {@link OgeCommandPalette} reaches. */
export interface OgeCommandPaletteHandle {
  /** Opens the palette with an empty query. */
  open(): void;
  /** Closes the palette; focus returns to where it was. */
  close(): void;
  /** Opens a closed palette, closes an open one. */
  toggle(): void;
}

/**
 * A command palette — a modal search box over every action of an app,
 * opened with Ctrl+K / ⌘K. Fuzzy, grouped and highlighted matches, recent
 * commands above an empty query, an APG combobox over a listbox, and the
 * shared modal shell (focus trap, scroll lock, inert background, Escape
 * stack, backdrop dismissal, focus restore).
 */
export const OgeCommandPalette = forwardRef<
  OgeCommandPaletteHandle,
  OgeCommandPaletteProps
>(function OgeCommandPaletteRender(props, ref): ReactElement | null {
  const config = useOgeOverlayConfig();
  const messages = useMemo(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );
  const recentLimit = props.recentLimit ?? 5;
  const latest = useRef(props);
  latest.current = props;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(
    props.defaultOpened ?? false,
  );
  const isOpen = props.opened ?? uncontrolledOpen;
  const openRef = useRef(isOpen);
  openRef.current = isOpen;
  const setOpen = (next: boolean) => {
    if (openRef.current === next) return;
    openRef.current = next;
    if (latest.current.opened === undefined) setUncontrolledOpen(next);
    latest.current.onOpenedChange?.(next);
  };
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  const [uncontrolledRecent, setUncontrolledRecent] = useState<
    readonly string[]
  >(props.defaultRecent ?? []);
  const recent = props.recent ?? uncontrolledRecent;

  const [query, setQueryState] = useState('');
  const queryRef = useRef(query);
  const setQuery = (value: string) => {
    if (queryRef.current === value) return;
    queryRef.current = value;
    setQueryState(value);
    latest.current.onQueryChange?.(value);
  };

  const sections = useMemo(
    () =>
      ogeCommandPaletteSections(props.commands, query, {
        recent: recentLimit > 0 ? recent : [],
        limit: props.maxResults ?? 50,
      }),
    [props.commands, query, recent, recentLimit, props.maxResults],
  );
  const options = useMemo(() => ogeCommandPaletteOptions(sections), [sections]);
  const [active, setActive] = useState(-1);
  // a new list makes its first runnable option active
  useIsomorphicLayoutEffect(() => {
    setActive(ogeCommandPaletteFirstActive(options));
  }, [options]);

  const uid = useId().replace(/:/g, '');
  const listId = `oge-command-palette-${uid}-list`;
  const optionId = (index: number) => `oge-command-palette-${uid}-${index}`;
  const groupId = (key: string) =>
    `oge-command-palette-${uid}-${key.replace(/[^\w-]/g, '_')}`;

  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  const coreRef = useRef<OgeActionSheetCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgeActionSheetCore({
      layer: () => layerRef.current,
      sheet: () => panelRef.current,
      onDismiss: () => setOpenRef.current(false),
    });
  }
  const core = coreRef.current;

  const wasOpen = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (!isOpen) {
      if (wasOpen.current) {
        wasOpen.current = false;
        setReady(false);
        setQuery('');
      }
      return;
    }
    wasOpen.current = true;
    core.activate();
    inputRef.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
      core.deactivate();
    };
  }, [isOpen, core]);
  useEffect(() => () => core.destroy(), [core]);

  // the active option stays in view as the keys move it
  useEffect(() => {
    if (!isOpen || active < 0) return;
    panelRef.current?.ownerDocument
      .getElementById(optionId(active))
      ?.scrollIntoView?.({ block: 'nearest' });
  });

  const open = () => {
    if (openRef.current) return;
    setQuery('');
    setOpen(true);
  };
  const close = () => setOpen(false);
  const toggle = () => (openRef.current ? close() : open());
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  const hotkey = props.hotkey === undefined ? 'Mod+K' : props.hotkey;
  useEffect(() => {
    if (!hotkey || typeof document === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !ogeMatchesShortcut(event, hotkey)) return;
      event.preventDefault();
      toggleRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hotkey]);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        if (!openRef.current) toggleRef.current();
      },
      close: () => setOpenRef.current(false),
      toggle: () => toggleRef.current(),
    }),
    [],
  );

  const execute = (index: number) => {
    const command = options[index]?.command;
    if (!command || command.disabled) return;
    const nextRecent = ogeCommandPaletteRecent(recent, command.id, recentLimit);
    if (props.recent === undefined) setUncontrolledRecent(nextRecent);
    props.onRecentChange?.(nextRecent);
    command.run?.();
    const event: OgeCommandExecuteEvent = { command, keepOpen: false };
    props.onCommandExecute?.(event);
    if (!event.keepOpen) close();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const intent = ogeCommandPaletteKeyIntent(event, active, options);
    if (!intent) return;
    event.preventDefault();
    if (intent.kind === 'run') execute(intent.index);
    else setActive(intent.index);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const label = ogeOverlayMessage(messages, 'commandPaletteLabel');
  const status = query.trim()
    ? ogeFormatMessage(ogeOverlayMessage(messages, 'commandPaletteResults'), {
        count: options.length,
      })
    : '';

  return createPortal(
    <div
      ref={layerRef}
      className={
        ready
          ? 'oge-command-palette-layer oge-command-palette-ready'
          : 'oge-command-palette-layer'
      }
    >
      <div
        ref={panelRef}
        className="oge-command-palette"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="oge-command-palette-search">
          <svg
            className="oge-command-palette-search-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            className="oge-command-palette-input"
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            aria-label={label}
            placeholder={
              props.placeholder ??
              ogeOverlayMessage(messages, 'commandPalettePlaceholder')
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <div
          className="oge-command-palette-list"
          role="listbox"
          id={listId}
          aria-label={label}
        >
          {sections.length === 0 ? (
            <div className="oge-command-palette-empty" role="presentation">
              {ogeOverlayMessage(messages, 'commandPaletteEmpty')}
            </div>
          ) : (
            sections.map((section) => {
              const heading = section.recent
                ? ogeOverlayMessage(messages, 'commandPaletteRecent')
                : section.group;
              return (
                <div
                  key={section.key}
                  className="oge-command-palette-group"
                  role="group"
                  aria-labelledby={heading ? groupId(section.key) : undefined}
                >
                  {heading && (
                    <div
                      className="oge-command-palette-group-label"
                      role="presentation"
                      id={groupId(section.key)}
                    >
                      {heading}
                    </div>
                  )}
                  {section.options.map((option) => {
                    const { command } = option;
                    const isActive = option.index === active;
                    return (
                      <div
                        key={command.id}
                        className={
                          isActive
                            ? 'oge-command-palette-option oge-command-palette-option-active'
                            : 'oge-command-palette-option'
                        }
                        role="option"
                        id={optionId(option.index)}
                        aria-selected={isActive}
                        aria-disabled={command.disabled ? true : undefined}
                        onPointerMove={() => {
                          if (!command.disabled) setActive(option.index);
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => execute(option.index)}
                      >
                        {command.icon && (
                          <svg
                            className="oge-command-palette-icon"
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path d={command.icon} />
                          </svg>
                        )}
                        <span className="oge-command-palette-text">
                          <span className="oge-command-palette-label">
                            {option.segments.map((segment, i) =>
                              segment.match ? (
                                <mark
                                  key={i}
                                  className="oge-command-palette-match"
                                >
                                  {segment.text}
                                </mark>
                              ) : (
                                <span key={i}>{segment.text}</span>
                              ),
                            )}
                          </span>
                          {command.description && (
                            <span className="oge-command-palette-description">
                              {command.description}
                            </span>
                          )}
                        </span>
                        {command.shortcut && (
                          <kbd className="oge-command-palette-shortcut">
                            {ogeFormatShortcut(command.shortcut)}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <span className="oge-command-palette-status" role="status">
          {status}
        </span>
      </div>
    </div>,
    document.body,
  );
});
