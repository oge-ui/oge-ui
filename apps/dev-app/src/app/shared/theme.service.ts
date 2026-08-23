import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type GridTheme = 'default' | 'tailwind' | 'bootstrap';
export type DocsMode = 'light' | 'dark';

const STORAGE_KEY = 'oge-docs-grid-theme';
const MODE_STORAGE_KEY = 'oge-docs-mode';
const LINK_ID = 'oge-grid-theme';
const DARK_LINK_ID = 'oge-grid-dark-theme';

/** `localStorage` is absent during build-time prerender and may throw in private browsing. */
function readStored(key: string): string | null {
  try {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // private browsing — the in-memory signal still drives the UI
  }
}

/**
 * Switches the grid bridge theme at runtime by swapping a stylesheet link —
 * exactly what a consuming app does at build time with a static import.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<GridTheme>(
    (readStored(STORAGE_KEY) as GridTheme | null) ?? 'default',
  );

  /** Docs light/dark mode; also switches the grids via the `oge-theme-dark` class. */
  readonly mode = signal<DocsMode>(
    (readStored(MODE_STORAGE_KEY) as DocsMode | null) ?? 'light',
  );

  toggleMode(): void {
    this.mode.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  constructor() {
    effect(() => {
      const theme = this.theme();
      writeStored(STORAGE_KEY, theme);
      const existing = this.document.getElementById(LINK_ID);
      if (theme === 'default') {
        existing?.remove();
        return;
      }
      const link =
        (existing as HTMLLinkElement) ?? this.document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      link.href = `themes/${theme}.css`;
      if (!existing) this.document.head.appendChild(link);
    });
    effect(() => {
      const dark = this.mode() === 'dark';
      writeStored(MODE_STORAGE_KEY, this.mode());
      const root = this.document.documentElement;
      root.classList.toggle('dark', dark);
      root.classList.toggle('oge-theme-dark', dark);
      if (dark && !this.document.getElementById(DARK_LINK_ID)) {
        const link = this.document.createElement('link');
        link.id = DARK_LINK_ID;
        link.rel = 'stylesheet';
        link.href = 'themes/dark.css';
        this.document.head.appendChild(link);
      }
    });
  }
}
