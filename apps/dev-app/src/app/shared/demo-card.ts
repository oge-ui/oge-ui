import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CodeBlock } from './code-block';

export interface DemoFile {
  name: string;
  language: string;
  code: string;
}

const DEFAULT_NAMES: Record<string, string> = {
  ts: 'component.ts',
  html: 'template.html',
  css: 'styles.css',
  sh: 'terminal',
};

/**
 * Docs demo card with Preview/Code tabs. Multi-file demos show one tab per
 * file (component.ts / template.html / …). The live demo stays mounted while
 * a code tab is open, so grid state survives tab switches.
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
        @if (effectiveFiles().length) {
          <div
            class="flex flex-wrap rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-950"
          >
            @for (tab of tabNames(); track tab) {
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
      <div class="p-4" [hidden]="activeTab() !== 'Preview'">
        <ng-content />
      </div>
      @for (file of effectiveFiles(); track file.name) {
        <div [hidden]="activeTab() !== file.name">
          <app-code-block
            [code]="file.code"
            [language]="file.language"
            [title]="file.name"
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
  /** Multi-file demo sources, one tab per file. */
  readonly files = input<readonly DemoFile[] | undefined>(undefined);

  protected readonly effectiveFiles = computed<readonly DemoFile[]>(() => {
    const files = this.files();
    if (files?.length) return files;
    const code = this.code();
    if (!code) return [];
    const language = this.language();
    return [{ name: DEFAULT_NAMES[language] ?? language, language, code }];
  });

  protected readonly tabNames = computed(() => [
    'Preview',
    ...this.effectiveFiles().map((file) => file.name),
  ]);

  protected readonly activeTab = signal('Preview');
}
