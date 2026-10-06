import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
  output,
} from '@angular/core';

/**
 * The drill-down path of the treemap and the sunburst: a `<nav>` with an
 * ordered list of real buttons for the ancestors and the current level as
 * `aria-current="page"` text — the APG breadcrumb's structure, buttons
 * instead of links because nothing navigates. Internal.
 */
@Component({
  selector: 'oge-chart-breadcrumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-chart-breadcrumb-host' },
  template: `
    <nav class="oge-chart-breadcrumb" [attr.aria-label]="label()">
      <ol>
        @for (crumb of crumbs(); track crumb.key; let last = $last) {
          <li>
            @if (last) {
              <span class="oge-chart-breadcrumb-current" aria-current="page">{{
                crumb.name
              }}</span>
            } @else {
              <button
                type="button"
                class="oge-chart-breadcrumb-btn"
                (click)="crumbClick.emit(crumb.key)"
              >
                {{ crumb.name }}
              </button>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class OgeChartBreadcrumb {
  readonly crumbs =
    input.required<
      readonly { readonly key: string; readonly name: string }[]
    >();
  readonly label = input('');
  readonly crumbClick = output<string>();
}
