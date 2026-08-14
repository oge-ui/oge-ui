import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Marks the logo component can draw — a superset of the shipped frameworks. */
export type FrameworkLogoName = 'angular' | 'react' | 'javascript';

/** Official brand colours, used when `brand` is on. */
const BRAND: Record<FrameworkLogoName, string> = {
  angular: '#DD0031',
  react: '#61DAFB',
  javascript: '#F7DF1E',
};

/**
 * The official mark of a framework, drawn inline.
 *
 * Used everywhere a framework is named so the switch, the hero and any future
 * per-framework surface stay visually identical. The React mark is the real
 * logo geometry (a nucleus with three orbits at 0°/60°/120°); the Angular one
 * is the shield with its `A`; the JavaScript square is here ready for the
 * vanilla layer, ahead of the framework itself.
 *
 * `brand` paints the official colour; without it the mark inherits
 * `currentColor`, which is what a segmented control wants for its inactive
 * items.
 */
@Component({
  selector: 'app-framework-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-framework-logo' },
  template: `
    @switch (name()) {
      @case ('angular') {
        <svg
          [attr.width]="size()"
          [attr.height]="size()"
          viewBox="0 0 24 24"
          [attr.fill]="fill()"
          aria-hidden="true"
        >
          <path
            d="M12 1.5 2.4 4.9 3.9 17.9 12 22.5l8.1-4.6 1.5-13L12 1.5Zm0 2.2 7.6 2.7-1.2 10.2L12 20.1l-6.4-3.5L4.4 6.4 12 3.7Z"
          />
          <path
            d="M12 5.6 7.6 15.9h1.7l.9-2.3h3.6l.9 2.3h1.7L12 5.6Zm-1.3 6.6L12 9l1.3 3.2h-2.6Z"
          />
        </svg>
      }
      @case ('react') {
        <!-- official React mark geometry: nucleus + three orbits -->
        <svg
          [attr.width]="size()"
          [attr.height]="size()"
          viewBox="-11.5 -10.232 23 20.463"
          [attr.color]="fill()"
          aria-hidden="true"
        >
          <circle r="2.05" fill="currentColor" />
          <g stroke="currentColor" stroke-width="1" fill="none">
            <ellipse rx="11" ry="4.2" />
            <ellipse rx="11" ry="4.2" transform="rotate(60)" />
            <ellipse rx="11" ry="4.2" transform="rotate(120)" />
          </g>
        </svg>
      }
      @case ('javascript') {
        <svg
          [attr.width]="size()"
          [attr.height]="size()"
          viewBox="0 0 24 24"
          [attr.fill]="fill()"
          aria-hidden="true"
        >
          <path
            d="M2 2h20v20H2V2Zm10.6 16.7c.5.9 1.2 1.6 2.6 1.6 1.2 0 1.9-.6 1.9-1.4 0-.9-.7-1.3-2-1.8l-.7-.3c-2-.8-3.3-1.9-3.3-4.1 0-2 1.5-3.5 3.9-3.5 1.7 0 2.9.6 3.7 2.1l-2 1.3c-.4-.8-.9-1.1-1.7-1.1s-1.3.5-1.3 1.1c0 .8.5 1.1 1.7 1.6l.7.3c2.3 1 3.6 2 3.6 4.3 0 2.4-1.9 3.7-4.4 3.7-2.5 0-4.1-1.2-4.9-2.7l2.2-1.1ZM5.6 19c.4.7.8 1.3 1.7 1.3.8 0 1.3-.3 1.3-1.6v-8.6h2.6v8.6c0 2.7-1.6 3.9-3.9 3.9-2.1 0-3.3-1.1-3.9-2.4L5.6 19Z"
          />
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
export class FrameworkLogo {
  readonly name = input.required<FrameworkLogoName>();
  readonly size = input(15);
  /** Paint the official brand colour instead of inheriting `currentColor`. */
  readonly brand = input(false);

  protected readonly fill = () =>
    this.brand() ? BRAND[this.name()] : 'currentColor';
}
