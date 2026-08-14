import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { highlight } from './highlight';

export interface CodeFile {
  name: string;
  language: string;
  code: string;
}

const DEFAULT_TITLES: Record<string, string> = {
  ts: 'component.ts',
  // React samples are `.tsx` files — a tab reading `component.ts` above JSX
  // is a small lie the React reader notices. The highlighter has no `tsx`
  // ruleset and falls back to `ts`, which is the correct highlighting anyway.
  tsx: 'component.tsx',
  html: 'template.html',
  css: 'styles.css',
  sh: 'terminal',
};

/**
 * VS Code-style code block: file tabs in the window bar (multi-file support),
 * line numbers, Dark+ palette, copy. Always dark, independent of docs theme.
 */
@Component({
  selector: 'app-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="overflow-hidden bg-[#1e1e1e]"
      [class]="
        frameless()
          ? ''
          : 'my-3 mb-5 rounded-xl border border-[#2d2d2d] shadow-lg'
      "
    >
      <!-- window bar with file tabs -->
      <div class="flex items-center gap-3 bg-[#181818] px-3 pt-2">
        <span class="flex gap-1.5 pb-2">
          <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
          <span class="h-3 w-3 rounded-full bg-[#febc2e]"></span>
          <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
        </span>
        <div class="flex min-w-0 overflow-x-auto">
          @for (file of effFiles(); track file.name; let index = $index) {
            <button
              type="button"
              class="flex shrink-0 items-center gap-2 rounded-t-md px-3.5 py-1.5 font-mono text-[12px] transition-colors"
              [class]="
                index === activeIndex()
                  ? 'border-t-2 border-[#4f8ff0] bg-[#1e1e1e] text-gray-200'
                  : 'border-t-2 border-transparent text-gray-500 hover:text-gray-300'
              "
              (click)="activeIndex.set(index)"
            >
              <span
                class="h-2 w-2 rounded-sm"
                [class]="dotClass(file.language)"
              ></span>
              {{ file.name }}
            </button>
          }
        </div>
        <button
          type="button"
          class="mb-1.5 ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-[#3c3c3c] px-2 py-1 text-xs text-gray-300 transition-colors hover:border-[#5a5a5a] hover:bg-[#2a2a2a] hover:text-white"
          (click)="copy()"
        >
          @if (copied()) {
            <svg
              viewBox="0 0 16 16"
              width="11"
              height="11"
              fill="none"
              stroke="#28c840"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m3 8.5 3.5 3.5L13 5" />
            </svg>
            Copied
          } @else {
            <svg
              viewBox="0 0 16 16"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
              <path
                d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"
              />
            </svg>
            Copy
          }
        </button>
      </div>
      <!-- editor body -->
      <div class="code-body flex overflow-x-auto">
        <div
          class="line-numbers select-none py-4 pl-4 pr-3 text-right"
          aria-hidden="true"
        >
          @for (line of lineNumbers(); track line) {
            <div>{{ line }}</div>
          }
        </div>
        <pre
          class="code-pre m-0 flex-1 py-4 pr-4"
        ><code [innerHTML]="highlighted()"></code></pre>
      </div>
    </div>
  `,
  styles: `
    .code-body {
      font-family:
        ui-monospace, 'Cascadia Code', 'JetBrains Mono', Consolas, monospace;
      font-size: 13px;
      line-height: 1.7;
    }

    .line-numbers {
      color: #6e7681;
      border-right: 1px solid #2d2d2d;
      background: #1e1e1e;
      position: sticky;
      left: 0;
      min-width: 44px;
      font-variant-numeric: tabular-nums;
    }

    .code-pre {
      color: #d4d4d4;
      padding-left: 16px;
      font: inherit;

      .tok-comment {
        color: #6a9955;
        font-style: italic;
      }
      .tok-string {
        color: #ce9178;
      }
      .tok-keyword {
        color: #569cd6;
      }
      .tok-type {
        color: #4ec9b0;
      }
      .tok-decorator {
        color: #dcdcaa;
      }
      .tok-number {
        color: #b5cea8;
      }
      .tok-tag {
        color: #7ee787;
      }
      .tok-attr {
        color: #9cdcfe;
      }
      .tok-interp {
        color: #dcdcaa;
      }
    }
  `,
})
export class CodeBlock {
  private readonly sanitizer = inject(DomSanitizer);

  /** Single-snippet shorthand. */
  readonly code = input<string | undefined>(undefined);
  readonly language = input('html');
  /** Optional file-name for the single-snippet shorthand. */
  readonly title = input<string | undefined>(undefined);
  /** Multi-file mode: one editor tab per file. */
  readonly files = input<readonly CodeFile[] | undefined>(undefined);
  /** Removes outer border/margins (for embedding inside demo cards). */
  readonly frameless = input(false);

  protected readonly copied = signal(false);
  protected readonly activeIndex = signal(0);

  protected readonly effFiles = computed<readonly CodeFile[]>(() => {
    const files = this.files();
    if (files?.length) return files;
    const code = this.code();
    if (code === undefined) return [];
    const language = this.language();
    return [
      {
        name: this.title() ?? DEFAULT_TITLES[language] ?? language,
        language,
        code,
      },
    ];
  });

  private readonly activeFile = computed<CodeFile | undefined>(() => {
    const files = this.effFiles();
    return files[Math.min(this.activeIndex(), files.length - 1)];
  });

  protected dotClass(language: string): string {
    switch (language) {
      case 'ts':
        return 'bg-[#519aba]';
      case 'html':
        return 'bg-[#e37933]';
      case 'css':
        return 'bg-[#a074c4]';
      default:
        return 'bg-[#8bc34a]';
    }
  }

  protected readonly lineNumbers = computed(() => {
    const count = (this.activeFile()?.code ?? '').split('\n').length;
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  protected readonly highlighted = computed<SafeHtml>(() => {
    const file = this.activeFile();
    return this.sanitizer.bypassSecurityTrustHtml(
      file ? highlight(file.code, file.language) : '',
    );
  });

  protected copy(): void {
    const file = this.activeFile();
    if (!file) return;
    navigator.clipboard?.writeText(file.code).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
