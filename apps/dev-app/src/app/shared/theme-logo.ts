import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Theme identities the docs offer — the grid theme values, verbatim. */
export type ThemeLogoName = 'default' | 'tailwind' | 'bootstrap';

/**
 * The mark of the CSS library a theme bridges to, drawn inline — Tailwind's
 * waves, Bootstrap's B, and the OGE indigo dot for the suite's own theme.
 * Sits in front of each option of the theme select so a reader recognises
 * the theme by its library's identity, not only by its name.
 */
@Component({
  selector: 'app-theme-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (name()) {
      @case ('tailwind') {
        <svg
          [attr.width]="size()"
          [attr.height]="size()"
          viewBox="0 0 24 24"
          fill="#38bdf8"
          aria-hidden="true"
        >
          <path
            d="M12 6c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35C13.39 10.85 14.5 12 17 12c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.3-.74-1.91-1.35C15.61 7.15 14.5 6 12 6ZM7 12c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.3.74 1.91 1.35C8.39 16.85 9.5 18 12 18c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.3-.74-1.91-1.35C10.61 13.15 9.5 12 7 12Z"
          />
        </svg>
      }
      @case ('bootstrap') {
        <svg
          [attr.width]="size()"
          [attr.height]="size()"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="1.5" y="3" width="21" height="18" rx="4" fill="#7952b3" />
          <path
            d="M9 6.8h4.1c1.9 0 3.2 1 3.2 2.7 0 1.2-.8 2.1-1.9 2.4v.1c1.4.2 2.4 1.3 2.4 2.7 0 2-1.5 3.1-3.7 3.1H9V6.8Zm2 4.4h1.7c1 0 1.6-.5 1.6-1.4 0-.8-.6-1.3-1.6-1.3H11v2.7Zm0 4.9h2c1.1 0 1.8-.5 1.8-1.5s-.7-1.5-1.9-1.5H11v3Z"
            fill="#fff"
          />
        </svg>
      }
      @default {
        <!-- the suite's own theme: the OGE indigo, as a token-colored dot -->
        <svg
          [attr.width]="size()"
          [attr.height]="size()"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="#6366f1"
            stroke-width="3.5"
          />
          <circle cx="12" cy="12" r="3" fill="#6366f1" />
        </svg>
      }
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class ThemeLogo {
  readonly name = input.required<ThemeLogoName>();
  readonly size = input(15);
}
