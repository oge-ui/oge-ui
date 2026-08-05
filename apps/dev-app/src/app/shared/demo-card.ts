import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CodeBlock, type CodeFile } from './code-block';

export type DemoFile = CodeFile;

/**
 * Docs demo card with Preview/Code tabs. In the Code tab, multi-file demos
 * show their file tabs inside the editor's own window bar (VS Code style).
 * The live demo stays mounted while Code is open, so grid state survives.
 */
@Component({
  selector: 'app-demo-card',
  imports: [CodeBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="my-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-800">
      <header
        class="flex items-center gap-3 border-b px-3 py-2"
        [class]="
          codeOpen()
            ? 'border-[#2d2d2d] bg-[#181818]'
            : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
        "
      >
        @if (hasCode()) {
          <div
            class="flex rounded-lg border p-0.5"
            [class]="
              codeOpen()
                ? 'border-[#3c3c3c] bg-[#1e1e1e]'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950'
            "
          >
            @for (tab of tabs; track tab) {
              <button
                type="button"
                class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                [class]="tabClass(tab)"
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
              class="rounded border px-2 py-0.5 font-mono text-[11px]"
              [class]="
                codeOpen()
                  ? 'border-[#3c3c3c] bg-[#1e1e1e] text-gray-400'
                  : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
              "
            >
              {{ chip }}
            </span>
          }
        </div>
      </header>
      <div class="p-4" [hidden]="activeTab() === 'Code'">
        <ng-content />
      </div>
      @if (hasCode()) {
        <div [hidden]="activeTab() === 'Preview'">
          <app-code-block
            [code]="code()"
            [language]="language()"
            [files]="files()"
            [frameless]="true"
          />
        </div>
      }
    </section>
  `,
})
export class DemoCard {
  readonly title = input('Example');
  readonly chips = input<readonly string[]>([]);
  /** Single-snippet shorthand; use `files` for multi-file demos. */
  readonly code = input<string | undefined>(undefined);
  readonly language = input('html');
  /** Multi-file demo sources — rendered as editor tabs inside the Code view. */
  readonly files = input<readonly DemoFile[] | undefined>(undefined);

  protected readonly tabs = ['Preview', 'Code'] as const;
  protected readonly activeTab = signal<'Preview' | 'Code'>('Preview');

  protected readonly hasCode = computed(
    () => this.code() !== undefined || (this.files()?.length ?? 0) > 0
  );

  protected readonly codeOpen = computed(() => this.hasCode() && this.activeTab() === 'Code');

  protected tabClass(tab: 'Preview' | 'Code'): string {
    const active = this.activeTab() === tab;
    if (this.codeOpen()) {
      return active ? 'bg-[#3c3c3c] text-white' : 'text-gray-500 hover:text-gray-300';
    }
    return active
      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200';
  }
}
