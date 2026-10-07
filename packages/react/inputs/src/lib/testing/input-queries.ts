import { fireEvent, getConfig } from '@testing-library/dom';

/** Filters shared by every input query (`getTextBox`, `getSelectBox`, …). */
export interface OgeInputQueryFilters {
  /** Only editors whose label (visible label or `aria-label`) matches. */
  label?: string | RegExp;
  /** Only editors whose displayed text matches. */
  value?: string | RegExp;
  /** Only disabled (`true`) or enabled (`false`) editors. */
  disabled?: boolean;
}

/**
 * Typed queries and actions over one OGE text-field editor — the React
 * counterpart of the `@oge-ui/inputs/testing` harnesses, with the same member
 * names. Reads are synchronous; actions fire events through Testing Library
 * (act-wrapped once `@testing-library/react` is loaded).
 */
export interface OgeInputQueries {
  /** The editor's root element (`.oge-text-box`, `.oge-select-box`, …). */
  readonly element: HTMLElement;
  /** The native `<input>`. */
  readonly input: HTMLInputElement;
  /** The text the editor shows. */
  getValue(): string;
  /** The visible label (without the required mark) or the `aria-label`. */
  getLabel(): string;
  /** The input's placeholder. */
  getPlaceholder(): string;
  /** Whether the editor is disabled. */
  isDisabled(): boolean;
  /** Whether the editor is read-only. */
  isReadonly(): boolean;
  /** Whether the editor shows its error state (`aria-invalid="true"`). */
  isInvalid(): boolean;
  /** Whether the editor is required (`aria-required="true"`). */
  isRequired(): boolean;
  /** The visible error message, or `''`. */
  getErrorText(): string;
  /** The visible hint, or `''`. */
  getHintText(): string;
  /** Focuses the input. */
  focus(): void;
  /** Blurs the input — the editor commits on blur. */
  blur(): void;
  /** Whether the input has focus. */
  isFocused(): boolean;
  /** Replaces the text and commits it (blur; Enter for a date box). */
  setValue(text: string): void;
  /** Replaces the text without committing (as-you-type behaviour). */
  typeText(text: string): void;
  /** Presses Enter in the input. */
  pressEnter(): void;
}

/** `getNumberBox()` — plus the keyboard spin. */
export interface OgeNumberBoxQueries extends OgeInputQueries {
  /** One step up (ArrowUp, which commits immediately). */
  increment(): void;
  /** One step down (ArrowDown, which commits immediately). */
  decrement(): void;
}

/** Filter for {@link OgeSelectBoxQueries.getOptions}. */
export interface OgeSelectOptionFilter {
  /** Only options whose text matches. */
  text?: string | RegExp;
}

/** `getSelectBox()` — the WAI-ARIA combobox + listbox. */
export interface OgeSelectBoxQueries extends OgeInputQueries {
  /** Whether the popup is open (`aria-expanded="true"`). */
  isOpen(): boolean;
  /** Opens the popup with a click on the field (no-op when open). */
  open(): void;
  /** Closes the popup with Escape (no-op when closed). */
  close(): void;
  /** Texts of the listed options — opens the popup first. */
  getOptions(filter?: OgeSelectOptionFilter): string[];
  /** Opens the popup and clicks the first option whose text matches. */
  selectOption(text: string | RegExp): void;
  /** Text of the selected option in the open list, or `null`. */
  getSelectedOptionText(): string | null;
  /** Types into the search field (`searchEnabled`) without committing. */
  search(text: string): void;
}

/** `getDateBox()` — a combobox whose popup is a date picker dialog. */
export interface OgeDateBoxQueries extends OgeInputQueries {
  /** Whether the picker is open (`aria-expanded="true"`). */
  isOpen(): boolean;
  /** Opens the picker with a click on the field (no-op when open). */
  open(): void;
  /** Closes the picker with Escape (no-op when closed). */
  close(): void;
  /** The heading of the month on show (`"March 2026"`). */
  getCalendarTitle(): string;
  /** Shows the next month. */
  nextMonth(): void;
  /** Shows the previous month. */
  previousMonth(): void;
  /** Opens the picker and clicks a day of the month on show. */
  selectDay(day: number): void;
}

const clean = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

const matches = (text: string, pattern: string | RegExp): boolean =>
  typeof pattern === 'string' ? text === pattern : pattern.test(text);

const wrap = (work: () => void): void => {
  getConfig().eventWrapper(work);
};

const enter = (input: HTMLElement) =>
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

