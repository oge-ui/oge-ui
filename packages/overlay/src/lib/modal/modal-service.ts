import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  Injectable,
  Injector,
  TemplateRef,
  ViewEncapsulation,
  createComponent,
  inject,
  input,
  signal,
  viewChild,
  type Type,
} from '@angular/core';
import {
  OgeDialogCore,
  ogeConfirmResult,
  ogeDialogAutoFocusSelector,
  ogeDialogOptions,
  ogePromptResult,
  resolveOgeDialog,
  type OgeDialogKind,
  type OgeDialogOutcome,
  type OgePromptBaseOptions,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG, type OgeOverlayMessages } from '../config';
import { OgeLiveAnnouncer } from '../live-announcer/live-announcer';
import { SIGNAL_ADAPTER } from '../signal-adapter';
import { OgeDialogContent, type OgeDialogContentData } from './dialog-content';
import type {
  OgeAlertOptions,
  OgeConfirmOptions,
  OgePromptOptions,
} from './dialog-types';
import { OgeModal } from './modal';
import { OGE_MODAL_DATA } from './modal-tokens';
import type {
  OgeModalAutoFocus,
  OgeModalClosedEvent,
  OgeModalPlacement,
  OgeModalRole,
  OgeModalSlotContext,
} from './modal-types';

export { OGE_MODAL_DATA } from './modal-tokens';

let nextDialogId = 0;

/** Configuration of a service-opened modal — the declarative inputs, minus slots. */
export interface OgeModalOpenConfig<D = unknown> {
  title?: string;
  ariaLabel?: string;
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  placement?: OgeModalPlacement;
  /** ARIA role of the panel. Default `'dialog'`. */
  dialogRole?: OgeModalRole;
  /** Id(s) of the element(s) describing the dialog (`aria-describedby`). */
  ariaDescribedBy?: string;
  shading?: boolean;
  fullScreen?: boolean;
  showCloseButton?: boolean;
  showMaximizeButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  scrollLock?: boolean;
  autoFocus?: OgeModalAutoFocus;
  restoreFocus?: boolean;
  padding?: boolean;
  dragEnabled?: boolean;
  dragOutsideBoundary?: boolean;
  resizeEnabled?: boolean;
  inertBackground?: boolean;
  closeGuard?: () => boolean | Promise<boolean>;
  messages?: Partial<OgeOverlayMessages>;
  /** Made available to the content component via `OGE_MODAL_DATA`. */
  data?: D;
}

/**
 * Handle of a service-opened modal: close it programmatically (full guard
 * pipeline) and await the result. Content components can inject it.
 */
export class OgeModalRef<R = unknown> {
  /** @internal wired by the service once the host renders. */
  _close: (result?: R) => void = () => undefined;

  /** Resolves after the modal closed, with reason and optional result. */
  readonly closed: Promise<OgeModalClosedEvent<R>>;

  constructor(closed: Promise<OgeModalClosedEvent<R>>) {
    this.closed = closed;
  }

  /** Closes through the full pipeline; the argument becomes `closed.result`. */
  close(result?: R): void {
    this._close(result);
  }
}

/**
 * Internal host rendered into `document.body` by `OgeModalService`. Body
 * mounting sidesteps `transform`ed ancestors (the documented constraint of
 * the declarative modal); page-level themes (`.oge-theme-dark` on
 * `<html>`/`<body>`) still apply.
 */
@Component({
  selector: 'oge-modal-service-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeModal, NgComponentOutlet, NgTemplateOutlet],
  template: `
    <oge-modal
      [(opened)]="opened"
      [title]="config().title"
      [ariaLabel]="config().ariaLabel"
      [width]="config().width"
      [height]="config().height"
      [minWidth]="config().minWidth"
      [minHeight]="config().minHeight"
      [maxWidth]="config().maxWidth"
      [maxHeight]="config().maxHeight"
      [placement]="config().placement ?? 'center'"
      [dialogRole]="config().dialogRole ?? 'dialog'"
      [ariaDescribedBy]="config().ariaDescribedBy"
      [shading]="config().shading ?? true"
      [fullScreen]="config().fullScreen ?? false"
      [showCloseButton]="config().showCloseButton ?? true"
      [showMaximizeButton]="config().showMaximizeButton ?? false"
      [closeOnEscape]="config().closeOnEscape ?? true"
      [closeOnBackdropClick]="config().closeOnBackdropClick ?? true"
      [scrollLock]="config().scrollLock ?? true"
      [autoFocus]="config().autoFocus ?? 'first-tabbable'"
      [restoreFocus]="config().restoreFocus ?? true"
      [padding]="config().padding ?? true"
      [dragEnabled]="config().dragEnabled ?? false"
      [dragOutsideBoundary]="config().dragOutsideBoundary ?? false"
      [resizeEnabled]="config().resizeEnabled ?? false"
      [inertBackground]="config().inertBackground ?? false"
      [closeGuard]="config().closeGuard"
      [messages]="config().messages"
      (closed)="onClosed()($any($event))"
    >
      @if (componentType(); as component) {
        <ng-container
          *ngComponentOutlet="component; injector: contentInjector()"
        />
      } @else if (template(); as tpl) {
        <ng-container *ngTemplateOutlet="tpl; context: templateContext()" />
      }
    </oge-modal>
  `,
})
export class OgeModalServiceHost {
  readonly config = input.required<OgeModalOpenConfig>();
  readonly componentType = input<Type<unknown> | null>(null);
  readonly template = input<TemplateRef<OgeModalSlotContext> | null>(null);
  readonly contentInjector = input.required<Injector>();
  readonly templateContext = input.required<OgeModalSlotContext>();
  readonly onClosed = input.required<(event: OgeModalClosedEvent) => void>();

