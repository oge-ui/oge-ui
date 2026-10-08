import {
  DOCUMENT,
  Injectable,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

export type GridTheme = 'default' | 'high-contrast' | 'tailwind' | 'bootstrap';
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
 * `high-contrast` is a scoped theme like dark: besides its stylesheet it needs
 * the `oge-theme-high-contrast` class on <html>. It is a light-surface
 * palette (AAA against white): components without a surface of their own —
 * tabs, text buttons, links — paint on the page, so while it is active the
 * docs render light whatever the stored mode (on the dark docs chrome its
 * accent read dark blue on near-black). The stored mode comes back with any
 * other theme.
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

  /** Whether the light/dark switch applies (not under the light high-contrast theme). */
  readonly modeLocked = computed(() => this.theme() === 'high-contrast');

  /** The mode the docs actually render in. */
  readonly effectiveMode = computed<DocsMode>(() =>
    this.modeLocked() ? 'light' : this.mode(),
  );

  toggleMode(): void {
    if (this.modeLocked()) return;
    this.mode.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  constructor() {
    effect(() => {
      const theme = this.theme();
      writeStored(STORAGE_KEY, theme);
      this.document.documentElement.classList.toggle(
        'oge-theme-high-contrast',
        theme === 'high-contrast',
      );
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
      writeStored(MODE_STORAGE_KEY, this.mode());
      const dark = this.effectiveMode() === 'dark';
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