function baseQueries(root: HTMLElement, kind: string): OgeInputQueries {
  const input = root.querySelector<HTMLInputElement>('input.oge-input-native');
  if (!input) throw new Error(`${kind}: the editor has no native input`);
  const type = (text: string) => {
    wrap(() => input.focus());
    fireEvent.input(input, { target: { value: text } });
  };
  return {
    element: root,
    input,
    getValue: () => input.value,
    getLabel() {
      const label = root.querySelector('.oge-input-label');
      if (label) return clean(label.textContent).replace(/\s*\*$/, '');
      return input.getAttribute('aria-label') ?? '';
    },
    getPlaceholder: () => input.getAttribute('placeholder') ?? '',
    isDisabled: () => root.classList.contains('oge-disabled') || input.disabled,
    isReadonly: () => root.classList.contains('oge-input-readonly'),
    isInvalid: () => input.getAttribute('aria-invalid') === 'true',
    isRequired: () => input.getAttribute('aria-required') === 'true',
    getErrorText: () =>
      clean(root.querySelector('.oge-input-error')?.textContent),
    getHintText: () =>
      clean(root.querySelector('.oge-input-hint')?.textContent),
    focus: () => wrap(() => input.focus()),
    blur: () => wrap(() => input.blur()),
    isFocused: () => input.ownerDocument.activeElement === input,
    setValue(text) {
      type(text);
      wrap(() => input.blur());
    },
    typeText: type,
    pressEnter: () => enter(input),
  };
}

/** The popup the combobox controls, looked up from its document. */
function controlled(input: HTMLInputElement): HTMLElement | null {
  const id = input.getAttribute('aria-controls');
  return id ? input.ownerDocument.getElementById(id) : null;
}

function popupQueries(base: OgeInputQueries, kind: string) {
  const { input } = base;
  const isOpen = () => input.getAttribute('aria-expanded') === 'true';
  const open = () => {
    if (!isOpen()) fireEvent.click(input);
  };
  const panel = (): HTMLElement => {
    open();
    const found = controlled(input);
    if (!found) throw new Error(`${kind}: the popup did not open`);
    return found;
  };
  return {
    isOpen,
    open,
    close() {
      if (isOpen()) {
        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
      }
    },
    panel,
  };
}

function createSelectBox(root: HTMLElement): OgeSelectBoxQueries {
  const base = baseQueries(root, 'getSelectBox');
  const popup = popupQueries(base, 'getSelectBox');
  const options = (filter: OgeSelectOptionFilter = {}) =>
    Array.from(
      popup.panel().querySelectorAll<HTMLElement>('[role="option"]'),
    ).filter(
      (option) =>
        filter.text === undefined ||
        matches(clean(option.textContent), filter.text),
    );
  return {
    ...base,
    isOpen: popup.isOpen,
    open: popup.open,
    close: popup.close,
    getOptions: (filter) => options(filter).map((o) => clean(o.textContent)),
    selectOption(text) {
      const [match] = options({ text });
      if (!match) {
        const all = options().map((o) => clean(o.textContent));
        throw new Error(
          `getSelectBox: no option matching ${String(text)} (options: ${all.join(', ')})`,
        );
      }
      fireEvent.click(match);
    },
    getSelectedOptionText() {
      const selected = options().find(
        (o) => o.getAttribute('aria-selected') === 'true',
      );
      return selected ? clean(selected.textContent) : null;
    },
    search(text) {
      base.typeText(text);
    },
  };
}

function createDateBox(root: HTMLElement): OgeDateBoxQueries {
  const base = baseQueries(root, 'getDateBox');
  const popup = popupQueries(base, 'getDateBox');
  const navs = () =>
    Array.from(
      popup.panel().querySelectorAll<HTMLElement>('.oge-calendar-nav'),
    );
  return {
    ...base,
    setValue(text) {
      base.typeText(text);
      enter(base.input);
    },
    isOpen: popup.isOpen,
    open: popup.open,
    close: popup.close,
    getCalendarTitle: () =>
      clean(
        popup.panel().querySelector('.oge-calendar-view-label')?.textContent,
      ),
    nextMonth() {
      const all = navs();
      fireEvent.click(all[all.length - 1]);
    },
    previousMonth() {
      fireEvent.click(navs()[0]);
    },
    selectDay(day) {
      const cell = Array.from(
        popup
          .panel()
          .querySelectorAll<HTMLButtonElement>(
            '.oge-calendar-cell[role="gridcell"]:not(.oge-calendar-cell-other)',
          ),
      ).find((c) => clean(c.textContent) === String(day));
      if (!cell) {
        throw new Error(`getDateBox: no day ${day} in the month on show`);
      }
      if (cell.disabled) throw new Error(`getDateBox: day ${day} is disabled`);
      fireEvent.click(cell);
    },
  };
}

function createNumberBox(root: HTMLElement): OgeNumberBoxQueries {
  const base = baseQueries(root, 'getNumberBox');
  return {
    ...base,
    increment: () =>
      fireEvent.keyDown(base.input, { key: 'ArrowUp', code: 'ArrowUp' }),
    decrement: () =>
      fireEvent.keyDown(base.input, { key: 'ArrowDown', code: 'ArrowDown' }),
  };
}

