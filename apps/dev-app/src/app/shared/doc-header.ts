import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Consistent page header: breadcrumb, title, lead text (projected), chips. */
@Component({
  selector: 'app-doc-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 border-b border-gray-200 pb-6 dark:border-gray-800">
      <nav class="mb-2 flex items-center gap-1.5 text-[12.5px] text-gray-400">
        <a routerLink="/getting-started" class="hover:text-gray-600 dark:hover:text-gray-300">Docs</a>
        <span>/</span>
        <a routerLink="/components/data-grid" class="hover:text-gray-600 dark:hover:text-gray-300">
          {{ category() }}
        </a>
        <span>/</span>
        <span class="text-gray-500 dark:text-gray-400">{{ title() }}</span>
      </nav>
      <h1 class="!m-0 text-[26px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {{ title() }}
      </h1>
      <div class="mt-2 [&>p]:!my-0 [&>p]:max-w-3xl">
        <ng-content />
      </div>
      @if (chips().length) {
        <div class="mt-3 flex flex-wrap gap-1.5">
          @for (chip of chips(); track chip) {
            <span
              class="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[11px] text-indigo-700 dark:border-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-300"
            >
              {{ chip }}
            </span>
          }
        </div>
      }
    </div>
  `,
})
export class DocHeader {
  readonly title = input.required<string>();
  readonly category = input('Data Grid');
  readonly chips = input<readonly string[]>([]);
}
