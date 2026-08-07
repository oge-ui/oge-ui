import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  Injectable,
  InjectionToken,
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
import type { OgeOverlayMessages } from '../config';
import { OgeModal } from './modal';
import type {
  OgeModalAutoFocus,
  OgeModalClosedEvent,
  OgeModalPlacement,
  OgeModalSlotContext,
} from './modal-types';

/**
 * Data passed via `OgeModalService.open(component, { data })`; inject it in
 * the content component: `readonly data = inject(OGE_MODAL_DATA)`.
 */
export const OGE_MODAL_DATA = new InjectionToken<unknown>('OGE_MODAL_DATA');

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