/** Builds the `getAll*` / `get*` pair for one editor kind. */
function finders<Q extends OgeInputQueries>(
  name: string,
  selector: string,
  create: (root: HTMLElement) => Q,
) {
  const getAll = (
    container: HTMLElement = document.body,
    filters: OgeInputQueryFilters = {},
  ): Q[] => {
    const roots = container.matches(selector)
      ? [container]
      : Array.from(container.querySelectorAll<HTMLElement>(selector));
    return roots
      .map(create)
      .filter(
        (q) =>
          (filters.label === undefined ||
            matches(q.getLabel(), filters.label)) &&
          (filters.value === undefined ||
            matches(q.getValue(), filters.value)) &&
          (filters.disabled === undefined ||
            q.isDisabled() === filters.disabled),
      );
  };
  const getOne = (
    container: HTMLElement = document.body,
    filters: OgeInputQueryFilters = {},
  ): Q => {
    const found = getAll(container, filters);
    if (found.length !== 1) {
      throw new Error(
        `${name}: expected one editor, found ${found.length} — narrow the container or pass a label filter`,
      );
    }
    return found[0];
  };
  return [getOne, getAll] as const;
}

const [textBox, textBoxes] = finders('getTextBox', '.oge-text-box', (root) =>
  baseQueries(root, 'getTextBox'),
);
const [numberBox, numberBoxes] = finders(
  'getNumberBox',
  '.oge-number-box',
  createNumberBox,
);
const [selectBox, selectBoxes] = finders(
  'getSelectBox',
  '.oge-select-box:not(.oge-multi-column-combo-box)',
  createSelectBox,
);
const [dateBox, dateBoxes] = finders(
  'getDateBox',
  '.oge-date-box',
  createDateBox,
);

/**
 * The one `<OgeTextBox>` in (or being) the container that matches the
 * filters; throws when there is none or more than one.
 *
 * ```tsx
 * render(<Profile />);
 * const name = getTextBox(document.body, { label: 'Name' });
 * name.setValue('Ada');
 * expect(name.isInvalid()).toBe(false);
 * ```
 */
export function getTextBox(
  container?: HTMLElement,
  filters?: OgeInputQueryFilters,
): OgeInputQueries {
  return textBox(container, filters);
}

/** Every `<OgeTextBox>` in the container that matches the filters. */
export function getAllTextBoxes(
  container?: HTMLElement,
  filters?: OgeInputQueryFilters,
): OgeInputQueries[] {
  return textBoxes(container, filters);
}

/** The one `<OgeNumberBox>` in the container that matches the filters. */
export function getNumberBox(
  container?: HTMLElement,
  filters?: OgeInputQueryFilters,
): OgeNumberBoxQueries {
  return numberBox(container, filters);
}

/** Every `<OgeNumberBox>` in the container that matches the filters. */
export function getAllNumberBoxes(
  container?: HTMLElement,
  filters?: OgeInputQueryFilters,
): OgeNumberBoxQueries[] {
  return numberBoxes(container, filters);
}

/**
 * The one `<OgeSelectBox>` in the container that matches the filters.
 *
 * ```tsx
 * const city = getSelectBox(container, { label: 'City' });
 * city.selectOption('Oslo');
 * expect(city.getValue()).toBe('Oslo');
 * ```
 */
export function getSelectBox(
  container?: HTMLElement,
  filters?: OgeInputQueryFilters,
): OgeSelectBoxQueries {
  return selectBox(container, filters);
}

/** Every `<OgeSelectBox>` in the container that matches the filters. */
export function getAllSelectBoxes(
  container?: HTMLElement,
  filters?: OgeInputQueryFilters,
): OgeSelectBoxQueries[] {
  return selectBoxes(container, filters);
}

/** The one `<OgeDateBox>` in the container that matches the filters. */
export function getDateBox(
  container?: HTMLElement,
  filters?: OgeInputQueryFilters,
): OgeDateBoxQueries {
  return dateBox(container, filters);
}

/** Every `<OgeDateBox>` in the container that matches the filters. */
export function getAllDateBoxes(
  container?: HTMLElement,
  filters?: OgeInputQueryFilters,
): OgeDateBoxQueries[] {
  return dateBoxes(container, filters);
}

/**
 * Shortcut: picks a select box option by text. Takes any element inside the
 * select box (its combobox, its root) or its queries object.
 *
 * ```tsx
 * selectOption(screen.getByRole('combobox', { name: 'City' }), 'Oslo');
 * ```
 */
export function selectOption(
  selectBox: HTMLElement | OgeSelectBoxQueries,
  text: string | RegExp,
): void {
  if ('selectOption' in selectBox) {
    selectBox.selectOption(text);
    return;
  }
  const root = selectBox.closest<HTMLElement>('.oge-select-box');
  if (!root) {
    throw new Error(
      'selectOption: the element is not inside an OGE select box',
    );
  }
  createSelectBox(root).selectOption(text);
}
