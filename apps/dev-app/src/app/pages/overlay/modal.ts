import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import { OgeSelectBox } from '@oge-ui/inputs';
import {
  OGE_MODAL_DATA,
  OgeModal,
  OgeModalFooter,
  OgeModalHeaderActions,
  OgeModalRef,
  OgeModalService,
  type OgeModalClosedEvent,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  BASIC_SNIPPET,
  BUSY_SNIPPET,
  FORM_SNIPPET,
  GUARD_SNIPPET,
  RESULT_SNIPPET,
  SIZING_SNIPPET,
  WINDOW_SNIPPET,
} from './modal-snippets';

/** Content of the service demo — gets its data and ref via DI. */
@Component({
  imports: [OgeButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="m-0 mb-3">
      Rename <code>{{ data }}</code> — this component was opened imperatively
      and injected its payload via <code>OGE_MODAL_DATA</code>.
    </p>
    <div class="flex justify-end gap-2">
      <oge-button text="Cancel" stylingMode="text" (clicked)="ref.close()" />
      <oge-button text="Rename" (clicked)="ref.close('renamed-' + data)" />
    </div>
  `,
})
class ServiceDemoDialog {
  protected readonly data = inject(OGE_MODAL_DATA) as string;
  protected readonly ref = inject(OgeModalRef);
}

const SECTIONS = [
  'Basics',
  'Form content & stacked popups',
  'Full screen, placement & sizing',
  'Window mode & modal service',
  'Async close guard',
  'Busy state',
  'Typed result',
] as const;

@Component({
  selector: 'app-overlay-modal',
  imports: [
    OgeButton,
    OgeSelectBox,
    OgeModal,
    OgeModalFooter,
    OgeModalHeaderActions,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Modal"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="['oge-modal', '[(opened)]', 'closeGuard', '*ogeModalFooter']"
    >
      <p>
        <code>oge-modal</code> is the centered dialog primitive: backdrop, focus
        trap, body scroll lock, Escape/backdrop closing and focus restore.
        Content renders lazily behind the <code>opened</code> model and joins
        the shared overlay Escape stack, so popups opened inside the modal close
        before the modal itself. Declare it near the component root —
        <code>transform</code>ed ancestors break <code>position: fixed</code>.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['[(opened)]', 'title', '*ogeModalFooter']"
      heading="Basics"
      description="Open declaratively via the two-way <code>opened</code> model or imperatively with <code>open()</code>/<code>close()</code>/<code>toggle()</code>. The footer slot's <code>let close</code> function closes the modal; <code>Escape</code>, backdrop clicks and the ✕ button work out of the box and focus returns to the opener."
      [code]="basicSnippet"
      language="ts"
    >
      <oge-button text="Open modal" (clicked)="basicOpen.set(true)" />
      <oge-modal title="Team settings" [(opened)]="basicOpen">
        <p class="m-0">
          Centered dialog with backdrop, focus trap and scroll lock. Try
          <kbd>Tab</kbd> — focus wraps inside the dialog.
        </p>
        <div *ogeModalFooter="let close" class="contents">
          <oge-button text="Cancel" stylingMode="text" (clicked)="close()" />
          <oge-button text="Save" (clicked)="close()" />
        </div>
      </oge-modal>
    </app-demo-card>

    <app-demo-card
      [chips]="['width', 'oge-select-box', 'Escape stack']"
      heading="Form content & stacked popups"
      description="Any content projects into the body — including dropdown editors. Their popups render <em>above</em> the modal, and the shared Escape stack closes the topmost surface first: one <kbd>Escape</kbd> for the open select popup, a second for the modal."
      [code]="formSnippet"
      language="ts"
    >
      <oge-button
        text="Edit record"
        stylingMode="outlined"
        (clicked)="formOpen.set(true)"
      />
      <oge-modal title="Edit record" [(opened)]="formOpen" [width]="420">
        <div class="flex flex-col gap-3">
          <oge-select-box
            label="Status"
            [items]="statuses"
            [(value)]="status"
          />
          <oge-select-box
            label="Assignee"
            [items]="assignees"
            [(value)]="assignee"
          />
        </div>
        <div *ogeModalFooter="let close" class="contents">
          <oge-button text="Done" (clicked)="close()" />
        </div>
      </oge-modal>
    </app-demo-card>

    <app-demo-card
      [chips]="['[(fullScreen)]', 'placement', 'shading', 'min/max size']"
      heading="Full screen, placement & sizing"
      description='<code>showMaximizeButton</code> puts a maximize/restore toggle in the title bar, driving the two-way <code>fullScreen</code> model (size inputs are ignored while full screen). <code>placement="top"</code> pins the dialog near the top edge — command-palette style — and <code>[shading]="false"</code> keeps the backdrop transparent while staying fully modal. Sizing accepts <code>width/height</code> plus <code>min/max</code> variants, as numbers (px) or CSS strings.'
      [code]="sizingSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-center gap-3">
        <oge-button
          text="Maximizable"
          stylingMode="outlined"
          (clicked)="sizingOpen.set(true)"
        />
        <oge-button
          text="Top placement"
          stylingMode="outlined"
          (clicked)="topOpen.set(true)"
        />
        <oge-button
          text="No shading"
          stylingMode="outlined"
          (clicked)="unshadedOpen.set(true)"
        />
      </div>
      <oge-modal
        title="Quarterly report"
        [(opened)]="sizingOpen"
        [(fullScreen)]="sizingFullScreen"
        [showMaximizeButton]="true"
        [width]="480"
        [minHeight]="220"
        [maxWidth]="'90vw'"
      >
        <p class="m-0">
          Use the title-bar button (or press it again) to toggle full screen —
          the state is a two-way <code>fullScreen</code> model.
        </p>
      </oge-modal>
      <oge-modal title="Quick search" [(opened)]="topOpen" placement="top">
        <input
          class="w-full rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-transparent"
          placeholder="Type to search…"
        />
      </oge-modal>
      <oge-modal
        title="Transparent backdrop"
        [(opened)]="unshadedOpen"
        [shading]="false"
        [width]="360"
      >
        <p class="m-0">
          No dimming, but still modal: focus stays trapped and the page behind
          does not scroll.
        </p>
      </oge-modal>
    </app-demo-card>

    <app-demo-card
      [chips]="['dragEnabled', 'resizeEnabled', 'OgeModalService', 'inert']"
      heading="Window mode & modal service"
      description="<code>dragEnabled</code> makes the title bar a drag handle (viewport-clamped unless <code>dragOutsideBoundary</code>), <code>resizeEnabled</code> adds a corner handle with <code>resizeStarted</code>/<code>resized</code> events, and <code>restorePosition</code> resets both on reopen. For imperative flows — or <code>transform</code>ed ancestors — <code>OgeModalService.open(component, config)</code> renders a body-appended modal; the content injects <code>OGE_MODAL_DATA</code> and closes itself via <code>OgeModalRef</code>, whose <code>closed</code> promise carries the typed result. <code>inertBackground</code> additionally marks the page behind the modal <code>inert</code>."
      [code]="windowSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-center gap-3">
        <oge-button
          text="Drag & resize"
          stylingMode="outlined"
          (clicked)="windowOpen.set(true)"
        />
        <oge-button
          text="Open via service"
          stylingMode="outlined"
          (clicked)="openServiceDemo()"
        />
        <span class="text-sm opacity-70"
          >service result: {{ serviceResult() }}</span
        >
      </div>
      <oge-modal
        title="Drag me by this bar"
        [(opened)]="windowOpen"
        [dragEnabled]="true"
        [resizeEnabled]="true"
        [width]="380"
        [minHeight]="160"
      >
        <ng-container *ogeModalHeaderActions>
          <button
            type="button"
            class="oge-modal-close"
            aria-label="Help"
            (click)="headerHelpClicks.set(headerHelpClicks() + 1)"
          >
            ?
          </button>
        </ng-container>
        <p class="m-0">
          Drag the title bar; resize from the bottom-right corner. Position and
          size reset on reopen (<code>restorePosition</code>). The
          <code>?</code> button in the title bar comes from the
          <code>*ogeModalHeaderActions</code> slot — clicked
          {{ headerHelpClicks() }} times, and it never starts a drag.
        </p>
      </oge-modal>
    </app-demo-card>

    <app-demo-card
      [chips]="['closeGuard', 'closePending', 'async veto']"
      heading="Async close guard"
      description="<code>closeGuard</code> runs before every close — <code>Escape</code>, backdrop, ✕ and <code>close()</code> alike — and may return a <code>Promise&amp;lt;boolean&amp;gt;</code>: the modal stays open until it resolves, single-flight guarded. No other library covers the async unsaved-changes veto without hand-rolled plumbing. A direct <code>opened</code> model write bypasses the guard (the app already decided)."
      [code]="guardSnippet"
      language="ts"
    >
      <oge-button
        text="Open guarded draft"
        stylingMode="outlined"
        (clicked)="guardOpen.set(true)"
      />
      <oge-modal
        title="Draft message"
        [(opened)]="guardOpen"
        [closeGuard]="confirmDiscard"
      >
        <label class="flex flex-col gap-1 text-sm">
          <span>Message (edit to make it dirty)</span>
          <textarea
            class="min-h-20 rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-transparent"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
          ></textarea>
        </label>
        <div *ogeModalFooter="let close" class="contents">
          <oge-button text="Close" (clicked)="close()" />
        </div>
      </oge-modal>
    </app-demo-card>

    <app-demo-card
      [chips]="['busy', 'aria-busy', 'spinner veil']"
      heading="Busy state"
      description="While <code>busy</code> is true the modal shows a spinner veil, sets <code>aria-busy</code> and blocks user-initiated closes — programmatic <code>close()</code> still works, so finish your async work and close. Pairs naturally with the button family's async <code>action</code>."
      [code]="busySnippet"
      language="ts"
    >
      <oge-button
        text="Simulate save (2s)"
        stylingMode="outlined"
        (clicked)="openBusyDemo()"
      />
      <oge-modal
        title="Publishing changes"
        [(opened)]="busyOpen"
        [busy]="saving()"
      >
        <p class="m-0">
          Escape, backdrop and ✕ are blocked while the fake request runs.
        </p>
      </oge-modal>
    </app-demo-card>

    <app-demo-card
      [chips]="['close(result)', 'OgeModalClosedEvent', 'reason']"
      heading="Typed result"
      description="<code>close(result)</code> — from code or the footer slot — carries a typed value into <code>closed</code>, alongside the close <code>reason</code>. Declarative confirm/prompt flows no longer need side-channel component state."
      [code]="resultSnippet"
      language="ts"
    >
      <div class="flex items-center gap-4">
        <oge-button
          text="Delete file…"
          severity="danger"
          stylingMode="outlined"
          (clicked)="confirmOpen.set(true)"
        />
        <span class="text-sm opacity-70">outcome: {{ outcome() }}</span>
      </div>
      <oge-modal
        title="Delete file?"
        [(opened)]="confirmOpen"
        [width]="360"
        (closed)="onConfirmClosed($event)"
      >
        <p class="m-0">This cannot be undone.</p>
        <div *ogeModalFooter="let close" class="contents">
          <oge-button text="Cancel" stylingMode="text" (clicked)="close()" />
          <oge-button
            text="Delete"
            severity="danger"
            (clicked)="close('delete')"
          />
        </div>
      </oge-modal>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>autoFocus</code> picks the initial focus target:
        <code>'first-tabbable'</code> (default), <code>'panel'</code>, or any
        CSS selector; an <code>[autofocus]</code> element always wins.
      </li>
      <li>
        Headerless modals (<code>showCloseButton=false</code>, no title) should
        set <code>ariaLabel</code>; <code>[padding]="false"</code> makes the
        body flush for grids and custom layouts.
      </li>
      <li>
        The ✕ button's aria label localizes via
        <code
          >provideOgeOverlayConfig(&#123; messages: &#123; modalClose: '…'
          &#125; &#125;)</code
        >
        or the per-instance <code>messages</code> input.
      </li>
      <li>
        Body scroll locks while open (scrollbar-width compensated, ref-counted
        across stacked modals) — disable with <code>[scrollLock]="false"</code>.
      </li>
    </ul>
  `,
})
export class OverlayModalPage {
  protected readonly sections = SECTIONS;
  private readonly modals = inject(OgeModalService);

  protected readonly basicOpen = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly windowOpen = signal(false);
  protected readonly serviceResult = signal('—');
  protected readonly headerHelpClicks = signal(0);
  protected readonly sizingOpen = signal(false);
  protected readonly sizingFullScreen = signal(false);
  protected readonly topOpen = signal(false);
  protected readonly unshadedOpen = signal(false);
  protected readonly guardOpen = signal(false);
  protected readonly busyOpen = signal(false);
  protected readonly confirmOpen = signal(false);

  protected readonly statuses = ['Open', 'In progress', 'Done'];
  protected readonly assignees = ['Ada', 'Grace', 'Linus', 'Margaret'];
  protected readonly status = signal<string | undefined>('Open');
  protected readonly assignee = signal<string | undefined>(undefined);

  protected readonly draft = signal('');
  protected readonly saving = signal(false);
  protected readonly outcome = signal('—');

  protected readonly confirmDiscard = (): boolean =>
    this.draft() === '' || confirm('Discard unsaved changes?');

  protected openBusyDemo(): void {
    this.busyOpen.set(true);
    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
      this.busyOpen.set(false);
    }, 2000);
  }

  protected async openServiceDemo(): Promise<void> {
    const ref = this.modals.open<string>(ServiceDemoDialog, {
      title: 'Opened via OgeModalService',
      width: 380,
      data: 'report.xlsx',
    });
    const { result, reason } = await ref.closed;
    this.serviceResult.set(result ?? `dismissed (${reason})`);
  }

  protected onConfirmClosed(event: OgeModalClosedEvent): void {
    this.outcome.set(
      event.result === 'delete' ? 'deleted' : `kept (${event.reason})`,
    );
  }

  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly formSnippet = FORM_SNIPPET;
  protected readonly sizingSnippet = SIZING_SNIPPET;
  protected readonly windowSnippet = WINDOW_SNIPPET;
  protected readonly guardSnippet = GUARD_SNIPPET;
  protected readonly busySnippet = BUSY_SNIPPET;
  protected readonly resultSnippet = RESULT_SNIPPET;
}
