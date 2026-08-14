import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { FrameworkLogo, type FrameworkLogoName } from './framework-logo';
import { FrameworkService } from './framework.service';

/**
 * The site-wide framework switch.
 *
 * Follows the shape Ionic and the DevExtreme demo gallery settled on: one
 * segmented control, a **global** choice, and no navigation — the page you are
 * reading re-renders in the framework you picked instead of sending you to a
 * different site. The sidebar therefore never lists a component twice.
 *
 * Rendered from `FrameworkService.frameworks`, so a future vanilla-JavaScript
 * layer appears here by adding one entry rather than by editing this template.
 *
 * Pass `family` on a component page and a framework without that family is
 * simply not offered; leave it off (the hero, a landing surface) and every
 * framework is selectable.
 */
@Component({
  selector: 'app-framework-switch',
  imports: [FrameworkLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-framework-switch' },
  template: `
    <!--
      A control with one option is noise, not a choice: a family that exists in
      a single framework simply shows no switch.
    -->
    @if (visible().length > 1) {
      <div class="app-fw-group" role="group" aria-label="Framework">
        @for (entry of visible(); track entry.id) {
          <button
            type="button"
            [class.is-active]="fw.framework() === entry.id"
            [attr.aria-pressed]="fw.framework() === entry.id"
            (click)="fw.set(entry.id)"
          >
            <app-framework-logo
              [name]="logoOf(entry.id)"
              [brand]="fw.framework() === entry.id"
              [size]="15"
            />
            {{ entry.label }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    /* No margin of its own: the header centers it in a flex row, and the
       hero places it explicitly — a host margin here pushed the control off
       the header's centerline. */
    :host {
      display: block;
    }
    .app-fw-group {
      display: inline-flex;
      gap: 0.2rem;
      padding: 0.22rem;
      border: 1px solid var(--oge-border-color);
      border-radius: 999px;
      background: var(--oge-bg);
    }
    .app-fw-group button {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.34rem 0.85rem;
      border: 0;
      border-radius: 999px;
      background: none;
      color: var(--oge-text-color);
      font: inherit;
      font-size: 0.82rem;
      font-weight: 500;
      opacity: 0.65;
      cursor: pointer;
      transition:
        background 120ms ease,
        opacity 120ms ease,
        box-shadow 120ms ease;
    }
    .app-fw-group button:hover {
      opacity: 1;
      background: var(--oge-row-hover-bg, var(--oge-accent-soft));
    }
    .app-fw-group button.is-active {
      opacity: 1;
      background: var(--oge-bg);
      color: var(--oge-text-color);
      box-shadow:
        0 1px 2px rgb(0 0 0 / 8%),
        0 0 0 1px var(--oge-border-color);
    }
    .app-fw-group button:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px var(--oge-focus-ring);
    }
    @media (prefers-reduced-motion: reduce) {
      .app-fw-group button {
        transition: none;
      }
    }
  `,
})
export class FrameworkSwitch {
  protected readonly fw = inject(FrameworkService);

  /**
   * Component family this page documents, e.g. `'buttons'`. Omit on surfaces
   * that are not about one component — every framework is then offered.
   */
  readonly family = input<string | undefined>(undefined);

  protected readonly visible = () => {
    const family = this.family();
    if (!family) return this.fw.frameworks;
    return this.fw.frameworks.filter((entry) =>
      this.fw.supports(family, entry.id),
    );
  };

  protected readonly logoOf = (id: string): FrameworkLogoName =>
    id as FrameworkLogoName;
}
