import { fireEvent } from '@testing-library/dom';

/** Filters for {@link getModal} / {@link getAllModals}. */
export interface OgeModalQueryFilters {
  /** Only modals whose title (or `aria-label`) matches. */
  title?: string | RegExp;
}

/**
 * Typed queries and actions over one open `<OgeModal>` (or a modal opened
 * through `useOgeModals()`, alert / confirm / prompt included) — the React
 * counterpart of `OgeModalHarness` from `@oge-ui/overlay/testing`, with the
 * same member names. Reads are synchronous; actions fire events through
 * Testing Library (act-wrapped once `@testing-library/react` is loaded). An
 * async close guard settles later: assert with `await waitFor(…)`.
 *
 * A closed React modal renders nothing, so only open modals are found; scope
 * queries to the content with `within(modal.element)`.
 */
export interface OgeModalQueries {
  /** The dialog panel (`.oge-modal`, `role="dialog"` / `"alertdialog"`). */
  readonly element: HTMLElement;
  /** Whether the modal is still open (its panel is in the document). */
  isOpen(): boolean;
  /** The title — the heading's text, or the `aria-label` without one. */
  getTitle(): string;
  /** The panel's role: `'dialog'` or `'alertdialog'`. */
  getRole(): string | null;
  /** Whether the modal reports `aria-busy`. */
  isBusy(): boolean;
  /** Text of the modal body. */
  getContentText(): string;
  /** Labels of the action buttons (the footer's, or a dialog helper's). */
  getButtonTexts(): string[];
  /** Clicks the action button whose label matches. */
  clickButton(label: string | RegExp): void;
  /** Clicks the header's close (✕) button. */
  close(): void;
  /** Presses Escape inside the modal. */
  pressEscape(): void;
  /** Presses on the backdrop, outside the panel. */
  clickBackdrop(): void;
}

const PANEL = '.oge-modal-layer > .oge-modal';

const clean = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

const matches = (text: string, pattern: string | RegExp): boolean =>
  typeof pattern === 'string' ? text === pattern : pattern.test(text);

function createModalQueries(panel: HTMLElement): OgeModalQueries {
  const buttons = () =>
    Array.from(
      panel.querySelectorAll<HTMLButtonElement>(
        '.oge-modal-footer button, .oge-modal-body .oge-dialog-actions button',
      ),
    );
  const labelOf = (button: HTMLElement) =>
    clean(button.textContent) || (button.getAttribute('aria-label') ?? '');
  return {
    element: panel,
    isOpen: () => panel.isConnected,
    getTitle() {
      const title = clean(panel.querySelector('.oge-modal-title')?.textContent);
      return title || (panel.getAttribute('aria-label') ?? '');
    },
    getRole: () => panel.getAttribute('role'),
    isBusy: () => panel.getAttribute('aria-busy') === 'true',
    getContentText: () =>
      clean(panel.querySelector('.oge-modal-body')?.textContent),
    getButtonTexts: () => buttons().map(labelOf),
    clickButton(label) {
      const button = buttons().find((b) => matches(labelOf(b), label));
      if (!button) {
        throw new Error(
          `getModal: no action button matching ${String(label)} (buttons: ${buttons().map(labelOf).join(', ')})`,
        );
      }
      fireEvent.click(button);
    },
    close() {
      const button = panel.querySelector<HTMLElement>('.oge-modal-close');
      if (!button) throw new Error('getModal: the modal has no close button');
      fireEvent.click(button);
    },
    pressEscape() {
      fireEvent.keyDown(panel, { key: 'Escape', code: 'Escape' });
    },
    clickBackdrop() {
      const layer = panel.parentElement;
      if (!layer) throw new Error('getModal: the modal is not open');
      fireEvent.pointerDown(layer);
      fireEvent.click(layer);
    },
  };
}

/** Every open modal in (or being) the container, optionally filtered. */
export function getAllModals(
  container: HTMLElement = document.body,
  filters: OgeModalQueryFilters = {},
): OgeModalQueries[] {
  const panels = container.matches(PANEL)
    ? [container]
    : Array.from(container.querySelectorAll<HTMLElement>(PANEL));
  return panels
    .map(createModalQueries)
    .filter(
      (modal) =>
        filters.title === undefined || matches(modal.getTitle(), filters.title),
    );
}

/**
 * The one open modal in the container (default `document.body`, where
 * `useOgeModals()` renders its dialogs). Throws when there is none or more
 * than one — pass a `title` filter.
 *
 * ```tsx
 * fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
 * const dialog = getModal(document.body, { title: 'Delete row?' });
 * expect(dialog.getButtonTexts()).toEqual(['Cancel', 'Delete']);
 * dialog.clickButton('Delete');
 * await waitFor(() => expect(dialog.isOpen()).toBe(false));
 * ```
 */
export function getModal(
  container: HTMLElement = document.body,
  filters: OgeModalQueryFilters = {},
): OgeModalQueries {
  const modals = getAllModals(container, filters);
  if (modals.length !== 1) {
    throw new Error(
      `getModal: expected one open modal, found ${modals.length} — pass a title filter`,
    );
  }
  return modals[0];
}