  /** Open on first render; the modal drives the close lifecycle. */
  protected readonly opened = signal(true);
  readonly modal = viewChild.required(OgeModal);
}

/**
 * Imperative, body-appended modals — the escape hatch for `transform`ed
 * ancestors and for prompt/confirm flows without a declared `<oge-modal>`:
 *
 * ```ts
 * private readonly modals = inject(OgeModalService);
 *
 * async confirmDelete(): Promise<void> {
 *   const ref = this.modals.open<string>(ConfirmDelete, {
 *     title: 'Delete file?', width: 360, data: { name: 'report.xlsx' },
 *   });
 *   const { result } = await ref.closed;
 *   if (result === 'delete') this.remove();
 * }
 * ```
 *
 * The content component injects `OGE_MODAL_DATA` for its input and
 * `OgeModalRef` to close itself with a result.
 */
@Injectable({ providedIn: 'root' })
export class OgeModalService {
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly injector = inject(Injector);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);
  private readonly announcer = inject(OgeLiveAnnouncer);

  /**
   * Asks a yes/no question in an APG alert dialog; resolves `true` for the
   * primary button, `false` for Cancel and Escape. `danger` styles the
   * primary button as destructive and puts initial focus on Cancel.
   *
   * ```ts
   * if (await this.modals.confirm({ title: 'Delete file?', message: 'This cannot be undone.', danger: true })) { … }
   * ```
   */
  confirm(options: string | OgeConfirmOptions): Promise<boolean> {
    return this.openDialog('confirm', options).then(({ outcome }) =>
      ogeConfirmResult(outcome),
    );
  }

  /** Shows a message with a single OK button (APG alert dialog); Escape also acknowledges it. */
  alert(options: string | OgeAlertOptions): Promise<void> {
    return this.openDialog('alert', options).then(() => undefined);
  }

  /**
   * Asks for a line of text; resolves the submitted value, or `null` for
   * Cancel and Escape. `required` and `validate` (sync or async) block the
   * submit and render the error beside the field (`aria-invalid` +
   * `aria-describedby`).
   */
  prompt(options: string | OgePromptOptions): Promise<string | null> {
    return this.openDialog('prompt', options).then(({ outcome, value }) =>
      ogePromptResult(outcome, value),
    );
  }

  private openDialog(
    kind: OgeDialogKind,
    input: string | OgePromptBaseOptions<TemplateRef<unknown>>,
  ): Promise<{ outcome: OgeDialogOutcome | undefined; value: string }> {
    const options =
      ogeDialogOptions<OgePromptBaseOptions<TemplateRef<unknown>>>(input);
    const messages = this.overlayConfig.messages;
    const dialog = resolveOgeDialog(kind, options, messages);
    const id = `oge-dialog-${nextDialogId++}`;
    let ref: OgeModalRef<OgeDialogOutcome> | null = null;
    const core = new OgeDialogCore({
      adapter: SIGNAL_ADAPTER,
      dialog,
      validate: options.validate,
      messages,
      settle: (outcome) => ref?.close(outcome),
      announce: (message) => this.announcer.announce(message),
    });
    const data: OgeDialogContentData = {
      dialog,
      core,
      id,
      icon: options.icon instanceof TemplateRef ? options.icon : null,
    };
    ref = this.open<OgeDialogOutcome, OgeDialogContentData>(OgeDialogContent, {
      title: dialog.title,
      width: dialog.width,
      dialogRole: dialog.role,
      ariaDescribedBy: dialog.message ? `${id}-message` : undefined,
      autoFocus: ogeDialogAutoFocusSelector(dialog.initialFocus),
      showCloseButton: false,
      closeOnBackdropClick: false,
      padding: false,
      data,
    });
    // Escape closes the modal without a result, which the mappers read as Cancel
    return ref.closed.then(({ result }) => ({
      outcome: result,
      value: core.value(),
    }));
  }

  /** Opens `content` (component or template) in a body-appended modal. */
  open<R = unknown, D = unknown>(
    content: Type<unknown> | TemplateRef<OgeModalSlotContext>,
    config: OgeModalOpenConfig<D> = {},
  ): OgeModalRef<R> {
    let resolveClosed!: (event: OgeModalClosedEvent<R>) => void;
    const modalRef = new OgeModalRef<R>(
      new Promise((resolve) => (resolveClosed = resolve)),
    );
    const contentInjector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: OGE_MODAL_DATA, useValue: config.data },
        { provide: OgeModalRef, useValue: modalRef },
      ],
    });

    const hostRef = createComponent(OgeModalServiceHost, {
      environmentInjector: this.envInjector,
    });
    hostRef.setInput('config', config);
    if (content instanceof TemplateRef) hostRef.setInput('template', content);
    else hostRef.setInput('componentType', content);
    hostRef.setInput('contentInjector', contentInjector);
    hostRef.setInput('templateContext', {
      $implicit: (result?: unknown) => modalRef.close(result as R),
    } satisfies OgeModalSlotContext);
    hostRef.setInput('onClosed', (event: OgeModalClosedEvent) => {
      resolveClosed(event as OgeModalClosedEvent<R>);
      // Let the close finish its teardown before the view goes away.
      queueMicrotask(() => {
        this.appRef.detachView(hostRef.hostView);
        hostRef.destroy();
        hostElement.remove();
      });
    });

    const hostElement = hostRef.location.nativeElement as HTMLElement;
    document.body.appendChild(hostElement);
    this.appRef.attachView(hostRef.hostView);
    modalRef._close = (result?: R) =>
      (hostRef.instance.modal() as OgeModal<R>).close(result);
    return modalRef;
  }
}
