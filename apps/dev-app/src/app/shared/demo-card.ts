import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CodeBlock } from './code-block';

/**
 * Docs demo card with Preview/Code tabs (shadcn-style). The live demo stays
 * mounted while the Code tab is open, so grid state survives tab switches.
 */
@Component({
  selector: 'app-demo-card',
  imports: [CodeBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="my-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-800">
      <header
        class="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
      >
        @if (code()) {
          <div class="flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-950">
            @for (tab of tabs; track tab) {
              <button
                type="button"
                class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                [class]="
                  activeTab() === tab
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                "
                (click)="activeTab.set(tab)"
              >
                {{ tab }}
              </button>
            }
          </div>
        } @else {
          <span class="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{{ title() }}</span>
        }
        <div class="ml-auto flex flex-wrap justify-end gap-1.5">
          @for (chip of chips(); track chip) {
            <span
              class="rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              {{ chip }}
            </span>
          }
        </div>
      </header>
      <div class="p-4" [hidden]="activeTab() === 'Code'">
        <ng-content />
      </div>
      @if (code(); as source) {
        <div [hidden]="activeTab() === 'Preview'">
          <app-code-block [code]="source" [language]="language()" [frameless]="true" />
        </div>
      }
    </section>
  `,
})
export class DemoCard {
  readonly title = input('Example');
  readonly chips = input<readonly string[]>([]);
  /** When given, a Preview/Code tab switcher appears. */
  readonly code = input<string | undefined>(undefined);
  readonly language = input('html');

  protected readonly tabs = ['Preview', 'Code'] as const;
  protected readonly activeTab = signal<'Preview' | 'Code'>('Preview');
}
