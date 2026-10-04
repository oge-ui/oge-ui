'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import {
  applyButtonGroupSelection,
  buttonGroupNavIndex,
  buttonGroupRole,
  type OgeButtonGroupSelectionChange,
  type OgeButtonGroupSelectionMode,
  type OgeButtonSeverity,
  type OgeButtonSize,
  type OgeButtonStylingMode,
  ogeIsRtl,
} from '@oge-ui/behavior';
import { OgeButton } from './button';
import { isDevMode } from './dev';
import {
  OgeButtonGroupContext,
  type OgeButtonGroupContextValue,
} from './button-group-context';

/** A data-driven entry rendered after the projected children. */
export interface OgeButtonGroupItem {
  value: string;
  text?: string;
  hint?: string;
  disabled?: boolean;
  severity?: OgeButtonSeverity;
  badge?: string | number | boolean;
}

export interface OgeButtonGroupItemClickEvent {
  /** `value` of the clicked button; `undefined` for buttons without one. */
  value: string | undefined;
  event: MouseEvent | KeyboardEvent;
  /** The matching `items` entry when the group is data-driven. */
  item?: OgeButtonGroupItem;
  /** DOM-order index of the clicked button; `-1` when unresolvable. */
  index: number;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeButtonGroupHandle {
  /** Moves keyboard focus to the group's roving-tabindex target. */
  focus(): void;
}

export interface OgeButtonGroupProps {
  /** Data-driven items rendered after the projected children. */
  items?: readonly OgeButtonGroupItem[];
  selectionMode?: OgeButtonGroupSelectionMode;
  /** Selected `value`s. `single` mode keeps at most one entry. */
  selectedKeys?: readonly string[];
  /** Uncontrolled initial selection. */
  defaultSelectedKeys?: readonly string[];
  /** Fires when `selectedKeys` changes through user interaction. */
  onSelectionChange?: (change: OgeButtonGroupSelectionChange) => void;
  /** Fires for every accepted child click, before any selection change. */
  onItemClick?: (event: OgeButtonGroupItemClickEvent) => void;
  /** Fill style cascaded to children without their own. */
  stylingMode?: OgeButtonStylingMode;
  /** Semantic color cascaded to children without their own. */
  severity?: OgeButtonSeverity;
  /** Size preset cascaded to children without their own. */
  size?: OgeButtonSize;
  /** Disables every button in the group. */
  disabled?: boolean;
  /** Accessible name of the toolbar/radiogroup/group element. */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const NATIVE = 'button.oge-button-native';

/**
 * Segmented group of buttons with optional single/multiple selection.
 *
 * ```tsx
 * <OgeButtonGroup selectionMode="single" defaultSelectedKeys={['left']} ariaLabel="Alignment">
 *   <OgeButton value="left" text="Left" />
 *   <OgeButton value="center" text="Center" />
 * </OgeButtonGroup>
 * ```
 *
 * Children inherit the group's `stylingMode`, `severity`, `size` and
 * `disabled` unless they set their own. Arrow keys move focus (roving
 * tabindex); in `single` mode they move the selection as well — the WAI-ARIA
 * radio-group rule, applied by `@oge-ui/behavior` so both render layers agree.
 */
export const OgeButtonGroup = forwardRef<
  OgeButtonGroupHandle,
  OgeButtonGroupProps
>(function OgeButtonGroup(
  {
    items,
    selectionMode = 'none',
    selectedKeys: selectedKeysProp,
    defaultSelectedKeys,
    onSelectionChange,
    onItemClick,
    stylingMode = 'contained',
    severity = 'normal',
    size = 'md',
    disabled = false,
    ariaLabel,
    className,
    style,
    children,
  }: OgeButtonGroupProps,
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [uncontrolled, setUncontrolled] = useState<readonly string[]>(
    defaultSelectedKeys ?? [],
  );
  const selectedKeys = selectedKeysProp ?? uncontrolled;
  // Index into the *enabled* buttons — the roving-tabindex anchor.
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const enabledButtons = useCallback(
    () =>
      Array.from(
        rootRef.current?.querySelectorAll<HTMLButtonElement>(NATIVE) ?? [],
      ).filter((el) => !el.disabled),
    [],
  );

  const indexOfValue = useCallback(
    (value: string) =>
      Array.from(
        rootRef.current?.querySelectorAll<HTMLButtonElement>(NATIVE) ?? [],
      ).findIndex((el) => el.dataset['ogeValue'] === value),
    [],
  );

  // Mirrors the Angular group's `focus()`: moves focus to whichever button
  // currently holds the roving tabindex, not simply the first one.
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        const buttons = Array.from(
          rootRef.current?.querySelectorAll<HTMLButtonElement>(NATIVE) ?? [],
        ).filter((el) => !el.disabled);
        const target = buttons.find((el) => el.tabIndex === 0) ?? buttons[0];
        target?.focus({ preventScroll: true });
      },
    }),
    [],
  );

  const notifyClick = useCallback(
    (value: string | undefined, event: MouseEvent | KeyboardEvent) => {
      onItemClick?.({
        value,
        event,
        item:
          value !== undefined
            ? items?.find((entry) => entry.value === value)
            : undefined,
        // DOM order, matching the Angular group's payload; `-1` when the click
        // came from somewhere the buttons cannot be enumerated.
        index: value === undefined ? -1 : indexOfValue(value),
      });
      const change = applyButtonGroupSelection(
        selectionMode,
        selectedKeys,
        value,
      );
      if (!change) return;
      if (selectedKeysProp === undefined) setUncontrolled(change.selectedKeys);
      onSelectionChange?.(change);
    },
    [
      items,
      onItemClick,
      onSelectionChange,
      selectedKeys,
      selectedKeysProp,
      selectionMode,
    ],
  );

  const contextValue = useMemo<OgeButtonGroupContextValue>(
    () => ({
      stylingMode,
      severity,
      size,
      disabled,
      selectionMode,
      isSelected: (value) =>
        value !== undefined && selectedKeys.includes(value),
      // Server HTML / first paint: in single mode with a selection, only the
      // selected button is a tab stop — the one case that is knowable without
      // seeing DOM order. Everything else keeps the buttons' own tabIndex
      // until the layout effect below applies the real roving pattern.
      initialTabIndex: (value) =>
        selectionMode === 'single' && selectedKeys.length > 0
          ? value !== undefined && selectedKeys.includes(value)
            ? 0
            : -1
          : undefined,
      notifyClick,
    }),
    [
      disabled,
      notifyClick,
      selectedKeys,
      selectionMode,
      severity,
      size,
      stylingMode,
    ],
  );

  /**
   * The roving tabindex is written onto the DOM rather than passed down: only
   * the rendered order tells us which enabled button comes first once the
   * projected children and the `items` entries are interleaved. Isomorphic:
   * `'use client'` components still server-render, and a bare
   * `useLayoutEffect` warns on every SSR pass.
   */
  useIsomorphicLayoutEffect(() => {
    const buttons = enabledButtons();
    if (buttons.length === 0) return;
    let target = focusedIndex;
    if (target < 0 || target >= buttons.length) {
      target = 0;
      if (selectionMode === 'single') {
        const selectedAt = buttons.findIndex((el) =>
          selectedKeys.includes(el.dataset['ogeValue'] ?? '\u0000'),
        );
        if (selectedAt >= 0) target = selectedAt;
      }
    }
    buttons.forEach((el, i) => {
      el.tabIndex = i === target ? 0 : -1;
    });
  });

  useEffect(() => {
    if (!isDevMode()) return;
    if (selectionMode === 'none') return;
    const missing = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>(NATIVE) ?? [],
    ).some((el) => el.dataset['ogeValue'] === undefined);
    if (missing) {
      console.warn(
        '[OgeButtonGroup] selectionMode is on but some buttons have no `value`; they cannot be selected.',
      );
    }
  }, [selectionMode, items, children]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = enabledButtons();
    const current = buttons.findIndex((el) => el.tabIndex === 0);
    const rtl = rootRef.current !== null && ogeIsRtl(rootRef.current);
    const next = buttonGroupNavIndex(event.key, current, buttons.length, rtl);
    if (next < 0) return;
    event.preventDefault();
    setFocusedIndex(next);
    const target = buttons[next];
    target.focus({ preventScroll: true });
    // WAI-ARIA radio-group pattern: arrows move the selection too.
    const value = target.dataset['ogeValue'];
    if (selectionMode === 'single' && value !== undefined) {
      notifyClick(value, event.nativeEvent);
    }
  };

  const onFocusIn = (event: React.FocusEvent<HTMLDivElement>) => {
    const buttons = enabledButtons();
    // `event.target` is typed as the container; the actual target is whichever
    // descendant took focus. Widen to `Node` so the identity comparison is
    // legal without pretending to know the concrete element type.
    const target: Node = event.target;
    const index = buttons.findIndex((el) => el === target);
    if (index >= 0) setFocusedIndex(index);
  };

  return (
    <div
      ref={rootRef}
      className={['oge-button-group', disabled && 'oge-disabled', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      role={buttonGroupRole(selectionMode)}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      onFocus={onFocusIn}
    >
      <OgeButtonGroupContext.Provider value={contextValue}>
        {children}
        {items?.map((item) => (
          <OgeButton
            key={item.value}
            value={item.value}
            text={item.text ?? ''}
            hint={item.hint}
            disabled={item.disabled ?? false}
            severity={item.severity}
            badge={item.badge}
          />
        ))}
      </OgeButtonGroupContext.Provider>
    </div>
  );
});
