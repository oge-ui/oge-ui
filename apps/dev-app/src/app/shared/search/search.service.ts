import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/**
 * Open state of the Ctrl/⌘K search palette.
 *
 * Deliberately tiny: this service and the header button are all the initial
 * bundle carries. The palette itself (`search-palette.ts`), its ranking code
 * and the index (`/search-index.json`) load the first time a reader asks for
 * search — `requested` flips once and the shell's `@defer` block fetches the
 * chunk.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly document = inject(DOCUMENT);

  /** True once search has been asked for; the deferred palette loads then. */
  readonly requested = signal(false);
  readonly isOpen = signal(false);

  open(): void {
    this.requested.set(true);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  /**
   * Global shortcuts: Ctrl/⌘K toggles the palette anywhere; `/` opens it
   * when the reader is not typing into a field. Browser-only — call it from
   * code that does not run in the prerender.
   */
  listen(): () => void {
    const onKeydown = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      if (key === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey) {
        // a component that owns Ctrl/⌘K (the rich-text editor's link
        // command) handles it first or is focused in a contenteditable
        if (event.defaultPrevented || isRichText(event.target)) return;
        event.preventDefault();
        this.toggle();
        return;
      }
      if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !this.isOpen() &&
        !isEditable(event.target)
      ) {
        event.preventDefault();
        this.open();
      }
    };
    this.document.addEventListener('keydown', onKeydown);
    return () => this.document.removeEventListener('keydown', onKeydown);
  }
}

/** Whether a keystroke on `target` is typing (an input, a text area, …). */
export function isEditable(target: EventTarget | null): boolean {
  if (!target || !(target as Element).tagName) return false;
  const element = target as HTMLElement;
  const tag = element.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (element as HTMLInputElement).type;
    return ![
      'button',
      'checkbox',
      'radio',
      'submit',
      'reset',
      'range',
    ].includes(type);
  }
  return element.isContentEditable || !!element.closest?.('[contenteditable]');
}

/** Whether `target` sits in a rich-text editing surface (contenteditable). */
export function isRichText(target: EventTarget | null): boolean {
  if (!target || !(target as Element).tagName) return false;
  const element = target as HTMLElement;
  return (
    element.isContentEditable ||
    !!element.closest?.('[contenteditable]:not([contenteditable="false"])')
  );
}
