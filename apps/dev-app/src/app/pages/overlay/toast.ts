import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import {
  OgeToastService,
  type OgeToastPosition,
  type OgeToastSeverity,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  ACTION_SNIPPET,
  BASIC_SNIPPET,
  COALESCE_SNIPPET,
  POSITION_SNIPPET,
  PROMISE_SNIPPET,
} from './toast-snippets';

const SECTIONS = [
  'Severities',
  'Positions & stacking',
  'Sticky, action & undo',
  'Promise toasts',
  'Coalescing & progress',
] as const;

@Component({
  selector: 'app-overlay-toast',
  imports: [OgeButton, DemoCard, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Toast"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="['OgeToastService', 'promise()', 'coalesce', 'action']"
    >
      <p>
        <code>OgeToastService</code> shows stacked, auto-dismissing
        notifications in body-appended regions above every other surface —
        including open modals. Toasts never steal focus and never join the
        Escape stack; screen readers hear them through permanent hidden live
        regions (errors assert, the rest stay polite). Timers pause on hover,
        focus and while the tab is hidden, always resuming with the remaining
        time.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['success/info/warning/error', 'title', 'announce']"
      heading="Severities"
      description="One sugar method per severity — the accent bar, icon and screen-reader mode follow. <code>title</code> adds a bold first line; <code>announce</code> overrides the politeness (errors assert by default)."
      [code]="basicSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-center gap-3">
        @for (severity of severities; track severity) {
          <oge-button
            [text]="severity"
            stylingMode="outlined"
            (clicked)="showSeverity(severity)"
          />
        }
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['position', 'toastMaxVisible', 'FIFO queue']"
      heading="Positions & stacking"
      description="Six logical positions (<code>top/bottom × start/center/end</code>) — RTL flips start/end automatically. The newest toast lands nearest the screen edge; extras beyond <code>toastMaxVisible</code> wait in a lossless FIFO queue and promote as slots free up. Try the burst button."
      [code]="positionSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-center gap-3">
        @for (position of positions; track position) {
          <oge-button
            [text]="position"
            stylingMode="text"
            (clicked)="showAt(position)"
          />
        }
        <oge-button text="Burst ×8" (clicked)="burst()" />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['sticky', 'action', 'ref.closed']"
      heading="Sticky, action & undo"
      description="<code>sticky</code> disables auto-dismiss — recommended whenever there's an <code>action</code>, so keyboard users can reach it. The action press closes with reason <code>'action'</code>; awaiting <code>ref.closed</code> gives a clean undo pattern without extra state."
      [code]="actionSnippet"
      language="ts"
    >
      <div class="flex items-center gap-4">
        <oge-button
          text="Delete row"
          severity="danger"
          stylingMode="outlined"
          (clicked)="deleteWithUndo()"
        />
        <span class="text-sm opacity-70">{{ undoState() }}</span>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['promise()', 'in-place morph', 'ref.update']"
      heading="Promise toasts"
      description="<code>promise()</code> shows a sticky spinner toast and morphs it in place when the promise settles — success or error accepts a message or a function returning a message or a full patch. The auto-dismiss timer only starts on settle. Under the hood it's the public <code>ref.update()</code> — usable for any live-updating toast."
      [code]="promiseSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-center gap-3">
        <oge-button text="Publish (succeeds)" (clicked)="runPromise(true)" />
        <oge-button
          text="Publish (fails)"
          stylingMode="outlined"
          (clicked)="runPromise(false)"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['coalesce', '×N badge', 'progressBar']"
      heading="Coalescing & progress"
      description="With <code>coalesce</code> an identical toast doesn't pile up — the existing one gains a live <code>×N</code> badge, restarts its timer and re-announces. <code>progressBar</code> shows the remaining time as a compositor-only bar that freezes exactly in sync with the paused timer."
      [code]="coalesceSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-center gap-3">
        <oge-button
          text="Fail an import row"
          stylingMode="outlined"
          (clicked)="coalesceDemo()"
        />
        <oge-button
          text="With progress bar"
          stylingMode="outlined"
          (clicked)="progressDemo()"
        />
        <oge-button
          text="Clear all"
          stylingMode="text"
          (clicked)="toasts.clear()"
        />
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Defaults live in
        <code
          >provideOgeOverlayConfig(&#123; toastPosition, toastDisplayTime,
          toastMaxVisible, toastProgressBar, toastCoalesceDuplicates
          &#125;)</code
        >; the ✕ label, region label and count badge localize via the
        <code>messages</code> block.
      </li>
      <li>
        Toast regions sit at the end of <code>&lt;body&gt;</code>, so their
        buttons are the last Tab stops; focusing a toast pauses its timer (WCAG
        2.2.1).
      </li>
      <li>
        <code>template</code> replaces the body for fully custom content — heavy
        interactive flows belong in <code>OgeModalService</code>
        instead.
      </li>
    </ul>
  `,
})
export class OverlayToastPage {
  protected readonly sections = SECTIONS;
  protected readonly toasts = inject(OgeToastService);

  protected readonly severities: OgeToastSeverity[] = [
    'success',
    'info',
    'warning',
    'error',
  ];
  protected readonly positions: OgeToastPosition[] = [
    'top-start',
    'top-center',
    'top-end',
    'bottom-start',
    'bottom-center',
    'bottom-end',
  ];
  protected readonly undoState = signal('—');

  protected showSeverity(severity: OgeToastSeverity): void {
    const messages: Record<OgeToastSeverity, string> = {
      success: 'Changes saved',
      info: 'Sync completed a minute ago',
      warning: 'Storage quota at 90%',
      error: 'Could not reach the server',
    };
    this.toasts.show({
      message: messages[severity],
      severity,
      title: severity === 'warning' ? 'Heads up' : undefined,
    });
  }

  protected showAt(position: OgeToastPosition): void {
    this.toasts.info(position, { position });
  }

  protected burst(): void {
    for (let i = 1; i <= 8; i++) {
      this.toasts.info(`Burst toast ${i} of 8`, { displayTime: 3000 });
    }
  }

  protected async deleteWithUndo(): Promise<void> {
    this.undoState.set('row deleted…');
    const ref = this.toasts.show({
      message: 'Row deleted',
      sticky: true,
      action: { text: 'Undo', handler: () => this.undoState.set('restored!') },
    });
    const { reason } = await ref.closed;
    if (reason !== 'action') this.undoState.set(`gone for good (${reason})`);
  }

  protected runPromise(succeed: boolean): void {
    const work = new Promise<number>((resolve, reject) => {
      setTimeout(
        () => (succeed ? resolve(3) : reject(new Error('network timeout'))),
        1800,
      );
    });
    void this.toasts.promise(work, {
      loading: 'Publishing…',
      success: (count) => `Published ${count} pages`,
      error: (e) => ({
        title: 'Publish failed',
        message: e instanceof Error ? e.message : String(e),
      }),
    });
  }

  protected coalesceDemo(): void {
    this.toasts.error('Import row failed', { coalesce: true, sticky: true });
  }

  protected progressDemo(): void {
    this.toasts.info('Hover me — the bar pauses with the timer', {
      progressBar: true,
      displayTime: 6000,
    });
  }

  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly positionSnippet = POSITION_SNIPPET;
  protected readonly actionSnippet = ACTION_SNIPPET;
  protected readonly promiseSnippet = PROMISE_SNIPPET;
  protected readonly coalesceSnippet = COALESCE_SNIPPET;
}
